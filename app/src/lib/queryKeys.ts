/**
 * Single source of truth for every TanStack Query key used in the app (plan
 * section 3.3). Every feature service and `features/notifications/services/realtime.ts`'s
 * `queryClient.invalidateQueries` calls go through these factories rather than
 * inlining tuples, so a rename here can't silently desync a producer from an
 * invalidator.
 */
export const queryKeys = {
  household: () => ['household'] as const,
  members: () => ['members'] as const,
  chores: () => ['chores'] as const,
  assignmentsActive: () => ['assignments', 'active'] as const,
  assignmentsHistory: () => ['assignments', 'history'] as const,
  ledger: (windowDays: number = 30) => ['ledger', {window: windowDays}] as const,
  equilibrium: () => ['equilibrium'] as const,
  marketOpen: () => ['market', 'open'] as const,
  feedbackInbox: () => ['feedback', 'inbox'] as const,
  feedbackSent: () => ['feedback', 'sent'] as const,
};

export type QueryKeyFactory = typeof queryKeys;
export type QueryKeyName = keyof QueryKeyFactory;
