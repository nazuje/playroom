import { describe, expect, it } from 'vitest';
import { levelById, SHIFT, shiftFor, type Level } from './levels.ts';
import { readRule, sameCard, type Card } from './machine.ts';
import { answer, current, missLimit, pickKey, startPlay, starsFor, whyWrong } from './play.ts';
import { addSkip, addWin, cleanMisses, cleanProgress, emptyProgress, isOpen, nextLevel, totalStars, withMisses } from './progress.ts';

const level = (id: number): Level => levelById(id) as Level;

describe('answering', () => {
  it('wins a one-puzzle go with the right number and ignores anything after', () => {
    const first = level(1);
    const right = answer(startPlay([first]), first.truth as number)!;
    expect(right).toMatchObject({ right: true, advanced: false });
    expect(right.play.won).toBe(true);
    expect(answer(right.play, first.truth as number)).toBeNull();
  });

  it('counts a wrong number as a miss and dims it', () => {
    const first = level(1);
    const wrong = answer(startPlay([first]), first.puzzle.given as number)!;
    expect(wrong.right).toBe(false);
    expect(wrong.play.misses).toBe(1);
    expect(wrong.play.tried).toEqual([String(first.puzzle.given)]);
    expect(wrong.why).toEqual({});
  });

  it('plays a shift of three puzzles in order, keeping misses and clearing the dimmed answers between them', () => {
    const shift = shiftFor(1, 0);
    expect(shift).toHaveLength(SHIFT);
    let play = startPlay(shift);
    play = answer(play, shift[0].puzzle.given as number)!.play;
    const first = answer(play, shift[0].truth as number)!;
    expect(first).toMatchObject({ right: true, advanced: true });
    expect(first.play).toMatchObject({ at: 1, misses: 1, tried: [], won: false });
    expect(current(first.play)).toBe(shift[1]);
    const second = answer(first.play, shift[1].truth as number)!;
    expect(second.play.at).toBe(2);
    const done = answer(second.play, shift[2].truth as number)!;
    expect(done).toMatchObject({ right: true, advanced: false });
    expect(done.play).toMatchObject({ won: true, misses: 1 });
  });

  it('ends a try on the 4th miss across a shift with three choices or 0 to 20, so trying everything never wins', () => {
    for (const id of [1, 10]) {
      const shift = shiftFor(id, 0);
      expect(missLimit(shift[0])).toBe(4);
      let play = startPlay(shift);
      const wrongs = (shift[0].answer === 'three' ? shift[0].numbers : [0, 1, 2, 3, 4]).filter((n) => n !== shift[0].truth);
      play = answer(play, wrongs[0])!.play;
      play = answer(play, wrongs[1])!.play;
      play = answer(play, shift[0].truth as number)!.play;
      const next = shift[1];
      const nextWrongs = (next.answer === 'three' ? next.numbers : [0, 1, 2, 3, 4]).filter((n) => n !== next.truth);
      play = answer(play, nextWrongs[0])!.play;
      expect(play.failed).toBe(false);
      play = answer(play, nextWrongs[1])!.play;
      expect(play.failed, `level ${id}`).toBe(true);
      expect(answer(play, next.truth as number)).toBeNull();
    }
  });

  it('ends a try on the 2nd wrong card across the shift when there are four or five cards', () => {
    for (const id of [16, 21, 22]) {
      const shift = shiftFor(id, 0);
      expect(shift[0].cards.length).toBeGreaterThanOrEqual(4);
      expect(missLimit(shift[0])).toBe(2);
      let play = startPlay(shift);
      const wrong = (at: number): Card => shift[at].cards.find((card) => !sameCard(card, shift[at].truth as Card)) as Card;
      play = answer(play, wrong(0))!.play;
      expect(play.failed).toBe(false);
      play = answer(play, shift[0].truth as Card)!.play;
      expect(answer(play, wrong(1))!.play.failed, `level ${id}`).toBe(true);
    }
    expect(missLimit(level(9))).toBe(4);
  });

  it('runs a wrong guess forwards on backwards levels, to show what it really makes', () => {
    const back = level(15);
    const given = back.puzzle.given as number;
    const result = answer(startPlay([back]), given)!;
    expect(result.right).toBe(false);
    expect(result.why.makes).not.toBe(given);
    expect(typeof result.why.makes === 'number' || result.why.makes === null).toBe(true);
    // A halving machine can't take an odd number at all.
    const halving = { ...back, puzzle: { ...back.puzzle, machines: [readRule('/2')] } };
    expect(whyWrong(halving, 7)).toEqual({ makes: null });
  });

  it('shows which examples a wrong card gets right, and a pair card fills both shut plates', () => {
    const cards = level(9);
    const wrongCards = cards.cards.filter((card) => !sameCard(card, cards.truth as Card));
    const first = answer(startPlay([cards]), wrongCards[0])!;
    expect(first.right).toBe(false);
    expect(first.why.checks).toHaveLength(cards.puzzle.examples.length);
    expect(first.why.checks!.every(Boolean)).toBe(false);
    expect(first.play.tried).toEqual([pickKey(wrongCards[0])]);
    expect(answer(startPlay([cards]), cards.truth as Card)!.play.won).toBe(true);
    // A number is never a rule.
    expect(answer(startPlay([cards]), 3)!.right).toBe(false);
    const pair = level(22);
    expect((pair.truth as Card).length).toBe(2);
    expect(answer(startPlay([pair]), pair.truth as Card)!.right).toBe(true);
    expect(answer(startPlay([pair]), [...(pair.truth as Card)].reverse())!.right).toBe(false);
  });

  it('gives stars for every miss since the level was last won, so a retry never buys three', () => {
    expect([0, 1, 2, 3, 4, 9].map(starsFor)).toEqual([3, 2, 2, 1, 1, 1]);
  });
});

describe('progress', () => {
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

  it('keeps misses per level until a win clears them', () => {
    let misses = withMisses({}, 3, 1);
    misses = withMisses(misses, 3, 2);
    misses = withMisses(misses, 5, 4);
    expect(misses).toEqual({ 3: 2, 5: 4 });
    expect(withMisses(misses, 3, 0)).toEqual({ 5: 4 });
    expect(cleanMisses(JSON.parse(JSON.stringify(misses)))).toEqual({ 3: 2, 5: 4 });
    expect(cleanMisses({ 1: -2, 2: 'x', 3: 1.5, 4: 2, 99: 3 })).toEqual({ 4: 2 });
    expect(cleanMisses(null)).toEqual({});
  });

  it('survives anything left in storage', () => {
    expect(cleanProgress('nonsense')).toEqual(emptyProgress());
    expect(cleanProgress({ stars: { 1: 7, 2: 'x', 99: 3 }, skipped: [4, 'y', 400] })).toEqual({ stars: { 1: 3 }, skipped: [4] });
  });
});
