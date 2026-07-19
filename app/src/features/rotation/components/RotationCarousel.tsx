/**
 * Horizontal physics carousel over one chore's projected rotation cycles
 * (plan section 4.2): `Gesture.Pan()` + `withDecay` clamped to card snap
 * points, scale/opacity interpolation on neighbor cards -- no ScrollView,
 * pure Reanimated transform for 60fps. Snap/clamp/interpolation math lives in
 * `../utils/carouselMath.ts` (unit tested); this file is Gesture Handler v2 +
 * Reanimated wiring around it. Like `dashboard/components/SwipeToComplete.tsx`,
 * it isn't exercised by render-based Jest tests -- see docs/DECISIONS.md's
 * Phase 4 testability-boundary note.
 */
import React from 'react';
import {Gesture, GestureDetector} from 'react-native-gesture-handler';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDecay,
  withSpring,
  type SharedValue,
} from 'react-native-reanimated';

import {
  CARD_GAP,
  clampRange,
  focusDistance,
  nearestSnapIndex,
  opacityForDistance,
  scaleForDistance,
  snapOffsetForIndex,
} from '../utils/carouselMath';
import {CycleCard} from './CycleCard';

export interface RotationCarouselCard {
  key: string;
  label: string;
  handlerName: string;
  isMakeup: boolean;
}

interface RotationCarouselProps {
  cards: RotationCarouselCard[];
}

interface CarouselCardProps {
  index: number;
  card: RotationCarouselCard;
  translateX: SharedValue<number>;
}

function CarouselCard({index, card, translateX}: CarouselCardProps): React.JSX.Element {
  const style = useAnimatedStyle(() => {
    const distance = focusDistance(index, translateX.value);
    return {
      transform: [{scale: scaleForDistance(distance)}],
      opacity: opacityForDistance(distance),
    };
  });

  return (
    <Animated.View style={style}>
      <CycleCard label={card.label} handlerName={card.handlerName} isMakeup={card.isMakeup} />
    </Animated.View>
  );
}

/** `RotationScreen`'s per-chore preview: swipe through "Now", "Next", "In N turns" cycle cards. */
export function RotationCarousel({cards}: RotationCarouselProps): React.JSX.Element {
  const translateX = useSharedValue(0);
  const startX = useSharedValue(0);
  const cardCount = cards.length;

  const pan = Gesture.Pan()
    .onStart(() => {
      startX.value = translateX.value;
    })
    .onUpdate(event => {
      translateX.value = startX.value + event.translationX;
    })
    .onEnd(event => {
      const [min, max] = clampRange(cardCount);
      translateX.value = withDecay({velocity: event.velocityX, clamp: [min, max]}, finished => {
        if (finished) {
          const nearest = nearestSnapIndex(translateX.value, cardCount);
          translateX.value = withSpring(snapOffsetForIndex(nearest), {damping: 20});
        }
      });
    });

  const stripStyle = useAnimatedStyle(() => ({
    transform: [{translateX: translateX.value}],
  }));

  return (
    <GestureDetector gesture={pan}>
      <Animated.View className="flex-row" style={[stripStyle, {gap: CARD_GAP}]}>
        {cards.map((card, index) => (
          <CarouselCard key={card.key} index={index} card={card} translateX={translateX} />
        ))}
      </Animated.View>
    </GestureDetector>
  );
}
