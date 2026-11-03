// Misses on a level add up over every try until it is won, so a fresh set after a lost try can't wash them
// away. The count lives in the kit store, so leaving, coming back or reloading keeps it too.
import { LEVELS } from './levels.ts';

/** Misses so far by level id, for levels not yet won since the count began. */
export type MissLog = Record<number, number>;

/** Stored values can be anything an older version left behind, so each one is checked. */
export function cleanMisses(saved: unknown): MissLog {
  const clean: MissLog = {};
  if (typeof saved !== 'object' || saved === null) return clean;
  for (const { id } of LEVELS) {
    const count = (saved as Record<string, unknown>)[id];
    if (typeof count === 'number' && Number.isFinite(count) && count > 0) clean[id] = Math.floor(count);
  }
  return clean;
}

export const missesSoFar = (log: MissLog, id: number): number => log[id] ?? 0;

/** The count after one more miss on a level. */
export const addMiss = (log: MissLog, id: number): MissLog => ({ ...log, [id]: missesSoFar(log, id) + 1 });

/** A win settles the count, so the next play of the level, a replay, starts from nothing. */
export function settle(log: MissLog, id: number): MissLog {
  const rest = { ...log };
  delete rest[id];
  return rest;
}

/** Three stars only for a level won with no miss on any try, two for one or two, one for any other win. */
export const starsFor = (misses: number): number => (misses === 0 ? 3 : misses <= 2 ? 2 : 1);
