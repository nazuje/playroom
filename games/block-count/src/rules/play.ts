// One try at a level: a set of three puzzles of the same kind, the answers tried, misses across the set, and the
// end of a try. Pure, so the tests and the bots can play it too.
import { missLimit, type Level } from './levels.ts';

export interface Play {
  /** The set's puzzles, in order. */
  puzzles: readonly Level[];
  /** Which puzzle is on the stage now. */
  at: number;
  /** Wrong answers over the whole set so far. */
  misses: number;
  /** Wrong answers tried on this puzzle, so they can be dimmed: numbers, or map places. */
  tried: number[];
  /** Every puzzle of the set is done. */
  won: boolean;
  /** The try ended with too many wrong answers. */
  failed: boolean;
}

export const startPlay = (puzzles: readonly Level[]): Play => ({ puzzles, at: 0, misses: 0, tried: [], won: false, failed: false });

export const puzzleOf = (play: Play): Level => play.puzzles[play.at];

export interface Answered {
  play: Play;
  right: boolean;
  /** The right answer finished a puzzle that isn't the set's last, and the next one comes up. */
  solvedOne: boolean;
}

/** An answer: a number, or on a map question the place of a map card. Repeats and answers after the end do nothing. */
export function answer(play: Play, pick: number): Answered | null {
  const level = puzzleOf(play);
  if (play.won || play.failed || play.tried.includes(pick)) return null;
  const offered = level.answer === 'maps' ? pick >= 0 && pick < level.maps.length : level.numbers.includes(pick);
  if (!offered) return null;
  if (pick === level.truth) {
    const last = play.at === play.puzzles.length - 1;
    const next = last ? { ...play, won: true } : { ...play, at: play.at + 1, tried: [] };
    return { play: next, right: true, solvedOne: !last };
  }
  const misses = play.misses + 1;
  return { play: { ...play, misses, failed: misses >= missLimit(level), tried: [...play.tried, pick] }, right: false, solvedOne: false };
}
