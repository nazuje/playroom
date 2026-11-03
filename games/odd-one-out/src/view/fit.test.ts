import { describe, expect, it } from 'vitest';
import { LEVELS } from '../rules/levels.ts';
import { placeOf } from '../rules/solve.ts';
import { fit, heightOf, leastTarget, widthOf } from './fit.ts';

// The top bar takes about 80px; the screen check measures the real one.
const BAR = 80;
const SCREENS = [
  { name: 'phone', width: 390, height: 844 },
  { name: 'small phone', width: 360, height: 640 },
  { name: 'tablet', width: 1024, height: 768 },
  { name: 'tablet standing', width: 768, height: 1024 },
];

describe('fitting the screen', () => {
  it('keeps every pad big enough, with nothing to scroll, on every level and screen', () => {
    for (const screen of SCREENS) {
      for (const level of LEVELS) {
        const sizes = fit(screen.width, screen.height - BAR, level.count);
        const where = `${screen.name} level ${level.id}`;
        expect(sizes.size, where).toBeGreaterThanOrEqual(leastTarget(level.big));
        expect(heightOf(sizes), where).toBeLessThanOrEqual(screen.height - BAR);
        expect(widthOf(sizes), where).toBeLessThanOrEqual(screen.width);
        expect(sizes.spots).toHaveLength(level.count);
      }
    }
  });

  it('never lets two pads overlap', () => {
    for (const screen of SCREENS) {
      for (const count of [4, 5, 6]) {
        const { spots, size } = fit(screen.width, screen.height - BAR, count);
        for (const [at, [x, y]] of spots.entries()) {
          for (const [x2, y2] of spots.slice(at + 1)) expect(Math.hypot(x - x2, y - y2), `${screen.name} ${count}`).toBeGreaterThanOrEqual(size);
        }
      }
    }
  });

  it('puts the pads in the rows and columns the solver reads groups from', () => {
    for (const count of [5, 6]) {
      for (const screen of SCREENS) {
        const { spots } = fit(screen.width, screen.height - BAR, count);
        const rows = [...new Set(spots.map(([, y]) => y))].sort((a, b) => a - b);
        const cols = [...new Set(spots.map(([x]) => x))].sort((a, b) => a - b);
        spots.forEach(([x, y], at) => {
          expect(rows.indexOf(y)).toBe(placeOf(at, count).row);
          expect(cols.indexOf(x)).toBe(placeOf(at, count).col);
        });
      }
    }
  });

  it('puts four in a square on a phone and in a row on a tablet', () => {
    expect(fit(390, 844 - BAR, 4).shape).toBe('square');
    expect(fit(1024, 768 - BAR, 4).shape).toBe('row');
  });
});
