const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Allow `.cjs` files to be recognized
config.resolver.sourceExts.push('cjs');

// Disable experimental package exports if needed
config.resolver.unstable_enablePackageExports = false;

module.exports = config;
