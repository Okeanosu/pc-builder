import type { CompatibilityIssueDTO, ProductSummaryDTO, RecommendationResultDTO } from '@pc/shared';
import { expect, type Locator, type Page, test } from '@playwright/test';
import { API_URL } from './env';
import { escapeRegExp, findProduct, toastTitle } from './support';

const C01_MESSAGE = 'Socket CPU (AM5) không khớp mainboard (LGA1700)';

async function swapPart(page: Page, slotLabel: string, noun: string, product: ProductSummaryDTO) {
  const slot = page.getByRole('listitem', { name: slotLabel, exact: true });
  await slot.getByRole('button', { name: `Đổi ${noun}` }).click();
  const picker = page.getByRole('dialog', { name: `Chọn ${noun}` });
  await expect(picker).toBeVisible();
  await picker.getByRole('searchbox', { name: `Tìm ${noun}` }).fill(product.name);
  // Incompatible candidates stay selectable; their button says so in its name.
  await picker
    .getByRole('button', { name: new RegExp(`^Chọn ${escapeRegExp(product.name)}( \\(|$)`) })
    .click();
  await expect(picker).toBeHidden();
  await expect(slot.getByText(product.name)).toBeVisible();
  return slot;
}

function conflictBadge(page: Page): Locator {
  return page.getByRole('button', { name: /xung đột/i }).first();
}

test('Customizer: CPU AM5 + mainboard LGA1700 → huy hiệu đỏ C01, lưu bị từ chối 422', async ({ page }) => {
  // A real advisor build, opened from its card link target, so the swap starts from a compatible set.
  const reco = await page.request.post(`${API_URL}/recommendations`, {
    data: { budget: 25_000_000, purpose: 'gaming' },
  });
  expect(reco.status()).toBe(200);
  const build = ((await reco.json()) as RecommendationResultDTO).builds[0]!;
  const current = (category: string) =>
    build.items.filter((i) => i.category === category).map((i) => i.product.id);
  // Both slots really change, whatever sockets the recommended build happens to use.
  const am5Cpu = await findProduct(page.request, 'cpu', { socket: 'AM5' }, current('cpu'));
  const lga1700Board = await findProduct(
    page.request,
    'mainboard',
    { socket: 'LGA1700' },
    current('mainboard'),
  );

  await page.goto(`/builder?build=${encodeURIComponent(build.id)}`);
  await expect(page.getByRole('heading', { level: 1, name: 'Tự build PC' })).toBeVisible();
  await expect(toastTitle(page, 'Đã mở cấu hình trong Customizer')).toBeVisible();
  await expect(page.getByRole('heading', { name: /Linh kiện\s*8\/8/ })).toBeVisible();

  const cpuSlot = await swapPart(page, 'CPU', 'CPU', am5Cpu);
  const boardSlot = await swapPart(page, 'Mainboard', 'mainboard', lga1700Board);

  // Client-side rules (same engine as the server) flag the socket mismatch on both slots, in Vietnamese.
  for (const slot of [cpuSlot, boardSlot]) {
    await expect(slot.getByText('C01', { exact: true })).toBeVisible();
    await expect(slot.getByText(C01_MESSAGE)).toBeVisible();
  }
  const badge = conflictBadge(page);
  await expect(badge).toBeVisible();
  await expect(badge).toHaveClass(/text-danger-ink/);
  const color = await badge.evaluate((el) => getComputedStyle(el).color);
  const [r, g, b] = (color.match(/\d+(\.\d+)?/g) ?? []).map(Number);
  expect(r, `badge colour ${color} should be red`).toBeGreaterThan((g ?? 0) + 60);
  expect(r).toBeGreaterThan((b ?? 0) + 60);

  // Server stays the source of truth: saving is rejected with the same rule.
  const saved = page.waitForResponse(
    (res) => res.url() === `${API_URL}/builds` && res.request().method() === 'POST',
  );
  await page.getByRole('button', { name: 'Lưu & chia sẻ' }).click();
  const res = await saved;
  expect(res.status()).toBe(422);
  const body = (await res.json()) as { error: { code: string; details: CompatibilityIssueDTO[] } };
  expect(body.error.code).toBe('INCOMPATIBLE');
  expect(body.error.details).toContainEqual(
    expect.objectContaining({ code: 'C01', severity: 'error', message: C01_MESSAGE }),
  );
  await expect(toastTitle(page, 'Cấu hình còn xung đột, chưa lưu được')).toBeVisible();
  await expect(page.getByText(new RegExp(`^C01: ${escapeRegExp(C01_MESSAGE)}`))).toBeVisible();
  await expect(page).toHaveURL(/\/builder$/);
});
