import { Entity, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm';
import type { Role } from './role.entity.js';
import type { SpecialPermission } from './special-permission.entity.js';

@Entity('role_special_permission')
export class RoleSpecialPermission {
  @PrimaryColumn({ type: 'bigint', primaryKeyConstraintName: 'pk_role_special_permission' })
  roleId: string;

  @PrimaryColumn({ type: 'text', primaryKeyConstraintName: 'pk_role_special_permission' })
  permissionCode: string;

  @ManyToOne('Role', (r: Role) => r.specialPermissions, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'role_id', foreignKeyConstraintName: 'fk_role_special_permission_role' })
  role?: Role;

  @ManyToOne('SpecialPermission', { onDelete: 'RESTRICT' })
  @JoinColumn({
    name: 'permission_code',
    foreignKeyConstraintName: 'fk_role_special_permission_permission',
  })
  permission?: SpecialPermission;
}
