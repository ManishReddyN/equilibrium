/**
 * Client-side port of `fn_next_handler` (supabase/migrations/0004_functions_and_triggers.sql)
 * for `RotationCarousel`'s upcoming-cycles preview (plan section 4.2: "derive
 * upcoming N cycles per chore client-side by replaying `fn_next_handler`
 * logic... write it once in `shared/utils/rotation.ts` with unit tests
 * asserting parity against a fixture exported from the SQL tests"). No such
 * fixture exists -- `supabase/tests/` only has `rls.spec.sql`, with no pgTAP
 * coverage of `fn_next_handler` to export from -- so `rotation.test.ts`
 * instead asserts the documented SQL behavior directly, read line-for-line
 * from the migration. See docs/DECISIONS.md.
 *
 * The server (`fn_next_handler`, invoked from `fn_complete_assignment` /
 * `fn_skip_assignment`) remains authoritative at assignment-creation time;
 * this is a preview only, using a snapshot of currently pending/in_progress
 * makeup obligations held constant across all N projected cycles (a real
 * future cycle could see those obligations resolved before it's reached).
 *
 * Sort-order note: members are ordered ascending by `id` (a Postgres `uuid`
 * column) to match `array_agg(id order by id)`. Postgres compares `uuid`
 * values byte-wise on their binary representation, but since every
 * canonical hyphenated UUID string has hyphens at the same fixed positions
 * (8-4-4-4-12), a hyphen is only ever compared against another hyphen --
 * so plain lexicographic string comparison of same-case UUID strings
 * produces an identical ordering. Supabase/PostgREST always returns
 * lowercase UUID strings, so `Array.prototype.sort()`'s default string
 * comparator is sufficient here.
 */

export interface MakeupObligation {
  /** The chore this pending/in_progress makeup assignment belongs to. */
  choreId: string;
  /** The member currently holding that makeup assignment. */
  handlerId: string;
}

export interface ResolveNextHandlerParams {
  /** All member ids in the household, in any order -- sorted internally. */
  memberIds: string[];
  /** The chore's current handler, or `null` if it has no assignment yet. */
  currentHandlerId: string | null;
  /** True only for `duo` households -- the makeup-skip rule is duo-only. */
  isDuo: boolean;
  /** The chore being rotated; obligations for this same chore never cause a skip. */
  choreId: string;
  /**
   * Every pending/in_progress `is_debit_makeup` assignment in the household,
   * across all chores (mirrors `fn_next_handler`'s unscoped `assignments`
   * query -- NOT pre-filtered to this chore).
   */
  pendingMakeupObligations: MakeupObligation[];
}

/** Ascending string sort matches Postgres's `order by id` for uuid columns -- see file header. */
function sortMemberIds(memberIds: string[]): string[] {
  return [...memberIds].sort();
}

/**
 * Mirrors `fn_next_handler` exactly:
 * - no members -> throws (`raise exception 'household % has no members'`)
 * - no current handler, or current handler no longer a member -> first sorted member
 * - otherwise, walk candidates `(currentIndex + i) % memberCount` for `i` in `1..memberCount`;
 *   for `duo` households, skip a candidate who already holds another chore's
 *   pending/in_progress makeup assignment; return the first candidate that isn't skipped
 * - if every candidate is skipped, fall back to the plain next-in-rotation
 *   candidate (`(currentIndex + 1) % memberCount`), unconditionally
 */
export function resolveNextHandler(params: ResolveNextHandlerParams): string {
  const sortedMembers = sortMemberIds(params.memberIds);
  const memberCount = sortedMembers.length;
  if (memberCount === 0) {
    throw new Error(`resolveNextHandler: household has no members for chore ${params.choreId}`);
  }

  if (params.currentHandlerId === null) {
    return sortedMembers[0] as string;
  }

  const currentIndex = sortedMembers.indexOf(params.currentHandlerId);
  if (currentIndex === -1) {
    return sortedMembers[0] as string;
  }

  const hasConflictingMakeup = (candidate: string): boolean =>
    params.isDuo &&
    params.pendingMakeupObligations.some(
      obligation => obligation.handlerId === candidate && obligation.choreId !== params.choreId,
    );

  for (let i = 1; i <= memberCount; i += 1) {
    const candidateIndex = (currentIndex + i) % memberCount;
    const candidate = sortedMembers[candidateIndex] as string;
    if (!hasConflictingMakeup(candidate)) {
      return candidate;
    }
  }

  // Every member has a conflicting makeup obligation -- plain next-in-rotation, no skip.
  return sortedMembers[(currentIndex + 1) % memberCount] as string;
}

/**
 * True when `handlerId` currently holds a pending/in_progress makeup
 * assignment for exactly this chore -- i.e. this handler's turn (current or
 * projected) *is* the makeup turn itself, distinct from `resolveNextHandler`'s
 * duo skip rule (which only fires for a *different* chore's obligation).
 * `RotationCarousel` uses this to decide whether a cycle card renders the
 * `Repeat2` "Makeup turn from skipped cycle" indicator (plan section 4.2).
 */
export function hasMakeupObligationForChore(
  pendingMakeupObligations: MakeupObligation[],
  choreId: string,
  handlerId: string,
): boolean {
  return pendingMakeupObligations.some(
    obligation => obligation.choreId === choreId && obligation.handlerId === handlerId,
  );
}

export interface ProjectUpcomingHandlersParams extends ResolveNextHandlerParams {
  /** How many future cycles to project (the carousel's upcoming-cards count). */
  count: number;
}

/**
 * Chains `resolveNextHandler` `count` times, feeding each result back in as
 * the next call's `currentHandlerId` -- the client-side replay
 * `RotationCarousel` uses to render upcoming cycles beyond the current one.
 */
export function projectUpcomingHandlers({
  count,
  ...rest
}: ProjectUpcomingHandlersParams): string[] {
  const upcoming: string[] = [];
  let currentHandlerId = rest.currentHandlerId;
  for (let i = 0; i < count; i += 1) {
    const next = resolveNextHandler({...rest, currentHandlerId});
    upcoming.push(next);
    currentHandlerId = next;
  }
  return upcoming;
}
