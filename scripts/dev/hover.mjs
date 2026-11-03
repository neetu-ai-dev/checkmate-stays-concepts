// Dev utility: moves a real mouse through points (optionally after scrolling to a selector)
// and screenshots, to check pointer-driven effects.
// Usage: node scripts/dev/hover.mjs <url> <out.png> <w>x<h> "<x,y;x,y;...>" [scrollSelector]
import { chromium } from 'playwright';
const [, , url, out, size, path, sel] = process.argv;
const [w, h] = size.split('x').map(Number);
const browser = await chromium.launch({ channel: 'chrome', args: ['--enable-gpu', '--ignore-gpu-blocklist', '--use-angle=d3d11'] });
const page = await browser.newPage({ viewport: { width: w, height: h } });
const problems = [];
page.on('pageerror', (e) => problems.push('pageerror: ' + e.message));
page.on('console', (m) => { if (m.type() === 'error') problems.push(m.text().slice(0, 200)); });
await page.goto(url, { waitUntil: 'networkidle' });
await page.waitForTimeout(1500);
if (sel) {
  await page.evaluate((s) => { const el = document.querySelector(s); const y = el.getBoundingClientRect().top + scrollY - 80; if (window.__lenis) window.__lenis.scrollTo(y, { immediate: true, force: true }); else scrollTo(0, y); }, sel);
  await page.waitForTimeout(1500);
}
const pts = path.split(';').map((p) => p.split(',').map(Number));
for (const [x, y] of pts) { await page.mouse.move(x, y, { steps: 8 }); await page.waitForTimeout(60); }
await page.waitForTimeout(700);
await page.screenshot({ path: out });
console.log(problems.length ? problems.join('\n') : 'no console problems');
await browser.close();
