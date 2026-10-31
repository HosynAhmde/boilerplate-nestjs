/** Keep in sync with apps/api/src/common/mobile.ts */
export function toAsciiDigits(value: string): string {
  return value
    .replace(/[۰-۹]/g, (d) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d)))
    .replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)));
}

export function normalizeMobile(input: string): string | null {
  let v = toAsciiDigits(input).replace(/[\s\-()]/g, '');
  if (v.startsWith('+98')) v = '0' + v.slice(3);
  else if (v.startsWith('0098')) v = '0' + v.slice(4);
  else if (v.startsWith('98') && v.length === 12) v = '0' + v.slice(2);
  else if (v.startsWith('9') && v.length === 10) v = '0' + v;
  return /^09\d{9}$/.test(v) ? v : null;
}
