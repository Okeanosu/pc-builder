import { describe, expect, it } from 'vitest';
import { clockOffset, MAX_RECEIPT_AGE_MS, receiptTime, SKEW_THRESHOLD_MS } from './clock';
import { formatCountdown, remainingMs } from './countdown';

const SERVER = Date.parse('2026-11-07T10:00:00.000Z');

describe('clockOffset', () => {
  it('is positive when the device clock is behind the server', () => {
    expect(clockOffset(SERVER, SERVER - 5 * 60_000)).toBe(5 * 60_000);
  });

  it('is negative when the device clock is ahead of the server', () => {
    expect(clockOffset(SERVER, SERVER + 2 * 3_600_000)).toBe(-2 * 3_600_000);
  });

  it('accepts ISO strings and HTTP Date headers (second precision)', () => {
    expect(clockOffset('2026-11-07T10:00:00.000Z', SERVER - 60_000)).toBe(60_000);
    expect(clockOffset('Sat, 07 Nov 2026 10:00:00 GMT', SERVER - 60_000)).toBe(60_000);
  });

  it('ignores delays under the threshold', () => {
    expect(clockOffset(SERVER, SERVER + SKEW_THRESHOLD_MS - 1)).toBe(0);
    expect(clockOffset(SERVER, SERVER - (SKEW_THRESHOLD_MS - 1))).toBe(0);
    expect(clockOffset(SERVER, SERVER - SKEW_THRESHOLD_MS)).toBe(SKEW_THRESHOLD_MS);
  });

  it('returns 0 when the server time is missing or unreadable', () => {
    expect(clockOffset(null, SERVER)).toBe(0);
    expect(clockOffset(undefined, SERVER)).toBe(0);
    expect(clockOffset('', SERVER)).toBe(0);
    expect(clockOffset('not a date', SERVER)).toBe(0);
    expect(clockOffset(Number.NaN, SERVER)).toBe(0);
  });

  it('keeps the countdown on server time despite a skewed device clock', () => {
    const expiresAt = '2026-11-07T10:15:00.000Z';
    const deviceAhead = SERVER + 10 * 60_000;
    const offset = clockOffset(SERVER, deviceAhead);
    expect(remainingMs(expiresAt, deviceAhead)).toBe(5 * 60_000);
    expect(formatCountdown(remainingMs(expiresAt, deviceAhead + offset) ?? 0)).toBe('15:00');
  });
});

describe('receiptTime', () => {
  const href = 'http://localhost:3101/orders/PCB123/pay';

  it('uses the first byte of a hard load of this page, measured on the device clock', () => {
    // First byte at perf 420 ms, now at perf 1 620 ms: the timestamp arrived 1.2 s ago.
    expect(receiptTime({ name: href, responseStart: 420 }, href, 5_000_000, 1_620)).toBe(5_000_000 - 1_200);
  });

  it('falls back to now after a client-side navigation or without timing data', () => {
    const other = { name: 'http://localhost:3101/checkout', responseStart: 420 };
    expect(receiptTime(other, href, 5_000_000, 1_620)).toBe(5_000_000);
    expect(receiptTime({ name: href, responseStart: 0 }, href, 5_000_000, 1_620)).toBe(5_000_000);
    expect(receiptTime(undefined, href, 5_000_000, 1_620)).toBe(5_000_000);
  });

  it('ignores a timing entry from an earlier visit to the same URL', () => {
    const perfNow = 420 + MAX_RECEIPT_AGE_MS + 1;
    expect(receiptTime({ name: href, responseStart: 420 }, href, 5_000_000, perfNow)).toBe(5_000_000);
  });
});
