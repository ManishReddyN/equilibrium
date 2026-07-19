/**
 * Asserts parity with `fn_next_handler` (supabase/migrations/0004_functions_and_triggers.sql,
 * lines ~109-176) read directly, since no pgTAP fixture exists to import
 * from -- see rotation.ts's file header and docs/DECISIONS.md.
 */
import {describe, expect, it} from '@jest/globals';

import {hasMakeupObligationForChore, projectUpcomingHandlers, resolveNextHandler} from './rotation';

// Deliberately out-of-order and non-contiguous-looking to prove sorting
// happens internally, ascending: a < b < c < d.
const MEMBERS = [
  'd4d4d4d4-0000-0000-0000-000000000004',
  'a1a1a1a1-0000-0000-0000-000000000001',
  'c3c3c3c3-0000-0000-0000-000000000003',
  'b2b2b2b2-0000-0000-0000-000000000002',
];
const [A, B, C, D] = [...MEMBERS].sort() as [string, string, string, string];

const CHORE_A = 'chore-a';
const CHORE_B = 'chore-b';

describe('resolveNextHandler', () => {
  it('throws when the household has no members', () => {
    expect(() =>
      resolveNextHandler({
        memberIds: [],
        currentHandlerId: null,
        isDuo: false,
        choreId: CHORE_A,
        pendingMakeupObligations: [],
      }),
    ).toThrow();
  });

  it('returns the first member in ascending id order when there is no current handler', () => {
    const next = resolveNextHandler({
      memberIds: MEMBERS,
      currentHandlerId: null,
      isDuo: false,
      choreId: CHORE_A,
      pendingMakeupObligations: [],
    });
    expect(next).toBe(A);
  });

  it('returns the first member when the current handler is no longer in the household', () => {
    const next = resolveNextHandler({
      memberIds: MEMBERS,
      currentHandlerId: 'not-a-member',
      isDuo: false,
      choreId: CHORE_A,
      pendingMakeupObligations: [],
    });
    expect(next).toBe(A);
  });

  it('advances to the next member in ascending id order', () => {
    expect(
      resolveNextHandler({
        memberIds: MEMBERS,
        currentHandlerId: A,
        isDuo: false,
        choreId: CHORE_A,
        pendingMakeupObligations: [],
      }),
    ).toBe(B);
  });

  it('wraps around modulo the member count', () => {
    expect(
      resolveNextHandler({
        memberIds: MEMBERS,
        currentHandlerId: D,
        isDuo: false,
        choreId: CHORE_A,
        pendingMakeupObligations: [],
      }),
    ).toBe(A);
  });

  it('ignores makeup obligations entirely for non-duo households', () => {
    // B has a conflicting makeup obligation, but isDuo=false must ignore it.
    expect(
      resolveNextHandler({
        memberIds: MEMBERS,
        currentHandlerId: A,
        isDuo: false,
        choreId: CHORE_A,
        pendingMakeupObligations: [{choreId: CHORE_B, handlerId: B}],
      }),
    ).toBe(B);
  });

  it('duo: skips a candidate holding a pending makeup obligation for a different chore', () => {
    // Current handler A -> next would be B, but B has a conflicting makeup
    // obligation on a different chore, so it should skip to C.
    expect(
      resolveNextHandler({
        memberIds: [A, B, C],
        currentHandlerId: A,
        isDuo: true,
        choreId: CHORE_A,
        pendingMakeupObligations: [{choreId: CHORE_B, handlerId: B}],
      }),
    ).toBe(C);
  });

  it('duo: does not skip a candidate whose makeup obligation is for this same chore', () => {
    expect(
      resolveNextHandler({
        memberIds: [A, B, C],
        currentHandlerId: A,
        isDuo: true,
        choreId: CHORE_A,
        pendingMakeupObligations: [{choreId: CHORE_A, handlerId: B}],
      }),
    ).toBe(B);
  });

  it('duo: falls back to the plain next-in-rotation candidate when every member has a conflicting obligation', () => {
    // With only A and B, both candidates would need conflicting obligations. The
    // loop starts at candidate index (currentIndex+1)=B, then wraps to A -- if
    // both are marked busy on a different chore, fall back to plain B.
    expect(
      resolveNextHandler({
        memberIds: [A, B],
        currentHandlerId: A,
        isDuo: true,
        choreId: CHORE_A,
        pendingMakeupObligations: [
          {choreId: CHORE_B, handlerId: A},
          {choreId: CHORE_B, handlerId: B},
        ],
      }),
    ).toBe(B);
  });

  it('is order-independent with respect to the input memberIds array', () => {
    const shuffled = [D, A, C, B];
    expect(
      resolveNextHandler({
        memberIds: shuffled,
        currentHandlerId: A,
        isDuo: false,
        choreId: CHORE_A,
        pendingMakeupObligations: [],
      }),
    ).toBe(B);
  });
});

describe('projectUpcomingHandlers', () => {
  it('chains resolveNextHandler for `count` cycles', () => {
    const upcoming = projectUpcomingHandlers({
      memberIds: [A, B, C],
      currentHandlerId: A,
      isDuo: false,
      choreId: CHORE_A,
      pendingMakeupObligations: [],
      count: 4,
    });
    expect(upcoming).toEqual([B, C, A, B]);
  });

  it('returns an empty array when count is 0', () => {
    const upcoming = projectUpcomingHandlers({
      memberIds: [A, B, C],
      currentHandlerId: A,
      isDuo: false,
      choreId: CHORE_A,
      pendingMakeupObligations: [],
      count: 0,
    });
    expect(upcoming).toEqual([]);
  });

  it('holds the makeup-obligation snapshot constant across every projected cycle', () => {
    // B always has a conflicting obligation on a different chore, so it
    // should be skipped every time it comes up across multiple cycles.
    const upcoming = projectUpcomingHandlers({
      memberIds: [A, B, C],
      currentHandlerId: A,
      isDuo: true,
      choreId: CHORE_A,
      pendingMakeupObligations: [{choreId: CHORE_B, handlerId: B}],
      count: 4,
    });
    expect(upcoming).not.toContain(B);
  });
});

describe('hasMakeupObligationForChore', () => {
  it('returns true when the handler holds a pending obligation for this exact chore', () => {
    expect(
      hasMakeupObligationForChore([{choreId: CHORE_A, handlerId: B}], CHORE_A, B),
    ).toBe(true);
  });

  it('returns false when the obligation is for a different chore', () => {
    expect(
      hasMakeupObligationForChore([{choreId: CHORE_B, handlerId: B}], CHORE_A, B),
    ).toBe(false);
  });

  it('returns false when the obligation belongs to a different handler', () => {
    expect(
      hasMakeupObligationForChore([{choreId: CHORE_A, handlerId: A}], CHORE_A, B),
    ).toBe(false);
  });

  it('returns false for an empty obligations list', () => {
    expect(hasMakeupObligationForChore([], CHORE_A, A)).toBe(false);
  });
});
