// One try at a level: a set of three puzzles of the same kind, the pieces tried, misses over the whole set, the
// end of a try, and which line of the quilt a wrong piece breaks. Pure, so the tests and the bots can play it too.
import type { Attr } from './cells.ts';
import { missLimit, shownFor, type Level } from './levels.ts';
import { brokenBy } from './solve.ts';

export interface Play {
  /** The set's puzzles, in order. */
  puzzles: readonly Level[];
  /** Which puzzle is on the quilt now. */
  at: number;
  /** Wrong pieces over the whole set so far. */
  misses: number;
  /** Wrong pieces tried on this puzzle, by place in the basket, so they can be dimmed. */
  tried: number[];
  /** Every puzzle of the set is done. */
  won: boolean;
  /** The try ended with too many wrong pieces. */
  failed: boolean;
}

export const startPlay = (puzzles: readonly Level[]): Play => ({ puzzles, at: 0, misses: 0, tried: [], won: false, failed: false });

export const puzzleOf = (play: Play): Level => play.puzzles[play.at];

export interface Answered {
  play: Play;
  right: boolean;
  /** The right piece finished a puzzle that isn't the set's last, and the next one comes up. */
  solvedOne: boolean;
  /** The rule a wrong piece breaks. */
  broken: Attr | null;
}

export function answer(play: Play, option: number): Answered | null {
  const level = puzzleOf(play);
  if (play.won || play.failed || play.tried.includes(option) || !level.options[option]) return null;
  if (option === level.answer) {
    const last = play.at === play.puzzles.length - 1;
    const next = last ? { ...play, won: true } : { ...play, at: play.at + 1, tried: [] };
    return { play: next, right: true, solvedOne: !last, broken: null };
  }
  const misses = play.misses + 1;
  return {
    play: { ...play, misses, failed: misses >= missLimit(level), tried: [...play.tried, option] },
    right: false,
    solvedOne: false,
    broken: brokenBy(shownFor(level), level.options[option])[0] ?? null,
  };
}

/** The rows and columns that show a rule, counted from 0: the ones that shake when a piece breaks it. */
export interface Lines {
  rows: number[];
  cols: number[];
}

/** The line through the gap that a broken rule runs along. "Once each" runs both ways. */
export function linesFor(level: Level, attr: Attr): Lines {
  const last = level.size - 1;
  const law = level.laws[attr];
  if (law === 'cols' || law === 'down') return { rows: [], cols: [last] };
  if (law === 'latin') return { rows: [last], cols: [last] };
  return { rows: [last], cols: [] };
}

/** The line that shows a rule best, for the demo and the hint: the first row or column, away from the gap. */
export function showLine(level: Level, attr: Attr): Lines {
  const law = level.laws[attr];
  if (law === 'cols' || law === 'down') return { rows: [], cols: [0] };
  if (law === 'latin') return { rows: [0], cols: [0] };
  return { rows: [0], cols: [] };
}

/** The rules that change from patch to patch, in the order the level meant them. */
export const movingRules = (level: Level): Attr[] => level.attrs.filter((attr) => level.laws[attr] !== 'same');
