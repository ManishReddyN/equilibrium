import React, {useEffect, useRef} from 'react';
import {ActivityIndicator} from 'react-native';
import {NavigationContainer} from '@react-navigation/native';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {useQueryClient} from '@tanstack/react-query';

import {useSession} from '@app/providers/SessionProvider';
import {useHousehold} from '@shared/hooks/useHousehold';
import {Screen} from '@shared/components/Screen';
import {SignInScreen} from '@features/auth/components/SignInScreen';
import {OnboardingNavigator} from '@features/onboarding/components/OnboardingNavigator';
import {useOnboardingStore} from '@features/onboarding/onboardingStore';
import {RealtimeChannelManager} from '@features/notifications/services/realtime';
import {colors} from '@theme/tokens';

import {linking} from './linking';
import {MainTabs} from './MainTabs';
import type {RootStackParamList} from './types';

const Stack = createNativeStackNavigator<RootStackParamList>();

function LoadingScreen(): React.JSX.Element {
  return (
    <Screen>
      {/* eslint-disable-next-line react-native/no-inline-styles -- ActivityIndicator isn't
      one of NativeWind's cssInterop-registered components, so `className` would silently no-op here. */}
      <ActivityIndicator style={{flex: 1}} size="large" color={colors.primary} />
    </Screen>
  );
}

/**
 * AuthGate: `Loading` while session/household resolve -> `Auth` (sign in) ->
 * `Onboarding` (signed in, no household yet, or mid-create-flow per
 * `onboardingStore`) -> `Main` (bottom tabs). Plan section 3.1 specifies this
 * file and the two-way Onboarding|MainTabs branch; `Loading` and the
 * `isOnboardingInProgress` override are additions -- see
 * app/navigation/types.ts and features/onboarding/onboardingStore.ts.
 */
export function RootNavigator(): React.JSX.Element {
  const {session, isLoading: isSessionLoading} = useSession();
  const household = useHousehold();
  const isOnboardingInProgress = useOnboardingStore(state => state.isInProgress);
  const queryClient = useQueryClient();
  const realtimeManagerRef = useRef<RealtimeChannelManager | null>(null);
  const householdId = household.data?.id;

  const isResolving = isSessionLoading || (Boolean(session) && household.isLoading);

  // Realtime (plan section 3.3): one channel per household, started once a
  // household is known and restarted whenever it changes; stopped on
  // cleanup (household loss / sign-out / unmount). The manager instance
  // itself is held in a ref so it survives re-renders instead of being
  // recreated on every household id change.
  useEffect(() => {
    if (!householdId) {
      return;
    }
    if (!realtimeManagerRef.current) {
      realtimeManagerRef.current = new RealtimeChannelManager(queryClient);
    }
    realtimeManagerRef.current.start(householdId);
    return () => {
      realtimeManagerRef.current?.stop();
    };
  }, [householdId, queryClient]);

  return (
    <NavigationContainer linking={linking}>
      <Stack.Navigator screenOptions={{headerShown: false}}>
        {isResolving ? (
          <Stack.Screen name="Loading" component={LoadingScreen} />
        ) : !session ? (
          <Stack.Screen name="Auth" component={SignInScreen} />
        ) : !household.data || isOnboardingInProgress ? (
          <Stack.Screen name="Onboarding" component={OnboardingNavigator} />
        ) : (
          <Stack.Screen name="Main" component={MainTabs} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
