/**
 * Phase 3 Verification Gate (plan section 3.5): `householdProfileForCount`
 * must mirror `households.profile`'s generated-column formula
 * (supabase/migrations/0002_core_tables.sql) exactly -- roommate_count 2 ->
 * duo, 3-5 -> shared_flat, else co_living -- across the full count range,
 * since every profile-dependent UI branch (Market/Feedback tab gating,
 * cohort chips) reads this client-side mirror rather than re-deriving it.
 */
// Explicit import (rather than relying on ambient jest globals -- this repo
// has no @types/jest installed, matching __tests__/App.test.tsx's existing
// convention).
import {describe, expect, it} from '@jest/globals';

import {householdProfileForCount} from './useHouseholdProfile';

const fields = {coolOffMinutes: 45, digestHourLocal: 20, cohortIndex: null as number | null};

describe('householdProfileForCount', () => {
  it('maps roommate_count 2 to duo', () => {
    expect(householdProfileForCount(2, fields)).toEqual({kind: 'duo', coolOffMinutes: 45});
  });

  it.each([3, 4, 5])('maps roommate_count %i to shared_flat', (count: number) => {
    expect(householdProfileForCount(count, fields)).toEqual({
      kind: 'shared_flat',
      anonymousPipelines: true,
    });
  });

  it.each([6, 20])('maps roommate_count %i to co_living', (count: number) => {
    expect(householdProfileForCount(count, {...fields, cohortIndex: 3})).toEqual({
      kind: 'co_living',
      cohortIndex: 3,
      digestHourLocal: 20,
    });
  });

  it('defaults co_living cohortIndex to 0 when the caller has no cohort assigned yet', () => {
    expect(householdProfileForCount(6, fields)).toEqual({
      kind: 'co_living',
      cohortIndex: 0,
      digestHourLocal: 20,
    });
  });

  it('never returns co_living for any count in the shared_flat range, and vice versa', () => {
    for (let count = 3; count <= 5; count += 1) {
      expect(householdProfileForCount(count, fields).kind).toBe('shared_flat');
    }
    for (const count of [6, 7, 10, 20]) {
      expect(householdProfileForCount(count, fields).kind).toBe('co_living');
    }
  });
});
