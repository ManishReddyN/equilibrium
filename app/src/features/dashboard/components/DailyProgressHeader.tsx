import React from 'react';
import {Text, View} from 'react-native';

interface DailyProgressHeaderProps {
  completedToday: number;
  totalToday: number;
}

/**
 * Thin teal progress bar summarizing today's chores (plan section 4.1's
 * component list). `totalToday` is the count of assignments due today at the
 * start of this session; `completedToday` grows as the user swipes them done
 * -- a lightweight, no-extra-query approximation rather than a full daily
 * history aggregate.
 */
export function DailyProgressHeader({
  completedToday,
  totalToday,
}: DailyProgressHeaderProps): React.JSX.Element {
  const ratio = totalToday === 0 ? 1 : Math.min(1, completedToday / totalToday);

  return (
    <View className="gap-2 pb-2 pt-1">
      <Text className="font-sans-medium text-sm text-ink-muted">
        {totalToday === 0 ? 'Nothing due today' : `${completedToday} of ${totalToday} done today`}
      </Text>
      <View className="h-1.5 w-full overflow-hidden rounded-full bg-border">
        <View
          className="h-1.5 rounded-full bg-primary"
          style={{width: `${Math.round(ratio * 100)}%`}}
        />
      </View>
    </View>
  );
}
