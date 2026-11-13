// Prints <src-dir>/*.svg as-is and renders <src-dir>/*.mmd with Mermaid, each to a vector PDF for LaTeX.
// Usage: node render.cjs <src-dir> <out-dir> [name ...]
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('@playwright/test');

const [srcDir, outDir, ...only] = process.argv.slice(2);
const MERMAID = 'https://cdn.jsdelivr.net/npm/mermaid@10.9.1/dist/mermaid.min.js';

const shell = (body, extraHead = '') => `<!doctype html><html><head><meta charset="utf-8">${extraHead}
<style>html,body{margin:0;padding:0;background:#fff} #root{display:inline-block;padding:6px}
#root svg{display:block;max-width:none!important}</style></head><body><div id="root">${body}</div></body></html>`;

async function printRoot(page, out) {
  const box = await page.locator('#root').boundingBox();
  const w = Math.ceil(box.width) + 1;
  const h = Math.ceil(box.height) + 1;
  await page.setViewportSize({ width: Math.max(w, 200), height: Math.max(h, 200) });
  await page.pdf({ path: out, width: `${w}px`, height: `${h}px`, printBackground: true, pageRanges: '1' });
}

(async () => {
  fs.mkdirSync(outDir, { recursive: true });
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1600, height: 1200 } });
  try {
    const files = fs
      .readdirSync(srcDir)
      .filter((f) => /\.(svg|mmd)$/.test(f))
      .filter((f) => only.length === 0 || only.includes(f.replace(/\.(svg|mmd)$/, '')));
    for (const f of files) {
      const name = f.replace(/\.(svg|mmd)$/, '');
      const src = fs.readFileSync(path.join(srcDir, f), 'utf8');
      if (f.endsWith('.svg')) {
        await page.setContent(shell(src));
      } else {
        const esc = src.replace(/&/g, '&amp;').replace(/</g, '&lt;');
        await page.setContent(
          shell(`<pre class="mermaid">${esc}</pre>`, `<script src="${MERMAID}"></script>`),
          { waitUntil: 'networkidle' },
        );
        await page.evaluate(async () => {
          // eslint-disable-next-line no-undef
          mermaid.initialize({
            startOnLoad: false,
            theme: 'neutral',
            fontFamily: '"Times New Roman", Times, serif',
            fontSize: 16,
            flowchart: {
              useMaxWidth: false,
              htmlLabels: true,
              curve: 'basis',
              nodeSpacing: 34,
              rankSpacing: 44,
              padding: 10,
            },
            sequence: {
              useMaxWidth: false,
              mirrorActors: false,
              actorMargin: 18,
              messageMargin: 30,
              boxMargin: 8,
              noteMargin: 8,
              width: 104,
              actorFontFamily: '"Times New Roman", Times, serif',
              messageFontFamily: '"Times New Roman", Times, serif',
              noteFontFamily: '"Times New Roman", Times, serif',
              actorFontSize: 16,
              messageFontSize: 16,
              noteFontSize: 15,
            },
            er: { useMaxWidth: false, layoutDirection: 'TB', entityPadding: 12, fontSize: 14 },
            class: { useMaxWidth: false, padding: 8 },
            state: { useMaxWidth: false, padding: 8 },
          });
          // eslint-disable-next-line no-undef
          await mermaid.run({ querySelector: 'pre.mermaid' });
          // width="100%" inside a shrink-to-fit box falls back to 300px; size the SVG from its own viewBox.
          for (const svg of document.querySelectorAll('#root svg')) {
            const vb = svg.viewBox.baseVal;
            svg.setAttribute('width', String(vb.width));
            svg.setAttribute('height', String(vb.height));
            svg.style.maxWidth = 'none';
          }
        });
        const err = await page.locator('.error-text, #root .error-icon').count();
        if (err) throw new Error(`mermaid error in ${f}`);
      }
      await printRoot(page, path.join(outDir, `${name}.pdf`));
      console.log('pdf', name);
    }
  } finally {
    await browser.close();
  }
})().then(
  () => process.exit(0),
  (e) => {
    console.error(e.message);
    process.exit(1);
  },
);
