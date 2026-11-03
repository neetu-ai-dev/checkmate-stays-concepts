// Dev utility: reads free-license Unsplash search results from the rendered search page.
// Usage: node scripts/dev/unsplash-dom.mjs <outJson> "<query>" ...
import { chromium } from 'playwright';
import fs from 'fs';
const [, , out, ...queries] = process.argv;
const browser = await chromium.launch({ channel: 'chrome' });
const page = await browser.newPage({ viewport: { width: 1400, height: 1000 }, userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36' });
const all = fs.existsSync(out) ? JSON.parse(fs.readFileSync(out, 'utf8')) : {};
for (const q of queries) {
  const url = `https://unsplash.com/s/photos/${encodeURIComponent(q.replace(/ /g, '-'))}?license=free&orientation=landscape`;
  const resp = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 }).catch((e) => null);
  await page.waitForTimeout(2500);
  await page.mouse.wheel(0, 3000); await page.waitForTimeout(1200);
  const read = () => page.evaluate(() => {
    const seen = new Set(); const res = [];
    for (const a of document.querySelectorAll('a[href^="/photos/"]')) {
      const href = a.getAttribute('href'); if (seen.has(href)) continue;
      const img = a.querySelector('img') || a.closest('figure')?.querySelector('img[src*="images.unsplash.com/photo-"]');
      if (!img || !img.src.includes('images.unsplash.com/photo-')) continue;
      seen.add(href);
      const fig = a.closest('figure');
      const author = fig?.querySelector('a[href^="/@"]');
      res.push({ page: 'https://unsplash.com' + href, alt: img.alt, src: img.src.split('?')[0], author: author?.textContent?.trim() || null, authorHref: author ? 'https://unsplash.com' + author.getAttribute('href') : null });
    }
    return res;
  });
  let items = [];
  for (let attempt = 0; attempt < 3; attempt++) {
    try { items = await read(); break; } catch { await page.waitForTimeout(2000); }
  }
  console.log(q, resp?.status(), '->', items.length);
  all[q] = items;
  fs.writeFileSync(out, JSON.stringify(all, null, 1));
}
fs.writeFileSync(out, JSON.stringify(all, null, 1));
await browser.close();
