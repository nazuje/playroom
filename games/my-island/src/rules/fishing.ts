import { COLLECTION, type Collectible } from '../data/collection.ts';
import { recordEvent } from './quests.ts';
import type { Island } from './state.ts';

/** Seconds for the fish to swim across the bar and back. */
export const SWIM_SECONDS = 2.6;
/** After this many misses the whole bar is green, so every child lands a fish. */
export const MISSES_TO_SURE = 3;

/** Where the fish is along the bar, from 0 to 1, after this long. It bobs back and forth forever: there is no rush. */
export function fishAt(seconds: number, swimSeconds = SWIM_SECONDS): number {
  const phase = (((seconds / swimSeconds) % 1) + 1) % 1;
  return phase < 0.5 ? phase * 2 : 2 - phase * 2;
}

export interface Zone {
  from: number;
  to: number;
}

/** The green part of the bar. It grows with every miss. */
export function zoneFor(misses: number, calm = false): Zone {
  const width = misses >= MISSES_TO_SURE ? 1 : Math.min(1, (calm ? 0.36 : 0.26) + misses * 0.2);
  const middle = 0.62;
  const from = Math.max(0, Math.min(1 - width, middle - width / 2));
  return { from, to: from + width };
}

export const inZone = (zone: Zone, at: number): boolean => at >= zone.from - 0.001 && at <= zone.to + 0.001;

const WEIGHT: Record<Collectible['rarity'], number> = { 1: 10, 2: 4, 3: 1.2, 4: 0.25 };

/** A weighted pick: the commoner a find, the likelier. */
export function pickWeighted(choices: readonly Collectible[], roll: number): Collectible | null {
  const total = choices.reduce((sum, item) => sum + WEIGHT[item.rarity], 0);
  let left = roll * total;
  for (const item of choices) {
    left -= WEIGHT[item.rarity];
    if (left < 0) return item;
  }
  return choices.at(-1) ?? null;
}

const FISH = COLLECTION.filter(({ category }) => category === 'fish');

/** Lands a fish in the book. Returns its id and whether it is new there. */
export function landFish(island: Island, roll: number): { id: string; first: boolean } {
  const fish = pickWeighted(FISH, roll) ?? FISH[0];
  const id = fish?.id ?? 'fish-little';
  const first = !island.book[id];
  island.book[id] = (island.book[id] ?? 0) + 1;
  island.shells += 1;
  recordEvent(island, { type: 'fish' });
  return { id, first };
}
