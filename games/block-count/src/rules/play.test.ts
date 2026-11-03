import { describe, expect, it } from 'vitest';
import { levelFor, missLimit, setFor, type Level } from './levels.ts';
import { addMiss, cleanMisses, missesSoFar, settle, starsFor } from './misses.ts';
import { answer, puzzleOf, startPlay, type Play } from './play.ts';
import { addSkip, addWin, cleanProgress, emptyProgress, isOpen, nextLevel } from './progress.ts';

const wrongFor = (level: Level, skip: number[] = []): number =>
  (level.answer === 'maps' ? level.maps.map((_, at) => at) : level.numbers).find((pick) => pick !== level.truth && !skip.includes(pick)) as number;

function step(play: Play, pick: number): Play {
  const result = answer(play, pick);
  if (!result) throw new Error(`No answer for ${pick}`);
  return result.play;
}

describe('a try at a level', () => {
  it('moves through the set with right answers and wins on the last', () => {
    let play = startPlay(setFor(11, 0));
    for (let at = 0; at < 3; at += 1) {
      expect(play.at).toBe(at);
      play = step(play, puzzleOf(play).truth);
    }
    expect(play.won).toBe(true);
    expect(play.misses).toBe(0);
  });

  it('ends a picker try on the 4th miss across the set, and a map try on the 3rd', () => {
    let play = startPlay(setFor(11, 0));
    const tried: number[] = [];
    for (let miss = 1; miss <= 4; miss += 1) {
      const pick = wrongFor(puzzleOf(play), tried);
      tried.push(pick);
      play = step(play, pick);
      expect(play.failed).toBe(miss === 4);
    }
    expect(missLimit(setFor(21, 0)[0])).toBe(3);
  });

  it('never fails on the first world', () => {
    let play = startPlay(setFor(1, 0));
    const level = puzzleOf(play);
    for (const pick of level.numbers.filter((value) => value !== level.truth)) play = step(play, pick);
    expect(play.failed).toBe(false);
    expect(missLimit(level)).toBe(Infinity);
  });

  it('ignores the same wrong answer twice, answers not offered, and anything after the end', () => {
    const level = levelFor(12, 0) as Level;
    let play = startPlay([level]);
    const wrong = wrongFor(level);
    play = step(play, wrong);
    expect(answer(play, wrong)).toBeNull();
    expect(answer(play, 999)).toBeNull();
    play = step(play, level.truth);
    expect(answer(play, level.truth)).toBeNull();
  });
});

describe('stars and progress', () => {
  it('gives 3 stars only with no misses, 2 for one or two, 1 for more', () => {
    expect([0, 1, 2, 3, 9].map(starsFor)).toEqual([3, 2, 2, 1, 1]);
  });

  it('keeps misses across tries until a win settles them', () => {
    let log = addMiss(addMiss({}, 4), 4);
    expect(missesSoFar(log, 4)).toBe(2);
    log = settle(log, 4);
    expect(missesSoFar(log, 4)).toBe(0);
    expect(cleanMisses({ 4: 2, 99: 3, 5: 'x', 6: -1 })).toEqual({ 4: 2 });
  });

  it('opens levels in order, keeps the best stars, and skips open the next', () => {
    let progress = emptyProgress();
    expect(isOpen(progress, 1)).toBe(true);
    expect(isOpen(progress, 2)).toBe(false);
    progress = addWin(progress, 1, 2);
    progress = addWin(progress, 1, 1);
    expect(progress.stars[1]).toBe(2);
    expect(isOpen(progress, 2)).toBe(true);
    progress = addSkip(progress, 2);
    expect(isOpen(progress, 3)).toBe(true);
    expect(nextLevel(progress)).toBe(3);
    expect(cleanProgress({ stars: { 1: 7, 2: 'x' }, skipped: [2, 'y'] })).toEqual({ stars: { 1: 3 }, skipped: [2] });
  });
});
