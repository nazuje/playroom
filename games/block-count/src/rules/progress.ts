import { LEVELS, levelById } from './levels.ts';

export interface Progress {
  /** Best stars by level id. A finished level always has at least 1. */
  stars: Record<number, number>;
  /** Levels passed with the skip button. They stay unfinished but open the next one. */
  skipped: number[];
}

export const emptyProgress = (): Progress => ({ stars: {}, skipped: [] });

const asStars = (value: unknown): number =>
  typeof value === 'number' && Number.isFinite(value) ? Math.max(0, Math.min(3, Math.floor(value))) : 0;

/** Stored values can be anything an older version left behind, so each one is checked. */
export function cleanProgress(saved: unknown): Progress {
  const raw = (typeof saved === 'object' && saved !== null ? saved : {}) as Record<string, unknown>;
  const stars = (typeof raw.stars === 'object' && raw.stars !== null ? raw.stars : {}) as Record<string, unknown>;
  const clean = emptyProgress();
  for (const { id } of LEVELS) {
    const best = asStars(stars[id]);
    if (best > 0) clean.stars[id] = best;
  }
  clean.skipped = LEVELS.flatMap(({ id }) => (Array.isArray(raw.skipped) && raw.skipped.includes(id) ? [id] : []));
  return clean;
}

export const isDone = (progress: Progress, id: number): boolean => (progress.stars[id] ?? 0) > 0;

/** Levels open in order. Finishing or skipping one opens the next, and nothing ever closes again. */
export function isOpen(progress: Progress, id: number): boolean {
  if (!levelById(id)) return false;
  const before = id - 1;
  return before < 1 || isDone(progress, before) || progress.skipped.includes(before);
}

/** Keeps the best result. A worse run never takes anything away. */
export function addWin(before: Progress, id: number, stars: number): Progress {
  return { ...before, stars: { ...before.stars, [id]: Math.max(before.stars[id] ?? 0, stars) } };
}

export const addSkip = (before: Progress, id: number): Progress =>
  before.skipped.includes(id) ? before : { ...before, skipped: [...before.skipped, id] };

/** The next level to point at, or null when every level is done. */
export function nextLevel(progress: Progress): number | null {
  const waiting = LEVELS.filter(({ id }) => !isDone(progress, id) && isOpen(progress, id));
  return (waiting.find(({ id }) => !progress.skipped.includes(id)) ?? waiting[0])?.id ?? null;
}

export const totalStars = (progress: Progress): number => Object.values(progress.stars).reduce((sum, stars) => sum + stars, 0);
