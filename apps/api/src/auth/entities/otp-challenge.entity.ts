import { Check, Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

/**
 * One-time login codes. Not financial data, so old rows may be purged.
 * `mobile` deliberately has no FK to app_user so responses never reveal
 * whether a user exists.
 */
@Entity('otp_challenge')
@Index('idx_otp_challenge_mobile_created_at', ['mobile', 'createdAt'])
@Check('chk_otp_challenge_attempt_count', `"attempt_count" BETWEEN 0 AND 5`)
export class OtpChallenge {
  @PrimaryGeneratedColumn('identity', { type: 'bigint', generatedIdentity: 'ALWAYS' })
  id: string;

  @Column({ type: 'text' })
  mobile: string;

  /** HMAC-SHA256 of the code, never the code itself. */
  @Column({ type: 'text' })
  codeHash: string;

  @Column({ type: 'timestamptz' })
  expiresAt: Date;

  @Column({ type: 'int', default: 0 })
  attemptCount: number;

  @Column({ type: 'timestamptz', nullable: true })
  consumedAt: Date | null;

  @Column({ type: 'inet', nullable: true })
  requestedIp: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;
}
