import { normalizeMobile } from './mobile.js';

describe('normalizeMobile', () => {
  it.each([
    ['09121234567', '09121234567'],
    ['+989121234567', '09121234567'],
    ['00989121234567', '09121234567'],
    ['989121234567', '09121234567'],
    ['9121234567', '09121234567'],
    ['۰۹۱۲ ۱۲۳ ۴۵۶۷', '09121234567'],
  ])('%s -> %s', (input, expected) => {
    expect(normalizeMobile(input)).toBe(expected);
  });

  it.each(['', '0912123456', '08121234567', 'abc', '091212345678'])('rejects %s', (input) => {
    expect(normalizeMobile(input)).toBeNull();
  });
});
