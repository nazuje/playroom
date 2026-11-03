import { describe, expect, it } from 'vitest';
import { LEVELS, missLimit, puzzleFor, SET, setFor, type Puzzle } from './levels.ts';
import { addHint, addMiss, cleanHints, cleanMisses, missesSoFar, settle, settleHint, starsFor } from './misses.ts';
import { answer, answerPair, pairKey, startPlay } from './play.ts';
import { addSkip, addWin, cleanProgress, emptyProgress, isOpen, nextLevel, totalStars } from './progress.ts';
import { allPairs } from './solve.ts';

const puzzle = (id: number, go = 0): Puzzle => puzzleFor(id, go) as Puzzle;
const wrongs = (one: Puzzle) => one.options.map((_, at) => at).filter((at) => at !== one.answer);
const wrongPairs = (one: Puzzle) => allPairs(one.options.length).filter(([a, b]) => pairKey(a, b) !== pairKey(...(one.pair as [number, number])));

describe('answering', () => {
  it('wins with the right option and ignores anything after', () => {
    const first = puzzle(1);
    const right = answer(startPlay([first]), first.answer)!;
    expect(right.right).toBe(true);
    expect(right.play.won).toBe(true);
    expect(answer(right.play, first.answer)).toBeNull();
  });

  it('moves through a set of three puzzles, and only the last one wins', () => {
    const set = setFor(6, 2);
    expect(set).toHaveLength(SET);
    expect(set.map((one) => one.go)).toEqual([6, 7, 8]);
    let play = startPlay(set);
    for (let at = 0; at < SET; at += 1) {
      const result = answer(play, set[at].answer)!;
      expect(result.right).toBe(true);
      expect(result.solvedOne).toBe(at < SET - 1);
      expect(result.play.won).toBe(at === SET - 1);
      play = result.play;
    }
  });

  it('counts a wrong option as a miss, dims it, says how it is wrong, and ignores it the second time', () => {
    const mirrored = puzzle(10);
    const at = mirrored.slips.indexOf('mirror');
    const result = answer(startPlay([mirrored]), at)!;
    expect(result.right).toBe(false);
    expect(result.play.misses).toBe(1);
    expect(result.play.tried).toEqual([at]);
    expect(result.feedback).toEqual({ kind: 'mirror' });
    expect(answer(result.play, at)).toBeNull();
    const moved = puzzle(12);
    const shown = answer(startPlay([moved]), moved.slips.indexOf('moved'))!.feedback;
    expect(shown?.kind === 'tiles' && shown.wrong).toHaveLength(1);
  });

  it('never ends a try on the first world, which is for age 5, though every miss still counts', () => {
    for (const id of [1, 2, 3, 4]) {
      const set = setFor(id, 1);
      expect(missLimit(set[0])).toBe(Infinity);
      let play = startPlay(set);
      for (const [at, one] of set.entries()) {
        for (const wrong of wrongs(one)) play = answer(play, wrong)!.play;
        expect(play.failed).toBe(false);
        expect(play.misses).toBe(at + 1);
        play = answer(play, one.answer)!.play;
      }
      expect(play.won).toBe(true);
    }
  });

  it('ends a try after 2 misses with three options and 3 with more, counted over the whole set', () => {
    for (const id of [5, 10, 15, 20]) {
      const set = setFor(id, 0);
      const limit = missLimit(set[0]);
      expect(limit).toBe(set[0].options.length === 3 ? 2 : 3);
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

  it('picks pairs in "which two are the same?", in either order, and a wrong pair only counts once', () => {
    const set = setFor(23, 0);
    const [first, second] = set[0].pair as [number, number];
    expect(answer(startPlay(set), 0)).toBeNull();
    expect(answerPair(startPlay(set), first, first)).toBeNull();
    const right = answerPair(startPlay(set), second, first)!;
    expect(right.right).toBe(true);
    expect(right.solvedOne).toBe(true);
    const [a, b] = wrongPairs(set[0])[0];
    const wrong = answerPair(startPlay(set), a, b)!;
    expect(wrong.right).toBe(false);
    expect(wrong.play.triedPairs).toEqual([pairKey(a, b)]);
    expect(answerPair(wrong.play, b, a)).toBeNull();
    let play = wrong.play;
    for (const [x, y] of wrongPairs(set[0]).slice(1, 3)) play = answerPair(play, x, y)!.play;
    expect(play.failed).toBe(true);
  });
});

describe('stars, misses and progress', () => {
  it('gives stars for every miss since the level was last won, and keeps three for a solve with no ↻ hint', () => {
    expect([0, 1, 2, 3, 4, 9].map((misses) => starsFor(misses))).toEqual([3, 2, 2, 1, 1, 1]);
    expect([0, 1, 2, 3].map((misses) => starsFor(misses, true))).toEqual([2, 2, 2, 1]);
    // Turning the target until it matches never buys three stars, on any world that has ↻.
    for (let misses = 0; misses < 10; misses += 1) expect(starsFor(misses, true)).toBeLessThan(3);
    for (const level of LEVELS) expect(['hint', 'none']).toContain(level.helper);
    expect(LEVELS.filter((level) => level.helper === 'hint').map((level) => level.world)).toEqual([...Array(4).fill('spin'), ...Array(5).fill('turn'), ...Array(5).fill('mirror')]);
  });

  it('adds misses and hints up over every try until a win settles them', () => {
    let log = addMiss({}, 3);
    log = addMiss(log, 3);
    log = addMiss(log, 5);
    expect(missesSoFar(log, 3)).toBe(2);
    expect(settle(log, 3)).toEqual({ 5: 1 });
    expect(cleanMisses(JSON.parse(JSON.stringify(log)))).toEqual({ 3: 2, 5: 1 });
    expect(cleanMisses({ 1: -2, 2: 'x', 4: 2.7, 99: 3 })).toEqual({ 4: 2 });
    expect(cleanMisses(null)).toEqual({});
    const hints = addHint(addHint([], 11), 11);
    expect(hints).toEqual([11]);
    expect(settleHint(hints, 11)).toEqual([]);
    expect(cleanHints([11, 'x', 99])).toEqual([11]);
    expect(cleanHints('nonsense')).toEqual([]);
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
