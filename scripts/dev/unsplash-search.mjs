// Dev utility: searches Unsplash in a real Chrome session and lists free (non-Unsplash+) results.
// Usage: node scripts/dev/unsplash-search.mjs <outJson> "<query 1>" "<query 2>" ...
import { chromium } from 'playwright';
import fs from 'fs';

const [, , out, ...queries] = process.argv;
const browser = await chromium.launch({ channel: 'chrome' });
const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
await page.goto('https://unsplash.com/', { waitUntil: 'domcontentloaded', timeout: 60000 });
const all = {};
for (const q of queries) {
  const res = await page.evaluate(async (q) => {
    const r = await fetch(`/napi/search/photos?query=${encodeURIComponent(q)}&per_page=30&orientation=landscape`);
    if (!r.ok) return { error: r.status };
    return r.json();
  }, q);
  if (res.error) { console.log(q, 'ERROR', res.error); continue; }
  all[q] = res.results
    .filter((r) => !r.premium && !r.plus && r.urls.raw.startsWith('https://images.unsplash.com/photo-'))
    .map((r) => ({ id: r.id, slug: r.slug, w: r.width, h: r.height, color: r.color, likes: r.likes, alt: r.alt_description, author: r.user.name, username: r.user.username, raw: r.urls.raw, thumb: r.urls.small, page: r.links.html }));
  console.log(q, '->', all[q].length);
}
fs.writeFileSync(out, JSON.stringify(all, null, 1));
await browser.close();
