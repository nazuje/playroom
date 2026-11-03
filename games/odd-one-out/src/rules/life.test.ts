import { describe, expect, it } from 'vitest';
import { LEVEL_COUNT } from './levels.ts';
import { LIFE, lifeEarned, lifeOf } from './life.ts';
import { addSkip, addWin, emptyProgress } from './progress.ts';

describe('pond life', () => {
  it('has one different friend for every level', () => {
    expect(LIFE).toHaveLength(LEVEL_COUNT);
    expect(new Set(LIFE).size).toBe(LIFE.length);
  });

  it('grows by one friend for each finished level, never for a skipped one', () => {
    let progress = emptyProgress();
    expect(lifeEarned(progress)).toEqual([]);
    progress = addWin(progress, 1, 1);
    progress = addSkip(progress, 2);
    progress = addWin(progress, 3, 3);
    expect(lifeEarned(progress)).toEqual([lifeOf(1), lifeOf(3)]);
  });
});
