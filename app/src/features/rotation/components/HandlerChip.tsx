import React from 'react';
import {Text, View} from 'react-native';

import {Avatar} from '@shared/components/Avatar';

interface HandlerChipProps {
  name: string;
  size?: number;
}

/** Avatar + name identity pill for a rotation cycle's handler, used inside `CycleCard`. */
export function HandlerChip({name, size = 48}: HandlerChipProps): React.JSX.Element {
  return (
    <View className="items-center gap-2">
      <Avatar name={name} size={size} />
      <Text className="font-sans-semibold text-sm text-ink" numberOfLines={1}>
        {name}
      </Text>
    </View>
  );
}
