import React from 'react';
import {Pressable, Text, View} from 'react-native';

interface ListRowProps {
  title: string;
  subtitle?: string;
  leading?: React.ReactNode;
  trailing?: React.ReactNode;
  onPress?: () => void;
}

/** Generic icon/title/subtitle/trailing row -- the base building block for every list screen. */
export function ListRow({title, subtitle, leading, trailing, onPress}: ListRowProps): React.JSX.Element {
  return (
    <Pressable
      disabled={!onPress}
      className="flex-row items-center gap-3 py-3"
      {...(onPress ? {onPress, accessibilityRole: 'button' as const} : {})}>
      {leading ? <View className="h-10 w-10 items-center justify-center">{leading}</View> : null}
      <View className="flex-1">
        <Text className="font-sans-medium text-base text-ink">{title}</Text>
        {subtitle ? <Text className="font-sans text-sm text-ink-muted">{subtitle}</Text> : null}
      </View>
      {trailing ? <View>{trailing}</View> : null}
    </Pressable>
  );
}
