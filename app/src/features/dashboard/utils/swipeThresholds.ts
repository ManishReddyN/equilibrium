/**
 * Pure swipe-threshold math for `SwipeToComplete` (plan section 4.1: "threshold
 * = 45% row width; below threshold spring back... Right-swipe completes;
 * left-swipe reveals actions").
 *
 * Marked `'worklet'` so it can be called directly from the Reanimated
 * `Gesture.Pan()` callbacks, which run on the UI thread -- Reanimated's
 * Babel plugin only auto-worklet-izes the gesture callback bodies
 * themselves, not helper functions imported from elsewhere, so an imported
 * helper called from a UI-thread callback must carry its own `'worklet'`
 * directive or the runtime throws. The directive is a no-op for plain JS
 * (including under Jest), so this stays fully unit-testable.
 */

export const COMPLETE_THRESHOLD_RATIO = 0.45;
/** Width of the revealed left-swipe actions panel (Skip / List on Market). */
export const ACTIONS_PANEL_WIDTH = 148;

export type SwipeOutcome = 'complete' | 'revealActions' | 'reset';

export function resolveSwipeOutcome(translationX: number, rowWidth: number): SwipeOutcome {
  'worklet';
  const completeThreshold = rowWidth * COMPLETE_THRESHOLD_RATIO;
  if (translationX >= completeThreshold) {
    return 'complete';
  }
  if (translationX <= -ACTIONS_PANEL_WIDTH / 2) {
    return 'revealActions';
  }
  return 'reset';
}

/** Whether a given translation has crossed the complete-threshold -- used to fire the haptic exactly once per crossing. */
export function hasCrossedCompleteThreshold(translationX: number, rowWidth: number): boolean {
  'worklet';
  return translationX >= rowWidth * COMPLETE_THRESHOLD_RATIO;
}
