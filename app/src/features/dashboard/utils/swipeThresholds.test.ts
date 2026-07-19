import {describe, expect, it} from '@jest/globals';

import {
  ACTIONS_PANEL_WIDTH,
  hasCrossedCompleteThreshold,
  resolveSwipeOutcome,
} from './swipeThresholds';

const ROW_WIDTH = 320;

describe('resolveSwipeOutcome', () => {
  it('returns "reset" for a small rightward drag under the 45% threshold', () => {
    expect(resolveSwipeOutcome(ROW_WIDTH * 0.2, ROW_WIDTH)).toBe('reset');
  });

  it('returns "complete" once translation reaches 45% of row width', () => {
    expect(resolveSwipeOutcome(ROW_WIDTH * 0.45, ROW_WIDTH)).toBe('complete');
  });

  it('returns "complete" for any translation beyond the threshold', () => {
    expect(resolveSwipeOutcome(ROW_WIDTH * 0.9, ROW_WIDTH)).toBe('complete');
  });

  it('returns "revealActions" for a leftward drag past half the actions panel width', () => {
    expect(resolveSwipeOutcome(-ACTIONS_PANEL_WIDTH, ROW_WIDTH)).toBe('revealActions');
  });

  it('returns "reset" for a small leftward drag that has not revealed the actions panel', () => {
    expect(resolveSwipeOutcome(-10, ROW_WIDTH)).toBe('reset');
  });

  it('returns "reset" at exactly zero translation', () => {
    expect(resolveSwipeOutcome(0, ROW_WIDTH)).toBe('reset');
  });
});

describe('hasCrossedCompleteThreshold', () => {
  it('is false below 45% of row width', () => {
    expect(hasCrossedCompleteThreshold(ROW_WIDTH * 0.44, ROW_WIDTH)).toBe(false);
  });

  it('is true at or above 45% of row width', () => {
    expect(hasCrossedCompleteThreshold(ROW_WIDTH * 0.45, ROW_WIDTH)).toBe(true);
  });

  it('is false for leftward drags', () => {
    expect(hasCrossedCompleteThreshold(-100, ROW_WIDTH)).toBe(false);
  });
});
