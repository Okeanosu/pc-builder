// Re-captures the storefront screenshots that show product photos (docs/design/screenshots/v2 and the thesis figures).
// Needs the web app on :3000 and the API on :4000 with the seeded catalog.
// Usage: NODE_PATH=<repo>/node_modules node docs/design/screenshots/capture.cjs <outDir>
const { chromium } = require('@playwright/test');

const BASE = 'http://localhost:3000';
const API = 'http://localhost:4000/api';
const out = process.argv[2];
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

async function open(browser, width, height, theme, dpr = 1) {
  const ctx = await browser.newContext({
    viewport: { width, height },
    deviceScaleFactor: dpr,
    locale: 'vi-VN',
  });
  const page = await ctx.newPage();
  await page.goto(`${BASE}/`);
  await page.evaluate((t) => localStorage.setItem('theme', t), theme);
  return { ctx, page };
}

async function visit(page, path) {
  await page.goto(BASE + path, { waitUntil: 'networkidle' });
  // Lazy images below the fold load only once scrolled into view.
  await page.evaluate(async () => {
    for (let y = 0; y < document.body.scrollHeight; y += 600) {
      window.scrollTo(0, y);
      await new Promise((r) => setTimeout(r, 120));
    }
    window.scrollTo(0, 0);
  });
  await page.waitForLoadState('networkidle');
  await wait(900);
}

async function shot(page, name, fullPage = false) {
  await page.screenshot({ path: `${out}/${name}.png`, fullPage, caret: 'hide', animations: 'disabled' });
  console.log('saved', name);
}

async function run() {
  const browser = await chromium.launch();
  const killer = setTimeout(() => browser.close().finally(() => process.exit(2)), 300_000);
  try {
    let { ctx, page } = await open(browser, 1440, 900, 'light');
    await visit(page, '/');
    await shot(page, 'home-1440', true);
    await visit(page, '/c/gpu');
    await shot(page, 'category-gpu-1440');
    await visit(page, '/p/amd-ryzen-5-5600g');
    await shot(page, 'product-cpu-1440', true);

    // Cart holding the "gaming, 25 million" build from the advisor, added as one assembled set.
    await page.goto(`${BASE}/advisor?q=${encodeURIComponent('chơi game 25 triệu')}`);
    const addAll = page.getByRole('button', { name: 'Thêm cả bộ vào giỏ' }).first();
    await addAll.waitFor({ timeout: 30_000 });
    await addAll.click();
    await wait(1500);
    await visit(page, '/cart');
    await page.getByRole('heading', { level: 1, name: 'Giỏ hàng' }).waitFor();
    await shot(page, 'cart-build-1440', true);
    await ctx.close();

    ({ ctx, page } = await open(browser, 1440, 900, 'dark'));
    await visit(page, '/');
    await shot(page, 'home-dark-1440');
    await ctx.close();

    ({ ctx, page } = await open(browser, 375, 812, 'light'));
    await visit(page, '/');
    await shot(page, 'home-375', true);
    await visit(page, '/c/gpu');
    await shot(page, 'category-gpu-375');
    await ctx.close();

    // Only an AM5 CPU chosen: the mainboard picker dims every board on another socket.
    ({ ctx, page } = await open(browser, 1920, 1080, 'light', 2));
    const cpu = await (await page.request.get(`${API}/products/amd-ryzen-7-7800x3d`)).json();
    await page.evaluate(
      (state) => localStorage.setItem('pcb.builder', JSON.stringify({ state, version: 1 })),
      {
        parts: { cpu },
        purpose: 'gaming',
        budget: null,
        saved: null,
      },
    );
    await page.goto(`${BASE}/builder`, { waitUntil: 'networkidle' });
    await page.getByRole('heading', { level: 1, name: 'Tự build PC' }).waitFor();
    await page.getByText('Chọn mainboard').first().click();
    const dialog = page.getByRole('dialog');
    await dialog.waitFor();
    await page.waitForLoadState('networkidle');
    await wait(2500);
    await dialog.screenshot({ path: `${out}/picker-dim.png`, caret: 'hide', animations: 'disabled' });
    console.log('saved picker-dim');
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
