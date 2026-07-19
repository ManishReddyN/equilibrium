/**
 * Shared screen scaffold: canvas background, safe areas, 16px gutter.
 * Every Phase 4 screen wraps its content in this per the execution plan
 * ("Every screen uses the shared Screen scaffold").
 */
import React from 'react';
import {ScrollView, View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';

interface ScreenProps {
  children: React.ReactNode;
  scrollable?: boolean;
  className?: string;
}

export function Screen({children, scrollable = false, className}: ScreenProps): React.JSX.Element {
  const gutterClassName = `flex-1 px-4 ${className ?? ''}`;

  return (
    <SafeAreaView className="flex-1 bg-canvas" edges={['top', 'left', 'right', 'bottom']}>
      {scrollable ? (
        <ScrollView
          className={gutterClassName}
          // `contentContainerStyle` is a plain style prop, not something
          // NativeWind's `className` transform touches.
          // eslint-disable-next-line react-native/no-inline-styles
          contentContainerStyle={{paddingBottom: 24}}
          showsVerticalScrollIndicator={false}>
          {children}
        </ScrollView>
      ) : (
        <View className={gutterClassName}>{children}</View>
      )}
    </SafeAreaView>
  );
}
