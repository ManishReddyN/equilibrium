import {useMemo} from 'react';

import {useSession} from '@app/providers/SessionProvider';

import {useHousehold, useMembers} from './useHousehold';

/**
 * Discriminated union driving every profile-dependent UI branch (plan
 * section 3.4): Market tab hidden outside shared_flat, Feedback composer
 * only in duo, cohort chips only in co_living. This is presentation-only --
 * the server (Phase 2 triggers: fn_feedback_set_release, fn_market_guard)
 * remains the real enforcement layer. Client gating is UX, DB gating is
 * security.
 */
export type HouseholdProfile =
  | {kind: 'duo'; coolOffMinutes: number}
  | {kind: 'shared_flat'; anonymousPipelines: true}
  | {kind: 'co_living'; cohortIndex: number; digestHourLocal: number};

interface HouseholdProfileFields {
  coolOffMinutes: number;
  digestHourLocal: number;
  cohortIndex: number | null;
}

/**
 * Pure mapping mirroring `households.profile`'s generated-column formula
 * (supabase/migrations/0002_core_tables.sql): roommate_count 2 -> duo,
 * 3-5 -> shared_flat, else co_living. Kept as its own pure function (rather
 * than just branching on the DB's `profile` enum value) so it's unit-testable
 * in isolation across the full count range without a live household fixture
 * per enum case.
 */
export function householdProfileForCount(
  roommateCount: number,
  fields: HouseholdProfileFields,
): HouseholdProfile {
  if (roommateCount === 2) {
    return {kind: 'duo', coolOffMinutes: fields.coolOffMinutes};
  }
  if (roommateCount >= 3 && roommateCount <= 5) {
    return {kind: 'shared_flat', anonymousPipelines: true};
  }
  return {
    kind: 'co_living',
    cohortIndex: fields.cohortIndex ?? 0,
    digestHourLocal: fields.digestHourLocal,
  };
}

interface UseHouseholdProfileResult {
  data: HouseholdProfile | undefined;
  isLoading: boolean;
}

/** Derives the profile engine union from the current household + the caller's own member row. */
export function useHouseholdProfile(): UseHouseholdProfileResult {
  const {session} = useSession();
  const household = useHousehold();
  const members = useMembers();

  const data = useMemo<HouseholdProfile | undefined>(() => {
    if (!household.data || !members.data) {
      return undefined;
    }
    const me = members.data.find(member => member.id === session?.user.id);
    return householdProfileForCount(household.data.roommate_count, {
      coolOffMinutes: household.data.cool_off_minutes,
      digestHourLocal: household.data.digest_hour_local,
      cohortIndex: me?.cohort_index ?? null,
    });
  }, [household.data, members.data, session?.user.id]);

  return {data, isLoading: household.isLoading || members.isLoading};
}
