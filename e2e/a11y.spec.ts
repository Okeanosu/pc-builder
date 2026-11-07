import { expect, type Page, test } from '@playwright/test';
import { API_URL } from './env';
import { findProduct } from './support';

/**
 * Structural accessibility checks without axe-core: language, landmarks, one h1, no sideways scrolling at
 * the project's viewport, keyboard order and error announcement on the checkout form. Colour contrast is
 * not measured here (it is a design-token property, see docs/design/ui-ux.md).
 */
const PAGES = ['/', '/advisor', '/builder', '/c/cpu', '/cart', '/checkout'];

async function hasNoHorizontalScroll(page: Page): Promise<boolean> {
  return page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth);
}

test('khả năng truy cập: ngôn ngữ, landmark, h1 và không cuộn ngang trên các trang chính', async ({
  page,
}) => {
  const cpu = await findProduct(page.request, 'cpu', {});
  expect(
    (await page.request.post(`${API_URL}/cart/items`, { data: { productId: cpu.id, qty: 1 } })).status(),
  ).toBe(201);

  for (const path of PAGES) {
    await page.goto(path);
    await expect(page.locator('html'), path).toHaveAttribute('lang', 'vi');
    await expect(page.getByRole('main'), path).toHaveCount(1);
    await expect(page.getByRole('banner').first(), path).toBeVisible();
    await expect(page.getByRole('heading', { level: 1 }), path).toHaveCount(1);
    expect(await hasNoHorizontalScroll(page), `${path} scrolls sideways`).toBe(true);
  }
});

test('khả năng truy cập: biểu mẫu thanh toán dùng được bằng bàn phím và báo lỗi gắn với ô nhập', async ({
  page,
}) => {
  const cpu = await findProduct(page.request, 'cpu', {});
  await page.request.post(`${API_URL}/cart/items`, { data: { productId: cpu.id, qty: 1 } });
  await page.goto('/checkout');

  const name = page.getByLabel('Họ và tên');
  const phone = page.getByLabel('Số điện thoại');
  const address = page.getByLabel('Địa chỉ giao hàng');
  const note = page.getByLabel('Ghi chú');
  await name.focus();
  for (const next of [phone, address, note]) {
    await page.keyboard.press('Tab');
    await expect(next).toBeFocused();
  }

  // The focused field shows a visible ring (drawn on the input's wrapper).
  await name.focus();
  const ring = await name.evaluate((el) => getComputedStyle(el.parentElement as HTMLElement).boxShadow);
  expect(ring).not.toBe('none');

  // Submitting the empty form from the keyboard marks the fields invalid, links the message and moves focus.
  await page.getByRole('button', { name: 'Đặt hàng và lấy mã QR' }).focus();
  await page.keyboard.press('Enter');
  await expect(name).toHaveAttribute('aria-invalid', 'true');
  await expect(name).toBeFocused();
  const describedBy = await name.getAttribute('aria-describedby');
  expect(describedBy).toBeTruthy();
  await expect(page.locator(`[id="${describedBy}"]`)).not.toBeEmpty();
  await expect(phone).toHaveAttribute('aria-invalid', 'true');
  await expect(address).toHaveAttribute('aria-invalid', 'true');
});
