// The puzzle as data: rows of fruit pictures that add up to a number, and the question row at the bottom.
// Pure, so the tests, the hint and the bots all read the same rows the screen draws.

export type Fruit = 'apple' | 'banana' | 'strawberry' | 'pear' | 'orange' | 'lemon' | 'pineapple' | 'watermelon';
export const FRUITS: readonly Fruit[] = ['apple', 'banana', 'strawberry', 'pear', 'orange', 'lemon', 'pineapple', 'watermelon'];

/**
 * How a fruit is drawn in a row. `one` is a single fruit. `bunch` is several of the same fruit in one picture,
 * worth that many. `times` is "2 ×" in front of a single fruit.
 */
export type Shape = 'one' | 'bunch' | 'times';

export interface Term {
  fruit: Fruit;
  shape: Shape;
  /** How many of the fruit the picture is worth: 1 for one, 2 or 3 for bunch and times. */
  count: number;
  /** Plus or minus in front of it. The first term of a row is always plus. */
  sign: 1 | -1;
}

/** A clue: these pictures add up to this number. */
export interface Row {
  terms: Term[];
  total: number;
}

export interface Puzzle {
  clues: Row[];
  /** The bottom row: what do these pictures add up to? */
  question: Term[];
}

/** What each fruit stands for. */
export type Values = Partial<Record<Fruit, number>>;

/** A term's own worth with its sign: a bunch of 3 bananas worth 2 each is 6, and minus that is -6. */
export const termValue = (term: Term, value: number): number => term.sign * term.count * value;

/** What the pictures add up to, or null while any fruit in them is still unknown. */
export function sumOf(terms: readonly Term[], values: Values): number | null {
  let sum = 0;
  for (const term of terms) {
    const value = values[term.fruit];
    if (value === undefined) return null;
    sum += termValue(term, value);
  }
  return sum;
}

/** What the sticker on a picture says: the fruit's number, times how many the picture holds. */
export const termWorth = (term: Term, value: number): number => term.count * value;

/** Each fruit once, in the order it first appears. */
export function fruitsIn(terms: readonly Term[]): Fruit[] {
  return [...new Set(terms.map((term) => term.fruit))];
}

export function fruitsOf(puzzle: Puzzle): Fruit[] {
  return [...new Set([...puzzle.clues.flatMap((row) => fruitsIn(row.terms)), ...fruitsIn(puzzle.question)])];
}

export const holds = (row: Row, values: Values): boolean => sumOf(row.terms, values) === row.total;

/** The question is a single plain fruit: "🍌 = ?". Then finding that fruit answers it. */
export function loneFruit(puzzle: Puzzle): Fruit | null {
  const [only, ...rest] = puzzle.question;
  return only && !rest.length && only.shape === 'one' ? only.fruit : null;
}

const SHAPE_MARK: Record<Shape, (term: Term) => string> = {
  one: (term) => term.fruit,
  bunch: (term) => `${term.count}${term.fruit}s`,
  times: (term) => `${term.count}×${term.fruit}`,
};

/** Terms as text, the way the bots read the board: "apple+apple" or "3bananas-pear". */
export function picture(terms: readonly Term[]): string {
  return terms.map((term, at) => `${at === 0 ? '' : term.sign > 0 ? '+' : '-'}${SHAPE_MARK[term.shape](term)}`).join('');
}

export const rowPicture = (row: Row): string => `${picture(row.terms)}=${row.total}`;
