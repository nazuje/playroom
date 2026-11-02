import type { Kind } from './dangers.ts';

export interface Stage {
  id: number;
  kinds: readonly Kind[];
  /** Seconds to survive. */
  goal: number;
  /** How hard the numbers are: warning time, speed and size. Past 1 is only for the very end. */
  difficulty: number;
  /** Seconds between new dangers. */
  gap: number;
}

/**
 * The first six teach one danger each: the ones you run from first, then the two you jump.
 * Jumping stages space their dangers out, because missing a jump is the easiest way to lose.
 * The rest combine them, up to something a grown-up finds really hard.
 */
export const STAGES: readonly Stage[] = [
  { id: 1, kinds: ['meteor'], goal: 20, difficulty: 0, gap: 1.5 },
  { id: 2, kinds: ['boulder'], goal: 20, difficulty: 0.05, gap: 1.5 },
  { id: 3, kinds: ['bar', 'meteor'], goal: 20, difficulty: 0.1, gap: 1.5 },
  { id: 4, kinds: ['slime', 'meteor'], goal: 25, difficulty: 0.15, gap: 1.6 },
  { id: 5, kinds: ['beam'], goal: 25, difficulty: 0.2, gap: 6 },
  { id: 6, kinds: ['ring'], goal: 25, difficulty: 0.25, gap: 6 },
  { id: 7, kinds: ['meteor', 'boulder', 'beam'], goal: 30, difficulty: 0.4, gap: 1 },
  { id: 8, kinds: ['ring', 'bar', 'meteor'], goal: 35, difficulty: 0.5, gap: 1 },
  { id: 9, kinds: ['beam', 'slime', 'boulder'], goal: 40, difficulty: 0.6, gap: 0.9 },
  { id: 10, kinds: ['ring', 'boulder', 'meteor', 'slime'], goal: 45, difficulty: 0.75, gap: 0.8 },
  { id: 11, kinds: ['meteor', 'boulder', 'beam', 'ring', 'bar', 'slime'], goal: 50, difficulty: 0.9, gap: 0.75 },
  { id: 12, kinds: ['meteor', 'boulder', 'beam', 'ring', 'bar', 'slime'], goal: 60, difficulty: 1, gap: 0.7 },
];

/** Stars for a finished stage: one for lasting, one for one bonk at most, and one for none. */
export function starsFor(hits: number): number {
  if (hits === 0) return 3;
  return hits === 1 ? 2 : 1;
}
