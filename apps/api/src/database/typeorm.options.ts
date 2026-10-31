import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { DataSourceOptions } from 'typeorm';
import type { Env } from '../config/env.js';
import { entities } from './entities.js';
import { SnakeNamingStrategy } from './snake-naming.strategy.js';

const here = dirname(fileURLToPath(import.meta.url));

export function buildDataSourceOptions(
  env: Pick<Env, 'DATABASE_URL' | 'DB_LOGGING' | 'NODE_ENV'>,
): DataSourceOptions {
  return {
    type: 'postgres',
    url: env.DATABASE_URL,
    applicationName: 'pasha-crm-api',
    entities,
    // compiled migrations; the CLI and the app both run from dist/
    migrations: [join(here, 'migrations', '*.js')],
    migrationsTableName: 'typeorm_migration',
    migrationsTransactionMode: 'each',
    namingStrategy: new SnakeNamingStrategy(),
    // The schema is owned by migrations only. Never let TypeORM alter it.
    synchronize: false,
    migrationsRun: false,
    logging: env.DB_LOGGING ? ['query', 'error'] : ['error'],
    extra: {
      max: 10,
      // all timestamps are timestamptz; keep the session in UTC so nothing
      // depends on the server's local zone. Shamsi dates are built in the app.
      options: '-c timezone=UTC',
    },
  };
}
