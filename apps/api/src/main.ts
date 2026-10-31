import 'reflect-metadata';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';
import { configureApp } from './bootstrap.js';
import type { AppConfigService } from './config/config.module.js';

const app = await NestFactory.create(AppModule, { bufferLogs: true });
configureApp(app);
const config = app.get<AppConfigService>(ConfigService);
await app.listen(config.get('API_PORT', { infer: true }), '0.0.0.0');
