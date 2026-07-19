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

// Stateful fake backing store shared across `open()` calls in a test run --
// enough to exercise lib/db/sqlite.ts's real insert/select/delete statements
// (matched by prefix, not a real SQL parser) without a native binding.
jest.mock('react-native-quick-sqlite', () => {
  const tables = new Map();

  function runQuery(query, params = []) {
    const normalized = query.trim().toLowerCase();
    if (normalized.startsWith('create table')) {
      if (!tables.has('kv')) {
        tables.set('kv', new Map());
      }
      return {rowsAffected: 0};
    }
    if (normalized.startsWith('insert into kv')) {
      const kv = tables.get('kv') ?? new Map();
      const [key, value] = params;
      kv.set(key, value);
      tables.set('kv', kv);
      return {rowsAffected: 1};
    }
    if (normalized.startsWith('select value from kv')) {
      const kv = tables.get('kv') ?? new Map();
      const [key] = params;
      const value = kv.get(key);
      if (value === undefined) {
        return {rowsAffected: 0, rows: {_array: [], length: 0, item: () => undefined}};
      }
      return {
        rowsAffected: 0,
        rows: {_array: [{value}], length: 1, item: () => ({value})},
      };
    }
    if (normalized.startsWith('delete from kv')) {
      const kv = tables.get('kv') ?? new Map();
      const [key] = params;
      kv.delete(key);
      return {rowsAffected: 1};
    }
    if (normalized.startsWith('select 1')) {
      return {rowsAffected: 0, rows: {_array: [{ok: 1}], length: 1, item: () => ({ok: 1})}};
    }
    throw new Error(`react-native-quick-sqlite mock: unhandled query "${query}"`);
  }

  return {
    open: jest.fn().mockReturnValue({
      execute: jest.fn((query, params) => runQuery(query, params)),
      executeAsync: jest.fn(async (query, params) => runQuery(query, params)),
      close: jest.fn(() => tables.clear()),
    }),
  };
});

jest.mock('@react-native-community/netinfo', () =>
  require('@react-native-community/netinfo/jest/netinfo-mock'),
);

jest.mock('@shopify/react-native-skia', () => ({
  Canvas: 'Canvas',
  Circle: 'Circle',
}));

jest.mock('@react-native-clipboard/clipboard', () => ({
  getString: jest.fn().mockResolvedValue(''),
  setString: jest.fn(),
}));
