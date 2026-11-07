import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().default(4000),
  DATABASE_URL: z.string().default('postgres://pc:pc@localhost:5433/pcbuilder'),
  REDIS_URL: z.string().default('redis://localhost:6380/0'),
  WEB_ORIGIN: z.string().default('http://localhost:3000'),
  JWT_ACCESS_SECRET: z.string().min(8).default('dev-access-secret'),
  JWT_REFRESH_SECRET: z.string().min(8).default('dev-refresh-secret'),
  ASSEMBLY_FEE: z.coerce.number().int().nonnegative().default(200_000),
  ORDER_HOLD_MINUTES: z.coerce.number().int().positive().default(15),
  GEMINI_API_KEY: z.string().default(''),
  GEMINI_MODEL: z.string().default('gemini-flash-latest'),
  GEMINI_TIMEOUT_MS: z.coerce.number().int().positive().default(20_000),
  VIETQR_BANK_BIN: z.string().default('970422'),
  VIETQR_ACCOUNT_NO: z.string().default('0000000000'),
  VIETQR_ACCOUNT_NAME: z.string().default('PC BUILDER STORE'),
  SEPAY_API_KEY: z.string().default('dev-sepay-key'),
});

export type Env = z.infer<typeof envSchema>;

export function loadEnv(source: NodeJS.ProcessEnv = process.env): Env {
  const env = envSchema.parse(source);
  if (env.NODE_ENV === 'production' && env.JWT_ACCESS_SECRET.startsWith('dev-')) {
    throw new Error('JWT secrets must be set in production');
  }
  // The webhook key is the only thing that stops anyone from marking orders as paid.
  if (env.NODE_ENV === 'production' && env.SEPAY_API_KEY === 'dev-sepay-key') {
    throw new Error('SEPAY_API_KEY must be set in production');
  }
  return env;
}

export const env = loadEnv();
