/**
 * TanStack Query persister backed by react-native-quick-sqlite (plan section
 * 3.2), rather than MMKV: the dehydrated cache (assignments history, ledger
 * pages) can grow well past MMKV's small-value sweet spot for a busy
 * household, so it gets its own `equilibrium.db` / `kv` table instead of
 * riding along in the MMKV instance `lib/supabase.ts` uses for the auth
 * session.
 */
import {open, type QuickSQLiteConnection} from 'react-native-quick-sqlite';
import type {Persister, PersistedClient} from '@tanstack/react-query-persist-client';

const DB_NAME = 'equilibrium.db';
const CACHE_KEY = 'tanstack-query-cache';

let connection: QuickSQLiteConnection | undefined;

/** Lazily opens the shared connection and ensures the `kv` table exists. */
function getConnection(): QuickSQLiteConnection {
  if (!connection) {
    connection = open({name: DB_NAME});
    connection.execute('create table if not exists kv (key text primary key, value text not null);');
  }
  return connection;
}

interface KvRow {
  value: string;
}

export const sqliteQueryPersister: Persister = {
  persistClient: async (persistedClient: PersistedClient) => {
    const value = JSON.stringify(persistedClient);
    await getConnection().executeAsync(
      `insert into kv (key, value) values (?, ?)
       on conflict(key) do update set value = excluded.value;`,
      [CACHE_KEY, value],
    );
  },
  restoreClient: async () => {
    const {rows} = await getConnection().executeAsync('select value from kv where key = ?;', [
      CACHE_KEY,
    ]);
    if (!rows || rows.length === 0) {
      return undefined;
    }
    const row = rows.item(0) as KvRow;
    return JSON.parse(row.value) as PersistedClient;
  },
  removeClient: async () => {
    await getConnection().executeAsync('delete from kv where key = ?;', [CACHE_KEY]);
  },
};

/** Closes and forgets the shared connection -- used by sign-out and by tests that need a clean slate. */
export function resetSqliteConnection(): void {
  connection?.close();
  connection = undefined;
}
