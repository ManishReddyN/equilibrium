/**
 * `shared_flat`/`co_living` households' equilibrium visual (plan section
 * 4.3): one bar, one segment per member (co-living: one segment per cohort,
 * expandable to a per-member breakdown) -- animated segment widths, member
 * legend with avatars, amber tint when a segment's share deviates from its
 * ideal split by more than the household's `equilibrium_tolerance`
 * (`shared/utils/points.ts#equilibriumProgress`). Reanimated-driven segment
 * fills aren't exercised by render-based Jest tests (like
 * `BilateralBalanceSlider`); the expand/collapse legend below is plain React
 * state, unit-tested indirectly via `../utils/balanceMath.ts`'s layout math.
 * See docs/DECISIONS.md's Phase 4 testability-boundary note.
 */
import React, {useEffect, useState} from 'react';
import {Pressable, Text, View, type LayoutChangeEvent} from 'react-native';
import Animated, {
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import {Avatar} from '@shared/components/Avatar';
import {equilibriumProgress, formatShare, isOutOfEquilibrium} from '@shared/utils/points';
import {Scale} from '@theme/icons';
import {colors} from '@theme/tokens';

import {segmentWidths} from '../utils/balanceMath';

export interface ContributionSegmentMember {
  id: string;
  name: string;
  share: number;
}

export interface ContributionSegment {
  key: string;
  label: string;
  share: number;
  idealShare: number;
  /** Present only for co-living cohort segments -- renders an expandable per-member breakdown. */
  members?: ContributionSegmentMember[];
}

interface StackedContributionBarProps {
  segments: ContributionSegment[];
  tolerancePercent: number;
}

const BAR_HEIGHT = 20;

function ContributionSegmentFill({width, progress}: {width: number; progress: number}): React.JSX.Element {
  const widthValue = useSharedValue(width);
  const progressValue = useSharedValue(progress);

  useEffect(() => {
    widthValue.value = withTiming(width, {duration: 300});
  }, [width, widthValue]);
  useEffect(() => {
    progressValue.value = withTiming(progress, {duration: 300});
  }, [progress, progressValue]);

  const style = useAnimatedStyle(() => ({
    width: widthValue.value,
    backgroundColor: interpolateColor(progressValue.value, [0, 1], [colors.primary, colors.warn]),
  }));

  return <Animated.View className="h-full border-r-2 border-white" style={style} />;
}

export function StackedContributionBar({
  segments,
  tolerancePercent,
}: StackedContributionBarProps): React.JSX.Element {
  const [containerWidth, setContainerWidth] = useState(0);
  const [expandedKey, setExpandedKey] = useState<string | null>(null);

  function onBarLayout(event: LayoutChangeEvent): void {
    setContainerWidth(event.nativeEvent.layout.width);
  }

  const widths = segmentWidths(
    segments.map(segment => segment.share),
    containerWidth,
  );

  return (
    <View className="gap-3">
      <View
        onLayout={onBarLayout}
        className="flex-row overflow-hidden rounded-full bg-border"
        style={{height: BAR_HEIGHT}}>
        {segments.map((segment, index) => (
          <ContributionSegmentFill
            key={segment.key}
            width={widths[index] ?? 0}
            progress={equilibriumProgress(segment.share, segment.idealShare, tolerancePercent)}
          />
        ))}
      </View>

      <View className="gap-1">
        {segments.map(segment => {
          const outOfEquilibrium = isOutOfEquilibrium(
            segment.share,
            segment.idealShare,
            tolerancePercent,
          );
          const expandable = Boolean(segment.members && segment.members.length > 0);
          const expanded = expandable && expandedKey === segment.key;

          return (
            <View key={segment.key}>
              <Pressable
                disabled={!expandable}
                onPress={() => setExpandedKey(expanded ? null : segment.key)}
                className="flex-row items-center gap-3 py-1"
                {...(expandable ? {accessibilityRole: 'button' as const} : {})}>
                <Avatar name={segment.label} size={28} />
                <Text className="flex-1 font-sans-medium text-sm text-ink">{segment.label}</Text>
                {outOfEquilibrium ? (
                  <Scale size={14} strokeWidth={1.75} color={colors.warn} />
                ) : null}
                <Text
                  className={`font-sans-semibold text-sm ${
                    outOfEquilibrium ? 'text-warn' : 'text-ink'
                  }`}>
                  {formatShare(segment.share)}
                </Text>
              </Pressable>

              {expanded
                ? (segment.members ?? []).map(member => (
                    <View
                      key={member.id}
                      className="ml-8 flex-row items-center gap-2 border-l border-border py-0.5 pl-3">
                      <Avatar name={member.name} size={20} />
                      <Text className="flex-1 font-sans text-xs text-ink-muted">{member.name}</Text>
                      <Text className="font-sans-medium text-xs text-ink-muted">
                        {formatShare(member.share)}
                      </Text>
                    </View>
                  ))
                : null}
            </View>
          );
        })}
      </View>
    </View>
  );
}
