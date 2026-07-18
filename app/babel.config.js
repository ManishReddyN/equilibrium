module.exports = {
  presets: ['module:@react-native/babel-preset', 'nativewind/babel'],
  plugins: [
    [
      'module-resolver',
      {
        root: ['./'],
        alias: {
          '@app': './src/app',
          '@features': './src/features',
          '@shared': './src/shared',
          '@lib': './src/lib',
          '@theme': './src/theme',
        },
      },
    ],
    'react-native-reanimated/plugin', // MUST be last
  ],
};
