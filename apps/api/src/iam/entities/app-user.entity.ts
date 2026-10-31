import {
  Check,
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import type { Role } from './role.entity.js';

@Entity('app_user')
@Unique('uq_app_user_mobile', ['mobile'])
@Check('chk_app_user_mobile', `"mobile" ~ '^09[0-9]{9}$'`)
@Check('chk_app_user_failed_otp_count', `"failed_otp_count" >= 0`)
export class AppUser {
  @PrimaryGeneratedColumn('identity', { type: 'bigint', generatedIdentity: 'ALWAYS' })
  id: string;

  @Column({ type: 'text' })
  fullName: string;

  /** Normalized Iranian mobile: 09xxxxxxxxx */
  @Column({ type: 'text' })
  mobile: string;

  @Index('idx_app_user_role_id')
  @Column({ type: 'bigint' })
  roleId: string;

  @ManyToOne('Role', { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'role_id', foreignKeyConstraintName: 'fk_app_user_role' })
  role?: Role;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @Column({ type: 'int', default: 0 })
  failedOtpCount: number;

  @Column({ type: 'timestamptz', nullable: true })
  lockedUntil: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  lastLoginAt: Date | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @Column({ type: 'bigint', nullable: true })
  createdBy: string | null;

  @ManyToOne('AppUser', { onDelete: 'RESTRICT', nullable: true })
  @JoinColumn({ name: 'created_by', foreignKeyConstraintName: 'fk_app_user_created_by' })
  creator?: AppUser | null;
}
