export type Stars = 1 | 2 | 3;

/** How one empty car got filled: wrong taps first, and whether the idle nudge showed the answer. */
export interface BlankResult {
  misses: number;
  nudged: boolean;
}

/** A first-try answer is worth a whole point, one slip half, and more slips or a nudge nothing more. */
function blankScore({ misses, nudged }: BlankResult): number {
  const slips = nudged ? Math.max(misses, 1) : misses;
  if (slips === 0) return 1;
  return slips === 1 ? 0.5 : 0;
}

/** Up to 3 stars for a train. Every train earns at least one, because finishing is worth something. */
export function trainStars(blanks: readonly BlankResult[]): Stars {
  if (blanks.length === 0) return 3;
  const score = blanks.reduce((sum, blank) => sum + blankScore(blank), 0) / blanks.length;
  if (score === 1) return 3;
  return score >= 0.5 ? 2 : 1;
}

/** A level's stars are its trains' stars on average, rounded to the nearest. */
export function levelStars(trains: readonly Stars[]): Stars {
  if (trains.length === 0) return 1;
  const mean = trains.reduce<number>((sum, stars) => sum + stars, 0) / trains.length;
  return Math.min(3, Math.max(1, Math.round(mean))) as Stars;
}

const isStars = (value: unknown): value is Stars => value === 1 || value === 2 || value === 3;

/** Saved best stars per level. Old or broken values are dropped rather than trusted. */
export function readBest(saved: unknown): Record<number, Stars> {
  const best: Record<number, Stars> = {};
  if (typeof saved !== 'object' || saved === null) return best;
  for (const [level, stars] of Object.entries(saved)) {
    if (/^[1-9]\d*$/.test(level) && isStars(stars)) best[Number(level)] = stars;
  }
  return best;
}

/** The record after a level, which only ever goes up. */
export function bestAfter(best: Record<number, Stars>, level: number, stars: Stars): Record<number, Stars> {
  return { ...best, [level]: Math.max(best[level] ?? 0, stars) as Stars };
}
