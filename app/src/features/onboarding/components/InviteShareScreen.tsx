import React, {useEffect} from 'react';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import {Share, Text, View} from 'react-native';
import Clipboard from '@react-native-clipboard/clipboard';

import {Screen} from '@shared/components/Screen';
import {Card} from '@shared/components/Card';
import {Button} from '@shared/components/Button';
import {useGenerateInvite} from '@shared/hooks/useGenerateInvite';
import {formatInviteCode, shareMessage} from '@shared/utils/inviteCode';

import type {OnboardingStackParamList} from '@app/navigation/types';
import {useOnboardingStore} from '../onboardingStore';

type Props = NativeStackScreenProps<OnboardingStackParamList, 'InviteShare'>;

export function InviteShareScreen(_props: Props): React.JSX.Element {
  const generateInvite = useGenerateInvite();

  useEffect(() => {
    generateInvite.mutate();
    // Generate once on mount; re-running would issue a new secret and silently
    // invalidate the one already shown/copied.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleDone(): void {
    useOnboardingStore.getState().finish();
    // No explicit navigation call: RootNavigator's AuthGate re-renders on its
    // own (household exists, isInProgress now false) and swaps to Main.
  }

  return (
    <Screen>
      <View className="flex-1 items-center justify-center gap-6 px-4">
        <Text className="font-sans-bold text-2xl text-ink">Invite your roommates</Text>

        <Card className="w-full gap-3">
          {generateInvite.isPending ? (
            <Text className="font-sans text-sm text-ink-muted">Generating invite...</Text>
          ) : generateInvite.data ? (
            <>
              <Text selectable className="text-center font-sans-bold text-4xl tracking-widest text-ink">
                {formatInviteCode(generateInvite.data.code)}
              </Text>
              <Text className="text-center font-sans text-xs text-ink-muted">
                Share this code -- expires in 7 days
              </Text>
              <Button
                label="Copy code"
                variant="secondary"
                onPress={() => Clipboard.setString(generateInvite.data?.code ?? '')}
              />
              <Button
                label="Share"
                onPress={() => {
                  void Share.share({message: shareMessage(generateInvite.data?.code ?? '')});
                }}
              />
            </>
          ) : (
            <Text className="font-sans text-sm text-warn">Could not generate an invite.</Text>
          )}
        </Card>

        <Button label="Done" variant="secondary" onPress={handleDone} />
      </View>
    </Screen>
  );
}
