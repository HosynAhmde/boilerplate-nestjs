import { createHmac, randomBytes, randomInt, timingSafeEqual } from 'node:crypto';

export function hmac(pepper: string, value: string): string {
  return createHmac('sha256', pepper).update(value).digest('hex');
}

export function safeEqualHex(a: string, b: string): boolean {
  const ab = Buffer.from(a, 'hex');
  const bb = Buffer.from(b, 'hex');
  return ab.length === bb.length && timingSafeEqual(ab, bb);
}

/** Numeric code with `length` digits; leading zeros allowed. */
export function generateOtp(length: number): string {
  return randomInt(0, 10 ** length)
    .toString()
    .padStart(length, '0');
}

export function generateRefreshToken(): string {
  return randomBytes(32).toString('base64url');
}
