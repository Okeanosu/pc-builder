// Renders each <section class="slide"> of slides.html to slides/<id>.png at 3840x2160.
const path = require('node:path');
const { chromium } = require('@playwright/test');
(async () => {
  const b = await chromium.launch();
  try {
    const p = await b.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 2 });
    await p.goto('file://' + path.resolve(process.argv[2]), { waitUntil: 'networkidle' });
    await p.evaluate(() => document.fonts.ready);
    for (const id of await p.$$eval('section.slide', (s) => s.map((x) => x.id))) {
      await p.locator('#' + id).screenshot({ path: `${process.argv[3]}/${id}.png` });
      console.log('slide', id);
    }
  } finally { await b.close(); }
})().then(() => process.exit(0), (e) => { console.error(e); process.exit(1); });
