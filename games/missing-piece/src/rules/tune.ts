// The quilt's tune: one note per patch, played in reading order when the last piece goes in. Patches that look
// alike in the rules sound alike, so a row of the same shape is one note held, counts going up climb a scale, and
// a "once each" grid plays every note once in each row.
import { bitCount, type Cell } from './cells.ts';
import { movingRules } from './play.ts';
import type { Level } from './levels.ts';

/** A major pentatonic scale over two octaves, so any mix of notes sounds friendly. */
export const SCALE: readonly number[] = [262, 294, 330, 392, 440, 523, 587, 659, 784, 880];

/** Where each patch's value sits among the values its rule uses, 0 for the lowest. */
function rank(level: Level, attr: keyof Cell, cell: Cell): number {
  if (attr === 'marks') return bitCount(cell.marks) - 1;
  const used = [...new Set(level.cells.map((one) => one[attr]))].sort((a, b) => a - b);
  return used.indexOf(cell[attr]);
}

/** The scale step for each patch, row by row. */
export function tuneFor(level: Level): number[] {
  const rules = movingRules(level);
  return level.cells.map((cell) => {
    const step = rules.reduce((sum, attr, at) => sum + rank(level, attr, cell) * (at === 0 ? 1 : at === 1 ? 2 : 1), 0);
    return Math.max(0, Math.min(SCALE.length - 1, step + (rules.length > 1 ? 0 : 2)));
  });
}
