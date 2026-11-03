// Dev utility: renders labelled thumbnail sheets from unsplash-dom.mjs output.
// Usage: node scripts/dev/stock-sheets.mjs <in.json> <outDir>
import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
const [, , inFile, outDir] = process.argv;
const data = JSON.parse(fs.readFileSync(inFile, 'utf8'));
fs.mkdirSync(outDir, { recursive: true });
const TW = 240, TH = 160, COLS = 10;
let qi = 0;
const index = {};
for (const [q, items] of Object.entries(data)) {
  const tiles = [];
  for (let i = 0; i < items.length; i++) {
    const it = items[i];
    try {
      const buf = Buffer.from(await (await fetch(`${it.src}?w=480&q=60&fm=jpg`)).arrayBuffer());
      const label = Buffer.from(`<svg width="${TW}" height="${TH}"><rect x="0" y="0" width="44" height="22" fill="#000"/><text x="5" y="16" font-size="15" fill="#ff0" font-family="Arial">${qi}.${i}</text></svg>`);
      const img = await sharp(buf).resize(TW, TH, { fit: 'cover' }).composite([{ input: label, left: 0, top: 0 }]).toBuffer();
      tiles.push({ input: img, left: (i % COLS) * TW, top: Math.floor(i / COLS) * TH });
      index[`${qi}.${i}`] = it;
    } catch (e) { console.log('fail', q, i, e.message); }
  }
  const rows = Math.ceil(items.length / COLS) || 1;
  await sharp({ create: { width: COLS * TW, height: rows * TH, channels: 3, background: '#222' } }).composite(tiles).jpeg({ quality: 80 }).toFile(path.join(outDir, `sheet-${String(qi).padStart(2, '0')}.jpg`));
  console.log(qi, q, items.length);
  qi++;
}
fs.writeFileSync(path.join(outDir, 'index.json'), JSON.stringify(index, null, 1));
