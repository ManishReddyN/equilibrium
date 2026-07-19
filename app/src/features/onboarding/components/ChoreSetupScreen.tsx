import React, {useState} from 'react';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import {Pressable, Text, TextInput, View} from 'react-native';

import {Screen} from '@shared/components/Screen';
import {Card} from '@shared/components/Card';
import {Button} from '@shared/components/Button';
import {ListRow} from '@shared/components/ListRow';

import type {OnboardingStackParamList} from '@app/navigation/types';
import {useAddChores, type DraftChore} from '../services/onboarding';

type Props = NativeStackScreenProps<OnboardingStackParamList, 'ChoreSetup'>;

const DEFAULT_RECURRENCE_DAYS = 7;

export function ChoreSetupScreen({navigation, route}: Props): React.JSX.Element {
  const {householdId} = route.params;
  const [drafts, setDrafts] = useState<DraftChore[]>([]);
  const [title, setTitle] = useState('');
  const [complexityWeight, setComplexityWeight] = useState(5);
  const addChores = useAddChores();
  const [errorMessage, setErrorMessage] = useState<string | undefined>(undefined);

  function adjustWeight(delta: number): void {
    setComplexityWeight(current => Math.min(10, Math.max(1, current + delta)));
  }

  function addDraft(): void {
    if (title.trim().length === 0) {
      return;
    }
    setDrafts(current => [
      ...current,
      {
        title: title.trim(),
        complexityWeight,
        isRecurring: true,
        recurrenceDays: DEFAULT_RECURRENCE_DAYS,
      },
    ]);
    setTitle('');
    setComplexityWeight(5);
  }

  function removeDraft(index: number): void {
    setDrafts(current => current.filter((_, i) => i !== index));
  }

  async function handleNext(): Promise<void> {
    setErrorMessage(undefined);
    try {
      await addChores.mutateAsync({householdId, chores: drafts});
      navigation.navigate('DefinitionOfDone', {householdId});
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Could not save chores.');
    }
  }

  return (
    <Screen scrollable>
      <Text className="pt-4 font-sans-bold text-2xl text-ink">Set up chores</Text>

      <Card className="mt-4 gap-3">
        <View className="gap-2">
          <Text className="font-sans-medium text-sm text-ink">Chore title</Text>
          <TextInput
            placeholder="Dishes"
            placeholderTextColor="#64748B"
            value={title}
            onChangeText={setTitle}
            className="rounded-control border border-border px-4 py-3 font-sans text-base text-ink"
          />
        </View>
        <View className="gap-2">
          <Text className="font-sans-medium text-sm text-ink">Complexity (1-10)</Text>
          <View className="flex-row items-center gap-4">
            <Pressable
              accessibilityRole="button"
              onPress={() => adjustWeight(-1)}
              className="h-10 w-10 items-center justify-center rounded-control bg-primary-soft">
              <Text className="font-sans-bold text-lg text-primary">-</Text>
            </Pressable>
            <Text className="font-sans-semibold text-xl text-ink">{complexityWeight}</Text>
            <Pressable
              accessibilityRole="button"
              onPress={() => adjustWeight(1)}
              className="h-10 w-10 items-center justify-center rounded-control bg-primary-soft">
              <Text className="font-sans-bold text-lg text-primary">+</Text>
            </Pressable>
          </View>
        </View>
        <Button label="Add chore" variant="secondary" onPress={addDraft} disabled={title.trim().length === 0} />
      </Card>

      {drafts.length > 0 ? (
        <Card className="mt-4 gap-1">
          {drafts.map((draft, index) => (
            <View key={`${draft.title}-${index}`} className={index > 0 ? 'border-t border-border pt-1' : ''}>
              <ListRow
                title={draft.title}
                subtitle={`Complexity ${draft.complexityWeight} · every ${draft.recurrenceDays} days`}
                trailing={
                  <Button label="Remove" variant="secondary" className="px-3 py-2" onPress={() => removeDraft(index)} />
                }
              />
            </View>
          ))}
        </Card>
      ) : null}

      {errorMessage ? <Text className="mt-2 font-sans text-sm text-warn">{errorMessage}</Text> : null}

      <Button
        className="mt-4"
        label={addChores.isPending ? 'Saving...' : 'Next'}
        onPress={() => {
          void handleNext();
        }}
        disabled={addChores.isPending || drafts.length === 0}
      />
    </Screen>
  );
}
