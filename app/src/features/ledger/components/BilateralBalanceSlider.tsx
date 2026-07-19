/**
 * Duo households' equilibrium visual (plan section 4.3): a horizontal track
 * whose thumb position mirrors memberA's rolling contribution share (50% =
 * perfectly even). Reanimated springs the thumb into position on every share
 * change; the fill/thumb tint eases from teal to amber via `interpolateColor`
 * as the deviation from 50% grows past the household's `equilibrium_tolerance`
 * (`shared/utils/points.ts#equilibriumProgress`). Gesture-free but still
 * Reanimated-driven UI-thread wiring -- like `SwipeToComplete`, this isn't
 * exercised by render-based Jest tests, see docs/DECISIONS.md's Phase 4
 * testability-boundary note.
 */
import React, {useEffect} from 'react';
import {Text, View, type LayoutChangeEvent} from 'react-native';
import Animated, {
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

import {Avatar} from '@shared/components/Avatar';
import {equilibriumProgress, formatShare} from '@shared/utils/points';
import {colors} from '@theme/tokens';

import {thumbRatioForShare} from '../utils/balanceMath';

interface BilateralBalanceSliderProps {
  memberAName: string;
  memberBName: string;
  memberAShare: number;
  tolerancePercent: number;
}

const TRACK_HEIGHT = 12;
const THUMB_SIZE = 26;

export function BilateralBalanceSlider({
  memberAName,
  memberBName,
  memberAShare,
  tolerancePercent,
}: BilateralBalanceSliderProps): React.JSX.Element {
  const trackWidth = useSharedValue(0);
  const ratio = useSharedValue(thumbRatioForShare(memberAShare));
  const progress = useSharedValue(equilibriumProgress(memberAShare, 50, tolerancePercent));

  useEffect(() => {
    ratio.value = withSpring(thumbRatioForShare(memberAShare), {damping: 16});
    progress.value = withSpring(equilibriumProgress(memberAShare, 50, tolerancePercent), {
      damping: 16,
    });
  }, [memberAShare, tolerancePercent, ratio, progress]);

  function onTrackLayout(event: LayoutChangeEvent): void {
    trackWidth.value = event.nativeEvent.layout.width;
  }

  const fillStyle = useAnimatedStyle(() => ({
    width: ratio.value * trackWidth.value,
    backgroundColor: interpolateColor(progress.value, [0, 1], [colors.primary, colors.warn]),
  }));
  const thumbStyle = useAnimatedStyle(() => ({
    transform: [{translateX: ratio.value * trackWidth.value - THUMB_SIZE / 2}],
    backgroundColor: interpolateColor(progress.value, [0, 1], [colors.primary, colors.warn]),
  }));

  return (
    <View className="gap-2">
      <View className="flex-row items-center justify-between">
        <View className="flex-row items-center gap-2">
          <Avatar name={memberAName} size={24} />
          <Text className="font-sans-medium text-sm text-ink">{memberAName}</Text>
        </View>
        <View className="flex-row items-center gap-2">
          <Text className="font-sans-medium text-sm text-ink">{memberBName}</Text>
          <Avatar name={memberBName} size={24} />
        </View>
      </View>

      <View
        onLayout={onTrackLayout}
        className="justify-center overflow-visible rounded-full bg-border"
        style={{height: TRACK_HEIGHT}}>
        <Animated.View className="rounded-full" style={[{height: TRACK_HEIGHT}, fillStyle]} />
        <Animated.View
          className="absolute rounded-full border-2 border-white"
          style={[{width: THUMB_SIZE, height: THUMB_SIZE, top: -(THUMB_SIZE - TRACK_HEIGHT) / 2}, thumbStyle]}
        />
      </View>

      <Text className="text-center font-sans text-xs text-ink-muted">
        {formatShare(memberAShare)} / {formatShare(100 - memberAShare)}
      </Text>
    </View>
  );
}
