import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().default(4000),
  DATABASE_URL: z.string().default('postgres://pc:pc@localhost:5433/pcbuilder'),
  REDIS_URL: z.string().default('redis://localhost:6380/0'),
  WEB_ORIGIN: z.string().default('http://localhost:3000'),
  /** Reverse proxies in front of the API: 1 behind Caddy, 2 behind CloudFront + ALB (rate limits key on req.ip). */
  TRUST_PROXY_HOPS: z.coerce.number().int().nonnegative().default(1),
  JWT_ACCESS_SECRET: z.string().min(8).default('dev-access-secret'),
  JWT_REFRESH_SECRET: z.string().min(8).default('dev-refresh-secret'),
  ASSEMBLY_FEE: z.coerce.number().int().nonnegative().default(200_000),
  ORDER_HOLD_MINUTES: z.coerce.number().int().positive().default(15),
  /** "disabled" (a SecureString cannot be empty) means no key: the chatbot runs rule-based. */
  GEMINI_API_KEY: z
    .string()
    .default('')
    .transform((key) => (key === 'disabled' ? '' : key)),
  GEMINI_MODEL: z.string().default('gemini-flash-latest'),
  GEMINI_TIMEOUT_MS: z.coerce.number().int().positive().default(20_000),
  VIETQR_BANK_BIN: z.string().default('970422'),
  VIETQR_ACCOUNT_NO: z.string().default('0000000000'),
  VIETQR_ACCOUNT_NAME: z.string().default('PC BUILDER STORE'),
  SEPAY_API_KEY: z.string().default('dev-sepay-key'),
});

export type Env = z.infer<typeof envSchema>;

const SECRET_KEYS = ['JWT_ACCESS_SECRET', 'JWT_REFRESH_SECRET', 'SEPAY_API_KEY'] as const;
const PLACEHOLDER_SECRET = /^(dev-|change-me)/;
const MIN_SECRET_LENGTH = 32;
const PLACEHOLDER_ACCOUNT_NO = '0000000000';

/**
 * Production refuses to start with a default or guessable secret: a known JWT secret lets anyone forge an admin
 * token, and the SePay key is the only thing that stops anyone from marking orders as paid.
 */
function assertProductionSafe(env: Env): void {
  for (const key of SECRET_KEYS) {
    const value = env[key];
    if (PLACEHOLDER_SECRET.test(value) || value.length < MIN_SECRET_LENGTH) {
      throw new Error(
        `${key} must be set in production to a random value of at least ${MIN_SECRET_LENGTH} characters ` +
          '(openssl rand -hex 32)',
      );
    }
  }
  if (env.VIETQR_ACCOUNT_NO === PLACEHOLDER_ACCOUNT_NO) {
    throw new Error('VIETQR_ACCOUNT_NO must be set in production to the bank account that receives payments');
  }
  if (!/^\d{6,19}$/.test(env.VIETQR_ACCOUNT_NO)) {
    throw new Error('VIETQR_ACCOUNT_NO must be 6-19 digits');
  }
}

export function loadEnv(source: NodeJS.ProcessEnv = process.env): Env {
  const env = envSchema.parse(source);
  if (env.NODE_ENV === 'production') assertProductionSafe(env);
  return env;
}

export const env = loadEnv();
