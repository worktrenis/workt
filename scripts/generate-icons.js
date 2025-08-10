// Genera icone per App Store (1024x1024, senza alpha) e Google Play (512x512)
// Sorgente: assets/icon-source.svg (fallback: assets/icon.png)
// Output: assets/store/appstore-1024.png, assets/store/play-512.png, assets/store/feature-graphic-1024x500.png

const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const ROOT = __dirname ? path.resolve(__dirname, '..') : process.cwd();
const SRC_SVG = path.join(ROOT, 'assets', 'icon-source.svg');
const SRC_PNG = path.join(ROOT, 'assets', 'icon.png');
const OUT_DIR = path.join(ROOT, 'assets', 'store');

async function ensureDir(p) {
  await fs.promises.mkdir(p, { recursive: true });
}

async function loadSource() {
  if (fs.existsSync(SRC_SVG)) {
    return { input: SRC_SVG, type: 'svg' };
  }
  if (fs.existsSync(SRC_PNG)) {
    return { input: SRC_PNG, type: 'png' };
  }
  throw new Error('Sorgente icona non trovato: assets/icon-source.svg o assets/icon.png');
}

async function generateAppStoreIcon(src) {
  const out = path.join(OUT_DIR, 'appstore-1024.png');
  // App Store: 1024x1024 PNG senza alpha (flatten)
  await sharp(src)
    .resize(1024, 1024, { fit: 'contain', background: '#FFFFFF' })
    .flatten({ background: '#FFFFFF' })
    .png({ compressionLevel: 9, quality: 100 })
    .toFile(out);
  return out;
}

async function generatePlayIcon(src) {
  const out = path.join(OUT_DIR, 'play-512.png');
  // Google Play: 512x512 PNG (alpha permessa)
  await sharp(src)
    .resize(512, 512, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png({ compressionLevel: 9, quality: 100 })
    .toFile(out);
  return out;
}

async function generateFeatureGraphic(src) {
  const out = path.join(OUT_DIR, 'feature-graphic-1024x500.png');
  // Feature graphic base: 1024x500 sfondo brand
  const WIDTH = 1024;
  const HEIGHT = 500;
  const ICON_SIZE = 400; // dimensione icona al centro

  const bg = sharp({
    create: {
      width: WIDTH,
      height: HEIGHT,
      channels: 4,
      background: '#1E3A8A',
    },
  }).png();

  const iconBuf = await sharp(src)
    .resize(ICON_SIZE, ICON_SIZE, { fit: 'contain', background: '#1E3A8A' })
    .png()
    .toBuffer();

  const left = Math.round((WIDTH - ICON_SIZE) / 2);
  const top = Math.round((HEIGHT - ICON_SIZE) / 2);

  await bg
    .composite([{ input: iconBuf, left, top }])
    .toFile(out);
  return out;
}

async function main() {
  await ensureDir(OUT_DIR);
  const srcInfo = await loadSource();
  const src = srcInfo.input;

  const results = [];
  results.push(await generateAppStoreIcon(src));
  results.push(await generatePlayIcon(src));
  results.push(await generateFeatureGraphic(src));

  console.log('Icone generate:\n' + results.map(r => ' - ' + path.relative(ROOT, r)).join('\n'));
}

main().catch((err) => {
  console.error('Errore generazione icone:', err.message);
  process.exit(1);
});
