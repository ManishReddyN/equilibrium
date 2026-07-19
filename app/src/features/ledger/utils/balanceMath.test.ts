import {describe, expect, it} from '@jest/globals';

import {clampShare, cohortSegments, segmentWidths, thumbRatioForShare} from './balanceMath';

describe('clampShare', () => {
  it('passes through in-range values', () => {
    expect(clampShare(42)).toBe(42);
  });

  it('clamps below 0', () => {
    expect(clampShare(-5)).toBe(0);
  });

  it('clamps above 100', () => {
    expect(clampShare(140)).toBe(100);
  });
});

describe('thumbRatioForShare', () => {
  it('centers at 0.5 for an even 50/50 split', () => {
    expect(thumbRatioForShare(50)).toBe(0.5);
  });

  it('is 0 at the far left and 1 at the far right', () => {
    expect(thumbRatioForShare(0)).toBe(0);
    expect(thumbRatioForShare(100)).toBe(1);
  });

  it('clamps out-of-range shares', () => {
    expect(thumbRatioForShare(-10)).toBe(0);
    expect(thumbRatioForShare(110)).toBe(1);
  });
});

describe('segmentWidths', () => {
  it('splits proportionally to each share', () => {
    expect(segmentWidths([25, 75], 200)).toEqual([50, 150]);
  });

  it('sums to exactly totalWidth even when shares are unevenly weighted', () => {
    const widths = segmentWidths([10, 20, 30], 120);
    expect(widths.reduce((sum, w) => sum + w, 0)).toBeCloseTo(120);
  });

  it('falls back to an even split when every share is 0', () => {
    expect(segmentWidths([0, 0, 0], 90)).toEqual([30, 30, 30]);
  });

  it('returns an empty array for no members', () => {
    expect(segmentWidths([], 200)).toEqual([]);
  });

  it('returns zero-width segments when totalWidth is 0', () => {
    expect(segmentWidths([10, 20], 0)).toEqual([0, 0]);
  });

  it('ignores negative shares when normalizing', () => {
    expect(segmentWidths([-10, 30], 100)).toEqual([0, 100]);
  });
});

describe('cohortSegments', () => {
  it('groups members by cohortIndex and sums their shares', () => {
    const segments = cohortSegments([
      {id: 'a', name: 'Alice', share: 20, cohortIndex: 0},
      {id: 'b', name: 'Bob', share: 30, cohortIndex: 0},
      {id: 'c', name: 'Cara', share: 50, cohortIndex: 1},
    ]);

    expect(segments).toEqual([
      {
        key: 'cohort-0',
        label: 'Cohort 1',
        share: 50,
        idealShare: (100 / 3) * 2,
        members: [
          {id: 'a', name: 'Alice', share: 20},
          {id: 'b', name: 'Bob', share: 30},
        ],
      },
      {
        key: 'cohort-1',
        label: 'Cohort 2',
        share: 50,
        idealShare: 100 / 3,
        members: [{id: 'c', name: 'Cara', share: 50}],
      },
    ]);
  });

  it('sorts cohorts ascending by index', () => {
    const segments = cohortSegments([
      {id: 'a', name: 'Alice', share: 10, cohortIndex: 2},
      {id: 'b', name: 'Bob', share: 90, cohortIndex: 0},
    ]);

    expect(segments.map(segment => segment.key)).toEqual(['cohort-0', 'cohort-2']);
  });

  it('groups a null cohortIndex into its own trailing "Ungrouped" segment', () => {
    const segments = cohortSegments([
      {id: 'a', name: 'Alice', share: 40, cohortIndex: 0},
      {id: 'b', name: 'Bob', share: 60, cohortIndex: null},
    ]);

    expect(segments[segments.length - 1]).toMatchObject({key: 'ungrouped', label: 'Ungrouped'});
  });

  it('returns an empty array for no members', () => {
    expect(cohortSegments([])).toEqual([]);
  });
});
