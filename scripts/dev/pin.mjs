// Dev utility: screenshots a scroll-pinned section at points along its pin, then just after it
// releases, and reports whether the track actually moved and whether the next section overlaps.
// Usage: node scripts/dev/pin.mjs <url> <pinnedSelector> <outPrefix> <w>x<h> [--touch] [--reduced]
import { chromium } from 'playwright';

const [, , url, sel, out, size, ...flags] = process.argv;
const [w, h] = size.split('x').map(Number);
const browser = await chromium.launch({ channel: 'chrome', args: ['--enable-gpu', '--ignore-gpu-blocklist', '--use-angle=d3d11'] });
const context = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: flags.includes('--touch') ? 2 : 1, hasTouch: flags.includes('--touch'), isMobile: flags.includes('--touch'), reducedMotion: flags.includes('--reduced') ? 'reduce' : 'no-preference' });
const page = await context.newPage();
const problems = [];
page.on('pageerror', (e) => problems.push('pageerror: ' + e.message));
page.on('console', (m) => { if (m.type() === 'error') problems.push('console: ' + m.text().slice(0, 200)); });
await page.addInitScript(() => { window.open = (u) => { window.__opened = (window.__opened || []).concat(String(u)); return null; }; });
await page.goto(url, { waitUntil: 'networkidle', timeout: 60000 });
await page.waitForTimeout(1200);

const scrollTo = (y) => page.evaluate(async (y) => {
  const from = scrollY, steps = 14;
  for (let i = 1; i <= steps; i++) {
    const t = from + ((y - from) * i) / steps;
    if (window.__lenis) window.__lenis.scrollTo(t, { immediate: true, force: true }); else window.scrollTo(0, t);
    await new Promise((r) => setTimeout(r, 35));
  }
}, y);

// walk down to the section first so lazy images and reveals above it settle
const top = await page.evaluate((sel) => document.querySelector(sel).getBoundingClientRect().top + scrollY, sel);
await scrollTo(top - h);
await page.waitForTimeout(600);
const range = await page.evaluate(async (sel) => {
  const el = document.querySelector(sel);
  const spacer = el.parentElement?.classList.contains('pin-spacer') ? el.parentElement : null;
  const start = (spacer ?? el).getBoundingClientRect().top + scrollY;
  const len = spacer ? spacer.offsetHeight - el.offsetHeight : 0;
  return { start, len, pinned: !!spacer };
}, sel);
console.log('pinned:', range.pinned, 'start', Math.round(range.start), 'travel', range.len);
const track = async () => page.evaluate((sel) => {
  const t = document.querySelector(sel).querySelector('ul');
  return { x: Math.round(t.getBoundingClientRect().left), scrollLeft: Math.round(t.scrollLeft) };
}, sel);
for (const f of range.pinned ? [0, 0.5, 1] : [0]) {
  await scrollTo(range.start + range.len * f);
  await page.waitForTimeout(1300);
  await page.screenshot({ path: `${out}-p${f}.png` });
  console.log('at', f, JSON.stringify(await track()), 'secTop', await page.evaluate((sel) => Math.round(document.querySelector(sel).getBoundingClientRect().top), sel));
}
await scrollTo(range.start + range.len + h * 0.6);
await page.waitForTimeout(1300);
await page.screenshot({ path: `${out}-after.png` });
const overlap = await page.evaluate((sel) => {
  const el = document.querySelector(sel);
  const host = el.parentElement?.classList.contains('pin-spacer') ? el.parentElement : el;
  const next = host.nextElementSibling;
  if (!next) return null;
  return Math.round(el.getBoundingClientRect().bottom - next.getBoundingClientRect().top);
}, sel);
console.log('section bottom minus next top (should be <= 0):', overlap);
const overflow = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
if (overflow > 0) problems.push('HORIZONTAL OVERFLOW ' + overflow);
console.log(problems.length ? problems.join('\n') : 'no console problems');
await browser.close();
