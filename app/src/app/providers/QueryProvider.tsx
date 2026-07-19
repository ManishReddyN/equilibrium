/**
 * QueryClient + SQLite persister wiring (plan section 3.2): `gcTime` 7 days /
 * `staleTime` 30s defaults, `PersistQueryClientProvider` with a 7-day
 * `maxAge` and a `buster` tied to the app version, and `onlineManager` wired
 * to NetInfo so paused offline mutations resume the moment connectivity
 * returns.
 */
import React from 'react';
import {onlineManager, QueryClient} from '@tanstack/react-query';
import {PersistQueryClientProvider} from '@tanstack/react-query-persist-client';
import NetInfo from '@react-native-community/netinfo';

import {sqliteQueryPersister} from '@lib/db/sqlite';
import {appVersion} from '@lib/appVersion';
import {useAppStateQueryFocusSync} from '@shared/hooks/useAppState';

const ONE_DAY_MS = 1000 * 60 * 60 * 24;

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      gcTime: 7 * ONE_DAY_MS,
      staleTime: 30_000,
    },
  },
});

onlineManager.setEventListener(setOnline => {
  return NetInfo.addEventListener(state => {
    setOnline(Boolean(state.isConnected));
  });
});

export function QueryProvider({children}: {children: React.ReactNode}): React.JSX.Element {
  useAppStateQueryFocusSync();

  return (
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{
        persister: sqliteQueryPersister,
        maxAge: 7 * ONE_DAY_MS,
        buster: appVersion,
      }}>
      {children}
    </PersistQueryClientProvider>
  );
}
