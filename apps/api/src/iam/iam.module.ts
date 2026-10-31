import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppSection } from './entities/app-section.entity.js';
import { AppUser } from './entities/app-user.entity.js';
import { RoleSectionPermission } from './entities/role-section-permission.entity.js';
import { RoleSpecialPermission } from './entities/role-special-permission.entity.js';
import { Role } from './entities/role.entity.js';
import { SpecialPermission } from './entities/special-permission.entity.js';
import { PermissionsGuard } from './guards/permissions.guard.js';
import { PermissionService } from './permission.service.js';
import { RolesController } from './roles.controller.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Role,
      AppUser,
      AppSection,
      RoleSectionPermission,
      SpecialPermission,
      RoleSpecialPermission,
    ]),
  ],
  controllers: [RolesController],
  providers: [PermissionService, PermissionsGuard],
  exports: [PermissionService, PermissionsGuard, TypeOrmModule],
})
export class IamModule {}
