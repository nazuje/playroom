// Misses on a level add up over every try until it is won, so a fresh puzzle after a lost try can't wash them
// away. On the mirror world the ↻ button counts as a hint, kept the same way. Both live in the kit store, so
// leaving, coming back or reloading keeps them too.
import { LEVELS } from './levels.ts';

/** Misses so far by level id, for levels not yet won since the count began. */
export type MissLog = Record<number, number>;

/** Levels where ↻ was used as a hint since the level was last won. */
export type HintLog = number[];

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

export const cleanHints = (saved: unknown): HintLog =>
  LEVELS.flatMap(({ id }) => (Array.isArray(saved) && saved.includes(id) ? [id] : []));

export const missesSoFar = (log: MissLog, id: number): number => log[id] ?? 0;

/** The count after one more miss on a level. */
export const addMiss = (log: MissLog, id: number): MissLog => ({ ...log, [id]: missesSoFar(log, id) + 1 });

export const addHint = (log: HintLog, id: number): HintLog => (log.includes(id) ? log : [...log, id]);

/** A win settles the count, so the next play of the level, a replay, starts from nothing. */
export function settle(log: MissLog, id: number): MissLog {
  const rest = { ...log };
  delete rest[id];
  return rest;
}

export const settleHint = (log: HintLog, id: number): HintLog => log.filter((one) => one !== id);

/**
 * Three stars only for a level won with no miss on any try and no hint, two for one or two misses or a hint, one
 * for any other win.
 */
export const starsFor = (misses: number, hinted = false): number => (misses === 0 && !hinted ? 3 : misses <= 2 ? 2 : 1);
