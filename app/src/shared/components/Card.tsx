import React from 'react';
import {View, type ViewProps} from 'react-native';

interface CardProps extends ViewProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * Rounded, softly-elevated content container -- the base surface for list
 * items, summaries, form steps. `shadow-sm` + a light border reads as a
 * crisp, lifted card (dashboard-app convention) rather than the flat
 * border-only box this used before the 2026-07-20 redesign.
 */
export function Card({children, className, ...rest}: CardProps): React.JSX.Element {
  return (
    <View
      className={`rounded-card border border-border bg-white p-4 shadow-sm shadow-slate-950/5 ${className ?? ''}`}
      {...rest}>
      {children}
    </View>
  );
}
