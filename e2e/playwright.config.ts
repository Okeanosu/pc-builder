import { defineConfig, devices } from '@playwright/test';
import { API_PORT, API_URL, DATABASE_URL, REDIS_URL, WEB_PORT, WEB_URL } from './env';

/**
 * E2E against the real stack: the API (fallback AI mode, NODE_ENV=development so the payment simulator is
 * on) on a freshly reseeded `pcbuilder_e2e` + Redis db 7, and a production build of the web app.
 * Set E2E_WEB_DEV=1 to use `next dev` instead of build + start, E2E_REUSE=1 to reuse running servers.
 */
const webDev = process.env.E2E_WEB_DEV === '1';
const webCommand = webDev
  ? `pnpm --filter @pc/web exec next dev -p ${WEB_PORT}`
  : `pnpm --filter @pc/web build && pnpm --filter @pc/web exec next start -p ${WEB_PORT}`;

const mobile390 = {
  ...devices['Pixel 7'],
  viewport: { width: 390, height: 844 },
  screen: { width: 390, height: 844 },
};

export default defineConfig({
  testDir: '.',
  outputDir: './test-results',
  fullyParallel: false,
  // The specs share one database and the admin spec changes global purpose weights: run them in series.
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  forbidOnly: Boolean(process.env.CI),
  timeout: 90_000,
  expect: { timeout: 15_000 },
  reporter: [
    ['list'],
    ['json', { outputFile: './test-results/results.json' }],
    ['html', { outputFolder: './playwright-report', open: 'never' }],
  ],
  use: {
    baseURL: WEB_URL,
    locale: 'vi-VN',
    timezoneId: 'Asia/Ho_Chi_Minh',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    actionTimeout: 15_000,
    navigationTimeout: 45_000,
  },
  projects: [
    { name: 'setup', testMatch: /auth\.setup\.ts/, use: { ...devices['Desktop Chrome'] } },
    {
      name: 'desktop-1440',
      testMatch: /.*\.spec\.ts/,
      dependencies: ['setup'],
      use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } },
    },
    {
      name: 'mobile-390',
      testMatch: /.*\.spec\.ts/,
      dependencies: ['setup'],
      use: { ...mobile390, browserName: 'chromium' },
    },
  ],
  webServer: [
    {
      command: 'pnpm --filter @pc/api exec tsx ../../e2e/scripts/start-api.mts',
      url: `${API_URL}/health`,
      timeout: 120_000,
      reuseExistingServer: process.env.E2E_REUSE === '1',
      stdout: 'ignore',
      stderr: 'pipe',
      env: {
        PORT: String(API_PORT),
        NODE_ENV: 'development',
        DATABASE_URL,
        REDIS_URL,
        WEB_ORIGIN: WEB_URL,
        GEMINI_API_KEY: '',
        JWT_ACCESS_SECRET: 'e2e-access-secret',
        JWT_REFRESH_SECRET: 'e2e-refresh-secret',
      },
    },
    {
      command: webCommand,
      url: WEB_URL,
      timeout: 300_000,
      reuseExistingServer: process.env.E2E_REUSE === '1',
      stdout: 'ignore',
      stderr: 'pipe',
      env: { NEXT_PUBLIC_API_URL: API_URL, API_INTERNAL_URL: API_URL, PORT: String(WEB_PORT) },
    },
  ],
});
