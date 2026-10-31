import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Inject } from '@nestjs/common';
import type { Job } from 'bullmq';
import { QUEUES } from '../queue/queue.module.js';
import { SMS_PROVIDER, type SmsProvider } from './sms.provider.js';
import type { SmsJob } from './sms.service.js';

@Processor(QUEUES.SMS)
export class SmsProcessor extends WorkerHost {
  constructor(@Inject(SMS_PROVIDER) private readonly provider: SmsProvider) {
    super();
  }

  async process(job: Job<SmsJob>): Promise<void> {
    await this.provider.send({ to: job.data.to, text: job.data.text });
  }
}
