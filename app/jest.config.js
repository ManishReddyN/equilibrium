module.exports = {
  preset: 'react-native',
  setupFiles: [
    './node_modules/react-native-gesture-handler/jestSetup.js',
    './jest.setup.js',
  ],
  moduleNameMapper: {
    '^react-native-reanimated$': 'react-native-reanimated/mock',
  },
  transformIgnorePatterns: [
    'node_modules/(?!(jest-)?(react-native|@react-native|@react-navigation|@shopify/react-native-skia|@tanstack)|nativewind)',
  ],
};
