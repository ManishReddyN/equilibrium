import {useQuery, type UseQueryResult} from '@tanstack/react-query';

import {supabase} from '@lib/supabase';
import {queryKeys} from '@lib/queryKeys';
import type {MakeupObligation} from '@shared/utils/rotation';

export interface ChoreWithHandler {
  id: string;
  title: string;
  complexityWeight: number;
  isRecurring: boolean;
  recurrenceDays: number | null;
  currentHandlerId: string | null;
  currentHandlerName: string | null;
}

/**
 * `['chores']` -- every chore in the household plus its most recent
 * assignment's handler, so the rotation view can show "who has it now"
 * without a second query per row. The deterministic *upcoming* rotation
 * (replaying `fn_next_handler`'s ordering client-side, per plan section 4.2)
 * is Phase 4 work living in `shared/utils/rotation.ts`; this hook only
 * surfaces current state.
 */
export function useChores(): UseQueryResult<ChoreWithHandler[]> {
  return useQuery({
    queryKey: queryKeys.chores(),
    queryFn: async (): Promise<ChoreWithHandler[]> => {
      const {data: chores, error: choresError} = await supabase
        .from('chores')
        .select('id, title, complexity_weight, is_recurring, recurrence_days')
        .order('title');
      if (choresError) {
        throw choresError;
      }

      const {data: assignments, error: assignmentsError} = await supabase
        .from('assignments')
        .select('chore_id, current_handler_id, created_at, profiles(full_name)')
        .order('created_at', {ascending: false});
      if (assignmentsError) {
        throw assignmentsError;
      }

      const latestHandlerByChore = new Map<string, {id: string; name: string | null}>();
      for (const assignment of assignments ?? []) {
        if (!latestHandlerByChore.has(assignment.chore_id)) {
          latestHandlerByChore.set(assignment.chore_id, {
            id: assignment.current_handler_id,
            name: (assignment.profiles as unknown as {full_name: string} | null)?.full_name ?? null,
          });
        }
      }

      return (chores ?? []).map(chore => {
        const handler = latestHandlerByChore.get(chore.id);
        return {
          id: chore.id,
          title: chore.title,
          complexityWeight: chore.complexity_weight,
          isRecurring: chore.is_recurring,
          recurrenceDays: chore.recurrence_days,
          currentHandlerId: handler?.id ?? null,
          currentHandlerName: handler?.name ?? null,
        };
      });
    },
  });
}

/**
 * `['assignments','makeup']` -- every pending/in_progress `is_debit_makeup`
 * assignment across the whole household, unscoped to any one chore (mirrors
 * `fn_next_handler`'s own unscoped query, supabase/migrations/0004_functions_and_triggers.sql
 * lines ~109-176). Feeds `shared/utils/rotation.ts`'s `resolveNextHandler` /
 * `projectUpcomingHandlers` / `hasMakeupObligationForChore` for
 * `RotationCarousel`'s client-side cycle preview (plan section 4.2).
 */
export function useMakeupObligations(): UseQueryResult<MakeupObligation[]> {
  return useQuery({
    queryKey: queryKeys.assignmentsMakeup(),
    queryFn: async (): Promise<MakeupObligation[]> => {
      const {data, error} = await supabase
        .from('assignments')
        .select('chore_id, current_handler_id')
        .in('status', ['pending', 'in_progress'])
        .eq('is_debit_makeup', true);
      if (error) {
        throw error;
      }
      return (data ?? []).map(row => ({
        choreId: row.chore_id,
        handlerId: row.current_handler_id,
      }));
    },
  });
}
