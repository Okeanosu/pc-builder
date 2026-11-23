import { describe, expect, it } from 'vitest';
import { loadEnv } from './env';

const hex = (c: string) => c.repeat(64);
const prod = {
  NODE_ENV: 'production',
  JWT_ACCESS_SECRET: hex('a'),
  JWT_REFRESH_SECRET: hex('b'),
  SEPAY_API_KEY: hex('c'),
  VIETQR_ACCOUNT_NO: '1012345678',
};

describe('loadEnv fails closed in production', () => {
  it('accepts a complete production configuration', () => {
    const env = loadEnv({ ...prod });
    expect(env.SEPAY_API_KEY).toBe(hex('c'));
    expect(env.VIETQR_ACCOUNT_NO).toBe('1012345678');
  });

  for (const key of ['JWT_ACCESS_SECRET', 'JWT_REFRESH_SECRET', 'SEPAY_API_KEY'] as const) {
    it(`refuses a missing, placeholder or short ${key}`, () => {
      const { [key]: _omit, ...without } = prod;
      expect(() => loadEnv(without)).toThrow(key);
      for (const weak of [`dev-${hex('x')}`, `change-me-${hex('x')}`, 'change-me', 'x'.repeat(31)]) {
        expect(() => loadEnv({ ...prod, [key]: weak })).toThrow(key);
      }
      expect(() => loadEnv({ ...prod, [key]: 'x'.repeat(32) })).not.toThrow();
    });
  }

  it('refuses the placeholder VietQR account number', () => {
    const { VIETQR_ACCOUNT_NO: _omit, ...without } = prod;
    expect(() => loadEnv(without)).toThrow(/VIETQR_ACCOUNT_NO/);
    expect(() => loadEnv({ ...prod, VIETQR_ACCOUNT_NO: '0000000000' })).toThrow(/VIETQR_ACCOUNT_NO/);
  });

  it('rejects a malformed VIETQR_ACCOUNT_NO in production', () => {
    for (const bad of ['12345', '1234567890123456789012', '10123abc78', '1012 345 678']) {
      expect(() => loadEnv({ ...prod, VIETQR_ACCOUNT_NO: bad })).toThrow(/VIETQR_ACCOUNT_NO/);
    }
    expect(loadEnv({ ...prod, VIETQR_ACCOUNT_NO: '123456' }).VIETQR_ACCOUNT_NO).toBe('123456');
  });

  it('keeps the dev defaults outside production', () => {
    const env = loadEnv({ NODE_ENV: 'development' });
    expect(env.SEPAY_API_KEY).toBe('dev-sepay-key');
    expect(env.VIETQR_ACCOUNT_NO).toBe('0000000000');
    expect(loadEnv({ NODE_ENV: 'test' }).JWT_REFRESH_SECRET).toBe('dev-refresh-secret');
  });
});

describe('deployment settings', () => {
  it('trusts one proxy hop by default and reads TRUST_PROXY_HOPS (CloudFront + ALB = 2)', () => {
    expect(loadEnv({ NODE_ENV: 'test' }).TRUST_PROXY_HOPS).toBe(1);
    expect(loadEnv({ NODE_ENV: 'test', TRUST_PROXY_HOPS: '2' }).TRUST_PROXY_HOPS).toBe(2);
    expect(() => loadEnv({ NODE_ENV: 'test', TRUST_PROXY_HOPS: '-1' })).toThrow();
  });

  it('treats GEMINI_API_KEY=disabled as no key, so the chatbot runs rule-based', () => {
    expect(loadEnv({ NODE_ENV: 'test', GEMINI_API_KEY: 'disabled' }).GEMINI_API_KEY).toBe('');
    expect(loadEnv({ NODE_ENV: 'test', GEMINI_API_KEY: 'AIza-key' }).GEMINI_API_KEY).toBe('AIza-key');
  });
});
