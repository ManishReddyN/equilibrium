/**
 * Points/share formatting and equilibrium-tolerance math shared by the
 * ledger screen (Phase 4) and any dashboard summaries. `share` values here
 * are percentages (0-100), matching `fn_household_equilibrium`'s `share`
 * column (a rolling-30-day positive-contribution percentage per member).
 */

/** "+40" / "-10" / "0" -- ledger rows never show a bare positive number. */
export function formatSignedPoints(points: number): string {
  if (points > 0) {
    return `+${points}`;
  }
  return String(points);
}

/** "62%" -- rounds to the nearest whole percent for display. */
export function formatShare(share: number): string {
  return `${Math.round(share)}%`;
}

/** Even split for `count` household members, e.g. 2 -> 50, 4 -> 25. */
export function idealShareForMemberCount(count: number): number {
  if (count <= 0) {
    return 0;
  }
  return 100 / count;
}

/**
 * True when a member's share has drifted from the ideal split by more than
 * `households.equilibrium_tolerance` percentage points. Drives the
 * teal->amber tint on BilateralBalanceSlider/StackedContributionBar --
 * presentation only, the server never reads this (Phase 2 triggers are the
 * real enforcement layer; see shared/hooks/useHouseholdProfile.ts).
 */
export function isOutOfEquilibrium(
  share: number,
  idealShare: number,
  tolerancePercent: number,
): boolean {
  return Math.abs(share - idealShare) > tolerancePercent;
}
