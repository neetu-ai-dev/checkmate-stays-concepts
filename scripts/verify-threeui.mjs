// Installs and verifies the registered ThreeUI SylvaHero source (revision SHA-256 05f359ce157a).
//  - Source files are written from the registered bundle (vendor/threeui/sylva-hero.json,
//    fetched from https://threeui.com/source-code/sylva-hero.json).
//  - The authored HTML and binary assets are copied byte-for-byte from the published
//    @designcodeio/threeui package (lib-dist/assets/landing-pages/).
// Every file is checked against the required size and SHA-256. Exits non-zero on any mismatch.
// The concepts no longer use SylvaHero (Concept 2 became an original mountain scene), so the
// verified files live in archive/threeui-sylva/, outside the build.
// Usage: node scripts/verify-threeui.mjs [--install]
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

const REQUIRED = {
  'src/shaders/landing-pages/LandingPages.tsx': '4d379461ad00eb4de7900df312878035383de7e1ed4e13283b8143a2eea9d30a',
  'src/shaders/landing-pages/pageTypography.ts': '809cc65797d531cd3b3ca5a56815d55d24b3ee8d293e4e4bad6fdfe6c83244cc',
  'src/shaders/landing-pages/pageRecipes.ts': 'c9d9849cc255bac2d1d938d088c50917f84916f1c516d2bbb27fcfd803523233',
  'src/shaders/landing-pages/LandingPageFrame.tsx': '61de2cc50888aac4ac5557420b07fa47ed3543bb57c1e0055fafdefa53dbaa78',
  'public/landing-pages/inner-green-3d.html': '69c3694bd63f44ef9f007ebe4dac57a83e4402e0cdf6b54dd10b96dd4f05e197',
  'public/landing-pages/inner-green-assets/three.min.js': '8a5f7249903b54d30f79f708699d2fed2d6a1d0741a4cd41377d1f01bb5a2271',
  'src/shaders/threeui.css': 'efe4447139f1358dd8e9be68edf6fa46cbefbd1de423a4d6c439ca61d2c8eccf',
  'public/landing-pages/inner-green-assets/card-ecostove.jpg': '70ce084084902bc502f00c366405b661ecdff90dee95d363b36a6e146829e433',
  'public/landing-pages/inner-green-assets/card-ethos.jpg': '337627390f499b3ae272cec9e2f83c817694a82f42e1aa10a7b26a2c7d679dff',
  'public/landing-pages/inner-green-assets/lexend-latin.woff2': '1ec8f6ee2750554b4bc59ff0b507d316a82a7ba37e0e5bebc41d3bd9b9faad46',
};
const SIZES = {
  'public/landing-pages/inner-green-assets/card-ecostove.jpg': 290988,
  'public/landing-pages/inner-green-assets/card-ethos.jpg': 316720,
  'public/landing-pages/inner-green-assets/lexend-latin.woff2': 39692,
};
// The HTML is also needed as a ?raw module import by LandingPages.tsx (derived variants).
const MIRRORS = { 'src/shaders/sylva-living-world/sources/inner-green-3d.html': 'public/landing-pages/inner-green-3d.html' };

const ROOT = 'archive/threeui-sylva';
process.chdir(ROOT);
const back = (p) => path.join('..', '..', p);
const sha = (buf) => crypto.createHash('sha256').update(buf).digest('hex');
const bundle = JSON.parse(fs.readFileSync(back('vendor/threeui/sylva-hero.json'), 'utf8'));
const pkgAssets = back('node_modules/@designcodeio/threeui/lib-dist/assets');

if (process.argv.includes('--install')) {
  for (const f of bundle.files) {
    const dest = f.path;
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    if (typeof f.code === 'string') fs.writeFileSync(dest, Buffer.from(f.code, 'utf8'));
    else fs.copyFileSync(path.join(pkgAssets, f.path.replace(/^public\//, '')), dest);
  }
  for (const a of bundle.assets) {
    fs.mkdirSync(path.dirname(a.path), { recursive: true });
    fs.copyFileSync(path.join(pkgAssets, a.path.replace(/^public\//, '')), a.path);
  }
  for (const [dest, src] of Object.entries(MIRRORS)) {
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.copyFileSync(src, dest);
  }
}

let failed = 0;
const check = (file, expected, size) => {
  if (!fs.existsSync(file)) { console.log(`MISSING   ${file}`); failed++; return; }
  const buf = fs.readFileSync(file);
  const got = sha(buf);
  const okHash = got === expected;
  const okSize = size === undefined || buf.length === size;
  if (!okHash || !okSize) failed++;
  console.log(`${okHash && okSize ? 'OK      ' : 'MISMATCH'}  ${file}  ${buf.length} B  ${got}`);
};
for (const [file, expected] of Object.entries(REQUIRED)) {
  const declared = [...bundle.files, ...bundle.assets].find((f) => f.path === file);
  if (!declared || declared.sha256 !== expected) { console.log(`REGISTRY MISMATCH ${file}`); failed++; }
  check(file, expected, SIZES[file] ?? declared?.bytes);
}
for (const [dest, src] of Object.entries(MIRRORS)) check(dest, REQUIRED[src]);
console.log(failed ? `\n${failed} problem(s) — SylvaHero source is NOT verified.` : '\nAll SylvaHero files verified byte-for-byte.');
process.exit(failed ? 1 : 0);
