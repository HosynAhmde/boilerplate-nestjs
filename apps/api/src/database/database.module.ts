import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import type { AppConfigService } from '../config/config.module.js';
import { ConfigService } from '@nestjs/config';
import { buildDataSourceOptions } from './typeorm.options.js';
import { TransactionRunner } from './transaction-runner.js';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: AppConfigService) =>
        buildDataSourceOptions({
          DATABASE_URL: config.get('DATABASE_URL', { infer: true }),
          DB_LOGGING: config.get('DB_LOGGING', { infer: true }),
          NODE_ENV: config.get('NODE_ENV', { infer: true }),
        }),
    }),
  ],
  providers: [TransactionRunner],
  exports: [TransactionRunner],
})
export class DatabaseModule {}
