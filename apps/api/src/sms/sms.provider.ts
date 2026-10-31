export interface SmsMessage {
  to: string;
  text: string;
}

/** Implement this for a real SMS panel (Kavenegar, Melipayamak, ...). */
export interface SmsProvider {
  send(message: SmsMessage): Promise<void>;
}

export const SMS_PROVIDER = Symbol('SMS_PROVIDER');
