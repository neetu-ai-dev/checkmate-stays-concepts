// Dev utility: tiles PNGs in a directory into one contact sheet.
// Usage: node scripts/dev/contact-sheet.mjs <dir> <out.png> [cols] [tileWidth]
import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

const [, , dir, out, colsArg = '8', tileArg = '220'] = process.argv;
const files = fs.readdirSync(dir).filter((f) => f.endsWith('.png')).sort();
const cols = Number(colsArg), tw = Number(tileArg);
const first = await sharp(path.join(dir, files[0])).metadata();
const th = Math.round((first.height / first.width) * tw);
const rows = Math.ceil(files.length / cols);
const tiles = await Promise.all(files.map(async (f, i) => ({
  input: await sharp(path.join(dir, f)).resize(tw, th).toBuffer(),
  left: (i % cols) * tw, top: Math.floor(i / cols) * th,
})));
await sharp({ create: { width: cols * tw, height: rows * th, channels: 3, background: '#000' } }).composite(tiles).png().toFile(out);
console.log(out, cols * tw, rows * th);
