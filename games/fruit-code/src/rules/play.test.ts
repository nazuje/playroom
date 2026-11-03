import { describe, expect, it } from 'vitest';
import { levelById, questionValue, type Level } from './levels.ts';
import { answer, checksFor, choicesOf, missLimit, select, startPlay, starsFor, unknownFruits } from './play.ts';
import { addSkip, addWin, cleanProgress, emptyProgress, isOpen, nextLevel, totalStars } from './progress.ts';
import { plan } from './solve.ts';

const level = (id: number): Level => levelById(id) as Level;

describe('answering', () => {
  it('counts a wrong number as a miss, dims it, and shows the row does not add up', () => {
    const first = level(1);
    const play = startPlay(first);
    const wrong = answer(play, 3)!;
    expect(wrong.right).toBe(false);
    expect(wrong.play.misses).toBe(1);
    expect(wrong.play.tried.question).toEqual([3]);
    expect(wrong.checks).toEqual([{ row: 0, sum: 6, total: 4 }]);
    expect(answer(wrong.play, 3)!.play.tried.question).toEqual([3]);
  });

  it('wins a lone-fruit question by finding that fruit, and puts its sticker on', () => {
    const play = startPlay(level(1));
    const right = answer(play, 2)!;
    expect(right).toMatchObject({ right: true, decoded: 'apple' });
    expect(right.play.won).toBe(true);
    expect(right.play.known).toEqual({ apple: 2 });
    expect(answer(right.play, 2)).toBeNull();
  });

  it('decodes a fruit on the way, which points the buttons back at the question', () => {
    const two = level(5);
    let play = select(startPlay(two), 'apple');
    expect(play.target).toBe('apple');
    expect(choicesOf(play)).toEqual(two.choices.apple);
    const found = answer(play, 3)!;
    expect(found).toMatchObject({ right: true, decoded: 'apple' });
    play = found.play;
    expect(play).toMatchObject({ target: 'question', won: false, known: { apple: 3 } });
    expect(unknownFruits(play)).toEqual(['banana']);
    // A found fruit can't be picked again, and picking the lone question fruit picks the question.
    expect(select(play, 'apple').target).toBe('question');
    expect(select(play, 'banana').target).toBe('question');
    expect(answer(play, 1)!.play.won).toBe(true);
  });

  it('checks a wrong guess only against fruits already found, never the hidden ones', () => {
    const two = level(5);
    const play = startPlay(two);
    // banana alone: apple+banana can't be added up yet, so nothing to show.
    expect(checksFor(play, 'banana', 3)).toEqual([]);
    const known = answer(select(play, 'apple'), 3)!.play;
    expect(checksFor(known, 'banana', 3)).toEqual([{ row: 1, sum: 6, total: 4 }]);
  });

  it('asks for the sum when the question adds fruits, even once they are all found', () => {
    const chain = level(11);
    let play = startPlay(chain);
    for (const step of plan(chain.puzzle)) {
      if (step.kind === 'fruit') play = answer(select(play, step.fruit), step.value)!.play;
    }
    expect(play.won).toBe(false);
    expect(play.target).toBe('question');
    expect(answer(play, questionValue(chain) + 1)!.checks).toEqual([]);
    expect(answer(play, questionValue(chain))!.play.won).toBe(true);
  });

  it('ends a try after 2 misses with three choices and 3 with the picker, so guessing everything never wins', () => {
    const three = level(1);
    expect(missLimit(three)).toBe(2);
    const wrongs = three.choices.question!.filter((n) => n !== 2);
    let play = answer(startPlay(three), wrongs[0])!.play;
    expect(play.failed).toBe(false);
    play = answer(play, wrongs[1])!.play;
    expect(play.failed).toBe(true);
    expect(answer(play, 2)).toBeNull();
    expect(select(play, 'apple')).toBe(play);
    const picker = level(10);
    expect(missLimit(picker)).toBe(3);
    let later = startPlay(picker);
    for (const value of [0, 1]) later = answer(later, value + 15)!.play;
    expect(later.failed).toBe(false);
    expect(answer(later, 18)!.play.failed).toBe(true);
  });

  it('gives three stars for no misses, two for one, and one for two', () => {
    expect([0, 1, 2].map(starsFor)).toEqual([3, 2, 1]);
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

  it('survives anything left in storage', () => {
    expect(cleanProgress('nonsense')).toEqual(emptyProgress());
    expect(cleanProgress({ stars: { 1: 7, 2: 'x', 99: 3 }, skipped: [4, 'y', 400] })).toEqual({ stars: { 1: 3 }, skipped: [4] });
  });
});
