import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import type { AppUser } from '../../iam/entities/app-user.entity.js';

/** A refresh-token session. Revoking it logs the device out immediately. */
@Entity('auth_session')
@Unique('uq_auth_session_refresh_token_hash', ['refreshTokenHash'])
@Index('idx_auth_session_user_id_active', ['userId'], { where: '"revoked_at" IS NULL' })
export class AuthSession {
  @PrimaryGeneratedColumn('identity', { type: 'bigint', generatedIdentity: 'ALWAYS' })
  id: string;

  @Column({ type: 'bigint' })
  userId: string;

  @ManyToOne('AppUser', { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'user_id', foreignKeyConstraintName: 'fk_auth_session_user' })
  user?: AppUser;

  @Column({ type: 'text' })
  refreshTokenHash: string;

  @Column({ type: 'timestamptz' })
  expiresAt: Date;

  @Column({ type: 'timestamptz', nullable: true })
  revokedAt: Date | null;

  @Column({ type: 'text', nullable: true })
  userAgent: string | null;

  @Column({ type: 'inet', nullable: true })
  ip: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;
}
