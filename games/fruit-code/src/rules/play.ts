// One go at a level: which fruit the number buttons are setting, answers, decoded fruits, misses and stars.
// Pure, so the tests and the bots can play it too.
import { fruitsIn, loneFruit, sumOf, type Fruit, type Values } from './equation.ts';
import { questionValue, type Level, type Target } from './levels.ts';

export interface Play {
  level: Level;
  /** Fruits worked out so far. Each one wears a number sticker everywhere it appears. */
  known: Values;
  /** What the number buttons set now. */
  target: Target;
  /** Wrong numbers in this try. */
  misses: number;
  /** Wrong numbers tried for each target, so they can be dimmed. */
  tried: Partial<Record<Target, number[]>>;
  won: boolean;
  /** The try ended with too many wrong numbers. */
  failed: boolean;
}

export function startPlay(level: Level): Play {
  return { level, known: {}, target: 'question', misses: 0, tried: {}, won: false, failed: false };
}

/**
 * Wrong numbers that end a try. With three choices, two misses end it, so trying every number never wins. With
 * 0 to 20 it is three, which still leaves room for a slip.
 */
export const missLimit = (level: Level): number => (level.answer === 'three' ? 2 : 3);

const over = (play: Play): boolean => play.won || play.failed;

/** A lone-fruit question and that fruit are the same thing to work out, so they share one target. */
function normalize(level: Level, target: Target): Target {
  return target !== 'question' && loneFruit(level.puzzle) === target ? 'question' : target;
}

/** Points the number buttons at a fruit, or back at the question. A fruit already found stays as it is. */
export function select(play: Play, target: Target): Play {
  if (over(play)) return play;
  if (target !== 'question' && play.known[target] !== undefined) return play;
  return { ...play, target: normalize(play.level, target) };
}

export const truthOf = (level: Level, target: Target): number =>
  target === 'question' ? questionValue(level) : (level.values[target] as number);

export const choicesOf = (play: Play): number[] => play.level.choices[play.target] ?? [];

/** A clue row whose sum can be worked out with a guess in place: how far off it comes. */
export interface Check {
  row: number;
  sum: number;
  total: number;
}

export interface Answered {
  play: Play;
  right: boolean;
  /** The fruit that got its sticker, if any. */
  decoded: Fruit | null;
  /**
   * For a wrong fruit: every clue row whose sum the guess makes knowable, with what it would add up to, so the
   * row can show it doesn't add up. Empty when no row can be checked yet.
   */
  checks: Check[];
}

/** What the guess would make each checkable row add up to. Only fruits already found are used, never the truth. */
export function checksFor(play: Play, fruit: Fruit, value: number): Check[] {
  const values: Values = { ...play.known, [fruit]: value };
  return play.level.puzzle.clues.flatMap((row, at) => {
    if (!fruitsIn(row.terms).includes(fruit)) return [];
    const sum = sumOf(row.terms, values);
    return sum === null ? [] : [{ row: at, sum, total: row.total }];
  });
}

const targetFruit = (play: Play): Fruit | null => (play.target === 'question' ? loneFruit(play.level.puzzle) : play.target);

export function answer(play: Play, value: number): Answered | null {
  if (over(play)) return null;
  const { level, target } = play;
  const fruit = targetFruit(play);
  if (value !== truthOf(level, target)) {
    const tried = play.tried[target] ?? [];
    const misses = play.misses + 1;
    return {
      play: {
        ...play,
        misses,
        failed: misses >= missLimit(level),
        tried: { ...play.tried, [target]: tried.includes(value) ? tried : [...tried, value] },
      },
      right: false,
      decoded: null,
      checks: fruit ? checksFor(play, fruit, value) : [],
    };
  }
  const known = fruit ? { ...play.known, [fruit]: value } : play.known;
  return {
    play: { ...play, known, target: 'question', won: target === 'question' },
    right: true,
    decoded: fruit,
    checks: [],
  };
}

/** Fruits still hiding their number. */
export const unknownFruits = (play: Play): Fruit[] =>
  [...new Set(play.level.puzzle.clues.flatMap((row) => fruitsIn(row.terms)))].filter((fruit) => play.known[fruit] === undefined);
