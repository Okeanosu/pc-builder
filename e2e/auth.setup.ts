import { expect, test as setup } from '@playwright/test';
import { ADMIN, ADMIN_STATE } from './env';

// The API allows 5 logins per minute per IP, so the admin signs in here once and the specs reuse the cookies.
setup('quản trị viên đăng nhập qua giao diện và lưu phiên', async ({ page }) => {
  await page.goto('/login?redirect=/admin/weights');
  await page.getByLabel('Email').fill(ADMIN.email);
  await page.getByRole('textbox', { name: 'Mật khẩu', exact: true }).fill(ADMIN.password);
  await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click();

  await expect(page).toHaveURL(/\/admin\/weights$/);
  await expect(page.getByRole('banner').getByText('Trọng số thuật toán')).toBeVisible();
  await page.context().storageState({ path: ADMIN_STATE });
});
