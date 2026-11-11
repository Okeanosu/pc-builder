// Renders the print edition to an A4 PDF. Usage: node to-pdf.cjs <in.html> <out.pdf>
const path = require('node:path');
const { chromium } = require('@playwright/test');

const [input, output] = process.argv.slice(2);

async function run() {
  const browser = await chromium.launch();
  const killer = setTimeout(() => browser.close().finally(() => process.exit(2)), 120_000);
  try {
    const page = await browser.newPage({ viewport: { width: 794, height: 1123 } });
    await page.emulateMedia({ media: 'print', colorScheme: 'light' });
    await page.goto(`file://${path.resolve(input)}`, { waitUntil: 'networkidle' });
    await page.waitForFunction(() => window.__mermaidDone, null, { timeout: 60_000 });
    const status = await page.evaluate(() => window.__mermaidDone);
    if (status !== 'ok') throw new Error(`mermaid: ${status}`);
    const svgs = await page.locator('pre.mermaid svg').count();
    console.log('mermaid diagrams rendered:', svgs);
    await page.pdf({
      path: output,
      format: 'A4',
      printBackground: true,
      preferCSSPageSize: true,
      displayHeaderFooter: true,
      headerTemplate:
        '<div style="width:100%;font-size:7.5pt;color:#7a8087;padding:0 14mm;font-family:Arial,sans-serif;display:flex;justify-content:space-between"><span>PC Builder · Đồ án tốt nghiệp</span><span>Cơ sở dữ liệu: bảng, trường và quan hệ</span></div>',
      footerTemplate:
        '<div style="width:100%;font-size:7.5pt;color:#7a8087;padding:0 14mm;font-family:Arial,sans-serif;text-align:right"><span class="pageNumber"></span> / <span class="totalPages"></span></div>',
    });
    console.log('saved', output);
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
