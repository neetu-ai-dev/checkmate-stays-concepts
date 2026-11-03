// Dev utility: interaction checks for every concept. window.open is stubbed, so booking
// searches are recorded rather than sent to the live engine.
// Usage: node scripts/dev/interact.mjs <baseUrl> <shotDir>
import { chromium } from 'playwright';

const [, , base = 'http://localhost:5180', shots = '.'] = process.argv;
const browser = await chromium.launch({ channel: 'chrome', args: ['--enable-gpu', '--ignore-gpu-blocklist', '--use-angle=d3d11'] });
const results = [];
const check = (name, ok, detail = '') => { results.push({ name, ok, detail }); console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  — ' + detail : ''}`); };
const DEEP = /^https:\/\/letsbook\.me\/booking\/checkmate\?checkin=\d{4}-\d\d-\d\d&checkout=\d{4}-\d\d-\d\d&adults=3&children=1$/;

async function open(path, opts = {}) {
  const context = await browser.newContext({ viewport: opts.viewport ?? { width: 1440, height: 900 }, reducedMotion: opts.reduced ? 'reduce' : 'no-preference', hasTouch: !!opts.touch, isMobile: !!opts.touch, deviceScaleFactor: opts.touch ? 2 : 1 });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('response', (r) => { if (r.status() >= 400) errors.push(`HTTP ${r.status()} ${r.url()}`); });
  await page.addInitScript(() => { window.open = (u) => { window.__opened = (window.__opened || []).concat(String(u)); return null; }; });
  await page.goto(base + path, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1200);
  return { page, context, errors };
}

const scrollToY = (page, y) => page.evaluate((y) => { if (window.__lenis) window.__lenis.scrollTo(y, { immediate: true, force: true }); else window.scrollTo(0, y); }, y);
const scrollToSel = (page, sel, offset = -80) => page.evaluate(([s, o]) => {
  const el = document.querySelector(s); const y = el.getBoundingClientRect().top + scrollY + o;
  if (window.__lenis) window.__lenis.scrollTo(y, { immediate: true, force: true }); else window.scrollTo(0, y);
}, [sel, offset]);
const scrollFrac = (page, sel, f) => page.evaluate(([s, f]) => {
  const el = document.querySelector(s); const y = el.offsetTop + (el.offsetHeight - innerHeight) * f;
  if (window.__lenis) window.__lenis.scrollTo(y, { immediate: true, force: true }); else window.scrollTo(0, y);
}, [sel, f]);

const bookingCheck = async (page, label, formSel) => {
  const form = page.locator(formSel).first();
  await form.scrollIntoViewIfNeeded();
  await page.waitForTimeout(400);
  await form.getByRole('button', { name: 'More adults' }).click();
  await form.getByRole('button', { name: 'More children' }).click();
  await form.locator('button[type=submit]').click();
  const url = (await page.evaluate(() => window.__opened || [])).at(-1) || '';
  check(`${label}: booking deep-link`, DEEP.test(url), url);
};

/** Walk the page top to bottom (loading lazy images, triggering reveals), then check every image. */
const imageSweep = async (page, label) => {
  const h = await page.evaluate(() => document.documentElement.scrollHeight);
  for (let y = 0; y < h; y += 700) { await scrollToY(page, y); await page.waitForTimeout(120); }
  await page.waitForTimeout(800);
  const res = await page.evaluate(() => {
    const imgs = [...document.querySelectorAll('img')];
    const broken = imgs.filter((i) => i.complete && i.naturalWidth === 0).map((i) => i.currentSrc || i.src);
    const pending = imgs.filter((i) => !i.complete).length;
    return { total: imgs.length, broken, pending };
  });
  check(`${label}: all images load (${res.total})`, res.broken.length === 0, res.broken.join(' ') + (res.pending ? ` pending=${res.pending}` : ''));
};

const cursorJourney = async (page, label) => {
  const stage = () => page.evaluate(() => document.documentElement.dataset.cursorStage);
  await scrollToY(page, 0); await page.waitForTimeout(300);
  const top = await stage();
  const max = await page.evaluate(() => document.documentElement.scrollHeight - innerHeight);
  await scrollToY(page, max * 0.5); await page.waitForTimeout(300);
  const mid = await stage();
  await scrollToY(page, max); await page.waitForTimeout(300);
  const end = await stage();
  await scrollToY(page, 0); await page.waitForTimeout(300);
  const back = await stage();
  const cur = await page.evaluate(() => getComputedStyle(document.querySelector('main') || document.body).cursor);
  check(`${label}: cursor pawn → queen and back`, top === 'pawn' && mid === 'bishop' && end === 'queen' && back === 'pawn' && cur.includes('data:image/svg+xml'), `${top} → ${mid} → ${end} → ${back}`);
};

/** Scroll-pinned rail: the section holds while its track moves sideways with scroll, then releases. */
const pinCheck = async (page, label, sectionSel) => {
  const info = await page.evaluate((sel) => {
    const el = document.querySelector(sel);
    const spacer = el.parentElement?.classList.contains('pin-spacer') ? el.parentElement : null;
    return spacer ? { start: spacer.getBoundingClientRect().top + scrollY, travel: spacer.offsetHeight - el.offsetHeight } : null;
  }, sectionSel);
  check(label + ': pinned with scroll travel', !!info && info.travel > 300, JSON.stringify(info));
  if (!info) return;
  const x = () => page.evaluate((sel) => Math.round(document.querySelector(sel + ' ul').getBoundingClientRect().left), sectionSel);
  await scrollToY(page, info.start); await page.waitForTimeout(1200);
  const x0 = await x();
  await scrollToY(page, info.start + info.travel * 0.6); await page.waitForTimeout(1500);
  const mid = await page.evaluate((sel) => ({ top: Math.round(document.querySelector(sel).getBoundingClientRect().top) }), sectionSel);
  const x1 = await x();
  check(label + ': vertical scroll moves the track sideways while held', x1 < x0 - 200 && Math.abs(mid.top) <= 2, x0 + ' → ' + x1 + ', section top ' + mid.top);
  await page.waitForTimeout(3000);
  check(label + ': no timed autoplay', Math.abs((await x()) - x1) < 2);
  await scrollToY(page, info.start + info.travel + 400); await page.waitForTimeout(1200);
  const after = await page.evaluate((sel) => {
    const el = document.querySelector(sel); const host = el.parentElement.classList.contains('pin-spacer') ? el.parentElement : el;
    const next = host.nextElementSibling;
    return { secBottom: Math.round(el.getBoundingClientRect().bottom), nextTop: next ? Math.round(next.getBoundingClientRect().top) : null };
  }, sectionSel);
  check(label + ': releases into the next section without overlap', after.nextTop === null || after.secBottom <= after.nextTop + 1, JSON.stringify(after));
  return info;
};

// ── Hub + retired Night Watch ──────────────────────────────────────────────
{
  const { page, context, errors } = await open('/');
  const cards = await page.locator('.hub-card').count();
  const nw = await page.locator('a[href="/concepts/night-watch"]').count();
  const order = await page.locator('.hub-title').allInnerTexts();
  check('Hub: four concepts in order, no Night Watch', cards === 4 && nw === 0 && order.join() === 'Ridgelight,Approach,Checkmate,Highlands', order.join(', '));
  await page.goto(base + '/concepts/night-watch', { waitUntil: 'networkidle' });
  check('Old Night Watch link returns to the overview', new URL(page.url()).pathname === '/');
  check('Hub: no runtime errors', errors.length === 0, errors.join(' | '));
  await context.close();
}

// ── Checkmate — shorter opening, booking after the board ───────────────
{
  const { page, context, errors } = await open('/concepts/checkmate');
  check('Checkmate: no booking window in the chess scene', (await page.locator('.cm-stage form, .cm-book-group').count()) === 0);
  check('Checkmate: switcher omits Night Watch', (await page.locator('.concept-switcher a[href="/concepts/night-watch"]').count()) === 0 && (await page.locator('.concept-switcher a').count()) === 5);
  await page.waitForTimeout(1500);
  const opening = await page.evaluate(() => ({ canvas: document.querySelector('.cm-canvas').classList.contains('is-in'), open: Number(getComputedStyle(document.querySelector('[data-ov="open"]')).opacity), introVh: document.querySelector('.cm-intro').offsetHeight / innerHeight }));
  check('Checkmate: brief entrance settles on the board, short scroll track', opening.canvas && opening.open > 0.9 && opening.introVh <= 2.6, JSON.stringify(opening));
  await scrollFrac(page, '.cm-intro', 0.22); await page.waitForTimeout(1500);
  check('Checkmate: the mate plays on the first scrolls', Number(await page.evaluate(() => getComputedStyle(document.querySelector('[data-ov="mate"]')).opacity)) > 0.5);
  await page.screenshot({ path: shots + '/c1-mate.png' });
  await scrollToY(page, 0); await page.waitForTimeout(800);
  await page.getByRole('button', { name: 'Skip intro' }).click();
  await page.waitForTimeout(800);
  check('Checkmate: Skip intro lands on the hero', (await page.evaluate(() => document.activeElement?.tagName)) === 'H1');
  await page.getByRole('button', { name: 'Book now' }).click(); await page.waitForTimeout(1600);
  check('Checkmate: Book now reaches the booking section', await page.evaluate(() => { const r = document.querySelector('#book').getBoundingClientRect(); return r.top >= 0 && r.bottom <= innerHeight + 40; }));
  check('Checkmate: header turns solid past the board', await page.evaluate(() => document.querySelector('.cm-header').classList.contains('is-scrolled')));
  await bookingCheck(page, 'Checkmate opening section', '#book');
  await bookingCheck(page, 'Checkmate closing', '#book-final');
  await cursorJourney(page, 'Checkmate');
  await imageSweep(page, 'Checkmate');
  check('Checkmate: no runtime errors', errors.length === 0, errors.join(' | '));
  await context.close();
}
{
  const { page, context, errors } = await open('/concepts/checkmate', { reduced: true });
  check('Checkmate reduced: static hero, no sequence', await page.evaluate(() => document.querySelector('.cm-intro').offsetHeight <= Math.max(innerHeight, 640) + 2));
  check('Checkmate reduced: no runtime errors', errors.length === 0, errors.join(' | '));
  await context.close();
}

// ── Highlands — photographic scenery, scroll-driven experiences ─────────
{
  const { page, context, errors } = await open('/concepts/highlands');
  await page.waitForTimeout(2500);
  const frame = page.frameLocator('iframe.lg-frame');
  check('Highlands: authored hero loaded with Checkmate copy', /Pause where/.test(await frame.locator('.headline').innerText()));
  check('Highlands: photographic scene drawing into authored #scene', await page.evaluate(() => { const c = document.querySelector('iframe.lg-frame').contentDocument.getElementById('scene'); return c.width > 300 && c.height > 300; }));
  const fcur = await frame.locator('body').evaluate((b) => getComputedStyle(b).cursor);
  check('Highlands: chess cursor inside the hero', fcur.includes('data:image/svg+xml'));
  await frame.locator('.liquid-button--explore').click();
  await page.waitForTimeout(1500);
  check('Highlands: liquid-metal "Book your stay" scrolls to booking', Math.abs(await page.evaluate(() => document.querySelector('#book').getBoundingClientRect().top)) < 80);
  await scrollToSel(page, '#suites', 0); await page.waitForTimeout(800);
  check('Highlands: hero loops parked off-screen', await page.evaluate(() => document.querySelector('iframe.lg-frame').contentWindow.__parked === true));
  await scrollToY(page, 0); await page.waitForTimeout(800);
  check('Highlands: hero loops resume on return', await page.evaluate(() => document.querySelector('iframe.lg-frame').contentWindow.__parked === false));
  await frame.locator('.dock-item', { hasText: 'Suites' }).click();
  await page.waitForTimeout(1500);
  check('Highlands: dock "Suites" scrolls to suites', Math.abs(await page.evaluate(() => document.querySelector('#suites').getBoundingClientRect().top)) < 80);
  await bookingCheck(page, 'Highlands band', '#book form');
  const info = await pinCheck(page, 'Highlands experiences', '#experiences');
  if (info) {
    await scrollToY(page, info.start + 10); await page.waitForTimeout(1000);
    await page.getByRole('button', { name: 'Town & temple' }).click(); await page.waitForTimeout(2200);
    const t = await page.evaluate(() => ({ count: document.querySelector('.lg-exp-count').textContent, current: document.querySelector('.lg-exp .dt-item.is-active')?.textContent }));
    check('Highlands: dock tabs jump along the sequence', /0[7-9] \/ 09/.test(t.count) && t.current === 'Town & temple', JSON.stringify(t));
  }
  const foot = await page.evaluate(() => {
    const mark = document.querySelector('.lg-footer-mark').getBoundingClientRect();
    return { markW: Math.round(mark.width), tel: document.querySelectorAll('.lg-footer a[href^="tel:"]').length, mail: !!document.querySelector('.lg-footer a[href^="mailto:"]'), nav: document.querySelectorAll('.lg-footer nav a').length };
  });
  check('Highlands: footer wordmark at brand scale with nav and contact', foot.markW <= 160 && foot.tel >= 3 && foot.mail && foot.nav >= 5, JSON.stringify(foot));
  await scrollToSel(page, '#connect', 0); await page.waitForTimeout(600);
  await page.locator('.lg-footer-cta').getByRole('button', { name: 'Check availability' }).click(); await page.waitForTimeout(1500);
  check('Highlands: footer booking action reaches the booking band', Math.abs(await page.evaluate(() => document.querySelector('#book').getBoundingClientRect().top)) < 80);
  await cursorJourney(page, 'Highlands');
  await imageSweep(page, 'Highlands');
  check('Highlands: no runtime errors', errors.length === 0, errors.join(' | '));
  await context.close();
}
for (const [label, opts] of [['Highlands reduced', { reduced: true }], ['Highlands phone', { touch: true, viewport: { width: 390, height: 844 } }]]) {
  const { page, context, errors } = await open('/concepts/highlands', opts);
  await scrollToSel(page, '.lg-rail', -200); await page.waitForTimeout(500);
  const r = await page.evaluate(() => { const el = document.querySelector('.lg-rail'); return { pinned: document.querySelector('.lg-exp').classList.contains('is-pinned'), scrollable: el.scrollWidth > el.clientWidth + 50, ox: getComputedStyle(el).overflowX }; });
  check(label + ': swipeable row instead of a pinned sequence', !r.pinned && r.scrollable && r.ox === 'auto', JSON.stringify(r));
  check(label + ': no runtime errors', errors.length === 0, errors.join(' | '));
  await context.close();
}

// ── Ridgelight — ridgeline frames ─────────────────────────────
{
  const { page, context, errors } = await open('/concepts/ridgelight');
  check('Ridgelight: hero chapter chips removed', (await page.locator('.rl-chips').count()) === 0);
  const clockTop = await page.locator('.rl-clock').innerText();
  check('Ridgelight: no booking panel on the opening screen', await page.evaluate(() => { const p = document.querySelector('.rl-book-panel'); const r = p.getBoundingClientRect(); return r.top > innerHeight || Number(getComputedStyle(p).opacity) < 0.1; }));
  const frames = await page.locator('[data-ridge]').count();
  const before = await page.evaluate(() => Number(getComputedStyle(document.querySelector('.rl-g-living')).getPropertyValue('--r')));
  await scrollToSel(page, '.rl-gallery', -40); await page.waitForTimeout(1800);
  const after = await page.evaluate(() => ({ r: Number(getComputedStyle(document.querySelector('.rl-g-living')).getPropertyValue('--r')), clip: getComputedStyle(document.querySelector('.rl-g-living')).clipPath.slice(0, 8) }));
  check('Ridgelight: organic ridgeline frames reveal on scroll', frames >= 4 && before < 0.3 && after.r > 0.95 && after.clip === 'polygon(', frames + ' frames, --r ' + before + ' → ' + after.r);
  await scrollToSel(page, '#book', 0); await page.waitForTimeout(1500);
  check('Ridgelight: booking panel revealed on scroll', await page.evaluate(() => Number(getComputedStyle(document.querySelector('.rl-book-panel')).opacity) > 0.9));
  await bookingCheck(page, 'Ridgelight panel', '#book form');
  const max = await page.evaluate(() => document.documentElement.scrollHeight - innerHeight);
  const clocks = [];
  for (const f of [0.2, 0.42, 0.58, 0.72, 1]) { await scrollToY(page, max * f); await page.waitForTimeout(500); clocks.push(await page.locator('.rl-clock').innerText()); }
  check('Ridgelight: hours run morning → night with scroll', /Morning/.test(clockTop) && /Night/.test(clocks.at(-1)) && new Set(clocks.map((c) => c.split(' ·')[0])).size >= 4, [clockTop, ...clocks].join(' | '));
  await scrollToY(page, 0); await page.waitForTimeout(500);
  check('Ridgelight: hour reverses when scrolling back', /Morning/.test(await page.locator('.rl-clock').innerText()));
  await bookingCheck(page, 'Ridgelight closing', '#connect form');
  // the After Dark tunnel: page scroll flies the cards; the wheel is never captured
  check('Ridgelight: mixed After Dark cards replaced by the tunnel', (await page.locator('.rl-dark-card').count()) === 0 && (await page.locator('#after-dark .rl-tunnel-hero').count()) === 1);
  const track = await page.evaluate(() => { const t = document.querySelector('.rl-tunnel-track'); return { top: t.getBoundingClientRect().top + scrollY, len: t.offsetHeight - innerHeight }; });
  const cardsAt = async (f) => {
    await scrollToY(page, track.top + track.len * f); await page.waitForTimeout(1400);
    return page.evaluate(() => [...document.querySelectorAll('.rl-tunnel-hero [style*="translate3d"]')].map((c) => ({ o: Number(getComputedStyle(c).opacity), z: Number((c.style.transform.match(/,\s*(-?[\d.]+)px\)/) || [])[1]) })));
  };
  const c0 = await cardsAt(0.02), c1 = await cardsAt(0.5);
  const visible = (cs) => cs.filter((c) => c.o > 0.5).length;
  check('Ridgelight: tunnel cards fly forward with page scroll', c0.length === 9 && visible(c1) >= 3 && c1[0].z > c0[0].z + 400, 'visible ' + visible(c0) + ' → ' + visible(c1) + ', z ' + c0[0].z + ' → ' + c1[0].z);
  const y0 = await page.evaluate(() => scrollY);
  await page.mouse.move(720, 450); await page.mouse.wheel(0, 600); await page.waitForTimeout(900);
  check('Ridgelight: wheel inside the tunnel scrolls the page (no hijack)', (await page.evaluate(() => scrollY)) > y0 + 300);
  const head = await page.evaluate(() => getComputedStyle(document.querySelector('#rl-dark-h')).filter);
  // background softening: blur on the background layer only, in and back out
  await scrollToY(page, 0); await page.waitForTimeout(600);
  const top = await page.evaluate(() => ({ s: Number(getComputedStyle(document.querySelector('.rl')).getPropertyValue('--soften')), f: getComputedStyle(document.querySelector('.rl-world canvas')).filter }));
  await scrollToY(page, 1400); await page.waitForTimeout(600);
  const down = await page.evaluate(() => ({ s: Number(getComputedStyle(document.querySelector('.rl')).getPropertyValue('--soften')), f: getComputedStyle(document.querySelector('.rl-world canvas')).filter, fg: getComputedStyle(document.querySelector('main')).filter }));
  await scrollToY(page, 0); await page.waitForTimeout(600);
  const back = await page.evaluate(() => Number(getComputedStyle(document.querySelector('.rl')).getPropertyValue('--soften')));
  check('Ridgelight: background blurs after the opening and clears on return', top.s === 0 && /blur\(0px\)/.test(top.f) && down.s === 1 && /blur\(4px\)/.test(down.f) && back === 0, JSON.stringify({ top, down, back }));
  check('Ridgelight: foreground stays sharp', down.fg === 'none' && head === 'none', down.fg + ' / ' + head);
  await cursorJourney(page, 'Ridgelight');
  await imageSweep(page, 'Ridgelight');
  check('Ridgelight: no runtime errors', errors.length === 0, errors.join(' | '));
  await context.close();
}
{
  const { page, context, errors } = await open('/concepts/ridgelight', { reduced: true });
  await scrollToSel(page, '.rl-gallery', -40); await page.waitForTimeout(600);
  check('Ridgelight reduced: tunnel becomes a still grid', await page.evaluate(() => document.querySelector('.rl-tunnel').classList.contains('is-static') && document.querySelectorAll('#after-dark li .aspect-\\[4\\/5\\] img, #after-dark ul img').length >= 9));
  check('Ridgelight reduced: frames shown whole, no reveal', await page.evaluate(() => [...document.querySelectorAll('[data-ridge]')].every((f) => (getComputedStyle(f).getPropertyValue('--r').trim() || '1') === '1')));
  check('Ridgelight reduced: no runtime errors', errors.length === 0, errors.join(' | '));
  await context.close();
}

// ── Approach — the approach, the arrival ───────────────────────────────
{
  const { page, context, errors } = await open('/concepts/approach');
  check('Approach: approach canvas present', await page.evaluate(() => !!document.querySelector('.ap-scene canvas')));
  check('Approach: no hand-off frame or booking inside the approach', (await page.locator('.ap-handoff, .ap-stage form').count()) === 0);
  check('Approach: header uses the dock tabs', (await page.locator('.ap-nav .dt .dt-item').count()) === 4);
  await scrollFrac(page, '.ap-intro', 1); await page.waitForTimeout(1600);
  const w = await page.evaluate(() => {
    const sec = document.querySelector('#welcome').getBoundingClientRect(), copy = document.querySelector('.ap-welcome-copy').getBoundingClientRect(), book = document.querySelector('#book').getBoundingClientRect();
    return { top: Math.round(sec.top), arrived: document.querySelector('.ap-arrived').textContent, bookRightOfCopy: book.left > copy.right, bookVisible: book.bottom <= innerHeight + 2 };
  });
  check('Approach: approach hands straight to the arrival scene', Math.abs(w.top) <= 2 && w.arrived === 'You have arrived.', JSON.stringify(w));
  check('Approach: booking on the right of the arrival copy', w.bookRightOfCopy && w.bookVisible, JSON.stringify(w));
  await page.screenshot({ path: shots + '/c5-arrival.png' });
  await bookingCheck(page, 'Approach arrival panel', '#book');
  await scrollToY(page, 0); await page.waitForTimeout(600);
  await page.getByRole('button', { name: 'Skip the approach' }).click(); await page.waitForTimeout(1800);
  check('Approach: skip lands on the arrival', Math.abs(await page.evaluate(() => document.querySelector('#welcome').getBoundingClientRect().top)) < 4);
  await page.locator('.ap-nav .dt-item', { hasText: 'Experiences' }).click(); await page.waitForTimeout(1800);
  const ex = await page.evaluate(() => ({ top: Math.round(document.querySelector('#experiences').getBoundingClientRect().top), active: document.querySelector('.ap-nav .dt-item.is-active')?.textContent }));
  check('Approach: header tab scrolls and marks the section', Math.abs(ex.top - 72) < 12 && ex.active === 'Experiences', JSON.stringify(ex));
  const sq = await page.evaluate(() => ({ squares: document.querySelectorAll('.ap-board .ap-sq').length, images: document.querySelectorAll('.ap-board .ap-sq--img img').length }));
  check('Approach: experiences as Checkmate\'s board', sq.squares === 12 && sq.images === 6, JSON.stringify(sq));
  const info = await pinCheck(page, 'Approach suite features', '.ap-fs');
  if (info) {
    await scrollToY(page, info.start + 10); await page.waitForTimeout(1000);
    await page.locator('.ap-fs .dt-item', { hasText: 'Roof' }).click(); await page.waitForTimeout(2200);
    check('Approach: feature tabs jump along the sequence', (await page.evaluate(() => document.querySelector('.ap-fs .dt-item.is-active')?.textContent)) === 'Roof');
  }
  await bookingCheck(page, 'Approach closing', '#book-final');
  await cursorJourney(page, 'Approach');
  await imageSweep(page, 'Approach');
  check('Approach: no runtime errors', errors.length === 0, errors.join(' | '));
  await context.close();
}
{
  const { page, context, errors } = await open('/concepts/approach', { reduced: true });
  check('Approach reduced: static opening, arrival and rail without motion', await page.evaluate(() => document.querySelector('.ap-intro').offsetHeight <= Math.max(innerHeight, 640) + 2 && !document.querySelector('.ap-fs').classList.contains('is-pinned')));
  check('Approach reduced: no runtime errors', errors.length === 0, errors.join(' | '));
  await context.close();
}

// ── phones: native cursor, no overflow, no errors ───────────────────────
for (const path of ['/concepts/checkmate', '/concepts/highlands', '/concepts/ridgelight', '/concepts/approach']) {
  const { page, context, errors } = await open(path, { touch: true, viewport: { width: 390, height: 844 } });
  const cur = await page.evaluate(() => getComputedStyle(document.querySelector('main') || document.body).cursor);
  const h = await page.evaluate(() => document.documentElement.scrollHeight);
  let overflow = 0;
  for (let y = 0; y < h; y += 900) { await scrollToY(page, y); await page.waitForTimeout(80); overflow = Math.max(overflow, await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)); }
  if (path === '/concepts/ridgelight') {
    await scrollToY(page, 1400); await page.waitForTimeout(500);
    const m = await page.evaluate(() => ({ s: Number(getComputedStyle(document.querySelector('.rl')).getPropertyValue('--soften')), f: getComputedStyle(document.querySelector('.rl-world canvas')).filter }));
    check('touch Ridgelight: lightweight veil instead of blur', m.s === 1 && m.f === 'none', JSON.stringify(m));
  }
  check('touch ' + path + ': native cursor, no overflow, no errors', !cur.includes('data:image') && overflow <= 0 && errors.length === 0, cur.slice(0, 12) + ' overflow=' + overflow + ' ' + errors.join(' | '));
  await context.close();
}

console.log(`\n${results.filter((r) => r.ok).length}/${results.length} checks passed`);
await browser.close();
process.exit(results.every((r) => r.ok) ? 0 : 1);
