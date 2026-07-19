import React, {useMemo, useState} from 'react';
import {Alert, Pressable, Text, TextInput, View} from 'react-native';

import {Screen} from '@shared/components/Screen';
import {Card} from '@shared/components/Card';
import {SectionHeader} from '@shared/components/SectionHeader';
import {EmptyState} from '@shared/components/EmptyState';
import {Button} from '@shared/components/Button';
import {useHousehold, useMembers} from '@shared/hooks/useHousehold';
import {useSession} from '@app/providers/SessionProvider';
import {formatDateTime, formatDurationShort} from '@shared/utils/dates';
import {Clock, Trash2} from '@theme/icons';
import {colors} from '@theme/tokens';

import {useFeedbackInbox, useFeedbackSent, useRetractFeedback, useSendFeedback} from '../services/feedback';

/**
 * duo-only tab (rendered conditionally by `app/navigation/MainTabs.tsx`).
 * Retract ("Retract allowed while status = 'queued'", plan section 4.5) is
 * gated client-side on `item.status === 'queued'` as a UX nicety only --
 * `fn_retract_feedback` re-checks both authorship and status server-side and
 * is the real enforcement (see features/feedback/services/feedback.ts).
 *
 * Known schema gap (logged in docs/DECISIONS.md): there is no trigger that
 * ever transitions `status` from `queued` to `released`/`read` -- the
 * "Delivers in Xh Ym" vs "Delivered" distinction below is computed purely
 * from `release_at` vs now(), so a sent item can still be retracted here even
 * after its cool-off has elapsed and the recipient has already seen it in
 * their inbox. Accepted as-is rather than adding new trigger logic this phase.
 */
export function FeedbackScreen(): React.JSX.Element {
  const {session} = useSession();
  const household = useHousehold();
  const members = useMembers();
  const inbox = useFeedbackInbox();
  const sent = useFeedbackSent();
  const sendFeedback = useSendFeedback();
  const retractFeedback = useRetractFeedback();
  const [body, setBody] = useState('');

  function confirmRetract(feedbackId: string): void {
    Alert.alert('Retract this feedback?', 'It will never be delivered.', [
      {text: 'Cancel', style: 'cancel'},
      {
        text: 'Retract',
        style: 'destructive',
        onPress: () =>
          retractFeedback.mutate(
            {feedbackId},
            {onError: error => Alert.alert('Could not retract feedback', error.message)},
          ),
      },
    ]);
  }

  const recipientId = useMemo(() => {
    const other = (members.data ?? []).find(member => member.id !== session?.user.id);
    return other?.id;
  }, [members.data, session?.user.id]);

  function handleSend(): void {
    if (!household.data || !recipientId || body.trim().length === 0) {
      return;
    }
    sendFeedback.mutate(
      {householdId: household.data.id, recipientId, body: body.trim()},
      {onSuccess: () => setBody('')},
    );
  }

  return (
    <Screen scrollable>
      <Text className="pt-4 font-sans-bold text-2xl text-ink">Feedback</Text>

      <Card className="mt-4 gap-3">
        <Text className="font-sans-medium text-sm text-ink">Send feedback</Text>
        <TextInput
          multiline
          placeholder="Something on your mind..."
          placeholderTextColor="#64748B"
          value={body}
          onChangeText={setBody}
          className="min-h-[80px] rounded-control border border-border px-4 py-3 font-sans text-base text-ink"
        />
        <Button
          label={sendFeedback.isPending ? 'Sending...' : 'Send'}
          onPress={handleSend}
          disabled={sendFeedback.isPending || body.trim().length === 0 || !recipientId}
        />
      </Card>

      <SectionHeader title="Inbox" />
      {(inbox.data ?? []).length === 0 && !inbox.isLoading ? (
        <EmptyState title="Nothing released yet." subtitle="Feedback arrives after the cool-off period." />
      ) : (
        <Card className="gap-2">
          {(inbox.data ?? []).map((item, index) => (
            <View key={item.id} className={index > 0 ? 'border-t border-border pt-2' : ''}>
              <Text className="font-sans text-base text-ink">{item.body}</Text>
              <Text className="font-sans text-xs text-ink-muted">
                {formatDateTime(new Date(item.created_at))}
              </Text>
            </View>
          ))}
        </Card>
      )}

      <SectionHeader title="Sent" />
      {(sent.data ?? []).length === 0 && !sent.isLoading ? (
        <EmptyState title="Nothing sent yet." />
      ) : (
        <Card className="gap-2">
          {(sent.data ?? []).map((item, index) => {
            const releaseAt = new Date(item.release_at);
            const isPending = releaseAt.getTime() > Date.now();
            return (
              <View
                key={item.id}
                className={`flex-row items-start justify-between ${
                  index > 0 ? 'border-t border-border pt-2' : ''
                }`}>
                <View className="flex-1">
                  <Text className="font-sans text-base text-ink">{item.body}</Text>
                  {isPending ? (
                    <View className="mt-1 flex-row items-center gap-1">
                      <Clock size={14} strokeWidth={1.75} color="#64748B" />
                      <Text className="font-sans text-xs text-ink-muted">
                        Delivers in {formatDurationShort(releaseAt.getTime() - Date.now())}
                      </Text>
                    </View>
                  ) : (
                    <Text className="mt-1 font-sans text-xs text-ink-muted">Delivered</Text>
                  )}
                </View>
                {item.status === 'queued' ? (
                  <Pressable
                    onPress={() => confirmRetract(item.id)}
                    disabled={retractFeedback.isPending}
                    accessibilityRole="button"
                    accessibilityLabel="Retract feedback"
                    hitSlop={8}
                    className={retractFeedback.isPending ? 'opacity-50' : ''}>
                    <Trash2 size={18} strokeWidth={1.75} color={colors.inkMuted} />
                  </Pressable>
                ) : null}
              </View>
            );
          })}
        </Card>
      )}
    </Screen>
  );
}
