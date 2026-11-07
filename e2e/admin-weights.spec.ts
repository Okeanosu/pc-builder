import { isDeepStrictEqual } from 'node:util';
import {
  type BuildDTO,
  CATEGORY_LABELS,
  type CategoryKey,
  type PurposeWeightsDTO,
  type RecommendationResultDTO,
} from '@pc/shared';
import { type APIRequestContext, expect, type Page, test } from '@playwright/test';
import { ADMIN_STATE, API_URL } from './env';
import { toastTitle } from './support';

test.use({ storageState: ADMIN_STATE });

// Refresh tokens rotate on every page load: keep the newest cookies for the next test in the run.
test.afterEach(async ({ context }) => {
  await context.storageState({ path: ADMIN_STATE });
});

/** GPU raised from 0.42 to 0.60; the other seven shrink proportionally (×0.69) so the column still sums to 1. */
const GAMING_GPU_HEAVY: Record<CategoryKey, string> = {
  cpu: '0,15',
  mainboard: '0,05',
  ram: '0,07',
  gpu: '0,60',
  storage: '0,05',
  psu: '0,03',
  case: '0,03',
  cooler: '0,02',
};

type Shares = Record<string, number>;

async function gamingRecommendation(request: APIRequestContext): Promise<{ shares: Shares; cache: string }> {
  // A fresh request context means a fresh guest cookie, so the per-client rate limit never kicks in.
  const res = await request.post(`${API_URL}/recommendations`, {
    data: { budget: 25_000_000, purpose: 'gaming' },
  });
  expect(res.status()).toBe(200);
  const { builds } = (await res.json()) as RecommendationResultDTO;
  expect(builds).toHaveLength(3);
  const shares = Object.fromEntries(builds.map((b: BuildDTO) => [b.label ?? b.name, b.allocation.gpu ?? 0]));
  return { shares, cache: res.headers()['x-cache'] ?? '' };
}

async function weights(page: Page): Promise<PurposeWeightsDTO> {
  const res = await page.request.get(`${API_URL}/admin/weights`);
  expect(res.status()).toBe(200);
  const gaming = ((await res.json()) as PurposeWeightsDTO[]).find((w) => w.purpose === 'gaming');
  expect(gaming).toBeDefined();
  return gaming!;
}

const comparable = (w: PurposeWeightsDTO) => ({ weights: w.weights, allocation: w.allocation });

async function saveGaming(page: Page) {
  // Gaming is the first purpose column, so its "Lưu" is the first of the four.
  const save = page.getByRole('button', { name: 'Lưu', exact: true }).first();
  await expect(save).toBeEnabled();
  const put = page.waitForResponse(
    (r) => r.url() === `${API_URL}/admin/weights/gaming` && r.request().method() === 'PUT',
  );
  await save.click();
  expect((await put).status()).toBe(200);
  await expect(toastTitle(page, 'Đã lưu trọng số “Chơi game”')).toBeVisible();
}

test('admin tăng trọng số GPU cho "Chơi game" → gợi ý mới dồn ngân sách cho GPU nhiều hơn', async ({
  page,
  playwright,
}, testInfo) => {
  await page.goto('/admin/weights');
  await expect(page.getByRole('banner').getByText('Trọng số thuật toán')).toBeVisible();
  const gpuInput = page.getByRole('textbox', { name: 'Trọng số Card đồ họa cho Chơi game' });
  await expect(gpuInput).toHaveValue('0.42');
  const original = await weights(page);

  const guest = await playwright.request.newContext();
  try {
    const before = await gamingRecommendation(guest);

    for (const [category, value] of Object.entries(GAMING_GPU_HEAVY) as [CategoryKey, string][]) {
      await page
        .getByRole('textbox', { name: `Trọng số ${CATEGORY_LABELS[category]} cho Chơi game` })
        .fill(value);
    }
    await expect(page.getByText('Chưa lưu')).toBeVisible();
    await saveGaming(page);
    expect((await weights(page)).weights.gpu).toBe(0.6);

    const fresh = await playwright.request.newContext();
    const after = await gamingRecommendation(fresh);
    await fresh.dispose();

    await testInfo.attach('gpu-share.json', {
      body: JSON.stringify({ before: before.shares, after: after.shares }, null, 2),
      contentType: 'application/json',
    });
    // Saving the weights invalidated the recommendation cache, so this is a fresh solve.
    expect(after.cache).toBe('MISS');
    expect(after.shares.performance!).toBeGreaterThan(before.shares.performance!);

    // Restore through the UI: "Khôi phục mặc định" loads the engine defaults, which equal the seed.
    await page.getByRole('button', { name: 'Khôi phục mặc định' }).first().click();
    await expect(gpuInput).toHaveValue('0.42');
    await saveGaming(page);
    expect(comparable(await weights(page))).toEqual(comparable(original));
  } finally {
    const now = await weights(page);
    if (!isDeepStrictEqual(comparable(now), comparable(original))) {
      await page.request.put(`${API_URL}/admin/weights/gaming`, { data: comparable(original) });
    }
    await guest.dispose();
  }
});
