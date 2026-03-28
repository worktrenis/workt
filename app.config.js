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

function loadPackageVersion(projectRoot) {
  const packagePath = path.resolve(projectRoot, 'package.json');
  if (!fs.existsSync(packagePath)) {
    return null;
  }

  const raw = fs.readFileSync(packagePath, 'utf8');
  const pkg = JSON.parse(raw);
  return typeof pkg.version === 'string' ? pkg.version : null;
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
  const packageVersion = loadPackageVersion(projectRoot);

  if (packageVersion && expoConfig.version !== packageVersion) {
    console.log(
      `[app.config.js] Syncing expo version ${expoConfig.version} -> ${packageVersion} from package.json`
    );
    expoConfig.version = packageVersion;
  }

  console.log(`[app.config.js] Using ${configName} (version ${expoConfig.version})`);

  // Inject plugin per adjustNothing
  expoConfig.plugins = expoConfig.plugins || [];
  expoConfig.plugins.push('./withAdjustNothing.js');

  return expoConfig;
};
