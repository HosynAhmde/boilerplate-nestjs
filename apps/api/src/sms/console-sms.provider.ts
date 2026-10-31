import { Inject, Injectable, Logger, type OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { AppConfigService } from '../config/config.module.js';
import type { SmsMessage, SmsProvider } from './sms.provider.js';

/** Development provider: writes the message to the log instead of sending it. */
@Injectable()
export class ConsoleSmsProvider implements SmsProvider, OnModuleInit {
  private readonly logger = new Logger('SMS');

  constructor(@Inject(ConfigService) private readonly config: AppConfigService) {}

  onModuleInit(): void {
    if (this.config.get('NODE_ENV', { infer: true }) === 'production') {
      this.logger.warn(
        'SMS_PROVIDER=console in production: no SMS is sent and login codes appear in the logs. Add a real SMS provider.',
      );
    }
  }

  async send({ to, text }: SmsMessage): Promise<void> {
    this.logger.log(`to=${to} text=${JSON.stringify(text)}`);
  }
}
