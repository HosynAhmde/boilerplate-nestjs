import { Check, Column, Entity, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm';
import type { AppSection } from './app-section.entity.js';
import type { Role } from './role.entity.js';

export const SECTION_ACTIONS = ['view', 'create', 'edit', 'delete', 'approve'] as const;
export type SectionAction = (typeof SECTION_ACTIONS)[number];

@Entity('role_section_permission')
@Check(
  'chk_role_section_permission_view',
  `"can_view" OR NOT ("can_create" OR "can_edit" OR "can_delete" OR "can_approve")`,
)
export class RoleSectionPermission {
  @PrimaryColumn({ type: 'bigint', primaryKeyConstraintName: 'pk_role_section_permission' })
  roleId: string;

  @PrimaryColumn({ type: 'text', primaryKeyConstraintName: 'pk_role_section_permission' })
  sectionCode: string;

  @ManyToOne('Role', (r: Role) => r.sectionPermissions, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'role_id', foreignKeyConstraintName: 'fk_role_section_permission_role' })
  role?: Role;

  @ManyToOne('AppSection', { onDelete: 'RESTRICT' })
  @JoinColumn({
    name: 'section_code',
    foreignKeyConstraintName: 'fk_role_section_permission_section',
  })
  section?: AppSection;

  @Column({ type: 'boolean', default: false })
  canView: boolean;

  @Column({ type: 'boolean', default: false })
  canCreate: boolean;

  @Column({ type: 'boolean', default: false })
  canEdit: boolean;

  /** Only affects master data; financial documents are never deleted. */
  @Column({ type: 'boolean', default: false })
  canDelete: boolean;

  @Column({ type: 'boolean', default: false })
  canApprove: boolean;
}
