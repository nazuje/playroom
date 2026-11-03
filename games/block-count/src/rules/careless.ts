// The careless eye: a child in a hurry who counts only the blocks they can see, or on "fill the box" only the
// empty spots they can see from above. After a miss they nudge the number, one more, one less, two more, two
// less, and so on. On a map question they read the stack in a mirror first, then grab any card. The level tests
// use this to prove the staircase: it wins the first world, and the late levels are out of its reach, and the
// careless bot plays it on the real game.
import type { Level } from './levels.ts';
import { mirrored, openTops, sameHeights } from './stack.ts';

/** The quick count: what shows, or the empty tops. */
export const quickCount = (level: Level): number => (level.ask === 'fill' ? openTops(level.heights, level.box) : level.seen);

/** The numbers a quick count nudges through, nearest first: n, n+1, n−1, n+2, n−2... among those offered. */
export function nudgesFrom(start: number, numbers: readonly number[]): number[] {
  const offered = new Set(numbers);
  const order: number[] = [];
  for (let step = 0; order.length < offered.size; step += 1) {
    for (const value of step === 0 ? [start] : [start + step, start - step]) if (offered.has(value)) order.push(value);
    if (step > 100) break;
  }
  return order;
}

/** The order the careless eye tries answers in: numbers, or map places. Ties among maps go by the random source. */
export function carelessOrder(level: Level, random: () => number): number[] {
  if (level.answer !== 'maps') return nudgesFrom(quickCount(level), level.numbers);
  const mirror = mirrored(level.heights);
  const first = level.maps.findIndex((map) => sameHeights(map, mirror));
  const rest = level.maps.map((_, at) => at).filter((at) => at !== first);
  const tiebreak = rest.map(() => random());
  return [first, ...rest.map((at, place) => ({ at, roll: tiebreak[place] })).sort((a, b) => a.roll - b.roll).map(({ at }) => at)];
}

/** How many misses the careless eye makes before it finds the answer to one puzzle. */
export const carelessMisses = (level: Level, random: () => number): number => carelessOrder(level, random).indexOf(level.truth);
