import React from 'react';
import {Text, View} from 'react-native';

import {Repeat2} from '@theme/icons';
import {colors} from '@theme/tokens';

import {CARD_WIDTH} from '../utils/carouselMath';
import {HandlerChip} from './HandlerChip';

/** Fixed card height so every card in the strip scales/fades around the same footprint. */
const CYCLE_CARD_HEIGHT = 176;

interface CycleCardProps {
  label: string;
  handlerName: string;
  isMakeup: boolean;
}

/**
 * One projected rotation cycle inside `RotationCarousel` (plan section 4.2):
 * a label ("Now" / "Next" / "In N turns"), the handler's identity chip, and
 * -- for duo households whose pending makeup obligation lands on this exact
 * chore -- a `Repeat2` indicator ("Makeup turn from skipped cycle").
 */
export function CycleCard({label, handlerName, isMakeup}: CycleCardProps): React.JSX.Element {
  return (
    <View
      className="items-center justify-center gap-3 rounded-card border border-border bg-white p-4"
      style={{width: CARD_WIDTH, height: CYCLE_CARD_HEIGHT}}>
      <Text className="font-sans-medium text-xs uppercase tracking-wide text-ink-muted">
        {label}
      </Text>
      <HandlerChip name={handlerName} />
      {isMakeup ? (
        <View className="flex-row items-center gap-1 px-2">
          <Repeat2 size={14} strokeWidth={1.75} color={colors.inkMuted} />
          <Text className="text-center font-sans text-xs text-ink-muted">
            Makeup turn from skipped cycle
          </Text>
        </View>
      ) : null}
    </View>
  );
}
