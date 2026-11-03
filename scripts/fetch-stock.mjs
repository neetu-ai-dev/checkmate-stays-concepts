// Downloads the selected Unsplash photographs (Unsplash License), encodes responsive WebP
// sizes into public/stock/, and writes src/data/stockCredits.json. Illustrative concept imagery
// only — none of these are photographs of Checkmate Stays.
// Usage: node scripts/fetch-stock.mjs <unsplash-index.json> [picks.json]   (picks: {key: indexId}, merged into existing credits)
import sharp from 'sharp';
import fs from 'fs';

const index = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const DEFAULT_PICKS = {
  'noir-retreat': '2.3', 'noir-suite-living': '3.0', 'noir-suite-window': '4.3', 'noir-winterline': '5.6',
  'peak-stars': '6.9', 'noir-bonfire': '7.4', 'noir-thali': '13.0', 'mist-pines': '9.0', 'great-oak': '11.2',
  'green-pines-dawn': '9.2', 'green-moss-floor': '9.16', 'green-oak': '11.5', 'green-suite': '3.13',
  'green-window': '4.12', 'dal': '13.14', 'green-forest-light': '9.4',
  'night-milkyway-peaks': '6.0', 'night-star-trails': '0.1', 'night-cabin': '2.17', 'night-lodge': '2.18',
  'night-bonfire': '7.10', 'night-orion': '17.13', 'night-tent': '0.15', 'night-lounge': '3.6',
  'light-winterline': '15.16', 'light-range': '5.3', 'light-branches': '5.18', 'light-pines': '16.4',
  'light-hilltown': '16.0', 'light-living': '3.5', 'light-bedroom': '3.15', 'light-momos': '14.4', 'light-oak-meadow': '11.6',
};
const PICKS = process.argv[3] ? JSON.parse(fs.readFileSync(process.argv[3], "utf8")) : DEFAULT_PICKS;
const HERO = new Set(['noir-retreat', 'night-milkyway-peaks', 'light-winterline', 'green-pines-dawn', 'lake-lodge-mist', 'foothills-mist', 'aframe-lodge', 'approach-sunrise-huts', 'approach-meadow-cabin', 'highlands-dawn']);
fs.mkdirSync('public/stock', { recursive: true });
async function get(url) {
  for (let attempt = 1; ; attempt++) {
    try { return Buffer.from(await (await fetch(url)).arrayBuffer()); }
    catch (e) { if (attempt >= 4) throw e; await new Promise((r) => setTimeout(r, 2000 * attempt)); }
  }
}
const credits = fs.existsSync("src/data/stockCredits.json") ? JSON.parse(fs.readFileSync("src/data/stockCredits.json", "utf8")) : {};
for (const [key, id] of Object.entries(PICKS)) {
  const it = index[id];
  if (!it) { console.log('missing', key, id); continue; }
  const big = HERO.has(key) ? 2560 : 1800;
  if (credits[key] && fs.existsSync(`public/stock/${key}-lg.webp`)) { console.log(key, 'already present'); continue; }
  const buf = await get(`${it.src}?w=${big}&q=85&fm=jpg`);
  await sharp(buf).resize({ width: big, withoutEnlargement: true }).webp({ quality: 78 }).toFile(`public/stock/${key}-lg.webp`);
  await sharp(buf).resize({ width: 900 }).webp({ quality: 72 }).toFile(`public/stock/${key}-sm.webp`);
  const meta = await sharp(`public/stock/${key}-lg.webp`).metadata();
  credits[key] = {
    description: it.alt, photographer: it.authorHref?.split('/@')[1] ?? null, photographerUrl: it.authorHref,
    source: it.page, license: 'Unsplash License (https://unsplash.com/license)', width: meta.width, height: meta.height,
  };
  console.log(key, meta.width, meta.height, fs.statSync(`public/stock/${key}-lg.webp`).size);
  fs.writeFileSync('src/data/stockCredits.json', JSON.stringify(credits, null, 2));
}
fs.mkdirSync('src/data', { recursive: true });
fs.writeFileSync('src/data/stockCredits.json', JSON.stringify(credits, null, 2));
