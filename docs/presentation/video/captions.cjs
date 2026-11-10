// Renders each subtitle as a full-frame 1920x1080 transparent PNG with a dark band at the bottom.
const fs = require('node:fs');
const { chromium } = require('@playwright/test');
const [work] = process.argv.slice(2);
const caps = JSON.parse(fs.readFileSync(`${work}/captions.json`, 'utf8'));
const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');
(async () => {
  fs.mkdirSync(`${work}/captions`, { recursive: true });
  const b = await chromium.launch();
  try {
    const p = await b.newPage({ viewport: { width: 1920, height: 1080 } });
    await p.setContent(`<!doctype html><html><head><meta charset="utf-8">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Archivo:wght@400..700&display=swap">
<style>html,body{margin:0;background:transparent}
#f{width:1920px;height:1080px;position:relative}
#c{position:absolute;left:50%;bottom:58px;transform:translateX(-50%);max-width:1560px;width:max-content;
background:rgba(11,13,16,.84);color:#fff;font:500 40px/1.38 Archivo,Arial,sans-serif;padding:14px 30px 16px;border-radius:10px;text-align:center;text-wrap:balance}
</style></head><body><div id="f"><div id="c"></div></div></body></html>`);
    await p.evaluate(() => document.fonts.ready);
    for (const c of caps) {
      await p.evaluate((t) => { document.getElementById('c').innerHTML = t; }, esc(c.text));
      await p.locator('#f').screenshot({ path: `${work}/captions/${c.file}`, omitBackground: true });
    }
    console.log('rendered', caps.length);
  } finally { await b.close(); }
})().then(() => process.exit(0), (e) => { console.error(e); process.exit(1); });
