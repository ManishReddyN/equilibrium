import React, {useEffect, useState} from 'react';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import {Text, TextInput} from 'react-native';

import {Screen} from '@shared/components/Screen';
import {Card} from '@shared/components/Card';
import {Button} from '@shared/components/Button';

import type {OnboardingStackParamList} from '@app/navigation/types';
import {useDraftChores, useSaveDefinitionsOfDone} from '../services/onboarding';

type Props = NativeStackScreenProps<OnboardingStackParamList, 'DefinitionOfDone'>;

/**
 * Baseline photo capture (plan section 4.4: `react-native-image-picker`,
 * resize to 1600px, upload to `baseline-photos/{household_id}/{chore_id}.jpg`,
 * "Baseline locked" immutability UI) is deferred to Phase 4 -- this step only
 * collects the text DoD for now. See docs/DECISIONS.md.
 */
export function DefinitionOfDoneScreen({navigation, route}: Props): React.JSX.Element {
  const {householdId} = route.params;
  const chores = useDraftChores(householdId);
  const saveDoD = useSaveDefinitionsOfDone();
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [errorMessage, setErrorMessage] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (!chores.data) {
      return;
    }
    setDrafts(current => {
      const next = {...current};
      for (const chore of chores.data) {
        if (!(chore.id in next)) {
          next[chore.id] = chore.definitionOfDone;
        }
      }
      return next;
    });
  }, [chores.data]);

  async function handleSave(): Promise<void> {
    setErrorMessage(undefined);
    try {
      await saveDoD.mutateAsync(
        Object.entries(drafts).map(([choreId, definitionOfDone]) => ({choreId, definitionOfDone})),
      );
      navigation.navigate('InviteShare');
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Could not save.');
    }
  }

  return (
    <Screen scrollable>
      <Text className="pt-4 font-sans-bold text-2xl text-ink">Definition of done</Text>
      <Text className="pb-2 font-sans text-sm text-ink-muted">
        Describe what "done" looks like for each chore, so there's no ambiguity later.
      </Text>

      {(chores.data ?? []).map(chore => (
        <Card key={chore.id} className="mt-3 gap-2">
          <Text className="font-sans-medium text-base text-ink">{chore.title}</Text>
          <TextInput
            multiline
            placeholder="e.g. Dishes washed, dried, and put away; counters wiped."
            placeholderTextColor="#64748B"
            value={drafts[chore.id] ?? ''}
            onChangeText={text => setDrafts(current => ({...current, [chore.id]: text}))}
            className="min-h-[60px] rounded-control border border-border px-4 py-3 font-sans text-base text-ink"
          />
        </Card>
      ))}

      {errorMessage ? <Text className="mt-2 font-sans text-sm text-warn">{errorMessage}</Text> : null}

      <Button
        className="mt-4"
        label={saveDoD.isPending ? 'Saving...' : 'Next'}
        onPress={() => {
          void handleSave();
        }}
        disabled={saveDoD.isPending || (chores.data ?? []).length === 0}
      />
    </Screen>
  );
}
