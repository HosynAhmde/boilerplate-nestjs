import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import type { RoleSectionPermission } from './role-section-permission.entity.js';
import type { RoleSpecialPermission } from './role-special-permission.entity.js';

@Entity('role')
@Unique('uq_role_name', ['name'])
export class Role {
  // BIGINT comes back from pg as a string; keep ids as strings end to end.
  @PrimaryGeneratedColumn('identity', { type: 'bigint', generatedIdentity: 'ALWAYS' })
  id: string;

  @Column({ type: 'text' })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ type: 'boolean', default: false })
  isSystem: boolean;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @OneToMany('RoleSectionPermission', (p: RoleSectionPermission) => p.role)
  sectionPermissions?: RoleSectionPermission[];

  @OneToMany('RoleSpecialPermission', (p: RoleSpecialPermission) => p.role)
  specialPermissions?: RoleSpecialPermission[];
}
