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

/**
 * "Retract allowed while status = 'queued'" (plan section 4.5), via
 * `fn_retract_feedback` (`supabase/migrations/0007_market_claim.sql`) --
 * `feedback_queue` only has SELECT/INSERT grants, no UPDATE, so this RPC is
 * the only way to flip `status`. The RPC itself re-checks both the author
 * and the `queued` status server-side (raises otherwise), so the client-side
 * `status === 'queued'` check gating the button in `FeedbackScreen` is only
 * a UX nicety, not the real enforcement.
 */
export function useRetractFeedback(): ReturnType<typeof useMutation<void, Error, {feedbackId: string}>> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({feedbackId}: {feedbackId: string}): Promise<void> => {
      const {error} = await supabase.rpc('fn_retract_feedback', {p_feedback_id: feedbackId});
      if (error) {
        throw error;
      }
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({queryKey: queryKeys.feedbackSent()});
    },
  });
}
