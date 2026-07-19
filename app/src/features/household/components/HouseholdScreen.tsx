import React, {useState} from 'react';
import type {BottomTabScreenProps} from '@react-navigation/bottom-tabs';
import {Share, Text, View} from 'react-native';
import Clipboard from '@react-native-clipboard/clipboard';

import {Screen} from '@shared/components/Screen';
import {Card} from '@shared/components/Card';
import {SectionHeader} from '@shared/components/SectionHeader';
import {ListRow} from '@shared/components/ListRow';
import {Avatar} from '@shared/components/Avatar';
import {Button} from '@shared/components/Button';
import {useHousehold, useMembers} from '@shared/hooks/useHousehold';
import {useGenerateInvite} from '@shared/hooks/useGenerateInvite';
import {ProfileGate} from '@shared/components/ProfileGate';
import {supabase} from '@lib/supabase';

import type {MainTabParamList} from '@app/navigation/types';

type Props = BottomTabScreenProps<MainTabParamList, 'Household'>;

const PROFILE_LABEL: Record<string, string> = {
  duo: 'Duo',
  shared_flat: 'Shared flat',
  co_living: 'Co-living',
};

/**
 * Steady-state Household tab -- a plan gap-fill (the folder tree calls for a
 * "Household" tab but the plan never describes its contents beyond
 * onboarding's one-time InviteShare step). Houses household info, the member
 * list, an ongoing "invite another roommate" action (reuses
 * `shared/hooks/useGenerateInvite`, the same RPC wrapper InviteShare uses),
 * and quick links into the profile-gated Market/Feedback tabs. See
 * docs/DECISIONS.md.
 */
export function HouseholdScreen({navigation}: Props): React.JSX.Element {
  const household = useHousehold();
  const members = useMembers();
  const generateInvite = useGenerateInvite();
  const [isSigningOut, setIsSigningOut] = useState(false);

  async function handleSignOut(): Promise<void> {
    setIsSigningOut(true);
    try {
      await supabase.auth.signOut();
    } finally {
      setIsSigningOut(false);
    }
  }

  return (
    <Screen scrollable>
      <Text className="pt-4 font-sans-bold text-2xl text-ink">{household.data?.name ?? 'Household'}</Text>
      {household.data ? (
        <Text className="font-sans text-sm text-ink-muted">
          {PROFILE_LABEL[household.data.profile] ?? household.data.profile} · {household.data.roommate_count}{' '}
          roommates
        </Text>
      ) : null}

      <SectionHeader title="Members" />
      <Card className="gap-1">
        {(members.data ?? []).map((member, index) => (
          <View key={member.id} className={index > 0 ? 'border-t border-border pt-1' : ''}>
            <ListRow
              title={member.full_name || 'Roommate'}
              leading={<Avatar name={member.full_name || '?'} size={32} />}
            />
          </View>
        ))}
      </Card>

      <SectionHeader title="Invite" />
      <Card className="gap-3">
        {generateInvite.data ? (
          <>
            <Text selectable className="font-sans text-sm text-ink">
              {generateInvite.data.deepLink}
            </Text>
            <View className="flex-row gap-2">
              <Button
                label="Copy"
                variant="secondary"
                className="flex-1"
                onPress={() => Clipboard.setString(generateInvite.data?.deepLink ?? '')}
              />
              <Button
                label="Share"
                className="flex-1"
                onPress={() => {
                  void Share.share({message: generateInvite.data?.deepLink ?? ''});
                }}
              />
            </View>
          </>
        ) : (
          <Button
            label={generateInvite.isPending ? 'Generating...' : 'Invite a roommate'}
            onPress={() => generateInvite.mutate()}
            disabled={generateInvite.isPending}
          />
        )}
      </Card>

      <ProfileGate allow={['shared_flat']}>
        <SectionHeader title="Chore market" />
        <Card>
          <ListRow title="Open the chore market" onPress={() => navigation.navigate('Market')} />
        </Card>
      </ProfileGate>

      <ProfileGate allow={['duo']}>
        <SectionHeader title="Feedback" />
        <Card>
          <ListRow title="Open feedback" onPress={() => navigation.navigate('Feedback')} />
        </Card>
      </ProfileGate>

      <Button
        className="mt-6"
        label={isSigningOut ? 'Signing out...' : 'Sign out'}
        variant="secondary"
        onPress={() => {
          void handleSignOut();
        }}
        disabled={isSigningOut}
      />
    </Screen>
  );
}
