import { type INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { Logger } from 'nestjs-pino';
import type { AppConfigService } from './config/config.module.js';

/** Shared by main.ts and e2e tests so both run the same pipeline. */
export function configureApp(app: INestApplication): void {
  const config = app.get<AppConfigService>(ConfigService);
  const express = app as NestExpressApplication;

  app.useLogger(app.get(Logger));
  // behind nginx/the Next.js proxy: trust one hop for the client IP
  express.set('trust proxy', 1);
  app.use(helmet());
  app.use(cookieParser());
  app.enableCors({ origin: config.get('CORS_ORIGINS', { infer: true }), credentials: true });
  // /metrics stays outside the prefix: the web proxy only forwards /api/*, so
  // Prometheus can scrape it on the internal network but the internet cannot.
  app.setGlobalPrefix('api/v1', { exclude: ['metrics'] });
  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
  );
  app.enableShutdownHooks();

  if (config.get('NODE_ENV', { infer: true }) !== 'production') {
    const doc = new DocumentBuilder()
      .setTitle('Pasha CRM API')
      .setVersion('0.1.0')
      .addBearerAuth()
      .build();
    SwaggerModule.setup('api/docs', app, SwaggerModule.createDocument(app, doc));
  }
}
