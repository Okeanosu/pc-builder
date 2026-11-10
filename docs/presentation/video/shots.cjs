// Captures the app screens used by the video at 1920x1080, 2x. Usage: node shots.cjs <outDir>
const { chromium } = require('@playwright/test');

const BASE = 'http://localhost:3000';
const API = 'http://localhost:4000/api';
const out = process.argv[2];
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

async function shot(page, name) {
  await page.evaluate(() => window.scrollTo(0, 0));
  await wait(500);
  await page.screenshot({ path: `${out}/${name}.png`, caret: 'hide', animations: 'disabled' });
  console.log('saved', name);
}

async function run() {
  const browser = await chromium.launch();
  const killer = setTimeout(() => browser.close().finally(() => process.exit(2)), 300_000);
  try {
    const ctx = await browser.newContext({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 2, locale: 'vi-VN' });
    const page = await ctx.newPage();
    await page.goto(`${BASE}/`);
    await page.evaluate(() => localStorage.setItem('theme', 'light'));

    await page.goto(`${BASE}/`, { waitUntil: 'networkidle' });
    await page.getByText('Engine xét').first().waitFor();
    await wait(1200);
    await shot(page, 'home');

    await page.goto(`${BASE}/advisor?q=${encodeURIComponent('chơi game 25 triệu')}`);
    await page.getByRole('link', { name: 'Mở trong Customizer' }).first().waitFor({ timeout: 30_000 });
    await wait(1500);
    await shot(page, 'advisor');

    await page.getByRole('link', { name: 'Mở trong Customizer' }).nth(1).click();
    await page.waitForURL(/\/builder/);
    await page.getByRole('heading', { level: 1, name: 'Tự build PC' }).waitFor();
    await wait(7000); // let the "opened in Customizer" toast close
    await shot(page, 'builder');

    await page.goto(`${BASE}/c/gpu`, { waitUntil: 'networkidle' });
    await page.locator('article').first().waitFor();
    await wait(800);
    await shot(page, 'category');

    await page.goto(`${BASE}/p/amd-ryzen-5-5600g`, { waitUntil: 'networkidle' });
    const bench = page.getByRole('tab', { name: 'Hiệu năng' });
    if (await bench.count()) await bench.click();
    await wait(800);
    await shot(page, 'product');

    await page.goto(`${BASE}/advisor`);
    await page.getByRole('button', { name: 'Thêm cả bộ vào giỏ' }).first().waitFor({ timeout: 30_000 });
    await page.getByRole('button', { name: 'Thêm cả bộ vào giỏ' }).first().click();
    await wait(1500);
    await page.goto(`${BASE}/cart`, { waitUntil: 'networkidle' });
    await page.getByRole('heading', { level: 1, name: 'Giỏ hàng' }).waitFor();
    await wait(800);
    await shot(page, 'cart');

    await page.getByRole('link', { name: /^Đặt lắp ráp/ }).click();
    await page.getByLabel('Họ và tên').fill('Nguyễn Văn An');
    await page.getByLabel('Số điện thoại').fill('0912345678');
    await page.getByLabel('Địa chỉ giao hàng').fill('12 Nguyễn Huệ, Phường Bến Nghé, Quận 1, TP. Hồ Chí Minh');
    await page.getByRole('button', { name: 'Đặt hàng và lấy mã QR' }).click();
    await page.waitForURL('**/pay');
    await page.getByRole('img', { name: /^Mã VietQR/ }).waitFor();
    await wait(1500);
    await shot(page, 'pay');

    // Settle the order through the dev simulator so the admin dashboard shows real revenue.
    const code = page.url().split('/orders/')[1].split('/')[0];
    const sim = await page.request.post(`${API}/payments/${code}/simulate`, { data: {} });
    console.log('simulate', code, sim.status());

    await page.goto(`${BASE}/login?redirect=/admin`);
    await page.getByLabel('Email').fill('admin@pcbuilder.vn');
    await page.getByRole('textbox', { name: 'Mật khẩu', exact: true }).fill('Admin@123');
    await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
    await page.waitForURL(/\/admin$/);
    await page.getByRole('heading', { level: 1, name: 'Tổng quan' }).waitFor();
    await wait(7000); // let the welcome toast close
    await shot(page, 'admin');

    await page.goto(`${BASE}/admin/weights`, { waitUntil: 'networkidle' });
    await wait(1500);
    await shot(page, 'weights');
    await ctx.close();
  } finally {
    clearTimeout(killer);
    await browser.close();
  }
}

run().then(
  () => process.exit(0),
  (err) => {
    console.error(err);
    process.exit(1);
  },
);
