/**
 * Pure geometry/physics helpers for `RotationCarousel` (plan section 4.2:
 * "horizontal physics carousel: `Gesture.Pan()` + `withDecay` clamped to card
 * snap points; scale/opacity interpolation on neighbors... no ScrollView --
 * pure Reanimated transform for 60fps"). Extracted from the gesture-handler
 * wiring so the snap/clamp/interpolation math is unit-testable without
 * mounting Reanimated's UI-thread runtime -- same split as
 * `../../dashboard/utils/swipeThresholds.ts`.
 *
 * Deliberately does not import Reanimated's own `interpolate`: the Jest mock
 * (`react-native-reanimated/mock`, wired in jest.config.js) stubs it out to a
 * no-op, so a dependency-free `interpolateClamped` is used instead -- it
 * behaves identically at runtime (interpolate is pure math, no native calls)
 * and stays testable under plain Jest.
 */

/** Each card's on-screen width, in dp. */
export const CARD_WIDTH = 220;
/** Horizontal gap between adjacent cards, in dp. */
export const CARD_GAP = 12;
/** Distance (in dp of scroll offset) between two adjacent cards' snap points. */
export const CARD_STEP = CARD_WIDTH + CARD_GAP;

/** The scroll offset (`translateX`) that brings card `index` to the focused/leftmost position. */
export function snapOffsetForIndex(index: number): number {
  'worklet';
  // `+ 0` normalizes `-0` (from `-0 * CARD_STEP` at index 0) to `0`.
  return -index * CARD_STEP + 0;
}

/**
 * Valid `[min, max]` scroll-offset range covering every card 0..cardCount-1
 * -- the `clamp` tuple `withDecay` is configured with.
 */
export function clampRange(cardCount: number): [min: number, max: number] {
  'worklet';
  const min = cardCount <= 1 ? 0 : -(cardCount - 1) * CARD_STEP;
  return [min, 0];
}

/** Nearest valid card index for a given scroll offset -- what a fling settles on after `withDecay`. */
export function nearestSnapIndex(offset: number, cardCount: number): number {
  'worklet';
  if (cardCount <= 0) {
    return 0;
  }
  const raw = Math.round(-offset / CARD_STEP);
  return Math.max(0, Math.min(cardCount - 1, raw));
}

/** How far (in card-widths) card `index` currently sits from the focused/centered position. */
export function focusDistance(index: number, offset: number): number {
  'worklet';
  return Math.abs(index + offset / CARD_STEP);
}

/** Local, worklet-safe linear interpolation clamped to the output range's endpoints. */
function interpolateClamped(
  x: number,
  inputRange: readonly [number, number, number],
  outputRange: readonly [number, number, number],
): number {
  'worklet';
  if (x <= inputRange[0]) {
    return outputRange[0];
  }
  if (x >= inputRange[2]) {
    return outputRange[2];
  }
  if (x <= inputRange[1]) {
    const t = (x - inputRange[0]) / (inputRange[1] - inputRange[0]);
    return outputRange[0] + t * (outputRange[1] - outputRange[0]);
  }
  const t = (x - inputRange[1]) / (inputRange[2] - inputRange[1]);
  return outputRange[1] + t * (outputRange[2] - outputRange[1]);
}

/** Off-focus cards shrink slightly the farther they sit from the focused card. */
export function scaleForDistance(distance: number): number {
  'worklet';
  return interpolateClamped(distance, [0, 1, 2], [1, 0.88, 0.78]);
}

/** Off-focus cards fade slightly the farther they sit from the focused card. */
export function opacityForDistance(distance: number): number {
  'worklet';
  return interpolateClamped(distance, [0, 1, 2], [1, 0.6, 0.35]);
}
