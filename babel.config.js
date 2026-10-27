const path = require('path');

module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      [
        'module-resolver',
        {
          root: ['./'],
          alias: {
            '@': './client/src',
            '@assets': './assets',
          },
          extensions: [
            '.ios.ts',
            '.android.ts',
            '.ts',
            '.ios.tsx',
            '.android.tsx',
            '.tsx',
            '.jsx',
            '.js',
            '.json',
            '.png',
            '.jpg',
            '.jpeg',
            '.gif',
          ],
        },
      ],
      '@babel/plugin-transform-template-literals',
      '@babel/plugin-transform-runtime',
      'react-native-reanimated/plugin',
    ],
    env: {
      production: {
        plugins: ['react-native-reanimated/plugin'],
      },
    },
  };
}; 