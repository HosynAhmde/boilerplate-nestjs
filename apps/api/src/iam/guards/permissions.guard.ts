import {
  type CanActivate,
  type ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { IS_PUBLIC_KEY } from '../../common/decorators/public.decorator.js';
import {
  SECTION_PERMISSION_KEY,
  SPECIAL_PERMISSION_KEY,
  type SectionRequirement,
} from '../permissions.decorator.js';
import { PermissionService } from '../permission.service.js';

/** Enforces @RequireSection / @RequireSpecial. Runs after the auth guard. */
@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly permissions: PermissionService,
  ) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const targets = [ctx.getHandler(), ctx.getClass()];
    if (this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, targets)) return true;

    const section = this.reflector.getAllAndOverride<SectionRequirement | undefined>(
      SECTION_PERMISSION_KEY,
      targets,
    );
    const special = this.reflector.getAllAndOverride<string[] | undefined>(
      SPECIAL_PERMISSION_KEY,
      targets,
    );
    if (!section && !special?.length) return true;

    const user = ctx.switchToHttp().getRequest<Request>().user;
    if (!user) throw new ForbiddenException();

    if (section && !(await this.permissions.can(user.roleId, section.section, section.action))) {
      throw new ForbiddenException('دسترسی به این بخش ندارید');
    }
    if (special?.length && !(await this.permissions.hasSpecial(user.roleId, special))) {
      throw new ForbiddenException('دسترسی به این عملیات ندارید');
    }
    return true;
  }
}
