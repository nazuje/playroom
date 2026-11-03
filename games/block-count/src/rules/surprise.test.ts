import { describe, expect, it } from 'vitest';
import { LEVELS, SET } from './levels.ts';
import { GOLDEN_ODDS, goldenFor } from './surprise.ts';

describe('the golden block', () => {
  const goes = LEVELS.flatMap(({ id }) => Array.from({ length: 200 }, (_, go) => goldenFor(id, go)));

  it('turns up in about one set in eight', () => {
    const share = goes.filter((one) => one !== null).length / goes.length;
    expect(share).toBeGreaterThan(GOLDEN_ODDS - 0.02);
    expect(share).toBeLessThan(GOLDEN_ODDS + 0.02);
  });

  it('can be in any puzzle of the set, and the same go always gets the same', () => {
    expect(new Set(goes.filter((one) => one !== null))).toEqual(new Set(Array.from({ length: SET }, (_, at) => at)));
    expect(goldenFor(5, 12)).toBe(goldenFor(5, 12));
  });
});
