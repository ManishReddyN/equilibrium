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
    [
      'module:react-native-dotenv',
      {moduleName: '@env', path: '.env', safe: false, allowUndefined: true},
    ],
    'react-native-reanimated/plugin', // MUST be last
  ],
};
