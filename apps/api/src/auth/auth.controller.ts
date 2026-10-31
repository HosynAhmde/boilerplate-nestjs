import { Body, Controller, Get, HttpCode, Post, Req, Res } from '@nestjs/common';
import type { Env } from '../config/env.js';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import type { Request, Response } from 'express';
import type { AuthUser } from '../common/auth-user.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { Public } from '../common/decorators/public.decorator.js';
import { ConfigService } from '@nestjs/config';
import { PermissionService } from '../iam/permission.service.js';
import { AuthService, type ClientMeta, type IssuedTokens } from './auth.service.js';
import { RequestOtpDto, VerifyOtpDto, type TokenResponse } from './dto/auth.dto.js';

export const REFRESH_COOKIE = 'pasha_rt';
const REFRESH_COOKIE_PATH = '/api/v1/auth';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly permissions: PermissionService,
    private readonly config: ConfigService<Env, true>,
  ) {}

  @Public()
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post('otp/request')
  @HttpCode(200)
  requestOtp(@Body() dto: RequestOtpDto, @Req() req: Request) {
    return this.auth.requestOtp(dto.mobile, meta(req));
  }

  @Public()
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post('otp/verify')
  @HttpCode(200)
  async verifyOtp(
    @Body() dto: VerifyOtpDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<TokenResponse> {
    return this.issue(res, await this.auth.verifyOtp(dto.mobile, dto.code, meta(req)));
  }

  @Public()
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  @Post('refresh')
  @HttpCode(200)
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<TokenResponse> {
    const token = (req.cookies as Record<string, string> | undefined)?.[REFRESH_COOKIE];
    return this.issue(res, await this.auth.refresh(token, meta(req)));
  }

  @ApiBearerAuth()
  @Post('logout')
  @HttpCode(204)
  async logout(@CurrentUser() user: AuthUser, @Res({ passthrough: true }) res: Response) {
    await this.auth.logout(user.sessionId);
    res.clearCookie(REFRESH_COOKIE, { path: REFRESH_COOKIE_PATH });
  }

  @ApiBearerAuth()
  @Get('me')
  async me(@CurrentUser() user: AuthUser) {
    return {
      id: user.id,
      fullName: user.fullName,
      mobile: user.mobile,
      roleId: user.roleId,
      permissions: await this.permissions.forRole(user.roleId),
    };
  }

  private issue(res: Response, tokens: IssuedTokens): TokenResponse {
    res.cookie(REFRESH_COOKIE, tokens.refreshToken, {
      httpOnly: true,
      secure: this.config.get('NODE_ENV', { infer: true }) === 'production',
      sameSite: 'strict',
      path: REFRESH_COOKIE_PATH,
      expires: tokens.refreshExpiresAt,
    });
    return { accessToken: tokens.accessToken, expiresInSeconds: tokens.expiresInSeconds };
  }
}

function meta(req: Request): ClientMeta {
  return { ip: req.ip ?? null, userAgent: req.headers['user-agent'] ?? null };
}
