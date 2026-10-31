import { Controller, Get } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { InjectRepository } from '@nestjs/typeorm';
import type { Repository } from 'typeorm';
import { AppSection } from './entities/app-section.entity.js';
import { Role } from './entities/role.entity.js';
import { SpecialPermission } from './entities/special-permission.entity.js';
import { RequireSection } from './permissions.decorator.js';

/** Read-only sample of an RBAC-protected endpoint. Full role management comes later. */
@ApiTags('iam')
@ApiBearerAuth()
@Controller('iam')
export class RolesController {
  constructor(
    @InjectRepository(Role) private readonly roles: Repository<Role>,
    @InjectRepository(AppSection) private readonly sections: Repository<AppSection>,
    @InjectRepository(SpecialPermission) private readonly special: Repository<SpecialPermission>,
  ) {}

  @Get('roles')
  @RequireSection('USERS_ROLES', 'view')
  listRoles() {
    return this.roles.find({ order: { id: 'ASC' } });
  }

  @Get('catalog')
  @RequireSection('USERS_ROLES', 'view')
  async permissionCatalog() {
    const [sections, special] = await Promise.all([
      this.sections.find({ order: { sortOrder: 'ASC' } }),
      this.special.find({ order: { code: 'ASC' } }),
    ]);
    return { sections, special };
  }
}
