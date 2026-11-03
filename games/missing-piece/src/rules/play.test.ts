import { describe, expect, it } from 'vitest';
import { levelFor, missLimit, SET, setFor, type Level } from './levels.ts';
import { addMiss, cleanMisses, missesSoFar, settle, starsFor } from './misses.ts';
import { answer, linesFor, movingRules, startPlay } from './play.ts';
import { addSkip, addWin, cleanProgress, emptyProgress, isOpen, nextLevel, totalStars } from './progress.ts';

const level = (id: number, go = 0): Level => levelFor(id, go) as Level;
const wrongs = (one: Level) => one.options.map((_, at) => at).filter((at) => at !== one.answer);

const one = (level: Level) => [level];

describe('answering', () => {
  it('wins with the right piece and ignores anything after', () => {
    const first = level(1);
    const right = answer(startPlay(one(first)), first.answer)!;
    expect(right.right).toBe(true);
    expect(right.play.won).toBe(true);
    expect(answer(right.play, first.answer)).toBeNull();
  });

  it('moves through a set of three puzzles, and only the last one wins', () => {
    const set = setFor(6, 2);
    expect(set).toHaveLength(SET);
    expect(set.map((puzzle) => puzzle.go)).toEqual([6, 7, 8]);
    let play = startPlay(set);
    for (let at = 0; at < SET; at += 1) {
      const result = answer(play, set[at].answer)!;
      expect(result.right).toBe(true);
      expect(result.solvedOne).toBe(at < SET - 1);
      expect(result.play.won).toBe(at === SET - 1);
      play = result.play;
    }
    expect(play.at).toBe(SET - 1);
  });

  it('counts a wrong piece as a miss, dims it, says which rule it breaks, and ignores it the second time', () => {
    const first = level(1);
    const [wrong] = wrongs(first);
    const result = answer(startPlay(one(first)), wrong)!;
    expect(result.right).toBe(false);
    expect(result.play.misses).toBe(1);
    expect(result.play.tried).toEqual([wrong]);
    expect(first.attrs).toContain(result.broken);
    expect(answer(result.play, wrong)).toBeNull();
  });

  it('never ends a try on the first world, which is for age 4, though every miss still counts', () => {
    for (const id of [1, 2, 3, 4, 5]) {
      const set = setFor(id, 1);
      expect(missLimit(set[0])).toBe(Infinity);
      let play = startPlay(set);
      for (const [at, puzzle] of set.entries()) {
        for (const wrong of wrongs(puzzle)) play = answer(play, wrong)!.play;
        expect(play.failed).toBe(false);
        expect(play.misses).toBe((at + 1) * (puzzle.options.length - 1));
        play = answer(play, puzzle.answer)!.play;
      }
      expect(play.won).toBe(true);
    }
  });

  it('ends a try after 2 misses with three pieces and 3 with more, counted over the whole set, from the second world on', () => {
    for (const id of [6, 9, 16, 21]) {
      const set = setFor(id, 0);
      const limit = missLimit(set[0]);
      expect(limit).toBe(set[0].options.length === 3 ? 2 : 3);
      // One miss on the first puzzle, then the rest on the second: the try still ends at the limit.
      let play = answer(startPlay(set), wrongs(set[0])[0])!.play;
      play = answer(play, set[0].answer)!.play;
      expect(play.misses).toBe(1);
      expect(play.tried).toEqual([]);
      const off = wrongs(set[1]);
      for (let miss = 1; miss < limit; miss += 1) {
        expect(play.failed).toBe(false);
        play = answer(play, off[miss - 1])!.play;
      }
      expect(play.failed).toBe(true);
      expect(answer(play, set[1].answer)).toBeNull();
    }
  });

  it('shakes the line a broken rule runs along', () => {
    const rows = level(1);
    expect(linesFor(rows, movingRules(rows)[0])).toEqual({ rows: [1], cols: [] });
    const cols = level(2);
    expect(linesFor(cols, movingRules(cols)[0])).toEqual({ rows: [], cols: [1] });
    const latin = level(16);
    expect(linesFor(latin, movingRules(latin)[0])).toEqual({ rows: [2], cols: [2] });
  });

  it('gives stars for every miss since the level was last won, so a retry never buys three', () => {
    expect([0, 1, 2, 3, 4, 9].map(starsFor)).toEqual([3, 2, 2, 1, 1, 1]);
  });
});

describe('misses and progress', () => {
  it('adds misses up over every try until a win settles them', () => {
    let log = addMiss({}, 3);
    log = addMiss(log, 3);
    log = addMiss(log, 5);
    expect(missesSoFar(log, 3)).toBe(2);
    expect(settle(log, 3)).toEqual({ 5: 1 });
    expect(cleanMisses(JSON.parse(JSON.stringify(log)))).toEqual({ 3: 2, 5: 1 });
    expect(cleanMisses({ 1: -2, 2: 'x', 4: 2.7, 99: 3 })).toEqual({ 4: 2 });
    expect(cleanMisses(null)).toEqual({});
  });

  it('opens levels in order and keeps finished ones finished', () => {
    let progress = emptyProgress();
    expect(isOpen(progress, 1)).toBe(true);
    expect(isOpen(progress, 2)).toBe(false);
    progress = addWin(progress, 1, 3);
    progress = addWin(progress, 1, 1);
    expect(progress.stars[1]).toBe(3);
    expect(isOpen(progress, 2)).toBe(true);
    progress = addSkip(progress, 2);
    expect(isOpen(progress, 3)).toBe(true);
    expect(nextLevel(progress)).toBe(3);
    expect(totalStars(progress)).toBe(3);
  });

  it('survives anything left in storage', () => {
    expect(cleanProgress('nonsense')).toEqual(emptyProgress());
    expect(cleanProgress({ stars: { 1: 7, 2: 'x', 99: 3 }, skipped: [4, 'y', 400] })).toEqual({ stars: { 1: 3 }, skipped: [4] });
  });
});
