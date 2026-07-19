import {useQuery, type UseQueryResult} from '@tanstack/react-query';

import {supabase} from '@lib/supabase';
import {queryKeys} from '@lib/queryKeys';
import type {Database} from '@lib/database.types';

export interface EquilibriumShare {
  userId: string;
  share: number;
}

/** `fn_household_equilibrium` -- rolling-30-day positive-contribution share per member. */
export function useEquilibrium(householdId: string | undefined): UseQueryResult<EquilibriumShare[]> {
  return useQuery({
    queryKey: queryKeys.equilibrium(),
    enabled: Boolean(householdId),
    queryFn: async (): Promise<EquilibriumShare[]> => {
      const {data, error} = await supabase.rpc('fn_household_equilibrium', {
        p_household_id: householdId as string,
      });
      if (error) {
        throw error;
      }
      return (data ?? []).map(row => ({userId: row.user_id, share: row.share}));
    },
  });
}

export type LedgerEntry = Database['public']['Tables']['audit_ledger']['Row'];

/** `['ledger', {window}]` -- most recent entries, newest first (paging deferred to Phase 4). */
export function useLedgerHistory(windowDays: number = 30): UseQueryResult<LedgerEntry[]> {
  return useQuery({
    queryKey: queryKeys.ledger(windowDays),
    queryFn: async (): Promise<LedgerEntry[]> => {
      const since = new Date(Date.now() - windowDays * 24 * 60 * 60 * 1000).toISOString();
      const {data, error} = await supabase
        .from('audit_ledger')
        .select('*')
        .gte('created_at', since)
        .order('created_at', {ascending: false})
        .range(0, 29);
      if (error) {
        throw error;
      }
      return data ?? [];
    },
  });
}
