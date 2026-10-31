import { InjectQueue } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import type { Queue } from 'bullmq';
import { QUEUES } from '../queue/queue.module.js';
import type { SmsMessage } from './sms.provider.js';

export interface SmsJob extends SmsMessage {
  /** e.g. OTP, ORDER_LOCKED; used later for sms_message logging. */
  eventCode: string;
}

@Injectable()
export class SmsService {
  constructor(@InjectQueue(QUEUES.SMS) private readonly queue: Queue<SmsJob>) {}

  async enqueue(job: SmsJob): Promise<void> {
    await this.queue.add(job.eventCode, job, job.eventCode === 'OTP' ? { attempts: 2 } : {});
  }
}
