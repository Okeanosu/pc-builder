import type { BuildDTO, CompatibilityResultDTO, OrderDTO } from '@pc/shared';
import { expect, test } from '@playwright/test';
import { API_URL } from './env';
import { buildsFrom, escapeRegExp, parseSse, stubVietQrImages, toastTitle } from './support';

const BUDGET = 25_000_000;

test('trang chủ → AI tư vấn → thêm cả bộ vào giỏ → đặt lắp ráp → VietQR → đã nhận thanh toán', async ({
  page,
  isMobile,
}) => {
  await stubVietQrImages(page);

  // 1. Hero prompt on the home page hands the request to the advisor.
  await page.goto('/');
  await page.getByRole('textbox', { name: 'Mô tả nhu cầu và ngân sách của bạn' }).fill('chơi game 25 triệu');
  const chatTurn = page.waitForResponse(
    (r) => /\/api\/chat\/sessions\/[^/]+\/messages$/.test(r.url()) && r.request().method() === 'POST',
  );
  await page.getByRole('button', { name: 'Hỏi AI tư vấn' }).click();
  await expect(page).toHaveURL(/\/advisor(\?|$)/);

  // 2. The SSE turn returns three builds from stock; every one is in budget and passes the server rules.
  const turn = await chatTurn;
  expect(turn.status()).toBe(200);
  expect(turn.headers()['content-type']).toContain('text/event-stream');
  // Chromium hands a streamed body without charset back as windows-1252, so non-ASCII text in it (build names)
  // is garbled here; the page itself decodes UTF-8. Only ASCII fields (ids, labels, prices) are read from it.
  const events = parseSse(await turn.text());
  expect(events.at(-1)).toMatchObject({ type: 'done', mode: 'FALLBACK' });
  const builds = buildsFrom(events);
  expect(builds.map((b) => b.label)).toEqual(['performance', 'balanced', 'budget']);
  for (const b of builds) {
    expect(b.totalPrice).toBeLessThanOrEqual(BUDGET);
    expect(b.items).toHaveLength(8);
    const check = await page.request.post(`${API_URL}/compatibility/check`, {
      data: { productIds: b.items.map((i) => i.product.id) },
    });
    const result = (await check.json()) as CompatibilityResultDTO;
    expect(result.issues.filter((i) => i.severity === 'error')).toEqual([]);
  }

  if (isMobile) await page.getByRole('tab', { name: /Cấu hình/ }).click();
  const compare = page.getByRole('region', { name: 'So sánh cấu hình' });
  const cards = compare.getByRole('group', { name: /^Cấu hình / });
  await expect(cards).toHaveCount(3);
  await expect(cards.nth(0)).toHaveAccessibleName('Cấu hình Tối ưu hiệu năng');
  await expect(cards.nth(1)).toHaveAccessibleName('Cấu hình Cân bằng');
  await expect(cards.nth(2)).toHaveAccessibleName('Cấu hình Tiết kiệm');

  // 3. Whole build into the cart. The build was persisted by the chat turn (source CHAT).
  const saved = await page.request.get(`${API_URL}/builds/${builds[0]!.id}`);
  expect(saved.status()).toBe(200);
  const chosen = (await saved.json()) as BuildDTO;
  expect(chosen).toMatchObject({ source: 'CHAT', label: 'performance', totalPrice: builds[0]!.totalPrice });
  await cards.nth(0).getByRole('button', { name: 'Thêm cả bộ vào giỏ' }).click();
  await expect(toastTitle(page, 'Đã thêm cả bộ vào giỏ hàng')).toBeVisible();
  await page.getByRole('link', { name: 'Giỏ hàng, 8 sản phẩm' }).click();

  await expect(page.getByRole('heading', { level: 1, name: 'Giỏ hàng' })).toBeVisible();
  const group = page.getByRole('region', { name: `Cấu hình ${chosen.name}` });
  await expect(group).toBeVisible();
  await expect(group.getByText('8 linh kiện')).toBeVisible();
  await expect(group.getByText('Đủ bộ')).toBeVisible();

  // 4. Guest checkout as an assembled build.
  await page.getByRole('link', { name: /^Đặt lắp ráp/ }).click();
  await expect(page).toHaveURL(new RegExp(`/checkout\\?build=${escapeRegExp(chosen.id)}$`));
  await page.getByLabel('Họ và tên').fill('Nguyễn Văn An');
  await page.getByLabel('Số điện thoại').fill('0912345678');
  await page.getByLabel('Địa chỉ giao hàng').fill('12 Nguyễn Huệ, Phường Bến Nghé, Quận 1, TP. Hồ Chí Minh');
  await expect(page.getByText('Phí lắp ráp', { exact: true })).toBeVisible();

  const placed = page.waitForResponse(
    (r) => r.url() === `${API_URL}/orders` && r.request().method() === 'POST',
  );
  await page.getByRole('button', { name: 'Đặt hàng và lấy mã QR' }).click();
  const orderRes = await placed;
  expect(orderRes.status()).toBe(201);
  const order = (await orderRes.json()) as OrderDTO;
  expect(order).toMatchObject({ type: 'BUILD', status: 'PENDING_PAYMENT', subtotal: chosen.totalPrice });
  expect(order.total).toBe(order.subtotal + order.assemblyFee);

  // 5. Pay page shows the dynamic VietQR with the exact amount and the order code as transfer content.
  await expect(page).toHaveURL(new RegExp(`/orders/${order.code}/pay$`));
  await expect(page.getByRole('heading', { level: 1, name: `Đơn ${order.code}` })).toBeVisible();
  const qr = page.getByRole('img', { name: new RegExp(`^Mã VietQR chuyển .+ cho đơn ${order.code}$`) });
  await expect(qr).toBeVisible();
  const src = (await qr.getAttribute('src')) ?? '';
  expect(src).toContain('img.vietqr.io');
  expect(src).toContain(`amount=${order.total}`);
  expect(src).toContain(`addInfo=${order.code}`);

  // 6. The bank transfer arrives out of band (dev simulator); the page notices it by polling.
  const sim = await page.request.post(`${API_URL}/payments/${order.code}/simulate`, { data: {} });
  expect(sim.status()).toBe(200);
  await expect(page.getByRole('heading', { name: 'Đã nhận thanh toán' })).toBeVisible();

  const after = await page.request.get(`${API_URL}/orders/${order.code}`);
  expect(after.status()).toBe(200);
  expect(await after.json()).toMatchObject({ status: 'PAID', paymentStatus: 'PAID' });
});
