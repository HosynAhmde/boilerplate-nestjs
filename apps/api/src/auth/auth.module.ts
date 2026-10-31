import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import type { AppConfigService } from '../config/config.module.js';
import { IamModule } from '../iam/iam.module.js';
import { SmsModule } from '../sms/sms.module.js';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';
import { JwtAuthGuard } from './guards/jwt-auth.guard.js';

@Module({
  imports: [
    IamModule,
    SmsModule,
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: AppConfigService) => ({
        secret: config.get('JWT_ACCESS_SECRET', { infer: true }),
        signOptions: { algorithm: 'HS256', issuer: 'pasha-crm' },
        verifyOptions: { algorithms: ['HS256'], issuer: 'pasha-crm' },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtAuthGuard],
  exports: [AuthService, JwtAuthGuard],
})
export class AuthModule {}
