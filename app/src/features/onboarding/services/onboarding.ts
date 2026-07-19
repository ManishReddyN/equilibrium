import {useMutation, useQuery, useQueryClient, type UseQueryResult} from '@tanstack/react-query';

import {supabase} from '@lib/supabase';
import {queryKeys} from '@lib/queryKeys';

import {baselinePhotoStoragePath} from '../utils/baselinePhoto';

export interface DraftChoreRow {
  id: string;
  title: string;
  definitionOfDone: string;
  /** Null until a baseline photo has been uploaded; immutable thereafter (server-enforced, see `useUploadBaselinePhoto`). */
  baselinePhotoPath: string | null;
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
        .select('id, title, definition_of_done, baseline_photo_path')
        .eq('household_id', householdId)
        .order('created_at', {ascending: true});
      if (error) {
        throw error;
      }
      return (data ?? []).map(row => ({
        id: row.id,
        title: row.title,
        definitionOfDone: row.definition_of_done,
        baselinePhotoPath: row.baseline_photo_path,
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

/** Saves each chore's Definition of Done text. */
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

export interface UploadBaselinePhotoInput {
  householdId: string;
  choreId: string;
  /** Local `file://`/`content://` uri from `launchCamera`'s resolved asset. */
  uri: string;
  contentType: string;
}

/**
 * Uploads a chore's baseline photo (plan section 4.4) to the private
 * `baseline-photos` bucket at the `{household_id}/{chore_id}.jpg` path the
 * `baseline_photos_insert`/`_select` RLS policies expect
 * (`supabase/migrations/0006_storage_and_realtime.sql`), then records the
 * path on the chore row. The storage policy itself denies a second INSERT to
 * the same path, and there is no UPDATE/DELETE policy for this bucket -- so
 * re-running this for an already-uploaded chore fails server-side rather than
 * silently overwriting the baseline; the "Baseline locked" UI in
 * `DefinitionOfDoneScreen` is what actually prevents that attempt client-side.
 * `fetch` + `.blob()` is the standard RN pattern for turning a local picker
 * uri into an uploadable body -- RN's bundled fetch/Blob polyfill supports
 * reading `file://`/`content://` uris, no extra filesystem dependency needed.
 */
export function useUploadBaselinePhoto(): ReturnType<
  typeof useMutation<string, Error, UploadBaselinePhotoInput>
> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({householdId, choreId, uri, contentType}: UploadBaselinePhotoInput): Promise<string> => {
      const path = baselinePhotoStoragePath(householdId, choreId);
      const response = await fetch(uri);
      const blob = await response.blob();
      const {error: uploadError} = await supabase.storage
        .from('baseline-photos')
        .upload(path, blob, {contentType, upsert: false});
      if (uploadError) {
        throw uploadError;
      }
      const {error: updateError} = await supabase
        .from('chores')
        .update({baseline_photo_path: path})
        .eq('id', choreId);
      if (updateError) {
        throw updateError;
      }
      return path;
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
