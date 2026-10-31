import 'reflect-metadata';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { Logger } from 'nestjs-pino';
import { AppModule } from './app.module.js';
import { configureApp } from './bootstrap.js';
import type { AppConfigService } from './config/config.module.js';

const app = await NestFactory.create(AppModule, { bufferLogs: true });
configureApp(app);
const logger = app.get(Logger);

// Last line of defence: log anything that escaped a try/catch. An uncaught
// exception leaves the process in an unknown state, so exit and let Docker
// restart it; a stray rejected promise is logged and the API keeps serving.
process.on('unhandledRejection', (reason) => {
  logger.error({ err: reason }, 'Unhandled promise rejection');
});
process.on('uncaughtException', (err) => {
  logger.fatal({ err }, 'Uncaught exception, shutting down');
  void app.close().finally(() => process.exit(1));
  setTimeout(() => process.exit(1), 5_000).unref();
});

const config = app.get<AppConfigService>(ConfigService);
await app.listen(config.get('API_PORT', { infer: true }), '0.0.0.0');
