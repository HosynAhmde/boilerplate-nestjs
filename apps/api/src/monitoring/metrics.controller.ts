import { Controller, Get, Header, Inject, Req, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiExcludeController } from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';
import type { Request } from 'express';
import { timingSafeEqual } from 'node:crypto';
import { Public } from '../common/decorators/public.decorator.js';
import type { AppConfigService } from '../config/config.module.js';
import { MetricsService } from './metrics.service.js';

@ApiExcludeController()
@Public()
@SkipThrottle()
@Controller('metrics')
export class MetricsController {
  private readonly token: string | undefined;

  constructor(
    private readonly metrics: MetricsService,
    @Inject(ConfigService) config: AppConfigService,
  ) {
    this.token = config.get('METRICS_TOKEN', { infer: true }) || undefined;
  }

  @Get()
  @Header('Cache-Control', 'no-store')
  async scrape(@Req() req: Request): Promise<string> {
    if (this.token) {
      const given = Buffer.from(req.headers.authorization ?? '');
      const expected = Buffer.from(`Bearer ${this.token}`);
      if (given.length !== expected.length || !timingSafeEqual(given, expected)) {
        throw new UnauthorizedException();
      }
    }
    req.res?.type(this.metrics.registry.contentType);
    return this.metrics.registry.metrics();
  }
}
