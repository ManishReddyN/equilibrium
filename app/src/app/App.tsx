/**
 * Equilibrium app shell (plan section 3.1). Replaces Phase 1's ProbeScreen
 * (which proved NativeWind, Nunito, Reanimated, Skia, and quick-sqlite all
 * work end-to-end on-device) with the real provider stack + navigator:
 * `GestureHandlerRootView` > `SafeAreaProvider` > `SessionProvider` (auth) >
 * `QueryProvider` (react-query + SQLite persister, section 3.2) >
 * `RootNavigator` (AuthGate, section 3.1). `NavigationContainer` and the
 * `QueryClient`/persister live inside `RootNavigator`/`QueryProvider`
 * respectively, so this file is pure composition.
 *
 * @format
 */

import React from 'react';
import {GestureHandlerRootView} from 'react-native-gesture-handler';
import {SafeAreaProvider} from 'react-native-safe-area-context';

import {SessionProvider} from './providers/SessionProvider';
import {QueryProvider} from './providers/QueryProvider';
import {RootNavigator} from './navigation/RootNavigator';

function App(): React.JSX.Element {
  return (
    // GestureHandlerRootView isn't one of NativeWind's cssInterop-registered
    // components, so `className` would silently no-op here.
    // eslint-disable-next-line react-native/no-inline-styles
    <GestureHandlerRootView style={{flex: 1}}>
      <SafeAreaProvider>
        <SessionProvider>
          <QueryProvider>
            <RootNavigator />
          </QueryProvider>
        </SessionProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

export default App;
