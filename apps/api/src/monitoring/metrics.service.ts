import { InjectQueue } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import type { Queue } from 'bullmq';
import { collectDefaultMetrics, Counter, Gauge, Histogram, Registry } from 'prom-client';
import { QUEUES } from '../queue/queue.module.js';

const JOB_STATES = ['waiting', 'active', 'delayed', 'failed', 'completed'] as const;

/**
 * Prometheus metrics for the API. Scraped from GET /metrics (not under
 * /api/v1, so the public web proxy never exposes it).
 */
@Injectable()
export class MetricsService {
  readonly registry = new Registry();

  readonly httpDuration = new Histogram({
    name: 'http_request_duration_seconds',
    help: 'HTTP request duration in seconds',
    labelNames: ['method', 'route', 'status'] as const,
    buckets: [0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
    registers: [this.registry],
  });

  readonly jobsFailed = new Counter({
    name: 'queue_jobs_failed_total',
    help: 'Background jobs that failed an attempt',
    labelNames: ['queue', 'name'] as const,
    registers: [this.registry],
  });

  constructor(@InjectQueue(QUEUES.SMS) smsQueue: Queue) {
    this.registry.setDefaultLabels({ app: 'pasha-crm-api' });
    collectDefaultMetrics({ register: this.registry });

    const queues = [smsQueue];
    new Gauge({
      name: 'queue_jobs',
      help: 'Jobs per queue and state',
      labelNames: ['queue', 'state'] as const,
      registers: [this.registry],
      // Read from Redis at scrape time only.
      async collect() {
        this.reset();
        await Promise.all(
          queues.map(async (q) => {
            const counts = await q.getJobCounts(...JOB_STATES);
            for (const state of JOB_STATES) this.set({ queue: q.name, state }, counts[state] ?? 0);
          }),
        );
      },
    });
  }
}
