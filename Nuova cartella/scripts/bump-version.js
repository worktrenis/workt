// Script Node.js per sincronizzare la versione di app.json con quella di package.json
// Uso: node scripts/bump-version.js

const fs = require('fs');
const path = require('path');

const configPaths = [
  path.join(__dirname, '../app.json'),
  path.join(__dirname, '../app-production.json'),
  path.join(__dirname, '../app-native.json')
];
const packageJsonPath = path.join(__dirname, '../package.json');

const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
const newVersion = packageJson.version;

for (const configPath of configPaths) {
  if (!fs.existsSync(configPath)) continue;
  const filename = path.basename(configPath);
  const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  if (!config.expo) continue;

  if (config.expo.version !== newVersion) {
    config.expo.version = newVersion;
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2) + '\n');
    console.log(`Sincronizzato: ${filename} versione aggiornata a ${newVersion}`);
  }
}
