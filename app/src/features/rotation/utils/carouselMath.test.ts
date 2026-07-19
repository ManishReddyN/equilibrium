import {describe, expect, it} from '@jest/globals';

import {
  CARD_STEP,
  clampRange,
  focusDistance,
  nearestSnapIndex,
  opacityForDistance,
  scaleForDistance,
  snapOffsetForIndex,
} from './carouselMath';

describe('snapOffsetForIndex', () => {
  it('returns 0 for the first card', () => {
    expect(snapOffsetForIndex(0)).toBe(0);
  });

  it('returns a negative multiple of CARD_STEP for later cards', () => {
    expect(snapOffsetForIndex(1)).toBe(-CARD_STEP);
    expect(snapOffsetForIndex(3)).toBe(-3 * CARD_STEP);
  });
});

describe('clampRange', () => {
  it('collapses to [0, 0] for a single card', () => {
    expect(clampRange(1)).toEqual([0, 0]);
  });

  it('collapses to [0, 0] for zero cards', () => {
    expect(clampRange(0)).toEqual([0, 0]);
  });

  it('spans from the last card back to 0 for multiple cards', () => {
    expect(clampRange(4)).toEqual([-3 * CARD_STEP, 0]);
  });
});

describe('nearestSnapIndex', () => {
  it('returns 0 for an empty carousel', () => {
    expect(nearestSnapIndex(0, 0)).toBe(0);
  });

  it('returns the exact index at each snap point', () => {
    expect(nearestSnapIndex(0, 5)).toBe(0);
    expect(nearestSnapIndex(-CARD_STEP, 5)).toBe(1);
    expect(nearestSnapIndex(-2 * CARD_STEP, 5)).toBe(2);
  });

  it('rounds to the closer neighbor between two snap points', () => {
    expect(nearestSnapIndex(-CARD_STEP * 0.4, 5)).toBe(0);
    expect(nearestSnapIndex(-CARD_STEP * 0.6, 5)).toBe(1);
  });

  it('clamps below index 0', () => {
    expect(nearestSnapIndex(50, 5)).toBe(0);
  });

  it('clamps above the last valid index', () => {
    expect(nearestSnapIndex(-100 * CARD_STEP, 5)).toBe(4);
  });
});

describe('focusDistance', () => {
  it('is 0 for the focused card at offset 0', () => {
    expect(focusDistance(0, 0)).toBe(0);
  });

  it('grows by 1 per card-step of scroll offset', () => {
    expect(focusDistance(2, -2 * CARD_STEP)).toBe(0);
    expect(focusDistance(2, -1 * CARD_STEP)).toBe(1);
    expect(focusDistance(0, -CARD_STEP)).toBe(1);
  });

  it('is always non-negative regardless of direction', () => {
    expect(focusDistance(0, CARD_STEP)).toBe(1);
  });
});

describe('scaleForDistance', () => {
  it('is 1 for the focused card', () => {
    expect(scaleForDistance(0)).toBe(1);
  });

  it('shrinks for the immediate neighbor', () => {
    expect(scaleForDistance(1)).toBeCloseTo(0.88);
  });

  it('shrinks further for the second neighbor and clamps beyond', () => {
    expect(scaleForDistance(2)).toBeCloseTo(0.78);
    expect(scaleForDistance(5)).toBeCloseTo(0.78);
  });

  it('interpolates between distance 0 and 1', () => {
    expect(scaleForDistance(0.5)).toBeCloseTo(0.94);
  });
});

describe('opacityForDistance', () => {
  it('is 1 for the focused card', () => {
    expect(opacityForDistance(0)).toBe(1);
  });

  it('fades for neighbors and clamps beyond the second neighbor', () => {
    expect(opacityForDistance(1)).toBeCloseTo(0.6);
    expect(opacityForDistance(2)).toBeCloseTo(0.35);
    expect(opacityForDistance(10)).toBeCloseTo(0.35);
  });
});
