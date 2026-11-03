// Dev utility: screenshots a page at several moments after load (for timed intros).
// Usage: node scripts/dev/timeline.mjs <url> <outPrefix> <w>x<h> <ms,ms,...> [--touch] [--reduced]
import { chromium } from 'playwright';
const [, , url, out, size, times, ...flags] = process.argv;
const [w, h] = size.split('x').map(Number);
const browser = await chromium.launch({ channel: 'chrome', args: ['--enable-gpu', '--ignore-gpu-blocklist', '--use-angle=d3d11'] });
const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: flags.includes('--touch') ? 2 : 1, hasTouch: flags.includes('--touch'), isMobile: flags.includes('--touch'), reducedMotion: flags.includes('--reduced') ? 'reduce' : 'no-preference' });
const page = await ctx.newPage();
const problems = [];
page.on('pageerror', (e) => problems.push('pageerror: ' + e.message));
page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') problems.push(m.type() + ': ' + m.text().slice(0, 240)); });
page.on('response', (r) => { if (r.status() >= 400) problems.push(`HTTP ${r.status()} ${r.url()}`); });
const t0 = Date.now();
await page.goto(url, { waitUntil: 'domcontentloaded' });
for (const ms of times.split(',').map(Number)) {
  const wait = ms - (Date.now() - t0);
  if (wait > 0) await page.waitForTimeout(wait);
  await page.screenshot({ path: `${out}-${ms}.png` });
}
const overflow = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
if (overflow > 0) problems.push('HORIZONTAL OVERFLOW ' + overflow);
console.log(problems.length ? problems.join('\n') : 'no console problems');
await browser.close();
