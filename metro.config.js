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

config.resolver = {
  ...resolver,
  extraNodeModules: {
    '@': path.resolve(__dirname, './client/src'),
    '@assets': path.resolve(__dirname, './assets'),
  },
  useWatchman: true,
  enableGlobalPackages: true,
};

config.maxWorkers = 4;
config.resetCache = false;
config.cacheVersion = '1.0';

module.exports = config;
