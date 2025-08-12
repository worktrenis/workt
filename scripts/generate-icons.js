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
const SCREENSHOT_PNG = path.join(OUT_DIR, 'screenshot.png'); // opzionale: screenshot dell'app in PNG
const SCREENSHOT_JPG = path.join(OUT_DIR, 'screenshot.jpg'); // opzionale: screenshot dell'app in JPG

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

async function generateNotificationIcon(src) {
  // Genera icona piccola Android per notifiche (bianca su trasparente)
  const SIZE = parseInt(process.env.NOTIF_SIZE || '96', 10); // Expo ridimensiona per densità; 96px è una base sicura
  const out = path.join(ROOT, 'assets', 'notification-icon.png');

  // 1) Ridimensiona sorgente in un canvas trasparente
  const resizedBuf = await sharp(src)
    .resize(SIZE, SIZE, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();

  // 2) Estrai il canale alpha come maschera
  const alpha = await sharp(resizedBuf).ensureAlpha().extractChannel('alpha').toBuffer();

  // 3) Crea un quadrato bianco e applica la maschera alpha per avere un glyph monocromatico bianco
  await sharp({
    create: {
      width: SIZE,
      height: SIZE,
      channels: 3,
      background: { r: 255, g: 255, b: 255 },
    },
  })
    .joinChannel(alpha)
    .png({ compressionLevel: 9, quality: 100 })
    .toFile(out);

  return out;
}

function getScreenshotPath() {
  if (fs.existsSync(SCREENSHOT_PNG)) return SCREENSHOT_PNG;
  if (fs.existsSync(SCREENSHOT_JPG)) return SCREENSHOT_JPG;
  return null;
}

function buildTitleOverlay(width, height) {
  const title = process.env.FG_TITLE || 'WorkT - Tracker Ore Lavoro';
  const subtitle = process.env.FG_SUBTITLE || 'Ore, trasferte, straordinari e CCNL in un colpo d’occhio';
  const panelWidth = 580;
  const margin = 32;
  const titleSize = 56;
  const subSize = 30;
  const safe = (s) => (s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const svg = `<?xml version="1.0" encoding="UTF-8"?>
  <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
    <defs>
      <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
        <feDropShadow dx="0" dy="4" stdDeviation="6" flood-color="#000000" flood-opacity="0.25" />
      </filter>
    </defs>
    <rect x="0" y="0" width="${panelWidth}" height="${height}" fill="#0B3B8C" fill-opacity="0.42"/>
    <g filter="url(#shadow)">
      <text x="${margin}" y="${margin + titleSize}" fill="#FFFFFF" stroke="#0A0F2D" stroke-width="2" paint-order="stroke fill" font-size="${titleSize}" font-weight="700" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, 'Noto Sans', 'Liberation Sans', sans-serif">${safe(title)}</text>
      <text x="${margin}" y="${margin + titleSize + 24 + subSize}" fill="#E5EDFF" stroke="#0A0F2D" stroke-width="1" paint-order="stroke fill" font-size="${subSize}" font-weight="600" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, 'Noto Sans', 'Liberation Sans', sans-serif">${safe(subtitle)}</text>
    </g>
  </svg>`;
  return Buffer.from(svg);
}

async function generateFeatureGraphicWithScreen() {
  const SCREENSHOT = getScreenshotPath();
  if (!SCREENSHOT) return null;
  const out = path.join(OUT_DIR, 'feature-graphic-with-screen-1024x500.png');
  const WIDTH = 1024;
  const HEIGHT = 500;

  const bg = sharp({
    create: {
      width: WIDTH,
      height: HEIGHT,
      channels: 4,
      background: '#1E3A8A',
    },
  }).png();

  // Crop opzionale dallo screenshot per rimuovere elementi (es. chip Annulla/Salva)
  const CROP_TOP = parseInt(process.env.SHOT_CROP_TOP || '0', 10);
  const CROP_RIGHT = parseInt(process.env.SHOT_CROP_RIGHT || '0', 10);
  const CROP_BOTTOM = parseInt(process.env.SHOT_CROP_BOTTOM || '0', 10);
  const CROP_LEFT = parseInt(process.env.SHOT_CROP_LEFT || '0', 10);

  let shot = sharp(SCREENSHOT);
  const meta0 = await shot.metadata();
  if (CROP_TOP || CROP_RIGHT || CROP_BOTTOM || CROP_LEFT) {
    const cropWidth = Math.max(1, (meta0.width || 0) - CROP_LEFT - CROP_RIGHT);
    const cropHeight = Math.max(1, (meta0.height || 0) - CROP_TOP - CROP_BOTTOM);
    shot = shot.extract({ left: CROP_LEFT, top: CROP_TOP, width: cropWidth, height: cropHeight });
  }

  // Ridimensiona lo screenshot per un layout a destra (area ~420x460)
  const MAX_W = 420;
  const MAX_H = 460;
  const shotMeta = await shot.metadata();
  let targetW = MAX_W;
  let targetH = Math.round((shotMeta.height || MAX_H) * (MAX_W / (shotMeta.width || MAX_W)));
  if (targetH > MAX_H) {
    targetH = MAX_H;
    targetW = Math.round((shotMeta.width || MAX_W) * (MAX_H / (shotMeta.height || MAX_H)));
  }

  const shotBuf = await shot
    .resize(targetW, targetH, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();

  // Semplice ombra sotto lo screenshot
  const shadowBuf = await sharp(shotBuf)
    .blur(10)
    .modulate({ brightness: 0.4, saturation: 0.2 })
    .png()
    .toBuffer();

  // Posiziona lo screenshot a destra con margine
  const left = WIDTH - targetW - 48;
  const top = Math.round((HEIGHT - targetH) / 2);

  const composites = [
    { input: shadowBuf, left: left + 8, top: top + 8 },
    { input: shotBuf, left, top },
    { input: buildTitleOverlay(WIDTH, HEIGHT), left: 0, top: 0 },
  ];

  await bg.composite(composites).toFile(out);
  return out;
}

async function generateFeatureGraphicPromo() {
  const out = path.join(OUT_DIR, 'feature-graphic-promo-1024x500.png');
  const WIDTH = 1024;
  const HEIGHT = 500;

  const bg = sharp({
    create: {
      width: WIDTH,
      height: HEIGHT,
      channels: 4,
      background: '#1E3A8A',
    },
  }).png();

  await bg.composite([{ input: buildTitleOverlay(WIDTH, HEIGHT), left: 0, top: 0 }]).toFile(out);
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
  // Notifica: icona piccola Android (bianca su trasparente)
  results.push(await generateNotificationIcon(src));
  const withScreen = await generateFeatureGraphicWithScreen();
  if (withScreen) results.push(withScreen);
  const promo = await generateFeatureGraphicPromo();
  if (promo) results.push(promo);

  console.log('Icone generate:\n' + results.map(r => ' - ' + path.relative(ROOT, r)).join('\n'));
}

main().catch((err) => {
  console.error('Errore generazione icone:', err.message);
  process.exit(1);
});
