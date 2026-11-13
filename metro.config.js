const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname, {
  isCSSEnabled: true,
});

const { transformer, resolver } = config;

config.transformer = {
  ...transformer,
  minifierPath: 'metro-minify-terser',
  minifierConfig: {
    compress: {
      reduce_funcs: false,
      keep_infinity: true,
      drop_console: false,
    },
  },
};

// Native build output (Xcode Swift Package checkouts, Gradle build dirs) can contain
// copies of npm packages, e.g. the OpenIAP checkout ships its own `expo-iap/package.json`.
// Metro must never resolve modules from there.
const nativeBuildDirs = [
  /[\\/]ios[\\/]build[\\/].*/,
  /[\\/]ios[\\/]Pods[\\/].*/,
  /[\\/]android[\\/](app[\\/])?build[\\/].*/,
];
const existingBlockList = resolver.blockList
  ? Array.isArray(resolver.blockList)
    ? resolver.blockList
    : [resolver.blockList]
  : [];

config.resolver = {
  ...resolver,
  extraNodeModules: {
    '@': path.resolve(__dirname, './client/src'),
    '@assets': path.resolve(__dirname, './assets'),
  },
  useWatchman: true,
  // Global (Haste-style) packages let any package.json in the project shadow node_modules.
  enableGlobalPackages: false,
  blockList: [...existingBlockList, ...nativeBuildDirs],
};

config.maxWorkers = 4;
config.resetCache = false;
config.cacheVersion = '1.0';

module.exports = config;
