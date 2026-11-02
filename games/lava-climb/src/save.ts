export interface Progress {
  /** Best stars for each level, by index. 0 means not finished. */
  stars: number[];
  /** Best time for each level, in seconds. 0 means not finished. */
  best: number[];
  /** How many levels are open, always at least 1. */
  open: number;
  /** Every singe ever, a badge to be proud of. */
  singes: number;
  /** Indexes of the levels whose hidden gem has been found. */
  secrets: number[];
}

export const emptyProgress = (levels: number): Progress => ({
  stars: new Array<number>(levels).fill(0),
  best: new Array<number>(levels).fill(0),
  open: 1,
  singes: 0,
  secrets: [],
});

const asCount = (value: unknown, most: number): number => (typeof value === 'number' && Number.isFinite(value) ? Math.max(0, Math.min(most, Math.floor(value))) : 0);

const asSeconds = (value: unknown): number => (typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : 0);

/** Stored values can be anything an older version left behind, so each one is checked. */
export function cleanProgress(saved: unknown, levels: number): Progress {
  const clean = emptyProgress(levels);
  if (typeof saved !== 'object' || saved === null) return clean;
  const { stars, best, open, singes, secrets } = saved as Partial<Record<keyof Progress, unknown>>;
  if (Array.isArray(stars)) clean.stars = clean.stars.map((_, index) => asCount(stars[index], 3));
  if (Array.isArray(best)) clean.best = clean.best.map((_, index) => asSeconds(best[index]));
  clean.open = Math.max(1, asCount(open, levels));
  clean.singes = asCount(singes, Number.MAX_SAFE_INTEGER);
  if (Array.isArray(secrets)) clean.secrets = [...new Set(secrets.filter((index): index is number => Number.isInteger(index) && index >= 0 && index < levels))];
  return clean;
}

export interface Win {
  index: number;
  stars: number;
  seconds: number;
  secret: boolean;
}

/** Keeps the best of everything. A worse run never takes anything away. */
export function addWin(before: Progress, win: Win): Progress {
  const { index, stars, seconds, secret } = win;
  const levels = before.stars.length;
  return {
    ...before,
    stars: before.stars.map((best, at) => (at === index ? Math.max(best, stars) : best)),
    best: before.best.map((best, at) => (at === index ? (best === 0 ? seconds : Math.min(best, seconds)) : best)),
    open: Math.min(levels, Math.max(before.open, index + 2)),
    secrets: secret && !before.secrets.includes(index) ? [...before.secrets, index] : before.secrets,
  };
}

export const addSinge = (before: Progress): Progress => ({ ...before, singes: before.singes + 1 });

/** Skipping opens the next level and leaves this one unfinished, ready to come back to. */
export const addSkip = (before: Progress, index: number): Progress => ({ ...before, open: Math.min(before.stars.length, Math.max(before.open, index + 2)) });

export const totalStars = (progress: Progress): number => progress.stars.reduce((sum, stars) => sum + stars, 0);

export const SKIP_AFTER = 3;
