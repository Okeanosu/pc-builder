// Renders report.html to an A4 PDF. Usage: node to-pdf.cjs <in.html> <out.pdf>
const path = require('node:path');
const { chromium } = require('@playwright/test');
const [input, output] = process.argv.slice(2);
(async () => {
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({ viewport: { width: 794, height: 1123 } });
    await page.emulateMedia({ media: 'print', colorScheme: 'light' });
    await page.goto(`file://${path.resolve(input)}`, { waitUntil: 'networkidle' });
    await page.evaluate(() => document.fonts.ready);
    const head = (t) => `<div style="width:100%;font-size:7.5pt;color:#7a8087;padding:0 17mm;font-family:Arial,sans-serif;display:flex;justify-content:space-between">${t}</div>`;
    await page.pdf({
      path: output, format: 'A4', printBackground: true, preferCSSPageSize: true, displayHeaderFooter: true,
      headerTemplate: head('<span>PC Builder · Đồ án tốt nghiệp</span><span>Tương thích linh kiện và cấu trúc dữ liệu</span>'),
      footerTemplate: '<div style="width:100%;font-size:7.5pt;color:#7a8087;padding:0 17mm;font-family:Arial,sans-serif;text-align:right"><span class="pageNumber"></span> / <span class="totalPages"></span></div>',
    });
    console.log('saved', output);
  } finally { await browser.close(); }
})().then(() => process.exit(0), (e) => { console.error(e); process.exit(1); });
