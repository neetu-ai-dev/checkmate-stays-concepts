// Dev utility: screenshot a URL. Usage: node scripts/dev/shot.mjs <url> <out.png> [width] [height] [fullPage]
import { chromium } from 'playwright';
const [, , url, out, w = '1440', h = '900', full = '0'] = process.argv;
const browser = await chromium.launch({ channel: 'chrome' });
const page = await browser.newPage({ viewport: { width: Number(w), height: Number(h) } });
page.on('console', (m) => { if (m.type() === 'error') console.log('console.error:', m.text().slice(0, 200)); });
page.on('pageerror', (e) => console.log('pageerror:', e.message.slice(0, 200)));
await page.goto(url, { waitUntil: 'networkidle', timeout: 60000 }).catch((e) => console.log('goto:', e.message));
await page.waitForTimeout(2500);
await page.screenshot({ path: out, fullPage: full === '1' });
console.log('final url:', page.url());
await browser.close();
