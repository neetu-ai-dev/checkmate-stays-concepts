// Derives a depth map for the Highlands dawn plate from aerial perspective: in layered,
// hazy ridges, brightness rises with distance (each ridge sits behind more haze), and the
// sky is farthest of all. Writes an 8-bit greyscale PNG (white = far) beside the hero document.
// Usage: node scripts/make-depth.mjs
import sharp from 'sharp';

const SRC = 'public/stock/highlands-dawn-lg.webp';
const OUT = 'public/landing-pages/highlands-assets/dawn-depth.png';
const W = 640;

const { data, info } = await sharp(SRC).resize({ width: W }).removeAlpha().raw().toBuffer({ resolveWithObject: true });
const { width: w, height: h } = info;
const depth = new Float32Array(w * h);
for (let i = 0; i < w * h; i++) {
  const r = data[i * 3] / 255, g = data[i * 3 + 1] / 255, b = data[i * 3 + 2] / 255;
  const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  depth[i] = Math.min(1, Math.max(0, (lum - 0.16) / 0.62));
}
// the sky: everything above the first strong edge in each column is as far as it gets
for (let x = 0; x < w; x++) {
  let y = 0;
  while (y < h - 1 && Math.abs(depth[(y + 1) * w + x] - depth[y * w + x]) < 0.035 && y < h * 0.6) depth[(y++) * w + x] = 1;
}
const px = Buffer.alloc(w * h);
for (let i = 0; i < w * h; i++) px[i] = Math.round(Math.pow(depth[i], 0.9) * 255);
await sharp(px, { raw: { width: w, height: h, channels: 1 } }).blur(2.2).png({ compressionLevel: 9 }).toFile(OUT);
console.log('wrote', OUT, w, h);
