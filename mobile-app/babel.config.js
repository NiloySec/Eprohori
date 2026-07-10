module.exports = function(api) {
  api.cache(true);
  return {
    presets: [['babel-preset-expo', { reanimated: false, worklets: false }]],
    plugins: [
      [
        'module-resolver',
        {
          alias: {
            '@screens': './src/screens',
            '@components': './src/components',
            '@navigation': './src/navigation',
            '@api': './src/api',
            '@stores': './src/stores',
            '@utils': './src/utils',
            '@theme': './src/theme',
            '@hooks': './src/hooks',
          },
        },
      ],
    ],
  };
};
