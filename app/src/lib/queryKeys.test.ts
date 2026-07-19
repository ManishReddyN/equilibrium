/**
 * Phase 3 Verification Gate (plan section 3.5): every query key factory must
 * produce a unique key -- a collision here would mean two unrelated queries
 * (or a query and an unrelated realtime invalidation, see
 * features/notifications/services/realtime.ts) silently share a cache entry.
 */
// Explicit import (rather than relying on ambient jest globals -- this repo
// has no @types/jest installed, matching __tests__/App.test.tsx's existing
// convention).
import {describe, expect, it} from '@jest/globals';

import {queryKeys} from './queryKeys';

describe('queryKeys', () => {
  it('produces a unique key for every parameterless factory', () => {
    const parameterless = [
      queryKeys.household(),
      queryKeys.members(),
      queryKeys.chores(),
      queryKeys.assignmentsActive(),
      queryKeys.assignmentsHistory(),
      queryKeys.equilibrium(),
      queryKeys.marketOpen(),
      queryKeys.feedbackInbox(),
      queryKeys.feedbackSent(),
      queryKeys.ledger(),
    ];

    const serialized = parameterless.map(key => JSON.stringify(key));

    expect(new Set(serialized).size).toBe(serialized.length);
  });

  it('ledger() defaults its window to 30 days', () => {
    expect(queryKeys.ledger()).toEqual(['ledger', {window: 30}]);
  });

  it('ledger(windowDays) produces a distinct key per window so differently-scoped pages never collide', () => {
    expect(queryKeys.ledger(7)).toEqual(['ledger', {window: 7}]);
    expect(JSON.stringify(queryKeys.ledger(7))).not.toBe(JSON.stringify(queryKeys.ledger(30)));
  });

  it('assignments active/history keys share a stable "assignments" root but remain distinct', () => {
    expect(queryKeys.assignmentsActive()[0]).toBe('assignments');
    expect(queryKeys.assignmentsHistory()[0]).toBe('assignments');
    expect(queryKeys.assignmentsActive()).not.toEqual(queryKeys.assignmentsHistory());
  });
});
