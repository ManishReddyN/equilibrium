/**
 * Native modules with no bundled jest mock get a minimal stand-in here so
 * unit tests can render components that use them without a device/emulator.
 */

jest.mock('react-native-mmkv', () => {
  const store = new Map();
  return {
    MMKV: jest.fn().mockImplementation(() => ({
      getString: (key) => (store.has(key) ? store.get(key) : undefined),
      set: (key, value) => store.set(key, value),
      delete: (key) => store.delete(key),
    })),
  };
});

jest.mock('react-native-quick-sqlite', () => ({
  open: jest.fn().mockReturnValue({
    execute: jest.fn().mockReturnValue({rows: {item: () => ({ok: 1}), length: 1}}),
    close: jest.fn(),
  }),
}));

jest.mock('@shopify/react-native-skia', () => ({
  Canvas: 'Canvas',
  Circle: 'Circle',
}));
