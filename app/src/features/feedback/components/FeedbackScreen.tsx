import React, {useMemo, useState} from 'react';
import {Text, TextInput, View} from 'react-native';

import {Screen} from '@shared/components/Screen';
import {Card} from '@shared/components/Card';
import {SectionHeader} from '@shared/components/SectionHeader';
import {EmptyState} from '@shared/components/EmptyState';
import {Button} from '@shared/components/Button';
import {useHousehold, useMembers} from '@shared/hooks/useHousehold';
import {useSession} from '@app/providers/SessionProvider';
import {formatDateTime, formatDurationShort} from '@shared/utils/dates';
import {Clock} from '@theme/icons';

import {useFeedbackInbox, useFeedbackSent, useSendFeedback} from '../services/feedback';

/**
 * duo-only tab (rendered conditionally by `app/navigation/MainTabs.tsx`).
 * Retract is intentionally not implemented yet -- it needs a new RPC the
 * database doesn't have (see features/feedback/services/feedback.ts).
 */
export function FeedbackScreen(): React.JSX.Element {
  const {session} = useSession();
  const household = useHousehold();
  const members = useMembers();
  const inbox = useFeedbackInbox();
  const sent = useFeedbackSent();
  const sendFeedback = useSendFeedback();
  const [body, setBody] = useState('');

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
              <View key={item.id} className={index > 0 ? 'border-t border-border pt-2' : ''}>
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
            );
          })}
        </Card>
      )}
    </Screen>
  );
}
