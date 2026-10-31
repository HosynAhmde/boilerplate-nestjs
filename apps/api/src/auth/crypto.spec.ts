import { generateOtp, hmac, safeEqualHex } from './crypto.js';

describe('auth crypto', () => {
  it('generates numeric codes of the requested length', () => {
    for (let i = 0; i < 200; i++) expect(generateOtp(5)).toMatch(/^\d{5}$/);
  });

  it('compares hashes and rejects mismatches', () => {
    const a = hmac('pepper', 'x');
    expect(safeEqualHex(a, hmac('pepper', 'x'))).toBe(true);
    expect(safeEqualHex(a, hmac('pepper', 'y'))).toBe(false);
    expect(safeEqualHex(a, 'abcd')).toBe(false);
  });
});
