import React from 'react';
import {Text, View} from 'react-native';

interface SectionHeaderProps {
  title: string;
  trailing?: React.ReactNode;
}

/** Uppercase muted label for list sections (e.g. dashboard's Today / Overdue / Upcoming). */
export function SectionHeader({title, trailing}: SectionHeaderProps): React.JSX.Element {
  return (
    <View className="flex-row items-center justify-between pb-2 pt-4">
      <Text className="font-sans-semibold text-sm uppercase tracking-wide text-ink-muted">
        {title}
      </Text>
      {trailing ? <View>{trailing}</View> : null}
    </View>
  );
}
