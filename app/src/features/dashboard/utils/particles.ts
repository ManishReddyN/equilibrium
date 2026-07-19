/**
 * Pure particle-physics helpers for `CompletionCelebration` (plan section 4.1:
 * "120 particles, teal/sage palette... gravity + drag simulated in a single
 * `useFrameCallback` on the UI thread; auto-unmount after 2.5s").
 *
 * Deliberately framework-free (no Reanimated/Skia imports) so it's fully unit
 * testable without a device/emulator -- see docs/DECISIONS.md for the Phase 4
 * testability-boundary decision: visual components (Skia Canvas + a single
 * `useFrameCallback`) stay thin, untested-by-render wiring around these
 * functions, which carry all the actual logic and get real Jest coverage.
 */

export type ParticleShape = 'circle' | 'roundedRect';

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  rotation: number;
  angularVelocity: number;
  size: number;
  color: string;
  shape: ParticleShape;
  opacity: number;
}

export interface CreateParticleOptions {
  originX: number;
  originY: number;
  palette: readonly string[];
  /** Injectable for deterministic tests; defaults to `Math.random`. */
  random?: () => number;
}

const MIN_SPEED = 260;
const MAX_SPEED = 620;
const MIN_SIZE = 4;
const MAX_SIZE = 10;
// Bias the burst upward so it reads as a "pop" rather than a symmetric
// explosion -- subtracted from the vertical component of every particle's
// initial velocity (screen y grows downward).
const UPWARD_BIAS = 200;

export function createParticle({
  originX,
  originY,
  palette,
  random = Math.random,
}: CreateParticleOptions): Particle {
  if (palette.length === 0) {
    throw new Error('createParticle: palette must not be empty');
  }
  const angle = random() * Math.PI * 2;
  const speed = MIN_SPEED + random() * (MAX_SPEED - MIN_SPEED);
  return {
    x: originX,
    y: originY,
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed - UPWARD_BIAS,
    rotation: random() * Math.PI * 2,
    angularVelocity: (random() - 0.5) * 6,
    size: MIN_SIZE + random() * (MAX_SIZE - MIN_SIZE),
    color: palette[Math.floor(random() * palette.length)] as string,
    shape: random() > 0.5 ? 'circle' : 'roundedRect',
    opacity: 1,
  };
}

export function createBurst(count: number, options: CreateParticleOptions): Particle[] {
  return Array.from({length: count}, () => createParticle(options));
}

/** Total celebration lifetime -- plan: "auto-unmount after 2.5s". */
export const CELEBRATION_LIFETIME_MS = 2500;
/** Particles hold full opacity until this many ms in, then fade to 0 by `CELEBRATION_LIFETIME_MS`. */
const FADE_START_MS = 1500;

const GRAVITY = 1400; // px/s^2, downward (positive y)
const DRAG_PER_SECOND = 1.2; // fraction of velocity shed per second of flight

/**
 * Advances one particle by `dtSeconds` of simulated time. `elapsedMs` is the
 * running time since the burst started (used only to drive the fade-out --
 * position/velocity integration is self-contained and frame-rate independent
 * given a correct `dtSeconds`).
 */
export function stepParticle(particle: Particle, dtSeconds: number, elapsedMs: number): Particle {
  const drag = Math.max(0, 1 - DRAG_PER_SECOND * dtSeconds);
  const vx = particle.vx * drag;
  const vy = (particle.vy + GRAVITY * dtSeconds) * drag;
  const fadeWindow = CELEBRATION_LIFETIME_MS - FADE_START_MS;
  const opacity =
    elapsedMs <= FADE_START_MS
      ? 1
      : Math.max(0, 1 - (elapsedMs - FADE_START_MS) / fadeWindow);

  return {
    ...particle,
    x: particle.x + vx * dtSeconds,
    y: particle.y + vy * dtSeconds,
    vx,
    vy,
    rotation: particle.rotation + particle.angularVelocity * dtSeconds,
    opacity,
  };
}

export function stepBurst(particles: Particle[], dtSeconds: number, elapsedMs: number): Particle[] {
  return particles.map(particle => stepParticle(particle, dtSeconds, elapsedMs));
}
