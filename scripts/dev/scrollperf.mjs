// Dev utility: frame pacing while wheel-scrolling continuously through a page section.
// Usage: node scripts/dev/scrollperf.mjs <url> <fromSelector> <px> [w]x[h] [--throttle=N] [--css="extra css"]
import { chromium } from 'playwright';
const [, , url, sel, dist = '3000', size = '1440x900', ...flags] = process.argv;
const [w, h] = size.split('x').map(Number);
const throttle = Number((flags.find((f) => f.startsWith('--throttle=')) || '=1').split('=')[1]);
const browser = await chromium.launch({ channel: 'chrome', args: ['--enable-gpu', '--ignore-gpu-blocklist', '--use-angle=d3d11'] });
const page = await browser.newPage({ viewport: { width: w, height: h } });
await page.goto(url, { waitUntil: 'networkidle' });
await page.waitForTimeout(1500);
await page.evaluate((s) => { const y = document.querySelector(s).getBoundingClientRect().top + scrollY - innerHeight; if (window.__lenis) window.__lenis.scrollTo(y, { immediate: true, force: true }); else scrollTo(0, y); }, sel);
await page.waitForTimeout(1200);
if (throttle > 1) { const cdp = await page.context().newCDPSession(page); await cdp.send('Emulation.setCPUThrottlingRate', { rate: throttle }); }
const css = flags.find((f) => f.startsWith('--css='));
if (css) await page.addStyleTag({ content: css.slice(6) });
await page.mouse.move(w / 2, h / 2);
await page.evaluate(() => { window.__f = []; let last = performance.now(); const tick = (t) => { window.__f.push(t - last); last = t; if (!window.__stop) requestAnimationFrame(tick); }; requestAnimationFrame(tick); });
for (let y = 0; y < Number(dist); y += 100) { await page.mouse.wheel(0, 100); await page.waitForTimeout(16); }
await page.waitForTimeout(800);
const f = await page.evaluate(() => { window.__stop = true; return window.__f.slice(2); });
f.sort((a, b) => a - b);
const pct = (p) => f[Math.min(f.length - 1, Math.floor(f.length * p))].toFixed(1);
console.log(`${url} ${size}${throttle > 1 ? ` cpu×${throttle}` : ''}: ${f.length} frames, median ${pct(0.5)}ms, p95 ${pct(0.95)}ms, p99 ${pct(0.99)}ms, >50ms: ${f.filter((x) => x > 50).length}`);
await browser.close();
