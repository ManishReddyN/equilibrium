/**
 * Full-screen Skia particle burst (plan section 4.1), mounted by
 * `DashboardScreen` only when the *last* active assignment for today
 * completes. Auto-calls `onDone` after `CELEBRATION_LIFETIME_MS` so the
 * parent can unmount it.
 *
 * All physics/state math lives in `../utils/particles.ts` (fully unit
 * tested); this file is a thin Reanimated/Skia wiring layer that is
 * deliberately NOT exercised by render-based Jest tests -- see
 * docs/DECISIONS.md's Phase 4 testability-boundary note: Reanimated's Jest
 * mock doesn't implement `useFrameCallback`, and there's no
 * device/emulator available on this machine to visually verify Skia output,
 * so correctness here rests on (a) the tested pure-logic module and (b) the
 * type system (Skia's `SkiaProps<T>` accepts a Reanimated `SharedValue`
 * directly, since both shapes are `{value: T}`).
 *
 * Hooks-in-a-loop note: 120 particles need per-particle reactive props
 * without violating `react-hooks/rules-of-hooks` (which flags any hook
 * called inside a `.map()` callback). The fix is `CelebrationParticle`: a
 * dedicated child component that calls its own hooks exactly once per its
 * own render, mounted 120 times from a single `.map()` in the parent -- one
 * hook-call-per-component-render, same as any other list of components.
 */
import React from 'react';
import {Dimensions} from 'react-native';
import {Canvas, Circle, RoundedRect} from '@shopify/react-native-skia';
import {
  runOnJS,
  useDerivedValue,
  useFrameCallback,
  useSharedValue,
  type SharedValue,
} from 'react-native-reanimated';

import {celebrationPalette} from '@theme/tokens';

import {CELEBRATION_LIFETIME_MS, createBurst, stepBurst, type Particle} from '../utils/particles';

const PARTICLE_COUNT = 120;
const PALETTE = celebrationPalette as unknown as string[];

interface CompletionCelebrationProps {
  onDone: () => void;
}

export function CompletionCelebration({onDone}: CompletionCelebrationProps): React.JSX.Element {
  const {width, height} = Dimensions.get('window');

  const particles = useSharedValue<Particle[]>(
    createBurst(PARTICLE_COUNT, {originX: width / 2, originY: height / 2, palette: PALETTE}),
  );
  const elapsedMs = useSharedValue(0);
  const done = useSharedValue(false);

  useFrameCallback(frameInfo => {
    if (done.value) {
      return;
    }
    const dtMs = frameInfo.timeSincePreviousFrame ?? 16.67;
    elapsedMs.value += dtMs;
    particles.value = stepBurst(particles.value, dtMs / 1000, elapsedMs.value);
    if (elapsedMs.value >= CELEBRATION_LIFETIME_MS) {
      done.value = true;
      runOnJS(onDone)();
    }
  });

  return (
    <Canvas
      // Full-screen transparent overlay per plan 4.1; not something
      // NativeWind's `className` transform reaches.
      // eslint-disable-next-line react-native/no-inline-styles
      style={{position: 'absolute', top: 0, left: 0, width, height}}
      pointerEvents="none">
      {Array.from({length: PARTICLE_COUNT}, (_, index) => (
        <CelebrationParticle key={index} index={index} particles={particles} />
      ))}
    </Canvas>
  );
}

interface CelebrationParticleProps {
  index: number;
  particles: SharedValue<Particle[]>;
}

function CelebrationParticle({index, particles}: CelebrationParticleProps): React.JSX.Element {
  // Shape, size, and color are fixed for a particle's whole lifetime (see
  // `createParticle`), so they're read once here rather than via a reactive
  // derived value -- only position/opacity need to update every frame.
  const initial = particles.value[index] as Particle;

  const cx = useDerivedValue(() => particles.value[index]?.x ?? initial.x);
  const cy = useDerivedValue(() => particles.value[index]?.y ?? initial.y);
  const opacity = useDerivedValue(() => particles.value[index]?.opacity ?? 0);
  const rectX = useDerivedValue(() => (particles.value[index]?.x ?? initial.x) - initial.size);
  const rectY = useDerivedValue(() => (particles.value[index]?.y ?? initial.y) - initial.size);

  if (initial.shape === 'circle') {
    return <Circle cx={cx} cy={cy} r={initial.size} color={initial.color} opacity={opacity} />;
  }
  return (
    <RoundedRect
      x={rectX}
      y={rectY}
      width={initial.size * 2}
      height={initial.size * 2}
      r={3}
      color={initial.color}
      opacity={opacity}
    />
  );
}
