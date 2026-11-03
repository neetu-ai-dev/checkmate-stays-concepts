// Dev utility: samples frames from a video with Chrome (H.264 needs Chrome, not bundled Chromium).
// Usage: node scripts/dev/video-frames.mjs <video> <outDir> [frameCount]
import { chromium } from 'playwright';
import { pathToFileURL } from 'url';
import path from 'path';

const [, , videoPath, outDir, count = '24'] = process.argv;
const browser = await chromium.launch({ channel: 'chrome' });
const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
const url = pathToFileURL(path.resolve(videoPath)).href;
await page.goto(pathToFileURL(path.resolve(outDir)).href);
await page.setContent(`<body style="margin:0;background:#000"><video id=v src="${url}" muted playsinline style="max-width:1400px;max-height:900px"></video></body>`);
const meta = await page.evaluate(() => new Promise((res, rej) => {
  const v = document.getElementById('v');
  if (v.readyState >= 1) res({ d: v.duration, w: v.videoWidth, h: v.videoHeight });
  v.onloadedmetadata = () => res({ d: v.duration, w: v.videoWidth, h: v.videoHeight });
  v.onerror = () => rej('error ' + v.error?.code);
}));
console.log(JSON.stringify(meta));
const n = Number(count);
for (let i = 0; i < n; i++) {
  const t = Math.min(meta.d - 0.05, (meta.d * i) / (n - 1));
  await page.evaluate((t) => new Promise((r) => {
    const v = document.getElementById('v');
    v.onseeked = () => r();
    v.currentTime = t;
  }), t);
  await page.locator('#v').screenshot({ path: path.join(outDir, `f${String(i).padStart(2, '0')}_${t.toFixed(2)}.png`) });
}
await browser.close();
