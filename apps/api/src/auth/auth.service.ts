import {
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { DataSource, IsNull, MoreThan, type EntityManager } from 'typeorm';
import { normalizeMobile, toAsciiDigits } from '../common/mobile.js';
import { ConfigService } from '@nestjs/config';
import type { Env } from '../config/env.js';
import { AppUser } from '../iam/entities/app-user.entity.js';
import { SmsService } from '../sms/sms.service.js';
import { generateOtp, generateRefreshToken, hmac, safeEqualHex } from './crypto.js';
import type { RequestOtpResponse } from './dto/auth.dto.js';
import { AuthSession } from './entities/auth-session.entity.js';
import { OtpChallenge } from './entities/otp-challenge.entity.js';

const LOCK_MINUTES = 15;
const INVALID_CODE = 'کد نامعتبر است یا منقضی شده';

export interface ClientMeta {
  ip?: string | null;
  userAgent?: string | null;
}

export interface IssuedTokens {
  accessToken: string;
  expiresInSeconds: number;
  refreshToken: string;
  refreshExpiresAt: Date;
}

export interface AccessTokenPayload {
  sub: string;
  sid: string;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly dataSource: DataSource,
    private readonly jwt: JwtService,
    private readonly config: ConfigService<Env, true>,
    private readonly sms: SmsService,
  ) {}

  private cfg<K extends keyof Env>(key: K): Env[K] {
    return this.config.get(key, { infer: true });
  }

  private hash(value: string): string {
    return hmac(this.cfg('AUTH_HASH_PEPPER'), value);
  }

  private mobileOrThrow(raw: string): string {
    const mobile = normalizeMobile(raw);
    if (!mobile) throw new HttpException('شماره موبایل نامعتبر است', HttpStatus.BAD_REQUEST);
    return mobile;
  }

  /**
   * Sends a login code. The response is the same whether or not the mobile
   * belongs to an active user, so it cannot be used to discover accounts.
   */
  async requestOtp(rawMobile: string, meta: ClientMeta): Promise<RequestOtpResponse> {
    const mobile = this.mobileOrThrow(rawMobile);
    const ttl = this.cfg('OTP_TTL_SECONDS');
    const cooldown = this.cfg('OTP_RESEND_COOLDOWN_SECONDS');
    const challenges = this.dataSource.getRepository(OtpChallenge);

    const last = await challenges.findOne({ where: { mobile }, order: { createdAt: 'DESC' } });
    if (last) {
      const wait = Math.ceil((last.createdAt.getTime() + cooldown * 1000 - Date.now()) / 1000);
      if (wait > 0) {
        throw new HttpException(
          { message: `لطفاً ${wait} ثانیه دیگر دوباره تلاش کنید`, retryAfterSeconds: wait },
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }
    }

    const user = await this.dataSource.getRepository(AppUser).findOne({ where: { mobile } });
    const canLogin =
      !!user && user.isActive && !(user.lockedUntil && user.lockedUntil.getTime() > Date.now());

    // Record a challenge even for unknown numbers so the cooldown behaves identically.
    const code = generateOtp(this.cfg('OTP_LENGTH'));
    await challenges.insert({
      mobile,
      codeHash: canLogin ? this.hash(`${mobile}:${code}`) : this.hash(generateRefreshToken()),
      expiresAt: new Date(Date.now() + ttl * 1000),
      requestedIp: meta.ip ?? null,
    });

    if (canLogin) {
      await this.sms.enqueue({
        eventCode: 'OTP',
        to: mobile,
        text: `کد ورود گالری پاشا: ${code}`,
      });
      if (this.cfg('OTP_DEV_LOG')) this.logger.warn(`DEV OTP for ${mobile}: ${code}`);
    }

    return { expiresInSeconds: ttl, resendInSeconds: cooldown };
  }

  async verifyOtp(rawMobile: string, rawCode: string, meta: ClientMeta): Promise<IssuedTokens> {
    const mobile = this.mobileOrThrow(rawMobile);
    const code = toAsciiDigits(rawCode);
    const maxAttempts = this.cfg('OTP_MAX_ATTEMPTS');

    // Failure counters must be committed, so the transaction returns a result
    // and the error (if any) is thrown after commit.
    const result = await this.dataSource.transaction(async (m) => {
      const challenge = await m
        .getRepository(OtpChallenge)
        .createQueryBuilder('c')
        .where('c.mobile = :mobile AND c.consumed_at IS NULL AND c.expires_at > now()', { mobile })
        .orderBy('c.created_at', 'DESC')
        .setLock('pessimistic_write')
        .getOne();
      if (!challenge || challenge.attemptCount >= maxAttempts) return null;

      const users = m.getRepository(AppUser);
      const user = await users.findOne({ where: { mobile }, lock: { mode: 'pessimistic_write' } });
      if (
        !user ||
        !user.isActive ||
        (user.lockedUntil && user.lockedUntil.getTime() > Date.now())
      ) {
        return null;
      }

      if (!safeEqualHex(challenge.codeHash, this.hash(`${mobile}:${code}`))) {
        await m.increment(OtpChallenge, { id: challenge.id }, 'attemptCount', 1);
        const failed = user.failedOtpCount + 1;
        await users.update(
          { id: user.id },
          failed >= maxAttempts
            ? { failedOtpCount: 0, lockedUntil: new Date(Date.now() + LOCK_MINUTES * 60_000) }
            : { failedOtpCount: failed },
        );
        return null;
      }

      await m.update(OtpChallenge, { id: challenge.id }, { consumedAt: new Date() });
      await users.update(
        { id: user.id },
        { failedOtpCount: 0, lockedUntil: null, lastLoginAt: new Date() },
      );
      return this.createSession(m, user.id, meta);
    });

    if (!result) throw new UnauthorizedException(INVALID_CODE);
    return result;
  }

  /** Rotates the refresh token. Reusing an already-rotated token revokes all of the user's sessions. */
  async refresh(rawRefreshToken: string | undefined, meta: ClientMeta): Promise<IssuedTokens> {
    if (!rawRefreshToken) throw new UnauthorizedException();
    const tokenHash = this.hash(rawRefreshToken);

    const result = await this.dataSource.transaction(async (m) => {
      const sessions = m.getRepository(AuthSession);
      const session = await sessions.findOne({
        where: { refreshTokenHash: tokenHash },
        lock: { mode: 'pessimistic_write' },
      });
      if (!session) return null;
      if (session.revokedAt) {
        await sessions.update(
          { userId: session.userId, revokedAt: IsNull() },
          { revokedAt: new Date() },
        );
        this.logger.warn(`Refresh token reuse detected for user ${session.userId}`);
        return null;
      }
      if (session.expiresAt.getTime() <= Date.now()) return null;

      const user = await m.getRepository(AppUser).findOne({ where: { id: session.userId } });
      if (!user?.isActive) return null;

      await sessions.update({ id: session.id }, { revokedAt: new Date() });
      return this.createSession(m, user.id, meta);
    });

    if (!result) throw new UnauthorizedException();
    return result;
  }

  async logout(sessionId: string): Promise<void> {
    await this.dataSource
      .getRepository(AuthSession)
      .update({ id: sessionId, revokedAt: IsNull() }, { revokedAt: new Date() });
  }

  /** Used by the auth guard on every request: the session must still be live. */
  async loadActiveSession(sessionId: string, userId: string) {
    return this.dataSource.getRepository(AuthSession).findOne({
      where: { id: sessionId, userId, revokedAt: IsNull(), expiresAt: MoreThan(new Date()) },
      relations: { user: true },
    });
  }

  private async createSession(
    m: EntityManager,
    userId: string,
    meta: ClientMeta,
  ): Promise<IssuedTokens> {
    const refreshToken = generateRefreshToken();
    const refreshExpiresAt = new Date(Date.now() + this.cfg('REFRESH_TOKEN_TTL_DAYS') * 86_400_000);
    const inserted = await m.getRepository(AuthSession).insert({
      userId,
      refreshTokenHash: this.hash(refreshToken),
      expiresAt: refreshExpiresAt,
      ip: meta.ip ?? null,
      userAgent: meta.userAgent?.slice(0, 500) ?? null,
    });
    const sessionId = String(inserted.identifiers[0]!.id);
    const expiresInSeconds = this.cfg('JWT_ACCESS_TTL_SECONDS');
    const payload: AccessTokenPayload = { sub: userId, sid: sessionId };
    const accessToken = await this.jwt.signAsync(payload, { expiresIn: expiresInSeconds });
    return { accessToken, expiresInSeconds, refreshToken, refreshExpiresAt };
  }
}
