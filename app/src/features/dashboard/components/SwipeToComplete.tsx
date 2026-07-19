/**
 * Swipeable assignment row (plan section 4.1): right-swipe past 45% of the
 * row width completes the assignment; left-swipe reveals a fixed actions
 * panel (Skip, and List on Market when the household is `shared_flat`).
 *
 * Threshold math lives in `../utils/swipeThresholds.ts` (unit tested); this
 * file is Gesture Handler v2 + Reanimated wiring around it. Like
 * `CompletionCelebration`, it isn't exercised by render-based Jest tests --
 * see docs/DECISIONS.md's Phase 4 testability-boundary note.
 */
import React, {useCallback} from 'react';
import {Pressable, Text, View, type LayoutChangeEvent} from 'react-native';
import {Gesture, GestureDetector} from 'react-native-gesture-handler';
import Animated, {
  Layout,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import {trigger as triggerHaptic} from 'react-native-haptic-feedback';

import {colors} from '@theme/tokens';
import {CheckCircle2} from '@theme/icons';

import {
  ACTIONS_PANEL_WIDTH,
  hasCrossedCompleteThreshold,
  resolveSwipeOutcome,
} from '../utils/swipeThresholds';

interface SwipeToCompleteProps {
  children: React.ReactNode;
  onComplete: () => void;
  onSkip: () => void;
  onListOnMarket?: (() => void) | undefined;
  disabled?: boolean;
}

function fireHaptic(): void {
  triggerHaptic('impactMedium', {enableVibrateFallback: true, ignoreAndroidSystemSettings: false});
}

export function SwipeToComplete({
  children,
  onComplete,
  onSkip,
  onListOnMarket,
  disabled = false,
}: SwipeToCompleteProps): React.JSX.Element {
  const translateX = useSharedValue(0);
  const startX = useSharedValue(0);
  const rowWidth = useSharedValue(0);
  const hasFiredHaptic = useSharedValue(false);

  const onLayout = useCallback(
    (event: LayoutChangeEvent) => {
      rowWidth.value = event.nativeEvent.layout.width;
    },
    [rowWidth],
  );

  const pan = Gesture.Pan()
    .enabled(!disabled)
    .activeOffsetX([-10, 10])
    .onStart(() => {
      startX.value = translateX.value;
    })
    .onUpdate(event => {
      const next = startX.value + event.translationX;
      translateX.value = Math.max(-ACTIONS_PANEL_WIDTH, Math.min(next, rowWidth.value));

      const crossed = hasCrossedCompleteThreshold(translateX.value, rowWidth.value);
      if (crossed && !hasFiredHaptic.value) {
        hasFiredHaptic.value = true;
        runOnJS(fireHaptic)();
      } else if (!crossed && hasFiredHaptic.value) {
        hasFiredHaptic.value = false;
      }
    })
    .onEnd(() => {
      const outcome = resolveSwipeOutcome(translateX.value, rowWidth.value);
      if (outcome === 'complete') {
        translateX.value = withTiming(rowWidth.value * 1.2, {duration: 220}, finished => {
          if (finished) {
            runOnJS(onComplete)();
          }
        });
      } else if (outcome === 'revealActions') {
        translateX.value = withSpring(-ACTIONS_PANEL_WIDTH, {damping: 18});
      } else {
        translateX.value = withSpring(0, {damping: 18});
      }
    });

  const rowStyle = useAnimatedStyle(() => ({
    transform: [{translateX: translateX.value}],
  }));
  const completeHintStyle = useAnimatedStyle(() => ({
    opacity: Math.min(1, Math.max(0, translateX.value) / 60),
  }));

  function closeActions(): void {
    translateX.value = withSpring(0, {damping: 18});
  }

  return (
    <Animated.View
      layout={Layout.springify()}
      // `overflow-hidden` clips the row to its rounded bounds so the actions
      // panel underneath only shows through the swipe gap; each row is its
      // own bordered/rounded surface (rather than nesting inside the shared
      // `Card` component's fixed padding, which would leave dead space the
      // swipe gesture couldn't reach and inset the actions-panel reveal).
      className="overflow-hidden rounded-card border border-border bg-white">
      <View
        className="absolute inset-y-0 right-0 flex-row items-stretch"
        style={{width: ACTIONS_PANEL_WIDTH}}>
        <Pressable
          onPress={() => {
            closeActions();
            onSkip();
          }}
          className="flex-1 items-center justify-center bg-warn">
          <Text className="font-sans-semibold text-sm text-white">Skip</Text>
        </Pressable>
        {onListOnMarket ? (
          <Pressable
            onPress={() => {
              closeActions();
              onListOnMarket();
            }}
            className="flex-1 items-center justify-center bg-primary">
            <Text className="font-sans-semibold text-sm text-white">Market</Text>
          </Pressable>
        ) : null}
      </View>

      <Animated.View
        pointerEvents="none"
        className="absolute inset-y-0 left-0 right-0 flex-row items-center bg-primary-soft px-4"
        style={completeHintStyle}>
        <CheckCircle2 size={20} strokeWidth={1.75} color={colors.primary} />
      </Animated.View>

      <GestureDetector gesture={pan}>
        <Animated.View onLayout={onLayout} className="bg-white" style={rowStyle}>
          {children}
        </Animated.View>
      </GestureDetector>
    </Animated.View>
  );
}
