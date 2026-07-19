import {describe, expect, it} from '@jest/globals';

import {
  CELEBRATION_LIFETIME_MS,
  createBurst,
  createParticle,
  stepBurst,
  stepParticle,
  type Particle,
} from './particles';

const palette = ['#0D9488', '#2DD4BF', '#5EEAD4', '#84A98C', '#52796F'] as const;

/** Deterministic stand-in for `Math.random` -- cycles through a fixed sequence. */
function sequenceRandom(values: number[]): () => number {
  let i = 0;
  return () => {
    const value = values[i % values.length] as number;
    i += 1;
    return value;
  };
}

describe('createParticle', () => {
  it('starts at the given origin with full opacity', () => {
    const particle = createParticle({originX: 100, originY: 200, palette});
    expect(particle.x).toBe(100);
    expect(particle.y).toBe(200);
    expect(particle.opacity).toBe(1);
  });

  it('picks a color from the palette', () => {
    for (let i = 0; i < 20; i += 1) {
      const particle = createParticle({originX: 0, originY: 0, palette});
      expect(palette).toContain(particle.color);
    }
  });

  it('picks one of exactly two shapes', () => {
    for (let i = 0; i < 20; i += 1) {
      const particle = createParticle({originX: 0, originY: 0, palette});
      expect(['circle', 'roundedRect']).toContain(particle.shape);
    }
  });

  it('is deterministic given an injected random function', () => {
    const a = createParticle({originX: 0, originY: 0, palette, random: sequenceRandom([0.25])});
    const b = createParticle({originX: 0, originY: 0, palette, random: sequenceRandom([0.25])});
    expect(a).toEqual(b);
  });

  it('throws on an empty palette rather than silently picking `undefined`', () => {
    expect(() => createParticle({originX: 0, originY: 0, palette: []})).toThrow();
  });
});

describe('createBurst', () => {
  it('creates exactly `count` particles', () => {
    const burst = createBurst(120, {originX: 50, originY: 50, palette});
    expect(burst).toHaveLength(120);
  });
});

describe('stepParticle', () => {
  const origin: Particle = {
    x: 0,
    y: 0,
    vx: 100,
    vy: -100,
    rotation: 0,
    angularVelocity: 1,
    size: 6,
    color: '#0D9488',
    shape: 'circle',
    opacity: 1,
  };

  it('advances position in the direction of velocity', () => {
    const next = stepParticle(origin, 1 / 60, 0);
    expect(next.x).toBeGreaterThan(origin.x);
    // Initial upward velocity (-100) plus one frame of gravity should still
    // move the particle upward (negative y) over a single 1/60s step.
    expect(next.y).toBeLessThan(origin.y);
  });

  it('applies gravity: vertical velocity increases (becomes more downward) over time', () => {
    let particle = origin;
    for (let i = 0; i < 30; i += 1) {
      particle = stepParticle(particle, 1 / 60, (i / 60) * 1000);
    }
    expect(particle.vy).toBeGreaterThan(origin.vy);
  });

  it('applies drag: speed decays relative to a driftless (no-gravity, no-drag) projection', () => {
    const next = stepParticle(origin, 1 / 60, 0);
    // Drag scales down vx every step; with no horizontal force besides drag,
    // vx should shrink in magnitude.
    expect(Math.abs(next.vx)).toBeLessThan(Math.abs(origin.vx));
  });

  it('advances rotation by angularVelocity * dt', () => {
    const next = stepParticle(origin, 0.5, 0);
    expect(next.rotation).toBeCloseTo(origin.rotation + origin.angularVelocity * 0.5);
  });

  it('holds full opacity before the fade window starts', () => {
    const next = stepParticle(origin, 1 / 60, 500);
    expect(next.opacity).toBe(1);
  });

  it('fades to 0 by the end of the celebration lifetime', () => {
    const next = stepParticle(origin, 1 / 60, CELEBRATION_LIFETIME_MS);
    expect(next.opacity).toBe(0);
  });

  it('never returns negative opacity past the lifetime', () => {
    const next = stepParticle(origin, 1 / 60, CELEBRATION_LIFETIME_MS + 1000);
    expect(next.opacity).toBe(0);
  });

  it('interpolates opacity partway through the fade window', () => {
    const midFade = 1500 + (CELEBRATION_LIFETIME_MS - 1500) / 2;
    const next = stepParticle(origin, 1 / 60, midFade);
    expect(next.opacity).toBeGreaterThan(0);
    expect(next.opacity).toBeLessThan(1);
  });
});

describe('stepBurst', () => {
  it('steps every particle in the array', () => {
    const burst = createBurst(10, {originX: 0, originY: 0, palette});
    const next = stepBurst(burst, 1 / 60, 0);
    expect(next).toHaveLength(10);
    next.forEach((particle, index) => {
      expect(particle.x).not.toBe(burst[index]?.x);
    });
  });
});
