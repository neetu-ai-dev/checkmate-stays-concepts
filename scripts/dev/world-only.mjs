// Dev utility: screenshots only the fixed 3D world of a page (hides every other layer).
// Usage: node scripts/dev/world-only.mjs <url> <out.png> <worldSelector> [scrollFraction]
import { chromium } from 'playwright';
const [, , url, out, sel, frac = '0'] = process.argv;
const browser = await chromium.launch({ channel: 'chrome', args: ['--enable-gpu', '--ignore-gpu-blocklist', '--use-angle=d3d11'] });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.goto(url, { waitUntil: 'networkidle' });
await page.waitForTimeout(1200);
await page.evaluate(async (f) => {
  const y = (document.documentElement.scrollHeight - innerHeight) * Number(f);
  if (window.__lenis) window.__lenis.scrollTo(y, { immediate: true, force: true }); else scrollTo(0, y);
}, frac);
await page.waitForTimeout(2500);
await page.addStyleTag({ content: `body * { visibility: hidden !important; } ${sel}, ${sel} * { visibility: visible !important; }` });
await page.waitForTimeout(200);
await page.screenshot({ path: out });
const px = await page.evaluate((s) => {
  const c = document.querySelector(s + ' canvas');
  return c ? `${c.width}x${c.height}` : 'none';
}, sel);
console.log(out, px);
await browser.close();
