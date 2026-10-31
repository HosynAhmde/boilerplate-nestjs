import { Injectable, Logger } from '@nestjs/common';
import type { SmsMessage, SmsProvider } from './sms.provider.js';

/** Development provider: writes the message to the log instead of sending it. */
@Injectable()
export class ConsoleSmsProvider implements SmsProvider {
  private readonly logger = new Logger('SMS');

  async send({ to, text }: SmsMessage): Promise<void> {
    this.logger.log(`to=${to} text=${JSON.stringify(text)}`);
  }
}
