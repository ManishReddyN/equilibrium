import {useQuery, type UseQueryResult} from '@tanstack/react-query';

import {supabase} from '@lib/supabase';
import {queryKeys} from '@lib/queryKeys';
import type {Database} from '@lib/database.types';

export type HouseholdRow = Database['public']['Tables']['households']['Row'];
export type ProfileRow = Database['public']['Tables']['profiles']['Row'];

/** The signed-in user's household row (RLS-scoped to `fn_my_household()`). `null` before onboarding. */
export function useHousehold(): UseQueryResult<HouseholdRow | null> {
  return useQuery({
    queryKey: queryKeys.household(),
    queryFn: async (): Promise<HouseholdRow | null> => {
      const {data, error} = await supabase.from('households').select('*').maybeSingle();
      if (error) {
        throw error;
      }
      return data;
    },
  });
}

/** Every profile row in the signed-in user's household (RLS-scoped), including the caller's own row. */
export function useMembers(): UseQueryResult<ProfileRow[]> {
  return useQuery({
    queryKey: queryKeys.members(),
    queryFn: async (): Promise<ProfileRow[]> => {
      const {data, error} = await supabase.from('profiles').select('*').order('id');
      if (error) {
        throw error;
      }
      return data ?? [];
    },
  });
}
