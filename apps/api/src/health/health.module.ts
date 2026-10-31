import { Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';
import { HealthController } from './health.controller.js';

@Module({
  imports: [TerminusModule.forRoot({ gracefulShutdownTimeoutMs: 1_000 })],
  controllers: [HealthController],
})
export class HealthModule {}
