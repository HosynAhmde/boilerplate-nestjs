import { Global, Module } from '@nestjs/common';
import { ConfigModule as NestConfigModule, ConfigService } from '@nestjs/config';
import { validateEnv, type Env } from './env.js';

export type AppConfigService = ConfigService<Env, true>;

@Global()
@Module({
  imports: [
    NestConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      // apps/api is the working directory in dev; the .env lives at the repo root
      envFilePath: ['.env', '../../.env'],
      validate: validateEnv,
    }),
  ],
})
export class ConfigModule {}
