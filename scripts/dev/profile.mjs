// Dev utility: measures rendering cost of a page (and its iframes): frame pacing, rAF
// callbacks, WebGL draw calls, canvas backing sizes and long tasks — at the top of the page
// and again after scrolling the hero out of view.
// Usage: node scripts/dev/profile.mjs <url> [w]x[h] [--touch]
import { chromium } from 'playwright';

const [, , url, size = '1440x900', ...flags] = process.argv;
const [w, h] = size.split('x').map(Number);
const browser = await chromium.launch({ channel: 'chrome', args: ['--enable-gpu', '--ignore-gpu-blocklist', '--use-angle=d3d11', '--enable-unsafe-swiftshader'] });
const context = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: flags.includes('--touch') ? 2 : 1, hasTouch: flags.includes('--touch'), isMobile: flags.includes('--touch') });
await context.addInitScript(() => {
  const stats = { raf: 0, draws: 0, longTasks: 0, longMs: 0 };
  window.__stats = stats;
  const raf = window.requestAnimationFrame.bind(window);
  window.requestAnimationFrame = (cb) => raf((t) => { stats.raf++; cb(t); });
  for (const Ctx of [window.WebGLRenderingContext, window.WebGL2RenderingContext]) {
    if (!Ctx) continue;
    for (const fn of ['drawArrays', 'drawElements', 'drawArraysInstanced', 'drawElementsInstanced']) {
      const orig = Ctx.prototype[fn];
      if (orig) Ctx.prototype[fn] = function (...a) { stats.draws++; return orig.apply(this, a); };
    }
  }
  try {
    new PerformanceObserver((l) => { for (const e of l.getEntries()) { stats.longTasks++; stats.longMs += e.duration; } }).observe({ type: 'longtask', buffered: true });
  } catch {}
});
const page = await context.newPage();
await page.goto(url, { waitUntil: 'networkidle', timeout: 60000 });
await page.waitForTimeout(4000);

const gpu = await page.evaluate(() => {
  const gl = document.createElement('canvas').getContext('webgl');
  const ext = gl?.getExtension('WEBGL_debug_renderer_info');
  return ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : 'unknown';
});
console.log('GPU:', gpu);

async function sample(label) {
  const frames = page.frames();
  for (const f of frames) await f.evaluate(() => { const s = window.__stats; if (s) { s.raf = 0; s.draws = 0; s.longTasks = 0; s.longMs = 0; } }).catch(() => {});
  const pacing = await page.evaluate(() => new Promise((res) => {
    const times = []; let last = performance.now();
    const tick = (t) => { times.push(t - last); last = t; if (times.length < 180) requestAnimationFrame(tick); else res(times); };
    requestAnimationFrame(tick);
  }));
  const sorted = [...pacing].sort((a, b) => a - b);
  const secs = pacing.reduce((a, b) => a + b, 0) / 1000;
  console.log(`\n[${label}] main-frame pacing: avg ${(secs * 1000 / pacing.length).toFixed(1)}ms  p95 ${sorted[Math.floor(sorted.length * 0.95)].toFixed(1)}ms  ~${(pacing.length / secs).toFixed(0)} fps`);
  for (const f of page.frames()) {
    const s = await f.evaluate(() => {
      const st = window.__stats || {};
      const canvases = [...document.querySelectorAll('canvas')].map((c) => `${c.width}x${c.height}${c.getContext ? '' : ''}`);
      return { raf: st.raf, draws: st.draws, longTasks: st.longTasks, longMs: Math.round(st.longMs || 0), canvases };
    }).catch(() => null);
    if (!s) continue;
    const name = f === page.mainFrame() ? 'main' : `iframe ${f.url().split('/').pop()}`;
    console.log(`  ${name}: rAF callbacks/s ${(s.raf / secs).toFixed(0)}, draw calls/s ${(s.draws / secs).toFixed(0)} (${(s.draws / Math.max(1, pacing.length)).toFixed(1)}/frame), long tasks ${s.longTasks} (${s.longMs}ms), canvases ${s.canvases.join(' ')}`);
  }
}
await sample('hero in view');
await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight * 0.6));
await page.waitForTimeout(1500);
await sample('hero scrolled out of view');
await browser.close();
