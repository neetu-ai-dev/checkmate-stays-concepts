// Dev utility: screenshots a tall scroll track (a sticky stage inside it) at fractions of its travel.
// Usage: node scripts/dev/track.mjs <url> <trackSelector> <outPrefix> <w>x<h> <f,f,...> [--touch] [--reduced]
import { chromium } from 'playwright';
const [, , url, sel, out, size, fracs, ...flags] = process.argv;
const [w, h] = size.split('x').map(Number);
const browser = await chromium.launch({ channel: 'chrome', args: ['--enable-gpu', '--ignore-gpu-blocklist', '--use-angle=d3d11'] });
const context = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: flags.includes('--touch') ? 2 : 1, hasTouch: flags.includes('--touch'), isMobile: flags.includes('--touch'), reducedMotion: flags.includes('--reduced') ? 'reduce' : 'no-preference' });
const page = await context.newPage();
const problems = [];
page.on('pageerror', (e) => problems.push('pageerror: ' + e.message));
page.on('console', (m) => { if (m.type() === 'error') problems.push('console: ' + m.text().slice(0, 200)); });
await page.goto(url, { waitUntil: 'networkidle', timeout: 60000 });
await page.waitForTimeout(1200);
const scrollTo = (y) => page.evaluate(async (y) => {
  const from = scrollY, steps = 16;
  for (let i = 1; i <= steps; i++) { const t = from + ((y - from) * i) / steps; if (window.__lenis) window.__lenis.scrollTo(t, { immediate: true, force: true }); else window.scrollTo(0, t); await new Promise((r) => setTimeout(r, 30)); }
}, y);
const r = await page.evaluate((sel) => { const el = document.querySelector(sel); return { top: el.getBoundingClientRect().top + scrollY, len: el.offsetHeight - innerHeight }; }, sel);
for (const f of fracs.split(',').map(Number)) {
  await scrollTo(r.top + r.len * f); await page.waitForTimeout(1200);
  await page.screenshot({ path: `${out}-t${f}.png` });
}
const overflow = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
if (overflow > 0) problems.push('HORIZONTAL OVERFLOW ' + overflow);
console.log(problems.length ? problems.join('\n') : 'no console problems');
await browser.close();
