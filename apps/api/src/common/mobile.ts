const PERSIAN_DIGITS = '۰۱۲۳۴۵۶۷۸۹';
const ARABIC_DIGITS = '٠١٢٣٤٥٦٧٨٩';

/** Converts Persian/Arabic digits to ASCII. */
export function toAsciiDigits(value: string): string {
  return value.replace(/[۰-۹٠-٩]/g, (d) => {
    const p = PERSIAN_DIGITS.indexOf(d);
    return String(p >= 0 ? p : ARABIC_DIGITS.indexOf(d));
  });
}

/**
 * Normalizes an Iranian mobile number to `09xxxxxxxxx`.
 * Accepts +98, 0098, 98 and 9xxxxxxxxx forms and Persian digits.
 * Returns null when the input is not a valid mobile.
 */
export function normalizeMobile(input: string): string | null {
  let v = toAsciiDigits(input).replace(/[\s\-()]/g, '');
  if (v.startsWith('+98')) v = '0' + v.slice(3);
  else if (v.startsWith('0098')) v = '0' + v.slice(4);
  else if (v.startsWith('98') && v.length === 12) v = '0' + v.slice(2);
  else if (v.startsWith('9') && v.length === 10) v = '0' + v;
  return /^09\d{9}$/.test(v) ? v : null;
}
