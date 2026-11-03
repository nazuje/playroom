import { describe, expect, it } from 'vitest';
import { LEVELS } from '../rules/levels.ts';
import { fit, heightOf, leastTarget, widthOf, type Layout } from './fit.ts';

// The top bar takes about 76px; the screen check measures the real one.
const BAR = 76;
const SCREENS = [
  { name: 'phone', width: 390, height: 844 },
  { name: 'small phone', width: 360, height: 640 },
  { name: 'tablet', width: 1024, height: 768 },
  { name: 'tablet standing', width: 768, height: 1024 },
];

const layoutOf = (level: (typeof LEVELS)[number]): Layout => ({ kind: level.kind, options: level.options, big: level.big, helper: level.helper !== 'none' });

describe('fitting the screen', () => {
  it('keeps every option big enough and the target bigger, with nothing to scroll, on every level and screen', () => {
    for (const screen of SCREENS) {
      for (const level of LEVELS) {
        const layout = layoutOf(level);
        const sizes = fit(screen.width, screen.height - BAR, layout);
        const where = `${screen.name} level ${level.id}`;
        expect(sizes.option, where).toBeGreaterThanOrEqual(leastTarget(level.big));
        expect(sizes.target, where).toBeGreaterThanOrEqual(level.kind === 'pairs' ? 110 : 150);
        if (level.kind === 'match') expect(sizes.target, where).toBeGreaterThan(sizes.option);
        expect(heightOf(sizes), where).toBeLessThanOrEqual(screen.height - BAR);
        expect(widthOf(sizes, layout), where).toBeLessThanOrEqual(screen.width);
        expect(sizes.perRow * sizes.rows).toBeGreaterThanOrEqual(level.options);
      }
    }
  });

  it('puts five options in two rows on a phone and one row on a tablet', () => {
    const five: Layout = { kind: 'match', options: 5, big: false, helper: false };
    expect(fit(390, 844 - BAR, five).rows).toBe(2);
    expect(fit(1024, 768 - BAR, five).rows).toBe(1);
  });
});
