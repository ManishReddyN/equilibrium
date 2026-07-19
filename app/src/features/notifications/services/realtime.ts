import type {QueryClient} from '@tanstack/react-query';
import type {RealtimeChannel} from '@supabase/supabase-js';

import {supabase} from '@lib/supabase';
import {queryKeys} from '@lib/queryKeys';

/**
 * Realtime (plan section 3.3): one channel manager per household subscribing
 * to postgres_changes for the four realtime-enabled tables (assignments,
 * market_listings, audit_ledger, feedback_queue --
 * supabase/migrations/0006_storage_and_realtime.sql), mapping each event to
 * targeted `queryClient.invalidateQueries` calls. RLS applies to realtime
 * automatically, so this only ever receives rows the caller could already
 * see via PostgREST.
 *
 * Assignment completions/skips already patch the local cache optimistically
 * (features/dashboard/services/assignments.ts's `onSuccess` invalidation) the
 * instant *this* device acts -- this manager's assignments handler is the
 * fallback path for changes made by other devices/roommates, not a duplicate.
 * No manual cache surgery is done here for any table; every event just
 * invalidates and lets the next `useQuery` refetch own the truth, per plan
 * section 3.3 ("no manual cache surgery except assignments status flips,
 * which patch the cache directly for instant UI" -- that direct patch lives
 * at the mutation call site, not here).
 */
export class RealtimeChannelManager {
  private channel: RealtimeChannel | null = null;

  constructor(private readonly queryClient: QueryClient) {}

  /** Idempotent: calling `start` again for the same (or a different) household first stops any existing channel. */
  start(householdId: string): void {
    this.stop();

    this.channel = supabase
      .channel(`household:${householdId}`)
      .on(
        'postgres_changes',
        {event: '*', schema: 'public', table: 'assignments', filter: `household_id=eq.${householdId}`},
        () => {
          void this.queryClient.invalidateQueries({queryKey: queryKeys.assignmentsActive()});
          void this.queryClient.invalidateQueries({queryKey: queryKeys.assignmentsHistory()});
        },
      )
      .on(
        'postgres_changes',
        {event: '*', schema: 'public', table: 'market_listings', filter: `household_id=eq.${householdId}`},
        () => {
          void this.queryClient.invalidateQueries({queryKey: queryKeys.marketOpen()});
        },
      )
      .on(
        'postgres_changes',
        {event: '*', schema: 'public', table: 'audit_ledger', filter: `household_id=eq.${householdId}`},
        () => {
          void this.queryClient.invalidateQueries({queryKey: queryKeys.ledger()});
          void this.queryClient.invalidateQueries({queryKey: queryKeys.equilibrium()});
        },
      )
      .on(
        'postgres_changes',
        {event: '*', schema: 'public', table: 'feedback_queue', filter: `household_id=eq.${householdId}`},
        () => {
          void this.queryClient.invalidateQueries({queryKey: queryKeys.feedbackInbox()});
          void this.queryClient.invalidateQueries({queryKey: queryKeys.feedbackSent()});
        },
      )
      .subscribe();
  }

  /** Unsubscribes, e.g. on sign-out or when the household changes. Safe to call when already stopped. */
  stop(): void {
    if (this.channel) {
      void supabase.removeChannel(this.channel);
      this.channel = null;
    }
  }
}
