/**
 * Pure layout math for the ledger's profile-engine-branched equilibrium
 * visuals (plan section 4.3): `BilateralBalanceSlider`'s thumb position and
 * `StackedContributionBar`'s proportional segment widths/cohort grouping.
 * Extracted so the geometry is unit-testable without mounting Reanimated --
 * same split as `../../rotation/utils/carouselMath.ts`.
 */
import {idealShareForMemberCount} from '@shared/utils/points';

/** Clamps a share percentage into the valid 0-100 range. */
export function clampShare(share: number): number {
  return Math.max(0, Math.min(100, share));
}

/**
 * `BilateralBalanceSlider`'s thumb position as a 0..1 ratio along the track
 * -- `memberAShare` of 50 (an even split) centers the thumb.
 */
export function thumbRatioForShare(memberAShare: number): number {
  return clampShare(memberAShare) / 100;
}

/**
 * `StackedContributionBar`'s per-segment pixel widths, proportional to each
 * share and summing to exactly `totalWidth` (so segments always tile the
 * full bar even if `shares` don't sum to precisely 100 -- rolling-window
 * rounding can leave them slightly off). Falls back to an even split when
 * every share is 0 (e.g. a brand-new household with no ledger activity yet).
 */
export function segmentWidths(shares: number[], totalWidth: number): number[] {
  if (shares.length === 0 || totalWidth <= 0) {
    return shares.map(() => 0);
  }
  const total = shares.reduce((sum, share) => sum + Math.max(0, share), 0);
  if (total <= 0) {
    return shares.map(() => totalWidth / shares.length);
  }
  return shares.map(share => (Math.max(0, share) / total) * totalWidth);
}

export interface CohortMemberInput {
  id: string;
  name: string;
  share: number;
  cohortIndex: number | null;
}

export interface CohortSegment {
  key: string;
  label: string;
  share: number;
  idealShare: number;
  members: {id: string; name: string; share: number}[];
}

/**
 * Groups `co_living` members into per-cohort `StackedContributionBar`
 * segments: a segment's share is the sum of its members' shares, and its
 * ideal share is the household's even per-member split times the cohort's
 * member count -- so a 3-person cohort in an 9-member household is expected
 * to hold ~33%, not ~11%. A `null` `cohort_index` (the column is nullable,
 * though onboarding should always assign one) groups into its own
 * "Ungrouped" segment rather than being silently dropped. Segments sort by
 * cohort index ascending, with "Ungrouped" last.
 */
export function cohortSegments(members: CohortMemberInput[]): CohortSegment[] {
  const idealPerMember = idealShareForMemberCount(members.length);

  const byCohort = new Map<string, CohortMemberInput[]>();
  for (const member of members) {
    const key = member.cohortIndex === null ? 'ungrouped' : `cohort-${member.cohortIndex}`;
    const group = byCohort.get(key);
    if (group) {
      group.push(member);
    } else {
      byCohort.set(key, [member]);
    }
  }

  return Array.from(byCohort.entries())
    .sort(([, groupA], [, groupB]) => {
      const a = groupA[0]?.cohortIndex ?? Number.POSITIVE_INFINITY;
      const b = groupB[0]?.cohortIndex ?? Number.POSITIVE_INFINITY;
      return a - b;
    })
    .map(([key, group]) => ({
      key,
      label: key === 'ungrouped' ? 'Ungrouped' : `Cohort ${(group[0]?.cohortIndex ?? 0) + 1}`,
      share: group.reduce((sum, member) => sum + member.share, 0),
      idealShare: idealPerMember * group.length,
      members: group.map(member => ({id: member.id, name: member.name, share: member.share})),
    }));
}
