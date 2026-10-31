import {
  Global,
  Inject,
  Injectable,
  Logger,
  Module,
  type OnApplicationShutdown,
} from '@nestjs/common';
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
      useFactory: (config: AppConfigService) => {
        const logger = new Logger('Redis');
        const redis = new Redis(config.get('REDIS_URL', { infer: true }), {
          maxRetriesPerRequest: 3,
        });
        // Without a listener ioredis prints raw "Unhandled error event" lines;
        // log once per outage instead of on every reconnect attempt.
        let down = false;
        redis.on('error', (err) => {
          if (!down) logger.error(`Redis connection error: ${err.message}`);
          down = true;
        });
        redis.on('ready', () => {
          if (down) logger.log('Redis connection restored');
          down = false;
        });
        return redis;
      },
    },
    RedisShutdown,
  ],
  exports: [REDIS],
})
export class RedisModule {}
