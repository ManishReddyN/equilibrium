import React from 'react';
import {View, type ViewProps} from 'react-native';

interface CardProps extends ViewProps {
  children: React.ReactNode;
  className?: string;
}

/** Rounded, bordered content container -- the base surface for list items, summaries, form steps. */
export function Card({children, className, ...rest}: CardProps): React.JSX.Element {
  return (
    <View className={`rounded-card border border-border bg-white p-4 ${className ?? ''}`} {...rest}>
      {children}
    </View>
  );
}
