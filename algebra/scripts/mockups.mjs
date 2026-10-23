/**
 * Flat garment MOCKUPS (not product photos): every image produced here is flagged MOCKUP in data/images.json
 * and labelled on the site. They show colour, placement and scale of the decoration, nothing more.
 * Replace with REAL PRODUCT IMAGE after the samples are approved (docs/LAUNCH_CHECKLIST.md).
 *
 * Output: site/assets/mockups/<product>-<color>-<view>.svg + .webp (800 px) + -400.webp, and data/images.json.
 * Needs Playwright for the raster versions: PLAYWRIGHT_MODULE=/path/to/playwright/index.mjs node scripts/mockups.mjs
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { execFileSync } from 'node:child_process';
import { colors, products } from '../data/catalog.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const out = join(root, 'site', 'assets', 'mockups');
mkdirSync(out, { recursive: true });
const paths = JSON.parse(readFileSync(join(root, 'brand', 'paths.json'), 'utf8'));
const INK = { navy: '#131A2B', ivory: '#F3EFE7' };

// 600 × 720 canvas. Silhouettes drawn as flat technical sketches.
const shapes = {
  tee: {
    body: 'M214 70 C252 104 348 104 386 70 L478 98 C520 130 556 168 584 214 L520 268 L476 232 L478 650 C380 664 220 664 122 650 L124 232 L80 268 L16 214 C44 168 80 130 122 98 Z',
    trims: ['M214 70 C252 112 348 112 386 70', 'M218 76 C256 120 344 120 382 76', 'M520 268 L584 214', 'M80 268 L16 214'],
    folds: ['M170 300 C190 420 180 540 196 640', 'M420 320 C410 430 430 540 408 640'],
    back: 'M214 70 C252 84 348 84 386 70',
  },
  polo: {
    body: 'M226 64 L300 92 L374 64 L478 96 C520 128 556 166 584 212 L520 266 L476 230 L478 650 C380 664 220 664 122 650 L124 230 L80 266 L16 212 C44 166 80 128 122 96 Z',
    trims: [
      'M226 64 L206 132 L292 150 L300 96 L308 150 L394 132 L374 64',
      'M300 150 L300 92',
      'M282 150 L282 250 L318 250 L318 150',
      'M520 266 L584 212',
      'M80 266 L16 212',
      'M512 258 L576 205',
      'M88 258 L24 205',
    ],
    buttons: [[300, 180], [300, 222]],
    folds: ['M170 300 C190 420 180 540 196 640', 'M420 320 C410 430 430 540 408 640'],
    back: 'M226 64 C260 76 340 76 374 64',
  },
  crew: {
    body: 'M212 72 C252 106 348 106 388 72 L480 100 C512 120 534 150 548 190 L596 600 L536 612 L478 300 L480 640 C380 652 220 652 120 640 L122 300 L64 612 L4 600 L52 190 C66 150 88 120 120 100 Z',
    trims: ['M212 72 C252 116 348 116 388 72', 'M216 80 C254 128 346 128 384 80', 'M120 612 L480 612', 'M590 556 L532 568', 'M10 556 L68 568'],
    folds: ['M180 320 C196 420 186 520 200 600', 'M420 330 C410 430 430 520 410 600'],
    back: 'M212 72 C252 86 348 86 388 72',
  },
};
const shapeOf = (p) => (p.category === 'polos' ? 'polo' : p.category === 'sweaters' ? 'crew' : 'tee');

function lum(hex) {
  const n = parseInt(hex.slice(1), 16);
  return (0.299 * (n >> 16) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255;
}

function garment(p, colorKey, view) {
  const s = shapes[shapeOf(p)];
  const c = colors[colorKey];
  const dark = lum(c.hex) < 0.45;
  const line = dark ? 'rgba(255,255,255,.18)' : 'rgba(19,26,43,.22)';
  const shade = dark ? 'rgba(0,0,0,.22)' : 'rgba(19,26,43,.06)';
  const ink = INK[c.ink];
  let deco = '';
  if (view === 'front') {
    if (p.line === 'graphic') {
      const front = readFileSync(join(root, 'capsule', p.graphic, `front-${c.tone}.svg`), 'utf8');
      const inner = front.replace(/^[\s\S]*?<\/title>/, '').replace(/<\/svg>\s*$/, '');
      deco = `<g transform="translate(352 150) scale(0.058)">${inner}</g>`; // 70 mm icon, left chest
    } else {
      // embroidered symbol, wearer's left chest. Tonal on the crew.
      const tone = p.category === 'sweaters' ? (dark ? 'rgba(255,255,255,.28)' : 'rgba(19,26,43,.35)') : ink;
      const size = p.category === 'sweaters' ? 19 : p.category === 'polos' ? 18 : 16; // ≈ real scale (1 cm ≈ 7 px on this canvas)
      deco = `<g transform="translate(${p.category === 'polos' ? 370 : 368} ${p.category === 'polos' ? 196 : 176}) scale(${size / 100})"><path fill="${tone}" d="${paths.symbolEmbroidery}"/></g>`;
    }
  } else if (p.line === 'graphic') {
    const back = readFileSync(join(root, 'capsule', p.graphic, `back-${c.tone}.svg`), 'utf8');
    const inner = back.replace(/^[\s\S]*?<\/title>/, '').replace(/<\/svg>\s*$/, '');
    deco = `<g transform="translate(195 138) scale(0.07)">${inner}</g>`; // 300 × 400 mm
  }
  const trims = view === 'front' ? s.trims : [s.back, ...s.trims.filter((t, i) => i >= (shapeOf(p) === 'polo' ? 3 : 2))];
  const buttons = view === 'front' && s.buttons ? s.buttons.map(([x, y]) => `<circle cx="${x}" cy="${y}" r="6" fill="${shade}" stroke="${line}"/>`).join('') : '';
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 720" width="600" height="720">
<rect width="600" height="720" fill="#F3EFE7"/>
<ellipse cx="300" cy="676" rx="230" ry="12" fill="rgba(19,26,43,.07)"/>
<path d="${s.body}" fill="${c.hex}" stroke="${line}" stroke-width="2" stroke-linejoin="round"/>
<g fill="none" stroke="${line}" stroke-width="2" stroke-linecap="round">${trims.map((d) => `<path d="${d}"/>`).join('')}</g>
<defs><linearGradient id="v" x1="0" x2="1"><stop offset="0" stop-color="#000" stop-opacity="${dark ? 0.18 : 0.06}"/><stop offset=".22" stop-color="#000" stop-opacity="0"/><stop offset=".78" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity="${dark ? 0.2 : 0.07}"/></linearGradient></defs>
<path d="${s.body}" fill="url(#v)"/>
${buttons}${deco}
</svg>`;
}

const images = [];
for (const p of products) {
  for (const colorKey of p.colors) {
    for (const view of p.line === 'graphic' ? ['back', 'front'] : ['front', 'back']) {
      const base = `${p.slug}-${colorKey}-${view}`;
      writeFileSync(join(out, `${base}.svg`), garment(p, colorKey, view));
      images.push({ productId: p.id, color: colorKey, view, file: `assets/mockups/${base}`, flag: 'MOCKUP' });
    }
  }
}

// concept crops from the moodboard (AI-generated art direction): never shown as the real product.
const concept = ['editorial-pair', 'detail-polo', 'detail-tee', 'detail-crew', 'detail-label', 'detail-button'].map((k) => ({
  file: `assets/concept/${k}`,
  flag: 'CONCEPT',
  note: 'Crop of the brand moodboard (AI-generated art direction). Not a photo of an Algebra product.',
}));
writeFileSync(join(root, 'data', 'images.json'), JSON.stringify({ flags: ['REAL PRODUCT IMAGE', 'MOCKUP', 'CONCEPT'], images, concept }, null, 1));

// raster versions
const mod = process.env.PLAYWRIGHT_MODULE;
if (mod) {
  const { chromium } = await import(pathToFileURL(mod).href);
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 800, height: 960 } });
  for (const im of images) {
    const svg = readFileSync(join(root, 'site', `${im.file}.svg`), 'utf8').replace('width="600" height="720"', 'width="800" height="960"');
    await page.setContent(`<html><body style="margin:0">${svg}</body></html>`);
    await page.screenshot({ path: join(root, 'site', `${im.file}.png`), clip: { x: 0, y: 0, width: 800, height: 960 } });
  }
  await browser.close();
  execFileSync('python3', [
    '-c',
    `import glob,os
from PIL import Image
for f in glob.glob(${JSON.stringify(out)}+'/*.png'):
    im=Image.open(f).convert('RGB'); b=f[:-4]
    im.save(b+'.webp',quality=84); im.resize((400,480),Image.LANCZOS).save(b+'-400.webp',quality=84)
    im.save(b+'.avif',quality=62)
    os.remove(f)`,
  ]);
}
console.log('mockups:', images.length, mod ? '(svg + webp/avif)' : '(svg only)');
