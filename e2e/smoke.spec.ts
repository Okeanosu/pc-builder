import { expect, test } from '@playwright/test';
import { API_URL } from './env';
import { buildsFrom, parseSse } from './support';

// Read-only apart from one chat session: safe to run against a deployed instance (see playwright.config.ts).
test('smoke: health, trang chủ và một lượt chat trả về cấu hình', async ({ page, request }) => {
  const health = await request.get(`${API_URL}/health`);
  expect(health.status()).toBe(200);
  expect(await health.json()).toMatchObject({ status: 'ok', db: 'up', redis: 'up' });

  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await expect(page.getByRole('textbox', { name: 'Mô tả nhu cầu và ngân sách của bạn' })).toBeVisible();

  const session = await request.post(`${API_URL}/chat/sessions`, { data: {} });
  expect(session.status()).toBe(201);
  const { id } = (await session.json()) as { id: string };
  const turn = await request.post(`${API_URL}/chat/sessions/${id}/messages`, {
    data: { text: 'chơi game 25 triệu' },
  });
  expect(turn.status()).toBe(200);
  const events = parseSse((await turn.body()).toString('utf8'));
  expect(events.at(-1)?.type).toBe('done');
  expect(buildsFrom(events).length).toBeGreaterThan(0);
});
