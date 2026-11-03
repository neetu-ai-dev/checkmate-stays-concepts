// Dev utility: scrolls a page through a list of positions, screenshots each, and reports
// console errors, page errors and failed requests.
// Usage: node scripts/dev/capture.mjs <url> <outPrefix> <w>x<h> <positions> [--reduced] [--touch] [--full]
//   positions: comma list; "s:0.4" = fraction of the first <section>'s scrollable length,
//              "y:1200" = absolute px, "sel:#suites" = element top, "end" = page bottom.
import { chromium } from 'playwright';

const [, , url, out, size, positions = 'y:0', ...flags] = process.argv;
const [w, h] = size.split('x').map(Number);
const browser = await chromium.launch({ channel: 'chrome' });
const context = await browser.newContext({
  viewport: { width: w, height: h },
  deviceScaleFactor: flags.includes('--touch') ? 2 : 1,
  hasTouch: flags.includes('--touch'),
  isMobile: flags.includes('--touch'),
  reducedMotion: flags.includes('--reduced') ? 'reduce' : 'no-preference',
});
const page = await context.newPage();
const problems = [];
page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') problems.push(`${m.type()}: ${m.text().slice(0, 300)}`); });
page.on('pageerror', (e) => problems.push(`pageerror: ${e.message.slice(0, 300)}`));
page.on('requestfailed', (r) => { if (!r.url().includes('fonts.g')) problems.push(`requestfailed: ${r.url()} ${r.failure()?.errorText}`); });
page.on('response', (r) => { if (r.status() >= 400) problems.push(`HTTP ${r.status()}: ${r.url()}`); });
// never let a test click open the real booking engine
await page.addInitScript(() => { window.open = (u) => { window.__opened = (window.__opened || []).concat(String(u)); return null; }; });
await page.goto(url, { waitUntil: 'networkidle', timeout: 60000 });
await page.waitForTimeout(1500);

for (const pos of positions.split(',')) {
  const y = await page.evaluate((pos) => {
    const [kind, val] = pos.split(':');
    if (kind === 's') {
      const s = document.querySelector('section');
      return s.offsetTop + (s.offsetHeight - innerHeight) * Number(val);
    }
    if (kind === 'sel') { const el = document.querySelector(val); return el ? el.getBoundingClientRect().top + scrollY : 0; }
    if (kind === 'end') return document.documentElement.scrollHeight;
    return Number(val);
  }, pos);
  await page.evaluate(async (y) => {
    // step through so scrubbed timelines and once-only reveals fire
    const from = scrollY, steps = 12;
    for (let i = 1; i <= steps; i++) {
      const t = from + ((y - from) * i) / steps;
      if (window.__lenis) window.__lenis.scrollTo(t, { immediate: true, force: true }); else window.scrollTo(0, t);
      await new Promise((r) => setTimeout(r, 40));
    }
  }, y);
  await page.waitForTimeout(1600);
  const name = `${out}-${pos.replace(/[:#.]/g, '_')}.png`;
  await page.screenshot({ path: name, fullPage: flags.includes('--full') });
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
  console.log('shot', name, 'y=', Math.round(y), overflow > 0 ? 'HORIZONTAL OVERFLOW ' + overflow + 'px' : '');
}
console.log(problems.length ? problems.join('\n') : 'no console problems');
await browser.close();
