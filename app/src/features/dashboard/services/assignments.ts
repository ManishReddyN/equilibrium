import {useMutation, useQuery, useQueryClient, type UseQueryResult} from '@tanstack/react-query';

import {supabase} from '@lib/supabase';
import {queryKeys} from '@lib/queryKeys';

export interface ActiveAssignment {
  id: string;
  choreId: string;
  choreTitle: string;
  status: 'pending' | 'in_progress';
  targetCompletionDate: string;
  isDebitMakeup: boolean;
}

/**
 * `['assignments','active']` -- pending/in_progress assignments for the
 * signed-in user's household, joined to the chore title so rows don't need a
 * second round trip. Sectioning into Today/Overdue/Upcoming happens in the
 * screen via `shared/utils/dates.ts#bucketDueDate`.
 */
export function useActiveAssignments(): UseQueryResult<ActiveAssignment[]> {
  return useQuery({
    queryKey: queryKeys.assignmentsActive(),
    queryFn: async (): Promise<ActiveAssignment[]> => {
      const {data, error} = await supabase
        .from('assignments')
        .select('id, chore_id, status, target_completion_date, is_debit_makeup, chores(title)')
        .in('status', ['pending', 'in_progress'])
        .order('target_completion_date', {ascending: true});
      if (error) {
        throw error;
      }
      return (data ?? []).map(row => ({
        id: row.id,
        choreId: row.chore_id,
        // Supabase's PostgREST embed returns an object for a to-one FK join.
        choreTitle: (row.chores as unknown as {title: string} | null)?.title ?? 'Chore',
        status: row.status as 'pending' | 'in_progress',
        targetCompletionDate: row.target_completion_date,
        isDebitMakeup: row.is_debit_makeup,
      }));
    },
  });
}

/**
 * `fn_complete_assignment` -- `p_proof_path` is a required RPC argument but
 * no screen in the plan actually captures a completion-proof photo (only the
 * one-time chore baseline photo, in onboarding's DefinitionOfDone step); an
 * empty string is passed deliberately. See docs/DECISIONS.md.
 */
export function useCompleteAssignment(): ReturnType<
  typeof useMutation<void, Error, {assignmentId: string}>
> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({assignmentId}: {assignmentId: string}): Promise<void> => {
      const {error} = await supabase.rpc('fn_complete_assignment', {
        p_assignment_id: assignmentId,
        p_proof_path: '',
      });
      if (error) {
        throw error;
      }
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({queryKey: queryKeys.assignmentsActive()});
      void queryClient.invalidateQueries({queryKey: queryKeys.assignmentsHistory()});
      void queryClient.invalidateQueries({queryKey: queryKeys.ledger()});
      void queryClient.invalidateQueries({queryKey: queryKeys.equilibrium()});
    },
  });
}

/** `fn_skip_assignment` -- turn circumvention; caller confirms the point debit before calling. */
export function useSkipAssignment(): ReturnType<
  typeof useMutation<void, Error, {assignmentId: string}>
> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({assignmentId}: {assignmentId: string}): Promise<void> => {
      const {error} = await supabase.rpc('fn_skip_assignment', {p_assignment_id: assignmentId});
      if (error) {
        throw error;
      }
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({queryKey: queryKeys.assignmentsActive()});
      void queryClient.invalidateQueries({queryKey: queryKeys.assignmentsHistory()});
      void queryClient.invalidateQueries({queryKey: queryKeys.ledger()});
      void queryClient.invalidateQueries({queryKey: queryKeys.equilibrium()});
    },
  });
}
