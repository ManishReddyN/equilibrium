import React, {useState} from 'react';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import {Text, TextInput, View} from 'react-native';

import {Screen} from '@shared/components/Screen';
import {Card} from '@shared/components/Card';
import {Button} from '@shared/components/Button';
import {colors} from '@theme/tokens';

import type {OnboardingStackParamList} from '@app/navigation/types';
import {useJoinHousehold} from '../services/onboarding';

type Props = NativeStackScreenProps<OnboardingStackParamList, 'JoinHousehold'>;

/**
 * Reached either via manual code entry or the `equilibrium://join?code=...`
 * deep link (`app/navigation/linking.ts`), which pre-fills `route.params.code`.
 * No explicit post-success navigation: `fn_join_household` makes
 * `useHousehold()` go truthy, and RootNavigator's AuthGate swaps to Main on
 * its own (the join path never sets the onboarding store's `isInProgress`
 * override -- there's no further step after joining).
 */
export function JoinHouseholdScreen({route}: Props): React.JSX.Element {
  const [code, setCode] = useState(route.params?.code ?? '');
  const joinHousehold = useJoinHousehold();
  const [errorMessage, setErrorMessage] = useState<string | undefined>(undefined);

  async function handleJoin(): Promise<void> {
    setErrorMessage(undefined);
    try {
      await joinHousehold.mutateAsync({inviteSecret: code.trim()});
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Could not join household.');
    }
  }

  return (
    <Screen>
      <View className="flex-1 items-center justify-center gap-4 px-4">
        <Text className="font-sans-bold text-2xl text-ink">Join a household</Text>
        <Card className="w-full gap-3">
          <TextInput
            autoCapitalize="none"
            autoCorrect={false}
            placeholder="Invite code"
            placeholderTextColor={colors.inkMuted}
            value={code}
            onChangeText={setCode}
            className="rounded-control border border-border px-4 py-3 font-sans text-base text-ink"
          />
          {errorMessage ? <Text className="font-sans text-sm text-warn">{errorMessage}</Text> : null}
          <Button
            label={joinHousehold.isPending ? 'Joining...' : 'Join'}
            onPress={() => {
              void handleJoin();
            }}
            disabled={joinHousehold.isPending || code.trim().length === 0}
          />
        </Card>
      </View>
    </Screen>
  );
}
