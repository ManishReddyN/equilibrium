import {useMutation, useQuery, useQueryClient, type UseQueryResult} from '@tanstack/react-query';

import {supabase} from '@lib/supabase';
import {queryKeys} from '@lib/queryKeys';
import type {Database} from '@lib/database.types';

export type FeedbackRow = Database['public']['Tables']['feedback_queue']['Row'];

async function currentUserId(): Promise<string> {
  const {data, error} = await supabase.auth.getUser();
  if (error || !data.user) {
    throw error ?? new Error('Not authenticated');
  }
  return data.user.id;
}

/**
 * `['feedback','inbox']` -- released feedback addressed to me. The
 * `fb_select` RLS policy (supabase/migrations/0005_rls.sql) already only
 * returns a recipient's rows once `release_at <= now()`, so no extra client
 * filtering is needed beyond scoping to `recipient_id`.
 */
export function useFeedbackInbox(): UseQueryResult<FeedbackRow[]> {
  return useQuery({
    queryKey: queryKeys.feedbackInbox(),
    queryFn: async (): Promise<FeedbackRow[]> => {
      const userId = await currentUserId();
      const {data, error} = await supabase
        .from('feedback_queue')
        .select('*')
        .eq('recipient_id', userId)
        .order('created_at', {ascending: false});
      if (error) {
        throw error;
      }
      return data ?? [];
    },
  });
}

/** `['feedback','sent']` -- feedback I've authored, released or still cooling off. */
export function useFeedbackSent(): UseQueryResult<FeedbackRow[]> {
  return useQuery({
    queryKey: queryKeys.feedbackSent(),
    queryFn: async (): Promise<FeedbackRow[]> => {
      const userId = await currentUserId();
      const {data, error} = await supabase
        .from('feedback_queue')
        .select('*')
        .eq('author_id', userId)
        .order('created_at', {ascending: false});
      if (error) {
        throw error;
      }
      return data ?? [];
    },
  });
}

/**
 * Inserts a feedback row; `release_at` is overwritten server-side by
 * `trg_feedback_set_release` (before-insert trigger, cool_off_minutes from
 * the household), and `fn_feedback_set_release` raises if the household
 * isn't `duo` -- both enforced regardless of what the client sends.
 */
export function useSendFeedback(): ReturnType<
  typeof useMutation<void, Error, {householdId: string; recipientId: string; body: string}>
> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      householdId,
      recipientId,
      body,
    }: {
      householdId: string;
      recipientId: string;
      body: string;
    }): Promise<void> => {
      const userId = await currentUserId();
      const {error} = await supabase.from('feedback_queue').insert({
        household_id: householdId,
        author_id: userId,
        recipient_id: recipientId,
        body,
      });
      if (error) {
        throw error;
      }
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({queryKey: queryKeys.feedbackSent()});
    },
  });
}

// NOTE: "Retract allowed while status = 'queued'" (plan section 4.5) needs a
// dedicated RPC -- feedback_queue only has SELECT/INSERT grants (see
// supabase/migrations/0005_rls.sql), no UPDATE, so the client cannot flip
// `status` itself. Add `fn_retract_feedback` in the same Phase 4 migration
// that adds `fn_claim_listing` for the market feature; tracked in
// docs/DECISIONS.md.
