import React, {useEffect, useState} from 'react';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import {ActivityIndicator, Text, TextInput, View} from 'react-native';
import {launchCamera} from 'react-native-image-picker';

import {Screen} from '@shared/components/Screen';
import {Card} from '@shared/components/Card';
import {Button} from '@shared/components/Button';
import {Camera, Lock} from '@theme/icons';
import {colors} from '@theme/tokens';

import type {OnboardingStackParamList} from '@app/navigation/types';
import {useDraftChores, useSaveDefinitionsOfDone, useUploadBaselinePhoto} from '../services/onboarding';
import {BASELINE_PHOTO_PICKER_OPTIONS, resolveBaselinePhotoPickerResponse} from '../utils/baselinePhoto';

type Props = NativeStackScreenProps<OnboardingStackParamList, 'DefinitionOfDone'>;

/**
 * Per plan section 4.4: DoD text + baseline photo, per chore. The photo is
 * captured via `launchCamera` (never the library -- the baseline must be a
 * fresh, current-state photo, not a historical one), uploaded immediately on
 * capture (not deferred to the screen's "Next" button, so a mid-flow app kill
 * doesn't lose an already-taken photo), and becomes immutable the moment
 * `chore.baselinePhotoPath` is set -- the button is replaced by a "Baseline
 * locked" row, matching the storage policy's own insert-once enforcement
 * (`useUploadBaselinePhoto`'s header comment). The photo is optional for
 * proceeding past this screen (only the DoD text is required) since the plan
 * doesn't mandate it as a hard gate; see docs/DECISIONS.md.
 */
export function DefinitionOfDoneScreen({navigation, route}: Props): React.JSX.Element {
  const {householdId} = route.params;
  const chores = useDraftChores(householdId);
  const saveDoD = useSaveDefinitionsOfDone();
  const uploadPhoto = useUploadBaselinePhoto();
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [errorMessage, setErrorMessage] = useState<string | undefined>(undefined);
  const [capturingChoreId, setCapturingChoreId] = useState<string | null>(null);

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

  async function handleCapture(choreId: string): Promise<void> {
    setErrorMessage(undefined);
    setCapturingChoreId(choreId);
    try {
      const response = await launchCamera(BASELINE_PHOTO_PICKER_OPTIONS);
      const result = resolveBaselinePhotoPickerResponse(response);
      if (result.status === 'cancelled') {
        return;
      }
      if (result.status === 'error') {
        setErrorMessage(result.message);
        return;
      }
      await uploadPhoto.mutateAsync({
        householdId,
        choreId,
        uri: result.asset.uri,
        contentType: result.asset.contentType,
      });
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Could not upload the baseline photo.');
    } finally {
      setCapturingChoreId(null);
    }
  }

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

      {(chores.data ?? []).map(chore => {
        const isCapturing = capturingChoreId === chore.id;
        const isLocked = chore.baselinePhotoPath !== null;
        return (
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

            {isLocked ? (
              <View className="flex-row items-center gap-2 py-1">
                <Lock size={16} strokeWidth={1.75} color={colors.inkMuted} />
                <Text className="font-sans-medium text-sm text-ink-muted">Baseline locked</Text>
              </View>
            ) : (
              <View className="flex-row items-center gap-2">
                {isCapturing ? (
                  <ActivityIndicator size="small" color={colors.primary} />
                ) : (
                  <Camera size={16} strokeWidth={1.75} color={colors.primary} />
                )}
                <Button
                  className="flex-1"
                  variant="secondary"
                  label={isCapturing ? 'Uploading...' : 'Take baseline photo'}
                  onPress={() => {
                    void handleCapture(chore.id);
                  }}
                  disabled={isCapturing}
                  accessibilityHint="Opens the camera to capture this chore's current-state baseline photo."
                />
              </View>
            )}
          </Card>
        );
      })}

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
