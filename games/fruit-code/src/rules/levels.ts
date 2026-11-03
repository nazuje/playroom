// The staircase. Each level is made by a small pure generator from a fixed seed, so the numbers are the same on
// every device and every run, and the tests can prove each puzzle has exactly one whole-number answer.
import { FRUITS, loneFruit, picture, sumOf, type Fruit, type Puzzle, type Row, type Term, type Values } from './equation.ts';
import { plan, solutions } from './solve.ts';

export type WorldId = 'one' | 'two' | 'chain' | 'count' | 'system';
export const WORLDS: readonly WorldId[] = ['one', 'two', 'chain', 'count', 'system'];

/** What the number buttons are setting: one fruit, or the question at the bottom. */
export type Target = Fruit | 'question';

export interface Level {
  id: number;
  /** Which of the level's puzzles this is. Every retry and replay moves on to a fresh one of the same shape. */
  variant: number;
  world: WorldId;
  puzzle: Puzzle;
  /** What every fruit really stands for. */
  values: Values;
  /** Three big numbers to pick from, or every number from 0 to 20. */
  answer: 'three' | 'picker';
  /** The numbers offered for each thing a player can work out, smallest first. */
  choices: Partial<Record<Target, number[]>>;
}

/** Puzzles per level. A level can be skipped after 5 failed tries, so a child never sees the same puzzle twice in a row of tries. */
export const VARIANTS = 5;

export const MOST = 20;
export const PICKER: readonly number[] = Array.from({ length: MOST + 1 }, (_, n) => n);
/** On picker levels no answer sits within this of a number on the board, so copying a number never works. */
const FAR_FROM_TOTALS = 3;

/** A small seeded random source (mulberry32), so a level never changes between runs. */
export function seeded(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let mixed = Math.imul(state ^ (state >>> 15), 1 | state);
    mixed ^= mixed + Math.imul(mixed ^ (mixed >>> 7), 61 | mixed);
    return ((mixed ^ (mixed >>> 14)) >>> 0) / 4294967296;
  };
}

type Random = () => number;
const int = (random: Random, low: number, high: number): number => low + Math.floor(random() * (high - low + 1));

// ---------- Row templates ----------

type Letter = 'A' | 'B' | 'C';
const LETTERS: readonly Letter[] = ['A', 'B', 'C'];

interface TermPlan {
  letter: Letter;
  shape: Term['shape'];
  count: number;
  sign: 1 | -1;
}

/**
 * Reads a row template: "A+A" is two of fruit A, "b3A" a bunch of three, "x2A" is 2 × A, and "-" takes away.
 * Templates are written in this file, so a typo is a bug and throws at once.
 */
export function readTemplate(template: string): TermPlan[] {
  return (template.match(/[+-]?[^+-]+/g) ?? []).map((part, at) => {
    const found = /^([+-]?)(?:(b|x)(\d))?([ABC])$/.exec(part);
    if (!found) throw new Error(`Bad row template: ${template}`);
    const [, sign, kind, count, letter] = found;
    if (at === 0 && sign === '-') throw new Error(`A row starts with plus: ${template}`);
    return {
      letter: letter as Letter,
      shape: kind === 'b' ? 'bunch' : kind === 'x' ? 'times' : 'one',
      count: count ? Number(count) : 1,
      sign: sign === '-' ? -1 : 1,
    };
  });
}

const termsFor = (plans: readonly TermPlan[], fruits: Record<Letter, Fruit>): Term[] =>
  plans.map(({ letter, shape, count, sign }) => ({ fruit: fruits[letter], shape, count, sign }));

// ---------- Levels ----------

interface Spec {
  world: WorldId;
  answer: Level['answer'];
  clues: string[];
  question: string;
  /** The lowest and highest number each fruit can stand for. */
  ranges: Partial<Record<Letter, [number, number]>>;
  /** Fixed fruits, for the classic first puzzles. Otherwise they are picked from the seed. */
  fruits?: Fruit[];
}

const SPECS: Spec[] = [
  // 1. One fruit: the same fruit is the same number.
  { world: 'one', answer: 'three', clues: ['A+A'], question: 'A', ranges: { A: [2, 4] }, fruits: ['apple'] },
  { world: 'one', answer: 'three', clues: ['A+A+A'], question: 'A', ranges: { A: [2, 4] } },
  { world: 'one', answer: 'three', clues: ['A+A', 'A+A+A'], question: 'A', ranges: { A: [3, 5] } },
  { world: 'one', answer: 'three', clues: ['A+A+A'], question: 'A', ranges: { A: [4, 6] } },

  // 2. Two fruits: find one, then use it to find the next.
  { world: 'two', answer: 'three', clues: ['A+A', 'A+B'], question: 'B', ranges: { A: [2, 4], B: [1, 6] }, fruits: ['apple', 'banana'] },
  { world: 'two', answer: 'three', clues: ['A+A+A', 'A+B'], question: 'B', ranges: { A: [2, 4], B: [2, 8] } },
  { world: 'two', answer: 'three', clues: ['A+B', 'A+A'], question: 'B', ranges: { A: [3, 6], B: [2, 8] } },
  { world: 'two', answer: 'three', clues: ['A+A', 'B+B+A'], question: 'B', ranges: { A: [2, 5], B: [2, 6] } },
  { world: 'two', answer: 'three', clues: ['B+B+A', 'A+A+A'], question: 'B', ranges: { A: [2, 5], B: [2, 7] } },

  // 3. A chain of three fruits, and questions that add two of them.
  { world: 'chain', answer: 'picker', clues: ['A+A', 'A+B', 'B+C'], question: 'C', ranges: { A: [2, 5], B: [1, 7], C: [1, 8] } },
  { world: 'chain', answer: 'picker', clues: ['A+A+A', 'A+B', 'B+C'], question: 'A+C', ranges: { A: [2, 4], B: [2, 8], C: [2, 8] } },
  { world: 'chain', answer: 'picker', clues: ['B+C', 'A+A', 'A+B'], question: 'A+C', ranges: { A: [2, 6], B: [2, 8], C: [2, 8] } },
  { world: 'chain', answer: 'picker', clues: ['A+B+C', 'A+A', 'B+B'], question: 'B+C', ranges: { A: [2, 6], B: [2, 6], C: [1, 6] } },
  { world: 'chain', answer: 'picker', clues: ['C+C+B', 'A+B', 'A+A+A'], question: 'A+B+C', ranges: { A: [2, 5], B: [2, 6], C: [2, 6] } },

  // 4. Count every fruit in a bunch, and take away.
  { world: 'count', answer: 'picker', clues: ['b3A', 'A+B'], question: 'B', ranges: { A: [2, 5], B: [2, 8] } },
  { world: 'count', answer: 'picker', clues: ['A+A', 'A-B'], question: 'B', ranges: { A: [4, 8], B: [1, 6] } },
  { world: 'count', answer: 'picker', clues: ['b2A+B', 'A+A+A'], question: 'B', ranges: { A: [2, 5], B: [2, 8] } },
  { world: 'count', answer: 'picker', clues: ['A-B', 'b3B'], question: 'A', ranges: { A: [5, 12], B: [2, 5] } },
  { world: 'count', answer: 'picker', clues: ['b3A-B', 'A+A', 'B+C'], question: 'A+C', ranges: { A: [3, 6], B: [1, 8], C: [1, 8] } },

  // 5. Code breakers: no row has only one fruit to find, so two rows have to work together.
  { world: 'system', answer: 'picker', clues: ['A+B', 'A-B'], question: 'A', ranges: { A: [4, 11], B: [1, 7] } },
  { world: 'system', answer: 'picker', clues: ['A+B', 'A+A+B'], question: 'B', ranges: { A: [2, 7], B: [2, 8] } },
  { world: 'system', answer: 'picker', clues: ['x3A+B', 'A+B'], question: 'B', ranges: { A: [2, 5], B: [1, 8] } },
  { world: 'system', answer: 'picker', clues: ['A+B', 'B+C', 'A+C'], question: 'A+B+C', ranges: { A: [2, 8], B: [2, 8], C: [2, 8] } },
  { world: 'system', answer: 'picker', clues: ['x2A+B', 'B+C', 'A-C'], question: 'A+B+C', ranges: { A: [3, 8], B: [1, 8], C: [1, 6] } },
];

const SEED = 20261103;

function pickFruits(random: Random, count: number): Fruit[] {
  const pool = [...FRUITS];
  const picked: Fruit[] = [];
  while (picked.length < count) picked.push(...pool.splice(Math.floor(random() * pool.length), 1));
  return picked;
}

/** Two close wrong numbers and the right one, smallest first. The tempting number is a child's first guess. */
function threeChoices(random: Random, answer: number, tempting: number): number[] {
  const near = [answer - 1, answer + 1, answer + 2, answer - 2, tempting];
  const pool = [...new Set(near)].filter((n) => n >= 1 && n <= MOST && n !== answer);
  const picked: number[] = [];
  while (picked.length < 2) picked.push(...pool.splice(Math.floor(random() * pool.length), 1));
  return [answer, ...picked].sort((a, b) => a - b);
}

/** The quick guess for a fruit: the number at the end of the last row that holds it. */
export function temptingFor(puzzle: Puzzle, fruits: readonly Fruit[]): number {
  const holding = puzzle.clues.filter((row) => row.terms.some((term) => fruits.includes(term.fruit)));
  return holding.at(-1)?.total ?? 0;
}

interface Made {
  puzzle: Puzzle;
  values: Values;
}

function attempt(spec: Spec, random: Random, variant: number): Made | null {
  const letters = LETTERS.filter((letter) => spec.ranges[letter]);
  // The classic first puzzles keep their fruits. Their fresh puzzles get new ones.
  const chosen = variant === 0 && spec.fruits ? spec.fruits : pickFruits(random, letters.length);
  const fruits = Object.fromEntries(letters.map((letter, at) => [letter, chosen[at]])) as Record<Letter, Fruit>;
  const values: Values = {};
  for (const letter of letters) {
    const [low, high] = spec.ranges[letter] as [number, number];
    values[fruits[letter]] = int(random, low, high);
  }
  // Different fruits stand for different numbers, so a sticker never says two things at once.
  if (new Set(Object.values(values)).size !== letters.length) return null;
  const clues: Row[] = spec.clues.map((template) => {
    const terms = termsFor(readTemplate(template), fruits);
    return { terms, total: sumOf(terms, values) as number };
  });
  const question = termsFor(readTemplate(spec.question), fruits);
  const answer = sumOf(question, values) as number;
  if (clues.some((row) => row.total < 1 || row.total > MOST) || answer < 1 || answer > MOST) return null;
  if (clues.some((row) => picture(row.terms) === picture(question))) return null;
  const puzzle = { clues, question };
  if (spec.answer === 'picker' && clues.some((row) => Math.abs(row.total - answer) < FAR_FROM_TOTALS)) return null;
  if (solutions(puzzle).length !== 1) return null;
  try {
    plan(puzzle);
  } catch {
    return null;
  }
  return { puzzle, values };
}

const shapeOf = ({ puzzle }: Made): string => [...puzzle.clues.map((row) => `${picture(row.terms)}=${row.total}`), picture(puzzle.question)].join('|');

/** Tries a generator until its numbers fit and the puzzle differs from the level's others. Every spec finds one within a few tries. */
function draw(spec: Spec, random: Random, variant: number, taken: ReadonlySet<string>): Made {
  for (let tries = 0; tries < 5000; tries += 1) {
    const made = attempt(spec, random, variant);
    if (made && !taken.has(shapeOf(made))) return made;
  }
  throw new Error(`No level fits: ${spec.clues.join(', ')}`);
}

function choicesFor(spec: Spec, random: Random, { puzzle, values }: Made): Level['choices'] {
  const fruits = [...new Set(puzzle.clues.flatMap((row) => row.terms.map((term) => term.fruit)))];
  if (spec.answer === 'picker') {
    return Object.fromEntries([...fruits, 'question'].map((target) => [target, [...PICKER]]));
  }
  const choices: Level['choices'] = {};
  for (const fruit of fruits) choices[fruit] = threeChoices(random, values[fruit] as number, temptingFor(puzzle, [fruit]));
  const lone = loneFruit(puzzle);
  choices.question = lone
    ? choices[lone]
    : threeChoices(random, sumOf(puzzle.question, values) as number, temptingFor(puzzle, puzzle.question.map((term) => term.fruit)));
  return choices;
}

function build(spec: Spec, index: number): Level[] {
  const taken = new Set<string>();
  return Array.from({ length: VARIANTS }, (_, variant) => {
    const random = seeded(SEED + index * 7919 + variant * 104729);
    const made = draw(spec, random, variant, taken);
    taken.add(shapeOf(made));
    return { id: index + 1, variant, world: spec.world, ...made, answer: spec.answer, choices: choicesFor(spec, random, made) };
  });
}

/** Makes every puzzle of the whole staircase from its seeds, by level and then variant. The same call always makes the same ones. */
export const buildLevels = (): Level[][] => SPECS.map(build);

export const ALL_VARIANTS: readonly (readonly Level[])[] = buildLevels();

/** The first puzzle of each level, which stands for the level on the map. */
export const LEVELS: readonly Level[] = ALL_VARIANTS.map((variants) => variants[0]);

/** Every puzzle of every level. */
export const EVERY_PUZZLE: readonly Level[] = ALL_VARIANTS.flat();

export const levelById = (id: number): Level | undefined => LEVELS.find((level) => level.id === id);

/** The puzzle for a level's nth go, wrapping round. */
export const levelFor = (id: number, go: number): Level | undefined => ALL_VARIANTS[id - 1]?.[((go % VARIANTS) + VARIANTS) % VARIANTS];

/** What the question at the bottom adds up to. */
export const questionValue = (level: Level): number => sumOf(level.puzzle.question, level.values) as number;
