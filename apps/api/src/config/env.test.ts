import { describe, expect, it } from 'vitest';
import { loadEnv } from './env';

const prodSecrets = {
  NODE_ENV: 'production',
  JWT_ACCESS_SECRET: 'prod-access-secret-xyz',
  JWT_REFRESH_SECRET: 'prod-refresh-secret-xyz',
};

describe('loadEnv fails closed in production', () => {
  it('refuses the default SePay webhook key', () => {
    expect(() => loadEnv({ ...prodSecrets })).toThrow(/SEPAY_API_KEY/);
    expect(() => loadEnv({ ...prodSecrets, SEPAY_API_KEY: 'dev-sepay-key' })).toThrow(/SEPAY_API_KEY/);
  });

  it('accepts a real key, and keeps the dev default outside production', () => {
    expect(loadEnv({ ...prodSecrets, SEPAY_API_KEY: 'sk_live_3f9a' }).SEPAY_API_KEY).toBe('sk_live_3f9a');
    expect(loadEnv({ NODE_ENV: 'development' }).SEPAY_API_KEY).toBe('dev-sepay-key');
  });
});
