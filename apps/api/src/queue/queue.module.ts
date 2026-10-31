import { BullModule } from '@nestjs/bullmq';
import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { AppConfigService } from '../config/config.module.js';

export const QUEUES = {
  SMS: 'sms',
} as const;

@Global()
@Module({
  imports: [
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: AppConfigService) => {
        const url = new URL(config.get('REDIS_URL', { infer: true }));
        return {
          connection: {
            host: url.hostname,
            port: Number(url.port || 6379),
            username: url.username || undefined,
            password: url.password || undefined,
            db: url.pathname.length > 1 ? Number(url.pathname.slice(1)) : 0,
            tls: url.protocol === 'rediss:' ? {} : undefined,
          },
          defaultJobOptions: {
            attempts: 5,
            backoff: { type: 'exponential', delay: 5_000 },
            removeOnComplete: 1_000,
            removeOnFail: 5_000,
          },
        };
      },
    }),
    BullModule.registerQueue({ name: QUEUES.SMS }),
  ],
  exports: [BullModule],
})
export class QueueModule {}
