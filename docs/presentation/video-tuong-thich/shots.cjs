// Captures the compatibility screens at 1920x1080 @2x. Usage: node shots.cjs <outDir>
const { chromium } = require('@playwright/test');

const BASE = 'http://localhost:3000';
const API = 'http://localhost:4000/api';
const out = process.argv[2];
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

const WRONG = {
  cpu: 'amd-ryzen-7-7800x3d',
  mainboard: 'MSI PRO B660M-A DDR4',
  ram: 'Crucial 16GB (2x8GB) DDR5 5200MHz CL42',
  gpu: 'ASUS ROG Strix GeForce RTX 4090 OC 24GB',
  case: 'Cooler Master Elite 110 Mini-ITX',
  psu: 'DeepCool PK450D 450W 80+ Bronze',
};

async function productByName(request, category, name) {
  if (!name.includes(' ')) return (await request.get(`${API}/products/${name}`)).json();
  const res = await request.get(`${API}/products?category=${category}&q=${encodeURIComponent(name)}&limit=50`);
  const body = await res.json();
  const list = body.items ?? body.data ?? body;
  const hit = list.find((p) => p.name === name);
  if (!hit) throw new Error(`not found: ${name}`);
  return (await request.get(`${API}/products/${hit.id}`)).json();
}

async function loadBuilder(page, parts, purpose = 'gaming', budget = null) {
  await page.evaluate(
    ([state]) => {
      localStorage.setItem('theme', 'light');
      localStorage.setItem('pcb.builder', JSON.stringify({ state, version: 1 }));
    },
    [{ parts, purpose, budget, saved: null }],
  );
  await page.goto(`${BASE}/builder`, { waitUntil: 'networkidle' });
  await page.getByRole('heading', { level: 1, name: 'Tự build PC' }).waitFor();
  await wait(1500);
}

async function shot(page, name, opts = {}) {
  await page.screenshot({ path: `${out}/${name}.png`, caret: 'hide', animations: 'disabled', ...opts });
  console.log('saved', name);
}

async function run() {
  const browser = await chromium.launch();
  const killer = setTimeout(() => browser.close().finally(() => process.exit(2)), 240_000);
  try {
    const ctx = await browser.newContext({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 2, locale: 'vi-VN' });
    const page = await ctx.newPage();
    await page.goto(`${BASE}/`);

    const parts = {};
    for (const [cat, name] of Object.entries(WRONG)) parts[cat] = await productByName(page.request, cat, name);
    await loadBuilder(page, parts);
    await page.evaluate(() => window.scrollTo(0, 0));
    await shot(page, 'builder-conflict');
    const issues = page.getByRole('list', { name: 'Vấn đề tương thích' }).first();
    if (await issues.count()) {
      await issues.scrollIntoViewIfNeeded();
      await wait(400);
      await shot(page, 'builder-issues');
    }

    // Only the AM5 CPU chosen: the mainboard picker dims every board on another socket.
    await loadBuilder(page, { cpu: parts.cpu });
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.getByText('Chọn mainboard').first().click();
    await page.getByRole('dialog').waitFor();
    await wait(2500);
    await shot(page, 'picker-dim');

    await page.goto(`${BASE}/login?redirect=/admin`);
    await page.getByLabel('Email').fill('admin@pcbuilder.vn');
    await page.getByRole('textbox', { name: 'Mật khẩu', exact: true }).fill('Admin@123');
    await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
    await page.waitForURL(/\/admin$/);
    await wait(6500);
    await page.goto(`${BASE}/admin/products/schema`, { waitUntil: 'networkidle' });
    await wait(1500);
    await shot(page, 'admin-schema');
    await page.goto(`${BASE}/admin/products/${parts.cpu.id}`, { waitUntil: 'networkidle' });
    await wait(1500);
    await shot(page, 'admin-product');
    await shot(page, 'admin-product-full', { fullPage: true });
    await ctx.close();
  } finally {
    clearTimeout(killer);
    await browser.close();
  }
}

run().then(() => process.exit(0), (err) => { console.error(err); process.exit(1); });
