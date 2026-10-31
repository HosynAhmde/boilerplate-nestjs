import { format } from 'date-fns-jalali';
import { faIR } from 'date-fns-jalali/locale/fa-IR';

const PERSIAN = '۰۱۲۳۴۵۶۷۸۹';

/** All dates are stored as UTC timestamptz; Shamsi exists only in the UI. */
export function formatJalali(date: Date | string, pattern = 'd MMMM yyyy'): string {
  return toPersianDigits(
    format(typeof date === 'string' ? new Date(date) : date, pattern, { locale: faIR }),
  );
}

export function formatJalaliDateTime(date: Date | string): string {
  return formatJalali(date, 'yyyy/MM/dd HH:mm');
}

export function toPersianDigits(value: string | number): string {
  return String(value).replace(/\d/g, (d) => PERSIAN[Number(d)]!);
}

/** Toman amounts arrive as strings (BIGINT); format without losing precision. */
export function formatToman(amount: string | number | bigint): string {
  return `${toPersianDigits(BigInt(amount).toLocaleString('en-US').replace(/,/g, '٬'))} تومان`;
}

/** Weights are stored in milligrams (BIGINT); show grams with 3 decimals. */
export function formatGrams(mg: string | number | bigint): string {
  const v = BigInt(mg);
  const sign = v < 0n ? '-' : '';
  const abs = v < 0n ? -v : v;
  const grams = `${abs / 1000n}.${(abs % 1000n).toString().padStart(3, '0')}`;
  return `${toPersianDigits(sign + grams)} گرم`;
}
