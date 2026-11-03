// One try at a level: a set of three puzzles of the same kind, the options tried, misses over the whole set, the
// end of a try, and what to show for a wrong choice: a mirror image flips over, a tile in the wrong place lights
// up. Pure, so the tests and the bots can play it too.
import { missLimit, type Puzzle, type Slip } from './levels.ts';
import { difference, relation, type Tile } from './shapes.ts';

export interface Play {
  /** The set's puzzles, in order. */
  puzzles: readonly Puzzle[];
  /** Which puzzle is on screen now. */
  at: number;
  /** Wrong choices over the whole set so far. */
  misses: number;
  /** Wrong options tried on this puzzle, by place, so they can be dimmed. */
  tried: number[];
  /** Wrong pairs tried on this puzzle, written "first-second" with the lower place first. */
  triedPairs: string[];
  /** Every puzzle of the set is done. */
  won: boolean;
  /** The try ended with too many wrong choices. */
  failed: boolean;
}

export const startPlay = (puzzles: readonly Puzzle[]): Play => ({ puzzles, at: 0, misses: 0, tried: [], triedPairs: [], won: false, failed: false });

export const puzzleOf = (play: Play): Puzzle => play.puzzles[play.at];

/** What a wrong choice shows: it flips over to show it is backwards, its odd tiles light up, or it is just another shape. */
export type Feedback = { kind: 'mirror' } | { kind: 'tiles'; wrong: Tile[]; missing: Tile[] } | { kind: 'shape' };

export interface Answered {
  play: Play;
  right: boolean;
  /** The right choice finished a puzzle that isn't the set's last, and the next one comes up. */
  solvedOne: boolean;
  feedback: Feedback | null;
}

/** The most odd tiles worth lighting up. More than this, and it is simply another shape. */
const MOST_ODD = 2;

/** What a wrong shape shows when compared with the one it should match. */
export function feedbackFor(from: readonly Tile[], to: readonly Tile[], slip: Slip | null): Feedback {
  if (slip === 'mirror' || (slip === null && relation(from, to) === 'mirror')) return { kind: 'mirror' };
  if (slip === 'shape') return { kind: 'shape' };
  const { wrong, missing } = difference(from, to);
  return wrong.length <= MOST_ODD && missing.length <= MOST_ODD ? { kind: 'tiles', wrong, missing } : { kind: 'shape' };
}

function next(play: Play): Answered {
  const last = play.at === play.puzzles.length - 1;
  const moved = last ? { ...play, won: true } : { ...play, at: play.at + 1, tried: [], triedPairs: [] };
  return { play: moved, right: true, solvedOne: !last, feedback: null };
}

const missed = (play: Play, puzzle: Puzzle, change: Partial<Play>): Play => {
  const misses = play.misses + 1;
  return { ...play, ...change, misses, failed: misses >= missLimit(puzzle) };
};

/** Taps an option under the target. */
export function answer(play: Play, option: number): Answered | null {
  const puzzle = puzzleOf(play);
  if (puzzle.kind !== 'match' || play.won || play.failed || play.tried.includes(option) || !puzzle.options[option]) return null;
  if (option === puzzle.answer) return next(play);
  return {
    play: missed(play, puzzle, { tried: [...play.tried, option] }),
    right: false,
    solvedOne: false,
    feedback: feedbackFor(puzzle.target, puzzle.options[option], puzzle.slips[option]),
  };
}

export const pairKey = (first: number, second: number): string => `${Math.min(first, second)}-${Math.max(first, second)}`;

/**
 * Picks two cards in "which two are the same?". The second card is the one that shows what is wrong, compared
 * with the first.
 */
export function answerPair(play: Play, first: number, second: number): Answered | null {
  const puzzle = puzzleOf(play);
  const key = pairKey(first, second);
  if (puzzle.kind !== 'pairs' || !puzzle.pair || play.won || play.failed || first === second) return null;
  if (!puzzle.options[first] || !puzzle.options[second] || play.triedPairs.includes(key)) return null;
  if (key === pairKey(...puzzle.pair)) return next(play);
  return {
    play: missed(play, puzzle, { triedPairs: [...play.triedPairs, key] }),
    right: false,
    solvedOne: false,
    feedback: feedbackFor(puzzle.options[first], puzzle.options[second], null),
  };
}
