import { Column, Entity, PrimaryColumn } from 'typeorm';

/** A screen/area of the app in the role permission matrix, e.g. ORDERS. */
@Entity('app_section')
export class AppSection {
  @PrimaryColumn({ type: 'text', primaryKeyConstraintName: 'pk_app_section' })
  code: string;

  @Column({ type: 'text' })
  titleFa: string;

  @Column({ type: 'int', default: 0 })
  sortOrder: number;
}
