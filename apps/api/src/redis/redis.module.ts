import { Global, Inject, Injectable, Module, type OnApplicationShutdown } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Redis } from 'ioredis';
import type { AppConfigService } from '../config/config.module.js';

export const REDIS = Symbol('REDIS');

@Injectable()
class RedisShutdown implements OnApplicationShutdown {
  constructor(@Inject(REDIS) private readonly redis: Redis) {}
  async onApplicationShutdown(): Promise<void> {
    await this.redis.quit();
  }
}

/** One shared ioredis client for app code (BullMQ opens its own). */
@Global()
@Module({
  providers: [
    {
      provide: REDIS,
      inject: [ConfigService],
      useFactory: (config: AppConfigService) =>
        new Redis(config.get('REDIS_URL', { infer: true }), { maxRetriesPerRequest: 3 }),
    },
    RedisShutdown,
  ],
  exports: [REDIS],
})
export class RedisModule {}
