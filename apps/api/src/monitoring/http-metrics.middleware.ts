import { Injectable, type NestMiddleware } from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';
import { MetricsService } from './metrics.service.js';

/** Times every request. The route label is the route pattern, never the raw URL. */
@Injectable()
export class HttpMetricsMiddleware implements NestMiddleware {
  constructor(private readonly metrics: MetricsService) {}

  use(req: Request, res: Response, next: NextFunction): void {
    const end = this.metrics.httpDuration.startTimer();
    res.on('finish', () => {
      const route = (req.route as { path?: string } | undefined)?.path;
      if (route === '/metrics') return;
      end({
        method: req.method,
        // unmatched URLs share one label so scanners cannot blow up cardinality
        route: route && route !== '*path' ? route : 'unmatched',
        status: String(res.statusCode),
      });
    });
    next();
  }
}
