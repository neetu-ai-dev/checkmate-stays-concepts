// Derives Concept 2's hero document from the hash-verified SylvaHero page.
//
// Kept from the authored page: the stage layout, entrance wipes and masks, pointer
// parallax, the magnifying dock, both liquid-metal controls, the pixel-reveal cards and
// the knobs. Changed, each by an asserted replacement below:
//   - the moss/root/fern/butterfly scene is not built; the app's mountain renderer draws
//     into the same #scene canvas instead (that build was the main source of the lag);
//   - every rAF loop in the document can be parked by the parent while it is off-screen;
//   - the green palette becomes slate, warm stone, earth and amber;
//   - copy, card photographs and labels become Checkmate's (verified facts only);
//   - clicks are bridged to the parent page with postMessage.
// Usage: node scripts/derive-highlands.mjs
import fs from 'fs';
import crypto from 'crypto';

const SRC = 'archive/threeui-sylva/public/landing-pages/inner-green-3d.html';
const SRC_SHA = '69c3694bd63f44ef9f007ebe4dac57a83e4402e0cdf6b54dd10b96dd4f05e197';
const OUT_DIR = 'public/landing-pages';
const OUT = `${OUT_DIR}/highlands.html`;

const raw = fs.readFileSync(SRC);
const sha = crypto.createHash('sha256').update(raw).digest('hex');
if (sha !== SRC_SHA) throw new Error(`Source is not the verified SylvaHero document (${sha})`);
let html = raw.toString('utf8');

const replace = (label, from, to, { all = false } = {}) => {
  const count = typeof from === 'string' ? html.split(from).length - 1 : (html.match(from) || []).length;
  if (!count) throw new Error(`No match for: ${label}`);
  html = typeof from === 'string' ? (all ? html.split(from).join(to) : html.replace(from, to)) : html.replace(from, to);
};

// ── runtime hooks, first thing in <head> ─────────────────────────────────
replace('head hooks', '<meta charset="utf-8">', `<meta charset="utf-8">
<script>
/* Checkmate: the app renders the mountain scene into #scene, and may park every
   animation loop in this document while the frame is off-screen. */
(function () {
  var raf = window.requestAnimationFrame.bind(window), queue = [];
  window.__externalScene = true;
  window.__park = function (on) {
    window.__parked = !!on;
    if (!on) { var q = queue; queue = []; q.forEach(function (cb) { raf(cb); }); }
  };
  window.requestAnimationFrame = function (cb) {
    if (window.__parked) { queue.push(cb); return 0; }
    return raf(cb);
  };
})();
</script>`);

// ── skip the moss scene build; keep everything else on its authored boot ──
replace('scene build', 'try { build(); }', 'try { if (!window.__externalScene) build(); }');

// ── assets ───────────────────────────────────────────────────────────────
replace('three runtime path', 'inner-green-assets/three.min.js', 'highlands-assets/three.min.js');
replace('font path', 'inner-green-assets/lexend-latin.woff2', 'highlands-assets/lexend-latin.woff2');
replace('about card photo', '<img src="inner-green-assets/card-ethos.jpg" alt="A cushion of moss grown over lichen-crusted stones"', '<img src="/stock/foothills-mist-sm.webp" alt="Forested hills folding into mist below snow peaks"');
replace('diary card photo', '<img src="inner-green-assets/card-ecostove.jpg" alt="Moss-covered boulders in a misty grove"', '<img src="/stock/dal-sm.webp" alt="A bowl of dal beside rice"');

// ── palette: moss greens → slate, warm stone, earth (style block only) ───
const styleEnd = html.indexOf('</style>');
let style = html.slice(0, styleEnd);
const PALETTE = [
  ['#383b34', '#2b333d'], ['#4a4d44', '#3a4552'], ['#23261f', '#1d232b'], ['#7c8177', '#7a7166'],
  ['#f2f3ef', '#f4f0ea'], ['#eef1e7', '#efe9df'],
  ['rgba(240,246,232', 'rgba(244,238,228'], ['rgba(238,243,231', 'rgba(236,232,226'], ['rgba(232,238,222', 'rgba(226,232,240'],
  ['rgba(34,40,31', 'rgba(32,39,48'], ['rgba(31,37,28', 'rgba(29,36,45'], ['rgba(28,34,22', 'rgba(27,33,42'],
  ['rgba(10,14,8', 'rgba(9,12,17'], ['rgba(24,28,20', 'rgba(20,25,32'], ['rgba(16,21,13', 'rgba(14,19,26'],
  ['rgba(252,255,246', 'rgba(255,250,242'], ['rgba(8,10,8', 'rgba(7,9,12'], ['rgba(7,9,7', 'rgba(6,8,11'],
  ['#1b1e18', '#181d24'], ['#263025', '#252d38'], ['#3f453a', '#3d4652'], ['#fbfcf8', '#fdfaf5'],
];
for (const [from, to] of PALETTE) {
  if (!style.includes(from)) throw new Error(`Palette colour not found: ${from}`);
  style = style.split(from).join(to);
}
html = style + html.slice(styleEnd);

replace('mountain sky + amber accents', '</style>\n</head>', `
  /* ── Checkmate: a dawn plate behind everything, amber highlights ──────── */
  /* matches the graded photograph while it loads */
  .hero{
    background: linear-gradient(180deg, #3a4658 0%, #5d6474 30%, #b49486 52%, #8c7480 70%, #3e3a4a 100%) !important;
  }
  .hero::after{
    background:
      radial-gradient(70% 38% at 50% 104%, rgba(236,180,120,.26) 0%, rgba(236,180,120,.08) 50%, rgba(236,180,120,0) 75%),
      linear-gradient(180deg, rgba(20,26,34,0) 70%, rgba(20,26,34,.35) 100%) !important;
  }
  .stat dd{ color:#ffd9a6; font-weight:500; }
  .stat dt{ color:rgba(255,255,255,.9) !important; }
  .lede{ color:rgba(255,255,255,.94) !important; }
  .label{ letter-spacing:.02em; }
  .ghost{ color:rgba(255,255,255,.07); }
  /* the mountains are opaque where the moss was open, so the About card sits in front of them */
  .card--about{ z-index:4; }
  .headline, .lede, .stat{ text-shadow:0 1px 2px rgba(22,26,36,.35), 0 2px 22px rgba(22,26,36,.6); }
</style>
</head>`);

// ── copy: Checkmate, verified facts only ─────────────────────────────────
replace('title', '<title>Sylva — Into the living world</title>', '<title>Checkmate Stays — Highlands</title>');
replace('meta', /<meta name="description" content="[^"]*">/, '<meta name="description" content="A boutique homestay in Charleville, Mussoorie: two suites beneath a 200-year-old oak, facing the snow-capped Himalayas.">');
replace('headline 1', '<i style="--d:260ms">Step into</i>', '<i style="--d:260ms">Pause where</i>');
replace('headline 2', '<i style="--d:360ms">the living world</i>', '<i style="--d:360ms">the hills begin</i>');
replace('lede', 'We restore wild places through patient design, native planting, and a deeper kind of stewardship.', 'Two suites in Charleville, Mussoorie, beneath a 200-year-old oak and the snow-capped Himalayas.');
replace('ghost word', '>SYLVA</div>', '>HILLS</div>');
replace('dock mark label', 'aria-label="Sylva — home"', 'aria-label="Checkmate Stays — home"');
replace('dock mark glyph', /(<a class="dock-item dock-mark"[^>]*>\s*<svg viewBox=")0 0 22 24(" aria-hidden="true">)[\s\S]*?(<\/svg>)/,
  '$10 0 22 24$2<path d="M10 0.8h2v2.4h2.3v2H12v2.6h-2V5.2H7.7v-2H10z"/><path d="M4.6 8.6C8.6 6.8 13.4 6.8 17.4 8.6l-1.6 5H6.2z"/><rect x="5.6" y="13.6" width="10.8" height="1.9" rx=".9"/><path d="M7.4 15.5h7.2l1.5 5.4H5.9z"/><path d="M3.6 21h14.8v2.2H3.6z"/>$3');
replace('dock: grove', '<span>Grove</span>', '<span>Suites</span>');
replace('dock: habitats', '<span>Habitats</span>', '<span>Experiences</span>');
replace('dock: journal', '<span>Journal</span>', '<span>Diary</span>');
replace('dock: enter', '<span>Enter</span>', '<span>Book</span>');
replace('about label', '<p class="label">Our Ethos</p>', '<p class="label">Our commitment</p>');
replace('about title', '<h2>Let the wild lead.</h2>', '<h2>Rooted in the hills.</h2>');
replace('about knob', 'aria-label="Read about Sylva"', 'aria-label="Read about our sustainability"');
replace('stat a label', '<dt>Canopy restored</dt><dd>282 ha</dd>', '<dt>Private L-shaped balcony</dt><dd>5 m wide</dd>');
replace('stat b label', '<dt>Native species</dt><dd>43 mapped</dd>', '<dt>From Dehradun airport</dt><dd>62 km</dd>');
replace('diary label', '<p class="label">Field Note 07</p>', '<p class="label">The Mussoorie Diary</p>');
replace('diary title', '<h2>After the Rain</h2>', '<h2>Garhwali, slow-cooked</h2>');
replace('diary knob', 'aria-label="Open field note: After the Rain"', 'aria-label="Open the Mussoorie Diary"');
replace('explore label', '<span class="lbl">Explore the work</span>', '<span class="lbl">Book your stay</span>');
replace('play label', 'aria-label="Play the film"', 'aria-label="Discover the suites"');
replace('play glyph', '<path d="M8 5.2v13.6L19 12z" fill="currentColor"/>', '<path d="M12 5v13M6.5 12.5 12 18l5.5-5.5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>');

// ── bridge: authored controls drive the app page ─────────────────────────
replace('bridge', '</body>', `<script>
/* Checkmate: authored controls drive the host page; on narrow screens the host is told
   the authored one-column height so the page scrolls as one document. */
(function () {
  function send(action, target, value) {
    parent.postMessage({ source: 'checkmate-highlands', action: action, target: target, value: value }, location.origin);
  }
  function on(sel, fn) {
    document.querySelectorAll(sel).forEach(function (el) {
      el.addEventListener('click', function (e) { e.preventDefault(); fn(); });
    });
  }
  var targets = ['#suites', '#experiences', '#diary', null];
  document.querySelectorAll('.dock-item:not(.dock-mark)').forEach(function (a, i) {
    a.addEventListener('click', function (e) { e.preventDefault(); targets[i] ? send('goto', targets[i]) : send('book'); });
  });
  on('.dock-mark', function () { send('goto', '#top'); });
  on('.liquid-button--explore', function () { send('book'); });
  on('.liquid-button--play', function () { send('goto', '#suites'); });
  on('.knob--about', function () { send('goto', '#rooted'); });
  on('.card--stove .knob', function () { send('goto', '#diary'); });
  on('.scroll', function () { send('goto', '#book'); });
  function measure() {
    var hero = document.querySelector('.hero'), stage = document.querySelector('.stage');
    if (!hero || !stage) return;
    if (!matchMedia('(max-width: 900px)').matches) { send('layout', null, null); return; }
    var bottom = stage.offsetTop + stage.offsetHeight;
    Array.prototype.forEach.call(hero.children, function (c) { bottom = Math.max(bottom, c.offsetTop + c.offsetHeight); });
    send('layout', null, Math.ceil(bottom));
  }
  addEventListener('load', measure);
  addEventListener('resize', measure);
  if (window.ResizeObserver) new ResizeObserver(measure).observe(document.querySelector('.stage'));
})();
</script>
</body>`);

fs.mkdirSync(`${OUT_DIR}/highlands-assets`, { recursive: true });
fs.writeFileSync(OUT, html);
for (const f of ['three.min.js', 'lexend-latin.woff2']) {
  fs.copyFileSync(`archive/threeui-sylva/public/landing-pages/inner-green-assets/${f}`, `${OUT_DIR}/highlands-assets/${f}`);
}
console.log(`wrote ${OUT} (${Buffer.byteLength(html)} bytes) from verified ${SRC_SHA.slice(0, 12)}`);
