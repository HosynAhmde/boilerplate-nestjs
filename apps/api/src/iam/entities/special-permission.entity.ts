import { Column, Entity, PrimaryColumn } from 'typeorm';

/** A sensitive operation with its own grant, e.g. INVOICE_VOID. */
@Entity('special_permission')
export class SpecialPermission {
  @PrimaryColumn({ type: 'text', primaryKeyConstraintName: 'pk_special_permission' })
  code: string;

  @Column({ type: 'text' })
  titleFa: string;
}
