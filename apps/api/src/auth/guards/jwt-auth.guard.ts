import {
  type CanActivate,
  type ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import type { Request } from 'express';
import { IS_PUBLIC_KEY } from '../../common/decorators/public.decorator.js';
import { AuthService, type AccessTokenPayload } from '../auth.service.js';

/**
 * Global guard: every route needs a valid access token unless marked @Public().
 * The session row is checked too, so logout or deactivating a user takes
 * effect immediately instead of when the token expires.
 */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly jwt: JwtService,
    private readonly auth: AuthService,
  ) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    if (
      this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [ctx.getHandler(), ctx.getClass()])
    ) {
      return true;
    }
    const req = ctx.switchToHttp().getRequest<Request>();
    const [scheme, token] = req.headers.authorization?.split(' ') ?? [];
    if (scheme !== 'Bearer' || !token) throw new UnauthorizedException();

    let payload: AccessTokenPayload;
    try {
      payload = await this.jwt.verifyAsync<AccessTokenPayload>(token);
    } catch {
      throw new UnauthorizedException();
    }

    const session = await this.auth.loadActiveSession(payload.sid, payload.sub);
    if (!session?.user?.isActive) throw new UnauthorizedException();

    req.user = {
      id: session.user.id,
      roleId: session.user.roleId,
      sessionId: session.id,
      fullName: session.user.fullName,
      mobile: session.user.mobile,
    };
    return true;
  }
}
