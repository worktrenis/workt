const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname, {
  // [Web-only]: Enables CSS support in Metro.
  isCSSEnabled: true,
});

// Esclude file di diagnostica dal bundling
config.resolver.blacklistRE = /#current-cloud-backend\/.*/;
config.resolver.platforms = ['ios', 'android', 'native', 'web'];

// Esclude file di test e diagnostica
config.resolver.resolverMainFields = ['react-native', 'browser', 'main'];

module.exports = config;
