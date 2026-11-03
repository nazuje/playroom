// One go at a level: the answers tried, misses, the end of a try and stars. Pure, so the tests and the bots can
// play it too.
import type { Level } from './levels.ts';
import { fitsEach, hiddenSlot, ruleKey, run, sameRule, withRule, type Rule } from './machine.ts';

/** A number token, or a rule card. */
export type Pick = number | Rule;

export interface Play {
  level: Level;
  /** Wrong answers in this try. */
  misses: number;
  /** Wrong answers tried, as keys, so they can be dimmed. */
  tried: string[];
  won: boolean;
  /** The try ended with too many wrong answers. */
  failed: boolean;
}

export const pickKey = (pick: Pick): string => (typeof pick === 'number' ? String(pick) : ruleKey(pick));

export function startPlay(level: Level): Play {
  return { level, misses: 0, tried: [], won: false, failed: false };
}

/**
 * Wrong answers that end a try. With three tokens or three cards, two misses end it, so trying every one never
 * wins. With 0 to 20 it is three, which still leaves room for a slip.
 */
export const missLimit = (level: Level): number => (level.answer === 'picker' ? 3 : 2);

export const isRight = (level: Level, pick: Pick): boolean =>
  typeof level.truth === 'number' ? pick === level.truth : typeof pick !== 'number' && sameRule(pick, level.truth);

/** What a wrong answer shows, so the player can see why it was wrong without being told the answer. */
export interface Why {
  /** Backwards: what the guess really makes, or null when the machine can't take it. */
  makes?: number | null;
  /** A rule card: which examples it gets right. */
  checks?: boolean[];
}

export function whyWrong(level: Level, pick: Pick): Why {
  const { puzzle } = level;
  if (typeof pick !== 'number') return { checks: fitsEach(withRule(puzzle.machines, hiddenSlot(puzzle), pick), puzzle.examples) };
  if (puzzle.ask === 'in') return { makes: run(puzzle.machines, pick) };
  return {};
}

export interface Answered {
  play: Play;
  right: boolean;
  why: Why;
}

export function answer(play: Play, pick: Pick): Answered | null {
  if (play.won || play.failed) return null;
  const { level } = play;
  if (isRight(level, pick)) return { play: { ...play, won: true }, right: true, why: {} };
  const key = pickKey(pick);
  const misses = play.misses + 1;
  return {
    play: { ...play, misses, failed: misses >= missLimit(level), tried: play.tried.includes(key) ? play.tried : [...play.tried, key] },
    right: false,
    why: whyWrong(level, pick),
  };
}

/**
 * Stars count every miss on a level since it was last won, across every try, so starting again never buys a
 * better score. Three stars only for none at all, two for one or two, and one for more.
 */
export const starsFor = (missesOnLevel: number): number => (missesOnLevel === 0 ? 3 : missesOnLevel <= 2 ? 2 : 1);
