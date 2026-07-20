import React, {useState} from 'react';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import {Pressable, Text, TextInput, View} from 'react-native';

import {Screen} from '@shared/components/Screen';
import {Card} from '@shared/components/Card';
import {Button} from '@shared/components/Button';
import {householdProfileForCount} from '@shared/hooks/useHouseholdProfile';
import {colors} from '@theme/tokens';

import type {OnboardingStackParamList} from '@app/navigation/types';
import {useCreateHousehold} from '../services/onboarding';
import {useOnboardingStore} from '../onboardingStore';

type Props = NativeStackScreenProps<OnboardingStackParamList, 'HouseholdBasics'>;

const PROFILE_PREVIEW: Record<string, string> = {
  duo: 'Duo mode: async cool-off feedback, back-to-back makeup turns.',
  shared_flat: 'Shared flat mode: anonymous chore market for swaps and drops.',
  co_living: 'Co-living mode: cohort grouping and a daily digest.',
};

export function HouseholdBasicsScreen({navigation}: Props): React.JSX.Element {
  const [name, setName] = useState('');
  const [roommateCount, setRoommateCount] = useState(2);
  const createHousehold = useCreateHousehold();
  const [errorMessage, setErrorMessage] = useState<string | undefined>(undefined);

  const previewKind = householdProfileForCount(roommateCount, {
    coolOffMinutes: 0,
    digestHourLocal: 0,
    cohortIndex: null,
  }).kind;

  function adjustCount(delta: number): void {
    setRoommateCount(current => Math.min(20, Math.max(2, current + delta)));
  }

  async function handleNext(): Promise<void> {
    setErrorMessage(undefined);
    try {
      // Set before the mutation resolves: once it does, `useHousehold()` goes
      // truthy and RootNavigator's AuthGate would otherwise swap straight to
      // Main mid-flow. See features/onboarding/onboardingStore.ts.
      useOnboardingStore.getState().begin();
      const householdId = await createHousehold.mutateAsync({name: name.trim(), roommateCount});
      navigation.navigate('ChoreSetup', {householdId});
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Could not create household.');
    }
  }

  return (
    <Screen scrollable>
      <Text className="pt-4 font-sans-bold text-2xl text-ink">Household basics</Text>

      <Card className="mt-4 gap-4">
        <View className="gap-2">
          <Text className="font-sans-medium text-sm text-ink">Household name</Text>
          <TextInput
            placeholder="The Loft"
            placeholderTextColor={colors.inkMuted}
            value={name}
            onChangeText={setName}
            className="rounded-control border border-border px-4 py-3 font-sans text-base text-ink"
          />
        </View>

        <View className="gap-2">
          <Text className="font-sans-medium text-sm text-ink">Roommates</Text>
          <View className="flex-row items-center gap-4">
            <Pressable
              accessibilityRole="button"
              onPress={() => adjustCount(-1)}
              className="h-10 w-10 items-center justify-center rounded-control bg-primary-soft">
              <Text className="font-sans-bold text-lg text-primary">-</Text>
            </Pressable>
            <Text className="font-sans-semibold text-xl text-ink">{roommateCount}</Text>
            <Pressable
              accessibilityRole="button"
              onPress={() => adjustCount(1)}
              className="h-10 w-10 items-center justify-center rounded-control bg-primary-soft">
              <Text className="font-sans-bold text-lg text-primary">+</Text>
            </Pressable>
          </View>
          <Text className="font-sans text-sm text-ink-muted">{PROFILE_PREVIEW[previewKind]}</Text>
        </View>

        {errorMessage ? <Text className="font-sans text-sm text-warn">{errorMessage}</Text> : null}

        <Button
          label={createHousehold.isPending ? 'Creating...' : 'Next'}
          onPress={() => {
            void handleNext();
          }}
          disabled={createHousehold.isPending || name.trim().length === 0}
        />
      </Card>
    </Screen>
  );
}
