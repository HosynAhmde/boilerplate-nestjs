import { Injectable } from '@nestjs/common';
import { DataSource, type EntityManager } from 'typeorm';

export interface TransactionOptions {
  /** Acting user; written to `app.user_id` so the audit trigger can record it. */
  userId?: string | null;
}

/**
 * Runs work inside one database transaction (READ COMMITTED) and sets
 * `app.user_id` for that transaction only. Ledger posting and every other
 * multi-row write should go through here.
 */
@Injectable()
export class TransactionRunner {
  constructor(private readonly dataSource: DataSource) {}

  run<T>(
    work: (manager: EntityManager) => Promise<T>,
    options: TransactionOptions = {},
  ): Promise<T> {
    return this.dataSource.transaction('READ COMMITTED', async (manager) => {
      if (options.userId) {
        await manager.query(`SELECT set_config('app.user_id', $1, true)`, [options.userId]);
      }
      return work(manager);
    });
  }
}
