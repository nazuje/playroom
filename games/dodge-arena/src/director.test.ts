import { describe, expect, it } from 'vitest';
import type { Danger } from './dangers.ts';
import { dangerHits, stepDanger } from './dangers.ts';
import { newDirector, planFor, stepDirector } from './director.ts';
import { STAGES } from './stages.ts';
import { STEP, WARN_FLOOR, ARENA_RADIUS, RING_GAP } from './tuning.ts';

function simulate(seconds: number, stageIndex: number | null, seed: number, each: (dangers: Danger[], made: Danger[], clock: number) => void): void {
  const director = newDirector(seed);
  const stage = stageIndex === null ? null : (STAGES[stageIndex] ?? null);
  let dangers: Danger[] = [];
  const player = { x: 3, z: -2 };
  for (let clock = 0; clock < seconds; clock += STEP) {
    for (const danger of dangers) stepDanger(danger, STEP, player);
    dangers = dangers.filter(({ phase }) => phase !== 'done');
    const made = stepDirector(director, planFor(clock, stage), STEP, player, dangers);
    each(dangers, made, clock);
  }
}

describe('the director', () => {
  it('gives every danger at least the floor of warning, in every stage and late in an endless run', () => {
    for (const stageIndex of [0, 3, 7, 11]) {
      simulate(60, stageIndex, 3, (_dangers, made) => {
        for (const danger of made) expect(danger.warn).toBeGreaterThanOrEqual(WARN_FLOOR);
      });
    }
    simulate(700, null, 9, (_dangers, made) => {
      for (const danger of made) expect(danger.warn).toBeGreaterThanOrEqual(WARN_FLOOR);
    });
  });

  it('never makes anything that can touch the player at the moment it appears', () => {
    simulate(400, null, 5, (_dangers, made) => {
      for (const danger of made) expect(dangerHits(danger, 3, -2, 0)).toBe(false);
    });
  });

  it('starts bars with their circle clear of the player', () => {
    simulate(90, STAGES.findIndex(({ kinds }) => kinds.includes('bar')), 11, (_dangers, made) => {
      for (const danger of made) {
        if (danger.kind === 'bar') expect(Math.hypot(danger.x - 3, danger.z + 2)).toBeGreaterThan(danger.size);
      }
    });
  });

  it('starts slime far away from the player', () => {
    simulate(120, STAGES.findIndex(({ kinds }) => kinds.includes('slime')), 2, (_dangers, made) => {
      for (const danger of made) {
        if (danger.kind === 'slime') expect(Math.hypot(danger.x - 3, danger.z + 2)).toBeGreaterThan(ARENA_RADIUS * 0.6);
      }
    });
  });

  it('keeps dangers you may have to jump far enough apart to recharge', () => {
    let last = -Infinity;
    simulate(280, null, 7, (_dangers, made, clock) => {
      for (const danger of made) {
        if (danger.kind !== 'ring' && danger.kind !== 'beam') continue;
        expect(clock - last).toBeGreaterThanOrEqual(RING_GAP - 0.2);
        last = clock;
      }
    });
  });

  it('keeps stage dangers to the stage’s own list', () => {
    for (const [at, stage] of STAGES.entries()) {
      simulate(30, at, 4, (_dangers, made) => {
        for (const danger of made) expect(stage.kinds).toContain(danger.kind);
      });
    }
  });

  it('plays the same game from the same seed', () => {
    const list = (seed: number): string[] => {
      const seen: string[] = [];
      simulate(40, null, seed, (_d, made) => seen.push(...made.map((danger) => `${danger.kind}${danger.x}`)));
      return seen;
    };
    expect(list(5)).toEqual(list(5));
    expect(list(5)).not.toEqual(list(6));
  });
});
