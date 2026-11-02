import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';
import { randomUUID } from 'node:crypto';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { LoggerModule } from 'nestjs-pino';
import { AuthModule } from './auth/auth.module.js';
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard.js';
import { AllExceptionsFilter } from './common/errors/all-exceptions.filter.js';
import { ConfigModule, type AppConfigService } from './config/config.module.js';
import { DatabaseModule } from './database/database.module.js';
import { HealthModule } from './health/health.module.js';
import { PermissionsGuard } from './iam/guards/permissions.guard.js';
import { IamModule } from './iam/iam.module.js';
import { MonitoringModule } from './monitoring/monitoring.module.js';
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
            // `||`: ConfigService falls back to the raw (possibly empty) process.env
            // value when the validated one is undefined.
            level:
              config.get('LOG_LEVEL', { infer: true }) ||
              (env === 'test' ? 'warn' : dev ? 'debug' : 'info'),
            // JSON lines in production (for Loki / docker logs), pretty in development.
            transport: dev ? { target: 'pino-pretty', options: { singleLine: true } } : undefined,
            base: { service: 'api' },
            // "level":"error" instead of "level":50, readable in Loki/Grafana
            formatters: dev ? undefined : { level: (label: string) => ({ level: label }) },
            // Reuse the caller's request id (e.g. from a proxy) or create one; it is
            // echoed in the x-request-id header and in every error response.
            genReqId: (req, res) => {
              const incoming = req.headers['x-request-id'];
              const id =
                typeof incoming === 'string' && /^[\w-]{8,64}$/.test(incoming)
                  ? incoming
                  : randomUUID();
              res.setHeader('x-request-id', id);
              return id;
            },
            customLogLevel: (_req, res, err) =>
              err || res.statusCode >= 500 ? 'error' : res.statusCode >= 400 ? 'warn' : 'info',
            // Which user made the request (set by the auth guard).
            // Client IP (behind the proxy) and, once authenticated, the user.
            customProps: (req) => {
              const r = req as { ip?: string; user?: { id: string } };
              return { ip: r.ip, ...(r.user && { userId: r.user.id }) };
            },
            // Headers are left out of request logs, so tokens and cookies never reach them.
            serializers: {
              req: (req: { id: unknown; method: string; url: string }) => ({
                id: req.id,
                method: req.method,
                url: req.url,
              }),
              res: (res: { statusCode: number }) => ({ statusCode: res.statusCode }),
            },
            redact: ['req.headers.authorization', 'req.headers.cookie'],
            autoLogging: {
              ignore: (req) =>
                (req.url?.startsWith('/api/v1/health') ?? false) || req.url === '/metrics',
            },
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
    MonitoringModule,
  ],
  providers: [
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
    // Order matters: rate limit, then authentication, then permissions.
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useExisting: JwtAuthGuard },
    { provide: APP_GUARD, useExisting: PermissionsGuard },
  ],
})
export class AppModule {}
