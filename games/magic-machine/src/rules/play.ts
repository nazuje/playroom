// One go at a level: a short shift of puzzles of the same shape, the answers tried, misses across the shift, the
// end of a try and stars. Pure, so the tests and the bots can play it too.
import type { Level } from './levels.ts';
import { cardKey, fitsEach, run, sameCard, withCard, type Card } from './machine.ts';

/** A number token, or a rule card. */
export type Pick = number | Card;

export interface Play {
  /** The puzzles of this go, played in order. */
  shift: readonly Level[];
  /** Which puzzle of the shift is on the machine. */
  at: number;
  /** Wrong answers in this go, across the whole shift. */
  misses: number;
  /** Wrong answers tried on this puzzle, as keys, so they can be dimmed. */
  tried: string[];
  /** Every puzzle of the shift is solved. */
  won: boolean;
  /** The try ended with too many wrong answers. */
  failed: boolean;
}

export const pickKey = (pick: Pick): string => (typeof pick === 'number' ? String(pick) : cardKey(pick));

export function startPlay(shift: readonly Level[]): Play {
  return { shift, at: 0, misses: 0, tried: [], won: false, failed: false };
}

export const current = (play: Play): Level => play.shift[play.at];

/**
 * The wrong answer that ends a try, counted across the whole shift. With three tokens or three cards that is the
 * fourth, and with 0 to 20 too: about one slip per puzzle, while trying every answer on every puzzle never fits.
 * The grown-up card levels offer four or five cards where every wrong one fits some example, so a second wrong
 * card ends the try and guessing through them rarely wins.
 */
export function missLimit(level: Level): number {
  if (level.answer === 'cards' && level.cards.length > 3) return 2;
  return 4;
}

export const isRight = (level: Level, pick: Pick): boolean =>
  typeof level.truth === 'number' ? pick === level.truth : typeof pick !== 'number' && sameCard(pick, level.truth);

/** What a wrong answer shows, so the player can see why it was wrong without being told the answer. */
export interface Why {
  /** Backwards: what the guess really makes, or null when the machine can't take it. */
  makes?: number | null;
  /** A rule card: which examples it gets right. */
  checks?: boolean[];
}

export function whyWrong(level: Level, pick: Pick): Why {
  const { puzzle } = level;
  if (typeof pick !== 'number') return { checks: fitsEach(withCard(puzzle, pick), puzzle.examples) };
  if (puzzle.ask === 'in') return { makes: run(puzzle.machines, pick) };
  return {};
}

export interface Answered {
  play: Play;
  right: boolean;
  /** A right answer that moves the shift on to its next puzzle. */
  advanced: boolean;
  why: Why;
}

export function answer(play: Play, pick: Pick): Answered | null {
  if (play.won || play.failed) return null;
  const level = current(play);
  if (isRight(level, pick)) {
    const last = play.at >= play.shift.length - 1;
    return {
      play: last ? { ...play, won: true } : { ...play, at: play.at + 1, tried: [] },
      right: true,
      advanced: !last,
      why: {},
    };
  }
  const key = pickKey(pick);
  const misses = play.misses + 1;
  return {
    play: { ...play, misses, failed: misses >= missLimit(level), tried: play.tried.includes(key) ? play.tried : [...play.tried, key] },
    right: false,
    advanced: false,
    why: whyWrong(level, pick),
  };
}

/**
 * Stars count every miss on a level since it was last won, across every try, so starting again never buys a
 * better score. Three stars only for none at all, two for one or two, and one for more.
 */
export const starsFor = (missesOnLevel: number): number => (missesOnLevel === 0 ? 3 : missesOnLevel <= 2 ? 2 : 1);
