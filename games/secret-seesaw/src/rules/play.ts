// One go at a level: taps, tray weights and answers. Pure, so the tests and the bots can play it too.
import { difference, openMystery, placeFromTray, tapItem, type Board, type Effect, type Mystery, type Values } from './board.ts';
import { boardFor, type Level } from './levels.ts';

export interface Play {
  level: Level;
  board: Board;
  /** Which of level.ask is being worked out now. */
  asking: number;
  /** Mysteries worked out so far. */
  found: Values;
  /** Wrong answers, or tray moves that tipped the seesaw too far, in this go. */
  misses: number;
  /** Wrong numbers tried for the mystery being asked. */
  tried: number[];
  won: boolean;
}

export function startPlay(level: Level): Play {
  return { level, board: boardFor(level), asking: 0, found: {}, misses: 0, tried: [], won: false };
}

export const isLevelBoard = (level: Level): boolean => level.ask.length === 0;

export const asked = (play: Play): Mystery | null => play.level.ask[play.asking] ?? null;

export interface Tapped {
  play: Play;
  effect: Effect;
}

export function tap(play: Play, id: string): Tapped {
  if (play.won) return { play, effect: { type: 'stuck', id, why: 'fixed' } };
  const { board, effect } = tapItem(play.board, id, { fixedGiven: isLevelBoard(play.level) });
  const next = { ...play, board };
  // Taking a weight back off can level the seesaw too, and that wins just the same.
  return { play: { ...next, won: isLevelBoard(play.level) && effect.type === 'back' && openLean(next) === 0 }, effect };
}

/** How much heavier the open side is than the other: 0 means level. */
export function openLean(play: Play): number {
  const { open } = play.level;
  if (!open) return 0;
  const lean = difference(play.board.seesaws[0], {});
  return open === 'right' ? lean : -lean;
}

export interface Placed extends Tapped {
  /** The seesaw went past level onto the open side. */
  over: boolean;
}

/** A tray weight goes onto the open side. Level wins at once. Tipping past level counts as a miss. */
export function place(play: Play, trayId: string): Placed | null {
  const { open } = play.level;
  if (play.won || !open) return null;
  const move = placeFromTray(play.board, trayId, 0, open);
  if (!move) return null;
  const next = { ...play, board: move.board };
  const lean = openLean(next);
  return { play: { ...next, won: lean === 0, misses: next.misses + (lean > 0 ? 1 : 0) }, effect: move.effect, over: lean > 0 };
}

export interface Guessed {
  play: Play;
  right: boolean;
  /** The guess was more than the truth, so the mystery's side sinks. */
  heavy: boolean;
}

export function guess(play: Play, value: number): Guessed | null {
  const mystery = asked(play);
  if (play.won || !mystery) return null;
  const truth = play.level.values[mystery] as number;
  if (value !== truth) {
    const tried = play.tried.includes(value) ? play.tried : [...play.tried, value];
    return { play: { ...play, misses: play.misses + 1, tried }, right: false, heavy: value > truth };
  }
  const asking = play.asking + 1;
  return {
    play: {
      ...play,
      board: openMystery(play.board, mystery, truth),
      asking,
      found: { ...play.found, [mystery]: truth },
      tried: [],
      won: asking >= play.level.ask.length,
    },
    right: true,
    heavy: false,
  };
}

/** What every mystery on the board weighs if this guess were true, for the honest wobble of a wrong answer. */
export function valuesWith(play: Play, value: number | null): Values {
  const mystery = asked(play);
  return mystery && value !== null ? { ...play.level.values, [mystery]: value } : play.level.values;
}

/** Three stars for no misses, two for one or two, one for any other win. */
export const starsFor = (misses: number): number => (misses === 0 ? 3 : misses <= 2 ? 2 : 1);
