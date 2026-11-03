import { describe, expect, it } from 'vitest';
import { LEVELS, missLimit, puzzleFor, SET, setFor, type Puzzle } from './levels.ts';
import { addMiss, cleanMisses, missesSoFar, settle, starsFor } from './misses.ts';
import { answer, buddyOf, danceFor, groupsOf, members, startPlay } from './play.ts';
import { addSkip, addWin, cleanProgress, emptyProgress, isOpen, nextLevel, totalStars } from './progress.ts';
import { featureOf } from './solve.ts';

const puzzle = (id: number, go = 0): Puzzle => puzzleFor(id, go) as Puzzle;
const wrongs = (one: Puzzle) => members(one);
const one = (single: Puzzle) => [single];

describe('answering', () => {
  it('wins with the odd one and ignores anything after', () => {
    const first = puzzle(1);
    const right = answer(startPlay(one(first)), first.answer)!;
    expect(right.right).toBe(true);
    expect(right.play.won).toBe(true);
    expect(answer(right.play, first.answer)).toBeNull();
  });

  it('moves through a set of three puzzles, and only the last one wins', () => {
    const set = setFor(6, 2);
    expect(set).toHaveLength(SET);
    expect(set.map((each) => each.go)).toEqual([6, 7, 8]);
    let play = startPlay(set);
    for (let at = 0; at < SET; at += 1) {
      const result = answer(play, set[at].answer)!;
      expect(result.right).toBe(true);
      expect(result.solvedOne).toBe(at < SET - 1);
      expect(result.play.won).toBe(at === SET - 1);
      play = result.play;
    }
  });

  it('counts a wrong tap as a miss, dims it, names a friend it belongs with, and ignores it the second time', () => {
    const first = puzzle(1);
    const [wrong] = wrongs(first);
    const result = answer(startPlay(one(first)), wrong)!;
    expect(result.right).toBe(false);
    expect(result.play.misses).toBe(1);
    expect(result.play.tried).toEqual([wrong]);
    expect(result.buddy).not.toBeNull();
    expect([wrong, first.answer]).not.toContain(result.buddy);
    expect(answer(result.play, wrong)).toBeNull();
  });

  it('never ends a try on the first world, which is for age 4, though every miss still counts', () => {
    for (const id of [1, 2, 3, 4, 5]) {
      const set = setFor(id, 1);
      expect(missLimit(set[0])).toBe(Infinity);
      let play = startPlay(set);
      for (const [at, each] of set.entries()) {
        for (const wrong of wrongs(each)) play = answer(play, wrong)!.play;
        expect(play.failed).toBe(false);
        expect(play.misses).toBe((at + 1) * (each.things.length - 1));
        play = answer(play, each.answer)!.play;
      }
      expect(play.won).toBe(true);
    }
  });

  it('ends a try after 3 misses, counted over the whole set, from the second world on', () => {
    for (const id of [6, 11, 16, 21]) {
      const set = setFor(id, 0);
      expect(missLimit(set[0])).toBe(3);
      let play = answer(startPlay(set), wrongs(set[0])[0])!.play;
      play = answer(play, set[0].answer)!.play;
      expect(play.misses).toBe(1);
      expect(play.tried).toEqual([]);
      const off = wrongs(set[1]);
      play = answer(play, off[0])!.play;
      expect(play.failed).toBe(false);
      play = answer(play, off[1])!.play;
      expect(play.failed).toBe(true);
      expect(answer(play, set[1].answer)).toBeNull();
    }
  });

  it('gives stars for every miss since the level was last won, so a retry never buys three', () => {
    expect([0, 1, 2, 3, 4, 9].map(starsFor)).toEqual([3, 2, 2, 1, 1, 1]);
  });
});

describe('friends and dances', () => {
  const everyGo = LEVELS.flatMap((level) => Array.from({ length: 9 }, (_, go) => puzzle(level.id, go)));

  it('points a wrong tap at one friend that keeps the rule with it, never the odd one', () => {
    for (const each of everyGo) {
      for (const wrong of wrongs(each)) {
        const buddy = buddyOf(each, wrong);
        expect(buddy, `level ${each.id}`).not.toBeNull();
        expect(members(each)).toContain(buddy);
        expect(buddy).not.toBe(wrong);
        const { rule, things } = each;
        if (rule.kind === 'pair') {
          const value = (at: number) => featureOf(things[at], rule.a, at, things.length);
          expect(value(buddy as number), `level ${each.id}`).toBe(value(wrong));
        }
        if (rule.kind === 'alternate') expect((buddy as number) % 2).toBe(wrong % 2);
      }
    }
  });

  it('dances in groups that cover every friend once', () => {
    for (const each of everyGo) {
      const groups = groupsOf(each);
      expect(groups.flat().sort((a, b) => a - b)).toEqual(members(each));
      expect(danceFor(each.idea)).toBeTruthy();
    }
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
