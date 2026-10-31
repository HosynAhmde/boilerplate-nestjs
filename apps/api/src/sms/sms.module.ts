import { Module } from '@nestjs/common';
import { ConsoleSmsProvider } from './console-sms.provider.js';
import { SmsProcessor } from './sms.processor.js';
import { SMS_PROVIDER } from './sms.provider.js';
import { SmsService } from './sms.service.js';

@Module({
  providers: [
    // Pick the provider from SMS_PROVIDER once a real panel is added.
    { provide: SMS_PROVIDER, useClass: ConsoleSmsProvider },
    SmsService,
    SmsProcessor,
  ],
  exports: [SmsService],
})
export class SmsModule {}
