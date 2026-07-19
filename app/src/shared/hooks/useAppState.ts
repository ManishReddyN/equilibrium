import {useEffect, useState} from 'react';
import {AppState, type AppStateStatus} from 'react-native';
import {focusManager} from '@tanstack/react-query';

/** Current React Native AppState status ('active' | 'background' | 'inactive'), reactive. */
export function useAppState(): AppStateStatus {
  const [status, setStatus] = useState<AppStateStatus>(AppState.currentState);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', setStatus);
    return () => subscription.remove();
  }, []);

  return status;
}

/**
 * Wires TanStack Query's `focusManager` to RN's AppState, so queries refetch
 * on foreground the same way they would on a browser tab regaining focus.
 * Call once, near the root (app/providers/QueryProvider.tsx) -- not per-screen.
 */
export function useAppStateQueryFocusSync(): void {
  useEffect(() => {
    function onChange(status: AppStateStatus): void {
      focusManager.setFocused(status === 'active');
    }
    const subscription = AppState.addEventListener('change', onChange);
    return () => subscription.remove();
  }, []);
}
