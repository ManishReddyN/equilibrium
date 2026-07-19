/**
 * Phase 3 Verification Gate: persister round-trip (plan section 3.5).
 * Exercises `sqliteQueryPersister` against the stateful `react-native-quick-sqlite`
 * mock in jest.setup.js -- a fake backing store shared across `open()` calls,
 * so this genuinely covers the persister's SQL (insert-or-update upsert,
 * select-by-key, delete-by-key) rather than just mocking the persister away.
 */
import type {PersistedClient} from '@tanstack/react-query-persist-client';

// Explicit import (rather than relying on ambient jest globals -- this repo
// has no @types/jest installed, matching __tests__/App.test.tsx's existing
// convention).
import {beforeEach, describe, expect, it} from '@jest/globals';

import {resetSqliteConnection, sqliteQueryPersister} from './sqlite';

function fakePersistedClient(overrides: Partial<PersistedClient> = {}): PersistedClient {
  return {
    timestamp: Date.now(),
    buster: 'test-buster',
    clientState: {queries: [], mutations: []},
    ...overrides,
  };
}

describe('sqliteQueryPersister', () => {
  beforeEach(() => {
    // Fresh connection + fresh backing store per test (see jest.setup.js:
    // the mock's `close()` clears its shared `tables` map).
    resetSqliteConnection();
  });

  it('restoreClient returns undefined before anything has been persisted', async () => {
    await expect(sqliteQueryPersister.restoreClient()).resolves.toBeUndefined();
  });

  it('round-trips a persisted client through restoreClient', async () => {
    const client = fakePersistedClient({buster: 'v1'});

    await sqliteQueryPersister.persistClient(client);

    await expect(sqliteQueryPersister.restoreClient()).resolves.toEqual(client);
  });

  it('overwrites the previous value on a second persistClient call (upsert, not duplicate rows)', async () => {
    await sqliteQueryPersister.persistClient(fakePersistedClient({buster: 'v1'}));
    const second = fakePersistedClient({buster: 'v2'});
    await sqliteQueryPersister.persistClient(second);

    await expect(sqliteQueryPersister.restoreClient()).resolves.toEqual(second);
  });

  it('removeClient clears the stored value', async () => {
    await sqliteQueryPersister.persistClient(fakePersistedClient());

    await sqliteQueryPersister.removeClient();

    await expect(sqliteQueryPersister.restoreClient()).resolves.toBeUndefined();
  });
});
