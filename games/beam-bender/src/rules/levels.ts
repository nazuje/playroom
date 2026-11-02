import { parseBoard, type Board } from './board.ts';

export type WorldId = 'mirrors' | 'blocks' | 'splitters' | 'colors' | 'double' | 'switches' | 'portals' | 'mix' | 'bonus';

export interface Level {
  id: number;
  world: WorldId;
  /** The drawing. See `parseBoard`, and the key below. */
  rows: readonly string[];
  /** Fewest taps that win, proved by the solver in levels.test.ts. Earns 3 stars. */
  par: number;
  /** One tap more than this loses the try. */
  limit: number;
  /** The bonus level that the hidden target in this level opens. */
  unlocks?: number;
}

export const WORLDS: readonly WorldId[] = ['mirrors', 'blocks', 'splitters', 'colors', 'double', 'switches', 'portals', 'mix'];

/*
 * Key to the drawings. Every level is laid out by hand and stored here. Row 0 is the far edge of the board.
 *
 *   .        floor                     # wall
 *   > < ^ v  white laser               r> b>  colored laser
 *   t        target for any light      tr tg tb  target for one color
 *   m0-m3    plain mirror, one working side (turn 0 faces north-east, each turn goes clockwise)
 *   d0 d1    two-sided mirror          s0 s1  splitter: bounces like d, and also lets light through
 *   fr fg fb color filter
 *   p1 p2    portal pair, drawn twice
 *   A a      block a at home and its other end, with xa its switch (same for B b and xb)
 *   ?        a hidden target on an ordinary floor tile
 */
export const LEVELS: readonly Level[] = [
  // Plain mirrors
  { id: 1, world: 'mirrors', par: 1, limit: 3, rows: ['. . .', '> . m1', '. . t'] },
  { id: 2, world: 'mirrors', par: 1, limit: 3, rows: ['. . . .', '> . m2 .', '. . . .', 't . m2 .'] },
  { id: 3, world: 'mirrors', par: 2, limit: 5, rows: ['. . . t', '. . . .', 'm0 . . m2', '^ . . .'] },
  { id: 4, world: 'mirrors', par: 3, limit: 6, rows: ['> . . m1', '. t . .', '. . . .', '. m3 . m2'] },
  // Fixed blocks
  { id: 5, world: 'blocks', par: 2, limit: 5, rows: ['> m2 # t', '. . # .', '. m3 . m2'] },
  { id: 6, world: 'blocks', par: 3, limit: 6, rows: ['> . m1 . .', '. # . # .', '. . . . t', '# . m2 . m3'] },
  { id: 7, world: 'blocks', par: 4, limit: 6, rows: ['> . . . m1', '# # # . .', 't . . . .', 'm2 . . . m2'] },
  { id: 8, world: 'blocks', par: 5, limit: 9, unlocks: 31, rows: ['. . # t .', 'm0 m0 # . .', '. m2 . m3 .', '^ . # ? .'] },
  // Splitters
  { id: 9, world: 'splitters', par: 3, limit: 6, rows: ['. . t . .', '. . . . .', '> . s0 . m0', '. . . . .', '. . . . t'] },
  { id: 10, world: 'splitters', par: 4, limit: 7, rows: ['t . m3 . t', '. . . . .', 'm3 . s1 . .', '. . . . .', '. . ^ . .'] },
  { id: 11, world: 'splitters', par: 4, limit: 7, rows: ['. t . . t', '. . . . .', '> s0 . s1 m1', '. . . . .', '. . . t .'] },
  { id: 12, world: 'splitters', par: 5, limit: 8, rows: ['t m0 # . t', '. . # . .', '> s0 . s1 m2', '. . # . .', '. . . m0 t'] },
  // Colors
  { id: 13, world: 'colors', par: 3, limit: 6, rows: ['> . m2 . .', '. . . . .', 'tr fr m0 fb #', '. . . . .'] },
  { id: 14, world: 'colors', par: 4, limit: 8, unlocks: 32, rows: ['r> m1 ? m1 tb', '. . . . .', 'b> . . m2 .', '. m2 . . tr'] },
  { id: 15, world: 'colors', par: 5, limit: 8, rows: ['. . tr tb .', '. . fr fb .', '> . s0 s0 m3', '. . . . fg', '. . . . tg'] },
  { id: 16, world: 'colors', par: 7, limit: 9, rows: ['> . m2 . tr', '. m0 . . m0', '. . fg . .', '. . m3 . m1', 'r> m2 . . tg'] },
  // Two-sided mirrors
  { id: 17, world: 'double', par: 5, limit: 9, rows: ['. m0 m0 . .', '> . d0 . t', '. m2 m3 . .'] },
  { id: 18, world: 'double', par: 6, limit: 9, rows: ['> d1 . . .', '. d1 d1 . .', '. . d0 d1 .', '. . . d1 d1', '. . . . t'] },
  { id: 19, world: 'double', par: 8, limit: 10, rows: ['. v . . t', '> d1 . d0 .', '. . . . .', '. d1 . d1 m0', '. . . m2 t'] },
  { id: 20, world: 'double', par: 8, limit: 10, rows: ['. v . v .', '. . . . .', '. d1 . d0 m3', 'm2 . . d0 d1', 't . . t .'] },
  // Switches and sliding blocks
  { id: 21, world: 'switches', par: 7, limit: 9, rows: ['. . xa . .', '> . m1 . .', '. . A a .', '. . m3 . m1', '. . . . t'] },
  { id: 22, world: 'switches', par: 7, limit: 9, rows: ['> . A . t', '. . a . .', '. . . . .', 'xa . . m3 t', '> . . m2 .'] },
  { id: 23, world: 'switches', par: 8, limit: 10, rows: ['. . xa . .', '> . m2 . .', '. a A . .', 'xb . m0 B m2', '. . . b t'] },
  { id: 24, world: 'switches', par: 10, limit: 12, rows: ['. . xa . .', '> . m2 . .', '. a A b .', 'xb . m0 B m2', '. t . . m1'] },
  // Portals
  { id: 25, world: 'portals', par: 10, limit: 12, rows: ['> . . . m3', 'm3 . . t .', '. . p1 . m0', '. . . . .', 'm2 p1 . . .'] },
  { id: 26, world: 'portals', par: 11, limit: 15, unlocks: 33, rows: ['> m3 . p1 m3', '. . . . .', '? m0 p1 . .', '. t p2 . m0', '. m2 . p2 .'] },
  { id: 27, world: 'portals', par: 12, limit: 14, rows: ['v m2 p1 . t', '. m0 . . m2', 'm1 . m3 p1 m2', '. . . . .', '. . m2 . m3'] },
  // Everything at once
  { id: 28, world: 'mix', par: 15, limit: 17, rows: ['. m2 fr m2 .', '. . tb p1 .', '> s1 fb m3 .', '. p1 . m0 tr', '. m1 . . m0'] },
  { id: 29, world: 'mix', par: 16, limit: 18, rows: ['v m2 p1 . tr', '. m1 . fr m3', 'm1 . m2 p1 m2', '. . . a .', 'xa . m0 A m0'] },
  { id: 30, world: 'mix', par: 19, limit: 21, rows: ['v m2 p1 . tr', '. s0 . fr m3', 'm1 . m2 p1 m3', 'm2 m3 . a .', 't xa m0 A m0'] },
  // Bonus levels, opened by a hidden target
  { id: 31, world: 'bonus', par: 6, limit: 9, rows: ['v t . t .', '. . . . .', 'm3 s0 s1 s0 m0', '. . . . .', '. . t . t'] },
  { id: 32, world: 'bonus', par: 7, limit: 10, rows: ['. tr . tb .', '. fr . fb .', 'm2 s0 . s0 m0', '. . . . fg', '^ . . . tg'] },
  { id: 33, world: 'bonus', par: 18, limit: 20, rows: ['> m3 . t .', 'm3 d0 p1 m0 .', '. m2 . . <', 'm1 . p1 m3 .', '. . . m2 t'] },
];

export const MAIN_LEVELS: readonly Level[] = LEVELS.filter(({ world }) => world !== 'bonus');
export const BONUS_LEVELS: readonly Level[] = LEVELS.filter(({ world }) => world === 'bonus');

export const levelById = (id: number): Level | undefined => LEVELS.find((level) => level.id === id);

const boards = new Map<number, Board>();

/** Boards are parsed once and never changed: a play keeps its turns apart from the board. */
export function boardFor(level: Level): Board {
  const known = boards.get(level.id);
  if (known) return known;
  const board = parseBoard(level.rows);
  boards.set(level.id, board);
  return board;
}
