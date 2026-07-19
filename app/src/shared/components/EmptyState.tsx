import React from 'react';
import {Text, View} from 'react-native';

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  subtitle?: string;
}

/** Calm, illustration-free empty state -- e.g. dashboard's "All settled for today." */
export function EmptyState({icon, title, subtitle}: EmptyStateProps): React.JSX.Element {
  return (
    <View className="flex-1 items-center justify-center gap-2 px-8 py-12">
      {icon ? <View className="mb-2">{icon}</View> : null}
      <Text className="font-sans-semibold text-base text-ink">{title}</Text>
      {subtitle ? (
        <Text className="text-center font-sans text-sm text-ink-muted">{subtitle}</Text>
      ) : null}
    </View>
  );
}
