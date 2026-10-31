import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, Matches, MaxLength } from 'class-validator';

export class RequestOtpDto {
  @ApiProperty({ example: '09121234567' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  mobile: string;
}

export class VerifyOtpDto extends RequestOtpDto {
  @ApiProperty({ example: '12345' })
  @IsString()
  @Matches(/^[0-9۰-۹]{4,8}$/)
  code: string;
}

export interface RequestOtpResponse {
  expiresInSeconds: number;
  resendInSeconds: number;
}

export interface TokenResponse {
  accessToken: string;
  expiresInSeconds: number;
}
