import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { LoggerModule } from 'nestjs-pino';
import { AuthModule } from './auth/auth.module.js';
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard.js';
import { ConfigModule, type AppConfigService } from './config/config.module.js';
import { DatabaseModule } from './database/database.module.js';
import { HealthModule } from './health/health.module.js';
import { PermissionsGuard } from './iam/guards/permissions.guard.js';
import { IamModule } from './iam/iam.module.js';
import { QueueModule } from './queue/queue.module.js';
import { RedisModule } from './redis/redis.module.js';
import { StorageModule } from './storage/storage.module.js';

@Module({
  imports: [
    ConfigModule,
    LoggerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: AppConfigService) => {
        const env = config.get('NODE_ENV', { infer: true });
        const dev = env === 'development';
        return {
          pinoHttp: {
            level: env === 'test' ? 'warn' : dev ? 'debug' : 'info',
            transport: dev ? { target: 'pino-pretty', options: { singleLine: true } } : undefined,
            redact: [
              'req.headers.authorization',
              'req.headers.cookie',
              'res.headers["set-cookie"]',
            ],
            autoLogging: { ignore: (req) => req.url?.startsWith('/api/v1/health') ?? false },
          },
        };
      },
    }),
    // In-memory rate limits are fine for a single API instance.
    ThrottlerModule.forRoot([{ name: 'default', ttl: 60_000, limit: 120 }]),
    DatabaseModule,
    RedisModule,
    QueueModule,
    StorageModule,
    IamModule,
    AuthModule,
    HealthModule,
  ],
  providers: [
    // Order matters: rate limit, then authentication, then permissions.
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useExisting: JwtAuthGuard },
    { provide: APP_GUARD, useExisting: PermissionsGuard },
  ],
})
export class AppModule {}
