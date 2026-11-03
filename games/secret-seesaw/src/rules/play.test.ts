import { describe, expect, it } from 'vitest';
import { describe as picture } from './board.ts';
import { levelById, type Level } from './levels.ts';
import { guess, openLean, place, startPlay, starsFor, tap, valuesWith } from './play.ts';
import { addSkip, addWin, cleanProgress, emptyProgress, isOpen, nextLevel, totalStars } from './progress.ts';

const level = (id: number): Level => levelById(id) as Level;

describe('answering', () => {
  it('counts a wrong number as a miss and says which way it was wrong', () => {
    const play = startPlay(level(1));
    const truth = level(1).values.box as number;
    const high = guess(play, truth + 1);
    expect(high).toMatchObject({ right: false, heavy: true });
    expect(high?.play.misses).toBe(1);
    expect(high?.play.tried).toEqual([truth + 1]);
    expect(guess(high!.play, truth - 1)).toMatchObject({ right: false, heavy: false });
  });

  it('wins on the right number and opens the box', () => {
    const play = startPlay(level(1));
    const right = guess(play, level(1).values.box as number);
    expect(right?.right).toBe(true);
    expect(right?.play.won).toBe(true);
    expect(right?.play.board.seesaws[0].left[0]).toMatchObject({ kind: 'weight', opened: 'box' });
    expect(guess(right!.play, 1)).toBeNull();
  });

  it('asks the second mystery once the first is found, and wins after both', () => {
    const two = level(22);
    let play = startPlay(two);
    play = guess(play, two.values.box as number)!.play;
    expect(play.won).toBe(false);
    expect(play.board.seesaws.map(picture)).toEqual([`${two.values.box}+hat=15`, `hat=${two.values.box}+3`]);
    play = guess(play, two.values.hat as number)!.play;
    expect(play.won).toBe(true);
  });

  it('weighs a wrong guess honestly for the wobble', () => {
    const play = startPlay(level(1));
    expect(valuesWith(play, 9)).toEqual({ box: 9 });
    expect(valuesWith(play, null)).toEqual(level(1).values);
  });

  it('gives three stars for no misses, two for one or two, and one after that', () => {
    expect([0, 1, 2, 3, 9].map(starsFor)).toEqual([3, 2, 2, 1, 1]);
  });
});

describe('making it level', () => {
  it('wins the moment the seesaw is level and counts tipping too far as a miss', () => {
    const first = level(6);
    const need = -openLean(startPlay(first));
    const exact = first.tray.indexOf(need);
    const won = place(startPlay(first), `t${exact}`);
    expect(won?.play.won).toBe(true);
    const tooMuch = first.tray.findIndex((value) => value > need);
    if (tooMuch >= 0) {
      const over = place(startPlay(first), `t${tooMuch}`);
      expect(over).toMatchObject({ over: true });
      expect(over?.play.misses).toBe(1);
    }
  });

  it('wins when taking a weight back off makes it level', () => {
    const board = level(7);
    const need = -openLean(startPlay(board));
    let play = startPlay(board);
    const all = board.tray.map((_, at) => `t${at}`);
    for (const id of all) play = place(play, id)?.play ?? play;
    const extra = board.tray.reduce((sum, value) => sum + value, 0) - need;
    const spare = board.tray.indexOf(extra);
    expect(spare).toBeGreaterThanOrEqual(0);
    expect(play.won).toBe(false);
    expect(tap(play, `t${spare}`).play.won).toBe(true);
  });

  it('takes a placed weight back with a tap and leaves given weights alone', () => {
    const board = level(8);
    const start = startPlay(board);
    const on = place(start, 't0')!;
    expect(tap(on.play, 't0').effect.type).toBe('back');
    const given = start.board.seesaws[0].right[0].id;
    expect(tap(start, given).effect).toMatchObject({ type: 'stuck', why: 'fixed' });
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
