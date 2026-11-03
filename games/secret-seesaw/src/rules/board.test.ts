import { describe, expect, it } from 'vitest';
import { describe as picture, findItem, openMystery, placeFromTray, tapItem, type Board, type Item, type Seesaw } from './board.ts';
import { isolated } from './board.ts';

let made = 0;
function item(token: string | number): Item {
  made += 1;
  return typeof token === 'number'
    ? { id: `i${made}`, kind: 'weight', value: token }
    : { id: `i${made}`, kind: 'mystery', mystery: token as 'box' | 'hat' };
}
const seesaw = (left: (string | number)[], right: (string | number)[]): Seesaw => ({ left: left.map(item), right: right.map(item) });
const board = (...seesaws: Seesaw[]): Board => ({ seesaws, tray: [], made: 0 });
const free = { fixedGiven: false };
const idOf = (from: Board, at: number, side: 'left' | 'right', index: number) => from.seesaws[at][side][index].id;

describe('taking the same off both sides', () => {
  it('takes a box off with its twin on the other side', () => {
    const start = board(seesaw(['box', 'box', 'box', 2], ['box', 8]));
    const { board: after, effect } = tapItem(start, idOf(start, 0, 'right', 0), free);
    expect(effect.type).toBe('pair');
    expect(picture(after.seesaws[0])).toBe('box+box+2=8');
  });

  it('takes a weight off both sides, shrinking the bigger weight opposite', () => {
    const start = board(seesaw(['box', 'box', 2], [8]));
    const { board: after, effect } = tapItem(start, idOf(start, 0, 'left', 2), free);
    expect(effect).toMatchObject({ type: 'take', amount: 2 });
    expect(picture(after.seesaws[0])).toBe('box+box=6');
  });

  it('takes only as much as the other side has, from whichever weight was tapped', () => {
    const start = board(seesaw(['box', 'box', 2], [8]));
    const { board: after, effect } = tapItem(start, idOf(start, 0, 'right', 0), free);
    expect(effect).toMatchObject({ type: 'take', amount: 2 });
    expect(picture(after.seesaws[0])).toBe('box+box=6');
  });

  it('takes from the biggest weights first and keeps the ids of those that shrink', () => {
    const start = board(seesaw(['box', 5], [3, 4]));
    const shrinking = idOf(start, 0, 'right', 0);
    const { board: after, effect } = tapItem(start, idOf(start, 0, 'left', 1), free);
    expect(picture(after.seesaws[0])).toBe('box=2');
    expect(after.seesaws[0].right[0].id).toBe(shrinking);
    expect(effect).toMatchObject({ gone: expect.arrayContaining([idOf(start, 0, 'left', 1), idOf(start, 0, 'right', 1)]) });
  });

  it('will not move a box that has no twin, or a weight with nothing opposite', () => {
    const start = board(seesaw(['box', 3], ['box', 'box']));
    expect(tapItem(start, idOf(start, 0, 'left', 1), free).effect).toMatchObject({ type: 'stuck', why: 'empty' });
    const lonely = board(seesaw(['box', 3], [7]));
    expect(tapItem(lonely, idOf(lonely, 0, 'left', 0), free).effect).toMatchObject({ type: 'stuck', why: 'alone' });
  });

  it('keeps given weights still on a "make it level" board', () => {
    const start = board(seesaw([4], [3]));
    expect(tapItem(start, idOf(start, 0, 'left', 0), { fixedGiven: true }).effect).toMatchObject({ type: 'stuck', why: 'fixed' });
  });
});

describe('swapping a mystery for what it weighs', () => {
  it('replaces the hat with what a lone hat balances on the other seesaw', () => {
    const start = board(seesaw(['box', 'hat'], [15]), seesaw(['hat'], ['box', 3]));
    const { board: after, effect } = tapItem(start, idOf(start, 0, 'left', 1), free);
    expect(effect.type).toBe('swap');
    expect(picture(after.seesaws[0])).toBe('box+box+3=15');
    expect(picture(after.seesaws[1])).toBe('hat=box+3');
    const ids = after.seesaws.flatMap((one) => [...one.left, ...one.right].map((thing) => thing.id));
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('swaps nothing when the lone mystery is the one tapped', () => {
    const start = board(seesaw(['box', 'hat'], [15]), seesaw(['hat'], ['box', 3]));
    expect(tapItem(start, idOf(start, 1, 'left', 0), free).effect.type).toBe('stuck');
  });
});

describe('the tray and opened mysteries', () => {
  it('puts a tray weight on and takes it back on a tap, in tray order', () => {
    const start: Board = { seesaws: [seesaw([5], [])], tray: [{ id: 't0', kind: 'weight', value: 2 }, { id: 't1', kind: 'weight', value: 3 }], made: 0 };
    const on = placeFromTray(start, 't0', 0, 'right');
    expect(on && picture(on.board.seesaws[0])).toBe('5=2');
    const back = tapItem(on!.board, 't0', { fixedGiven: true });
    expect(back.effect.type).toBe('back');
    expect(back.board.tray.map((weight) => weight.id)).toEqual(['t0', 't1']);
  });

  it('opens every copy of a worked-out mystery into a weight', () => {
    const start = board(seesaw(['box', 'hat'], [15]), seesaw(['hat'], ['box', 3]));
    const opened = openMystery(start, 'box', 6);
    expect(opened.seesaws.map(picture)).toEqual(['6+hat=15', 'hat=6+3']);
    expect(findItem(opened, idOf(start, 0, 'left', 0))?.item).toMatchObject({ kind: 'weight', value: 6, opened: 'box' });
  });

  it('tells when a mystery stands alone against plain weights', () => {
    expect(isolated(seesaw(['box', 'box'], [3, 3]), 'box')).toMatchObject({ count: 2, total: 6, side: 'left' });
    expect(isolated(seesaw(['box', 1], [7]), 'box')).toBeNull();
    expect(isolated(seesaw([7], ['hat']), 'hat')).toMatchObject({ count: 1, total: 7, side: 'right' });
  });
});
