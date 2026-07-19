/**
 * Throws with a prefixed message when `condition` is falsy, and narrows the
 * type of `condition` for everything after the call site. Use for
 * "this should be impossible given prior checks" assertions -- not for
 * user-facing validation (that belongs in zod schemas / form state).
 */
export function invariant(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(`Invariant violation: ${message}`);
  }
}
