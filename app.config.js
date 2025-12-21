const fs = require('fs');
const path = require('path');

function loadExpoConfigFromJson(configFile) {
  const raw = fs.readFileSync(configFile, 'utf8');
  const json = JSON.parse(raw);
  const expo = json && json.expo;
  if (!expo || typeof expo !== 'object') {
    throw new Error(`Invalid Expo config in ${path.basename(configFile)} (expected {"expo": {...}})`);
  }
  return expo;
}

module.exports = () => {
  const configName = (process.env && process.env.APP_CONFIG) || 'app.json';
  const projectRoot = __dirname;
  const resolved = path.resolve(projectRoot, configName);

  if (!resolved.startsWith(projectRoot + path.sep)) {
    throw new Error(`APP_CONFIG must point inside project root. Received: ${configName}`);
  }
  if (!fs.existsSync(resolved)) {
    throw new Error(`APP_CONFIG file not found: ${configName}`);
  }

  const expoConfig = loadExpoConfigFromJson(resolved);
  console.log(`[app.config.js] Using ${configName} (version ${expoConfig.version})`);
  return expoConfig;
};
