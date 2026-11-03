import { describe, expect, it } from 'vitest';
import { LEVELS } from '../rules/levels.ts';
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
  it('keeps every patch and piece big enough, with nothing to scroll, on every level and screen', () => {
    for (const screen of SCREENS) {
      for (const level of LEVELS) {
        const sizes = fit(screen.width, screen.height - BAR, level.size, level.options.length, level.big);
        const where = `${screen.name} level ${level.id}`;
        expect(sizes.piece, where).toBeGreaterThanOrEqual(leastTarget(level.big));
        expect(sizes.cell, where).toBeGreaterThanOrEqual(leastTarget(level.big));
        expect(heightOf(sizes, level.size), where).toBeLessThanOrEqual(screen.height - BAR);
        expect(widthOf(sizes, level.size), where).toBeLessThanOrEqual(screen.width);
        expect(sizes.perRow * sizes.rows).toBeGreaterThanOrEqual(level.options.length);
      }
    }
  });

  it('puts six pieces in two rows on a phone and one row on a tablet', () => {
    expect(fit(390, 844 - BAR, 3, 6, false).rows).toBe(2);
    expect(fit(1024, 768 - BAR, 3, 6, false).rows).toBe(1);
  });
});
