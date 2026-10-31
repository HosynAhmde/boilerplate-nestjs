import { OnWorkerEvent, Processor, WorkerHost } from '@nestjs/bullmq';
import { Inject, Logger } from '@nestjs/common';
import type { Job } from 'bullmq';
import { MetricsService } from '../monitoring/metrics.service.js';
import { QUEUES } from '../queue/queue.module.js';
import { SMS_PROVIDER, type SmsProvider } from './sms.provider.js';
import type { SmsJob } from './sms.service.js';

@Processor(QUEUES.SMS)
export class SmsProcessor extends WorkerHost {
  private readonly logger = new Logger(SmsProcessor.name);

  constructor(
    @Inject(SMS_PROVIDER) private readonly provider: SmsProvider,
    private readonly metrics: MetricsService,
  ) {
    super();
  }

  async process(job: Job<SmsJob>): Promise<void> {
    await this.provider.send({ to: job.data.to, text: job.data.text });
  }

  /** Every failed attempt is logged and counted; the last one is an error. */
  @OnWorkerEvent('failed')
  onFailed(job: Job<SmsJob> | undefined, err: Error): void {
    this.metrics.jobsFailed.inc({ queue: QUEUES.SMS, name: job?.name ?? 'unknown' });
    const attempts = job?.opts.attempts ?? 1;
    const final = !job || job.attemptsMade >= attempts;
    // Never log the message text: OTP codes are in it.
    const msg = `SMS job ${job?.id ?? '?'} (${job?.name ?? '?'}) failed attempt ${job?.attemptsMade ?? '?'}/${attempts}: ${err.message}`;
    if (final) this.logger.error(msg);
    else this.logger.warn(msg);
  }

  @OnWorkerEvent('error')
  onError(err: Error): void {
    this.logger.error(`SMS worker error: ${err.message}`);
  }
}
