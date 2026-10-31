import { Controller, Get, Inject } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import {
  HealthCheck,
  HealthCheckService,
  HealthIndicatorService,
  TypeOrmHealthIndicator,
} from '@nestjs/terminus';
import { SkipThrottle } from '@nestjs/throttler';
import type { Redis } from 'ioredis';
import { Public } from '../common/decorators/public.decorator.js';
import { REDIS } from '../redis/redis.module.js';
import { STORAGE_DRIVER, type StorageDriver } from '../storage/storage.driver.js';

@ApiTags('health')
@Public()
@SkipThrottle()
@Controller('health')
export class HealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly db: TypeOrmHealthIndicator,
    private readonly indicators: HealthIndicatorService,
    @Inject(REDIS) private readonly redis: Redis,
    @Inject(STORAGE_DRIVER) private readonly storage: StorageDriver,
  ) {}

  /** Liveness: the process is up. No dependencies are touched. */
  @Get('live')
  live() {
    return { status: 'ok' };
  }

  /** Readiness: database, Redis and file storage are reachable. */
  @Get()
  @HealthCheck()
  check() {
    return this.health.check([
      () => this.db.pingCheck('database', { timeout: 2_000 }),
      () => this.probe('redis', async () => void (await this.redis.ping())),
      () => this.probe('storage', () => this.storage.ping()),
    ]);
  }

  private async probe<K extends string>(key: K, fn: () => Promise<void>) {
    const session = this.indicators.check(key);
    try {
      await fn();
      return session.up();
    } catch (err) {
      return session.down({ message: (err as Error).message });
    }
  }
}
