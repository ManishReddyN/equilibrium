import {useMutation, useQuery, useQueryClient, type UseQueryResult} from '@tanstack/react-query';

import {supabase} from '@lib/supabase';
import {queryKeys} from '@lib/queryKeys';

export interface DraftChoreRow {
  id: string;
  title: string;
  definitionOfDone: string;
}

/**
 * Onboarding-only read of the chores just created in ChoreSetup, for the
 * DefinitionOfDone step. Deliberately separate from `features/rotation`'s
 * `useChores` (which also needs handler info this step doesn't) rather than
 * importing across features -- see plan section 3.1's "features never import
 * from other features" rule.
 */
export function useDraftChores(householdId: string): UseQueryResult<DraftChoreRow[]> {
  return useQuery({
    queryKey: [...queryKeys.chores(), 'draft', householdId],
    queryFn: async (): Promise<DraftChoreRow[]> => {
      const {data, error} = await supabase
        .from('chores')
        .select('id, title, definition_of_done')
        .eq('household_id', householdId)
        .order('created_at', {ascending: true});
      if (error) {
        throw error;
      }
      return (data ?? []).map(row => ({
        id: row.id,
        title: row.title,
        definitionOfDone: row.definition_of_done,
      }));
    },
  });
}

/** `fn_create_household` -- create path, step 1 (HouseholdBasics). Sets my own `household_id` server-side. */
export function useCreateHousehold(): ReturnType<
  typeof useMutation<string, Error, {name: string; roommateCount: number}>
> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({name, roommateCount}: {name: string; roommateCount: number}): Promise<string> => {
      const {data, error} = await supabase.rpc('fn_create_household', {
        p_name: name,
        p_roommate_count: roommateCount,
      });
      if (error) {
        throw error;
      }
      return data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({queryKey: queryKeys.household()});
    },
  });
}

export interface DraftChore {
  title: string;
  complexityWeight: number;
  isRecurring: boolean;
  recurrenceDays: number | null;
}

/** Bulk-inserts the chores staged in ChoreSetup; returns the created rows (with ids) for DefinitionOfDone. */
export function useAddChores(): ReturnType<
  typeof useMutation<{id: string; title: string}[], Error, {householdId: string; chores: DraftChore[]}>
> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      householdId,
      chores,
    }: {
      householdId: string;
      chores: DraftChore[];
    }): Promise<{id: string; title: string}[]> => {
      const {data, error} = await supabase
        .from('chores')
        .insert(
          chores.map(chore => ({
            household_id: householdId,
            title: chore.title,
            complexity_weight: chore.complexityWeight,
            is_recurring: chore.isRecurring,
            recurrence_days: chore.recurrenceDays,
          })),
        )
        .select('id, title');
      if (error) {
        throw error;
      }
      return data ?? [];
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({queryKey: queryKeys.chores()});
    },
  });
}

/**
 * Saves each chore's Definition of Done text. Baseline photo capture (plan
 * section 4.4: `react-native-image-picker`, upload to
 * `baseline-photos/{household_id}/{chore_id}.jpg`, "Baseline locked" UI) is
 * deferred to Phase 4 -- `baseline_photo_path` stays null until then. See
 * docs/DECISIONS.md.
 */
export function useSaveDefinitionsOfDone(): ReturnType<
  typeof useMutation<void, Error, {choreId: string; definitionOfDone: string}[]>
> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (entries: {choreId: string; definitionOfDone: string}[]): Promise<void> => {
      const results = await Promise.all(
        entries.map(entry =>
          supabase.from('chores').update({definition_of_done: entry.definitionOfDone}).eq('id', entry.choreId),
        ),
      );
      const failed = results.find(result => result.error);
      if (failed?.error) {
        throw failed.error;
      }
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({queryKey: queryKeys.chores()});
    },
  });
}

/** `fn_join_household` -- join path. Raises if the invite is invalid/expired/at capacity. */
export function useJoinHousehold(): ReturnType<typeof useMutation<string, Error, {inviteSecret: string}>> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({inviteSecret}: {inviteSecret: string}): Promise<string> => {
      const {data, error} = await supabase.rpc('fn_join_household', {p_invite_secret: inviteSecret});
      if (error) {
        throw error;
      }
      return data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({queryKey: queryKeys.household()});
      void queryClient.invalidateQueries({queryKey: queryKeys.members()});
    },
  });
}
