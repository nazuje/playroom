import { describe, expect, it } from 'vitest';
import { ghostPath } from './demo.ts';
import { buildLevel } from './level.ts';
import { DEMOS, PLANS } from './levels.ts';
import { HERO_H, TILE } from './tuning.ts';

const landedOn = (rows: number, rowsUp: number): number => (rows - 1 - rowsUp) * TILE - HERO_H;

describe('the wordless demonstrations', () => {
  it('shows a wall kick on level 3 that lands on the ledge above the rough wall', () => {
    const level = buildLevel(PLANS[2]!);
    const path = ghostPath(level, DEMOS[3]!);
    expect(path.some((frame) => frame.kicked)).toBe(true);
    expect(path.some((frame) => frame.sliding)).toBe(true);
    const end = path.at(-1)!;
    expect(end.ground).toBe(true);
    expect(end.y).toBeCloseTo(landedOn(level.rows, 14));
  });

  it('shows a dash on level 8 that crosses the gap to the high ledge', () => {
    const level = buildLevel(PLANS[7]!);
    const path = ghostPath(level, DEMOS[8]!);
    expect(path.some((frame) => frame.dashing)).toBe(true);
    const end = path.at(-1)!;
    expect(end.ground).toBe(true);
    expect(end.y).toBeCloseTo(landedOn(level.rows, 9));
    expect(end.x).toBeGreaterThan(10 * TILE - 6);
  });
});
