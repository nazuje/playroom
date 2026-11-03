import { describe, expect, it } from 'vitest';
import { levelById, type Level } from './levels.ts';
import { readRule, sameRule, type Rule } from './machine.ts';
import { answer, missLimit, pickKey, startPlay, starsFor, whyWrong } from './play.ts';
import { addSkip, addWin, cleanMisses, cleanProgress, emptyProgress, isOpen, nextLevel, totalStars, withMisses } from './progress.ts';

const level = (id: number): Level => levelById(id) as Level;

describe('answering', () => {
  it('wins with the right number and ignores anything after', () => {
    const first = level(1);
    const right = answer(startPlay(first), first.truth as number)!;
    expect(right.right).toBe(true);
    expect(right.play.won).toBe(true);
    expect(answer(right.play, first.truth as number)).toBeNull();
  });

  it('counts a wrong number as a miss and dims it', () => {
    const first = level(1);
    const wrong = answer(startPlay(first), first.puzzle.given as number)!;
    expect(wrong.right).toBe(false);
    expect(wrong.play.misses).toBe(1);
    expect(wrong.play.tried).toEqual([String(first.puzzle.given)]);
    expect(wrong.why).toEqual({});
  });

  it('ends a try after 2 misses with three choices and 3 with the picker, so trying everything never wins', () => {
    const three = level(1);
    expect(missLimit(three)).toBe(2);
    const wrongs = three.numbers.filter((n) => n !== three.truth);
    let play = answer(startPlay(three), wrongs[0])!.play;
    expect(play.failed).toBe(false);
    play = answer(play, wrongs[1])!.play;
    expect(play.failed).toBe(true);
    expect(answer(play, three.truth as number)).toBeNull();
    const picker = level(10);
    expect(missLimit(picker)).toBe(3);
    let later = startPlay(picker);
    const off = [0, 1, 2, 3].filter((n) => n !== picker.truth);
    for (const value of off.slice(0, 2)) later = answer(later, value)!.play;
    expect(later.failed).toBe(false);
    expect(answer(later, off[2])!.play.failed).toBe(true);
  });

  it('runs a wrong guess forwards on backwards levels, to show what it really makes', () => {
    const back = level(15);
    const given = back.puzzle.given as number;
    const result = answer(startPlay(back), given)!;
    expect(result.right).toBe(false);
    expect(result.why.makes).not.toBe(given);
    expect(typeof result.why.makes === 'number' || result.why.makes === null).toBe(true);
    // A halving machine can't take an odd number at all.
    const halving = { ...back, puzzle: { ...back.puzzle, machines: [readRule('/2')] } };
    expect(whyWrong(halving, 7)).toEqual({ makes: null });
  });

  it('shows which examples a wrong card gets right, and two wrong cards end the try', () => {
    const cards = level(9);
    const wrongCards = cards.cards.filter((card) => !sameRule(card, cards.truth as Rule));
    const first = answer(startPlay(cards), wrongCards[0])!;
    expect(first.right).toBe(false);
    expect(first.why.checks).toHaveLength(cards.puzzle.examples.length);
    expect(first.why.checks!.every(Boolean)).toBe(false);
    expect(first.play.tried).toEqual([pickKey(wrongCards[0])]);
    expect(answer(first.play, wrongCards[1])!.play.failed).toBe(true);
    expect(answer(startPlay(cards), cards.truth as Rule)!.play.won).toBe(true);
    // A number is never a rule.
    expect(answer(startPlay(cards), 3)!.right).toBe(false);
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
