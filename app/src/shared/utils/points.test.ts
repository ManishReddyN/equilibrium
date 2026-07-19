import {describe, expect, it} from '@jest/globals';

import {
  equilibriumProgress,
  formatShare,
  formatSignedPoints,
  idealShareForMemberCount,
  isOutOfEquilibrium,
} from './points';

describe('formatSignedPoints', () => {
  it('prefixes positive values with a plus sign', () => {
    expect(formatSignedPoints(40)).toBe('+40');
  });

  it('leaves negative values as-is', () => {
    expect(formatSignedPoints(-10)).toBe('-10');
  });

  it('renders zero without a sign', () => {
    expect(formatSignedPoints(0)).toBe('0');
  });
});

describe('formatShare', () => {
  it('rounds to the nearest whole percent and appends %', () => {
    expect(formatShare(61.6)).toBe('62%');
    expect(formatShare(61.4)).toBe('61%');
  });
});

describe('idealShareForMemberCount', () => {
  it('splits evenly across members', () => {
    expect(idealShareForMemberCount(2)).toBe(50);
    expect(idealShareForMemberCount(4)).toBe(25);
  });

  it('returns 0 for a household with no members', () => {
    expect(idealShareForMemberCount(0)).toBe(0);
    expect(idealShareForMemberCount(-1)).toBe(0);
  });
});

describe('isOutOfEquilibrium', () => {
  it('is false exactly at the tolerance boundary', () => {
    expect(isOutOfEquilibrium(60, 50, 10)).toBe(false);
  });

  it('is true just past the tolerance boundary', () => {
    expect(isOutOfEquilibrium(60.1, 50, 10)).toBe(true);
  });

  it('is symmetric around the ideal share', () => {
    expect(isOutOfEquilibrium(39.9, 50, 10)).toBe(true);
    expect(isOutOfEquilibrium(40, 50, 10)).toBe(false);
  });
});

describe('equilibriumProgress', () => {
  it('is 0 for a perfectly even share', () => {
    expect(equilibriumProgress(50, 50, 10)).toBe(0);
  });

  it('is 0 exactly at the tolerance boundary', () => {
    expect(equilibriumProgress(60, 50, 10)).toBe(0);
  });

  it('ramps linearly between the tolerance boundary and double the tolerance', () => {
    expect(equilibriumProgress(65, 50, 10)).toBeCloseTo(0.5);
  });

  it('clamps to 1 at or beyond double the tolerance', () => {
    expect(equilibriumProgress(70, 50, 10)).toBe(1);
    expect(equilibriumProgress(100, 50, 10)).toBe(1);
  });

  it('treats deviation symmetrically below the ideal share', () => {
    expect(equilibriumProgress(35, 50, 10)).toBeCloseTo(0.5);
  });

  it('falls back to a hard 0/1 cutoff when tolerance is 0', () => {
    expect(equilibriumProgress(50, 50, 0)).toBe(0);
    expect(equilibriumProgress(50.1, 50, 0)).toBe(1);
  });
});
