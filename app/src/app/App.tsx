/**
 * Equilibrium — Phase 1 app shell + temporary ProbeScreen.
 * ProbeScreen proves NativeWind, Nunito, Reanimated, Skia, and quick-sqlite
 * all work end-to-end on-device. Replaced by RootNavigator in Phase 3 and
 * deleted in Phase 4 per the execution plan.
 *
 * @format
 */

import React, {useEffect, useState} from 'react';
import {GestureHandlerRootView} from 'react-native-gesture-handler';
import {SafeAreaProvider, SafeAreaView} from 'react-native-safe-area-context';
import {QueryClient} from '@tanstack/react-query';
import {PersistQueryClientProvider} from '@tanstack/react-query-persist-client';
import {createSyncStoragePersister} from '@tanstack/query-sync-storage-persister';
import {NavigationContainer} from '@react-navigation/native';
import {View, Text, Pressable} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import {Canvas, Circle} from '@shopify/react-native-skia';
import {open} from 'react-native-quick-sqlite';
import {MMKV} from 'react-native-mmkv';

const mmkvStorage = new MMKV();
const persister = createSyncStoragePersister({
  storage: {
    getItem: key => mmkvStorage.getString(key) ?? null,
    setItem: (key, value) => mmkvStorage.set(key, value),
    removeItem: key => mmkvStorage.delete(key),
  },
});

const queryClient = new QueryClient();

function ProbeScreen(): React.JSX.Element {
  const offset = useSharedValue(0);
  const [sqliteResult, setSqliteResult] = useState<string>('running...');

  useEffect(() => {
    offset.value = withRepeat(
      withTiming(1, {duration: 900, easing: Easing.inOut(Easing.quad)}),
      -1,
      true,
    );
  }, [offset]);

  useEffect(() => {
    try {
      const db = open({name: 'equilibrium-probe.db'});
      const {rows} = db.execute('SELECT 1 as ok;');
      setSqliteResult(
        rows?.item ? JSON.stringify(rows.item(0)) : JSON.stringify(rows),
      );
      db.close();
    } catch (error) {
      setSqliteResult(`error: ${String(error)}`);
    }
  }, []);

  const boxStyle = useAnimatedStyle(() => ({
    transform: [{translateX: offset.value * 200}],
  }));

  return (
    <SafeAreaView className="flex-1 bg-canvas items-center justify-center gap-6 px-4">
      <Text className="font-sans-semibold text-2xl text-ink">Equilibrium</Text>
      <Text className="font-sans text-ink-muted">Phase 1 probe screen</Text>

      <View className="h-8 w-full items-start">
        <Animated.View
          style={boxStyle}
          className="h-8 w-8 rounded-control bg-primary"
        />
      </View>

      <Canvas style={{width: 120, height: 120}}>
        <Circle cx={60} cy={60} r={50} color="#0D9488" />
      </Canvas>

      <Text className="font-sans text-ink-muted">quick-sqlite: {sqliteResult}</Text>

      <Pressable className="rounded-card bg-primary px-6 py-3">
        <Text className="font-sans-medium text-white">Teal button</Text>
      </Pressable>
    </SafeAreaView>
  );
}

function App(): React.JSX.Element {
  return (
    <GestureHandlerRootView style={{flex: 1}}>
      <SafeAreaProvider>
        <PersistQueryClientProvider
          client={queryClient}
          persistOptions={{persister, maxAge: 1000 * 60 * 60 * 24 * 7}}>
          <NavigationContainer>
            <ProbeScreen />
          </NavigationContainer>
        </PersistQueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

export default App;
