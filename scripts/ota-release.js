#!/usr/bin/env node
// Rilascio OTA con bump versione patch, aggiornamento changelog AppInfo e pubblicazione EAS
// Uso:
//   node scripts/ota-release.js --message "Fix X; Miglioria Y" [--version 1.0.1] [--channel production]
//   node scripts/ota-release.js --channel production --auto

const fs = require('fs');
const { execSync } = require('child_process');
const path = require('path');

function parseArgs() {
  const args = process.argv.slice(2);
  const res = { channel: 'production', auto: false };
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === '--message' || a === '-m') res.message = args[++i];
    else if (a === '--version' || a === '-v') res.version = args[++i];
    else if (a === '--channel' || a === '-c') res.channel = args[++i];
    else if (a === '--auto') res.auto = true;
  }
  return res;
}

function bumpPatch(v) {
  const [maj, min, pat] = v.split('.').map(n => parseInt(n, 10) || 0);
  return `${maj}.${min}.${(pat || 0) + 1}`;
}

function readJson(p) { return JSON.parse(fs.readFileSync(p, 'utf8')); }
function writeJson(p, obj) { fs.writeFileSync(p, JSON.stringify(obj, null, 2)); }

function todayIT() {
  return new Date().toLocaleDateString('it-IT', { day: '2-digit', month: 'long', year: 'numeric' });
}

function prependChangelogAppInfo(version, bullets) {
  const filePath = path.resolve(__dirname, '..', 'src', 'screens', 'AppInfoScreen.js');
  let content = fs.readFileSync(filePath, 'utf8');

  const entry = `    {\n      version: '${version}',\n      date: '${todayIT()}',\n      changes: [\n        ${bullets.map(b => `'${b.replace(/'/g, "\\'")}'`).join(',\n        ')}\n      ]\n    },`;

  const start = content.indexOf('const changelog = [');
  if (start === -1) throw new Error('Changelog array non trovato in AppInfoScreen.js');
  const insertPos = content.indexOf('\n', start) + 1;
  content = content.slice(0, insertPos) + entry + '\n' + content.slice(insertPos);
  fs.writeFileSync(filePath, content);
}

function syncVersions(newVersion) {
  const pkgPath = path.resolve(__dirname, '..', 'package.json');
  const appPath = path.resolve(__dirname, '..', 'app.json');
  const appProdPath = path.resolve(__dirname, '..', 'app-production.json');

  const pkg = readJson(pkgPath);
  const app = readJson(appPath);
  const appProd = readJson(appProdPath);

  // Mantieni runtimeVersion, modifica solo expo.version
  pkg.version = newVersion;
  app.expo.version = newVersion;
  appProd.expo.version = newVersion;

  writeJson(pkgPath, pkg);
  writeJson(appPath, app);
  writeJson(appProdPath, appProd);
}

function main() {
  const args = parseArgs();
  // Prefer message from environment (npm forwards --message as npm_config_message)
  const envMessage = process.env.OTA_MESSAGE || process.env.npm_config_message;
  if (envMessage) args.message = envMessage;
  const pkgPath = path.resolve(__dirname, '..', 'package.json');
  const pkg = readJson(pkgPath);
  const current = pkg.version;

  const newVersion = args.version || (args.auto ? bumpPatch(current) : current);
  if (!args.message) {
    console.log('ℹ️ Nessun messaggio passato. Uso default generico.');
  }
  const bullets = (args.message || `Aggiornamento v${newVersion}`).split(/;|\|/).map(s => s.trim()).filter(Boolean);

  console.log(`📦 Versione corrente: ${current}`);
  console.log(`➡️  Nuova versione: ${newVersion}`);
  console.log(`📝 Messaggi: ${bullets.join(' | ')}`);

  // Aggiorna versioni (solo display/metadata)
  syncVersions(newVersion);

  // Prepend changelog in AppInfoScreen
  prependChangelogAppInfo(newVersion, bullets);

  // Commit modifiche
  try {
    execSync('git add -A', { stdio: 'inherit' });
    execSync(`git commit -m "📋 OTA: v${newVersion} changelog & metadata"`, { stdio: 'inherit' });
    execSync('git push', { stdio: 'inherit' });
  } catch (e) {
    console.log('ℹ️ Nessuna modifica da committare o push già aggiornato.');
  }

  // Pubblica OTA
  const easCmd = 'npx eas';
  const message = `v${newVersion}: ${bullets[0] || 'Aggiornamento OTA'}`;
  const cmd = `${easCmd} update --branch ${args.channel} --message "${message}"`;
  console.log(`⬆️ Esecuzione: ${cmd}`);
  execSync(cmd, { stdio: 'inherit' });

  console.log('✅ OTA pubblicata.');
}

try { main(); } catch (err) {
  console.error('❌ Errore OTA release:', err.message);
  process.exit(1);
}
