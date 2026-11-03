import { addParts, COLORS, mix, PAINTS } from './mix.ts';
import type { ColorId, Paint, Parts } from './mix.ts';

export type Rng = () => number;
export type Level = 0 | 1 | 2;

export const LEVELS: { level: Level; emoji: string }[] = [
  { level: 0, emoji: '🌱' },
  { level: 1, emoji: '🌿' },
  { level: 2, emoji: '🌳' },
];

export const ROUND_SIZE = 5;

export function shuffle<T>(items: readonly T[], rng: Rng): T[] {
  const shuffled = [...items];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j] as T, shuffled[i] as T];
  }
  return shuffled;
}

/**
 * One round: a fresh order with no repeats, however big the pool is. Anything in
 * `avoid`, such as last round's questions, comes only after everything else.
 */
export function pickRound<T>(pool: readonly T[], rng: Rng, avoid: readonly T[] = []): T[] {
  const fresh = shuffle(
    pool.filter((item) => !avoid.includes(item)),
    rng,
  );
  const again = shuffle(
    pool.filter((item) => avoid.includes(item)),
    rng,
  );
  return [...fresh, ...again].slice(0, ROUND_SIZE);
}

/** How often a surprise pops out of the beaker after a mix: about one mix in six. */
export const SURPRISE_CHANCE = 1 / 6;
export const SURPRISES = ['🐸', '🐙', '🦄', '🐥', '🐟', '🦆', '🐌', '🌈', '🦋', '🐞'] as const;

/** Now and then a little creature, or a rainbow, pops out of the paint. Usually nothing does. */
export function pickSurprise(rng: Rng): string | null {
  if (rng() >= SURPRISE_CHANCE) return null;
  return SURPRISES[Math.floor(rng() * SURPRISES.length)] ?? null;
}

// ---------- Guess the color ----------

/** Paints a Guess question can show in a pot. The mixed ones are made of real parts. */
export const POTS = {
  red: { red: 1 },
  yellow: { yellow: 1 },
  blue: { blue: 1 },
  white: { white: 1 },
  black: { black: 1 },
  orange: { red: 1, yellow: 1 },
  green: { yellow: 1, blue: 1 },
  purple: { red: 1, blue: 1 },
  brown: { red: 1, yellow: 1, blue: 1 },
} as const satisfies Record<string, Parts>;

export type PotColor = keyof typeof POTS & ColorId;

export interface Question {
  a: PotColor;
  b: PotColor;
}

export const QUESTIONS: Record<Level, Question[]> = {
  0: [
    { a: 'red', b: 'yellow' },
    { a: 'yellow', b: 'blue' },
    { a: 'red', b: 'blue' },
    { a: 'red', b: 'white' },
    { a: 'blue', b: 'white' },
    { a: 'black', b: 'white' },
    { a: 'yellow', b: 'white' },
  ],
  1: [
    { a: 'orange', b: 'white' },
    { a: 'green', b: 'white' },
    { a: 'purple', b: 'white' },
    { a: 'red', b: 'black' },
    { a: 'blue', b: 'black' },
    { a: 'yellow', b: 'black' },
    { a: 'green', b: 'black' },
  ],
  2: [
    { a: 'red', b: 'green' },
    { a: 'orange', b: 'blue' },
    { a: 'purple', b: 'yellow' },
    { a: 'brown', b: 'white' },
    { a: 'brown', b: 'black' },
    { a: 'orange', b: 'black' },
    { a: 'purple', b: 'black' },
  ],
};

/** The same question with its pots swapped half the time, so a repeat still looks new. */
export function sideSwapped(question: Question, rng: Rng): Question {
  return rng() < 0.5 ? question : { a: question.b, b: question.a };
}

export function questionParts(question: Question): Parts {
  return addParts(POTS[question.a], POTS[question.b]);
}

export function questionAnswer(question: Question): ColorId {
  const answer = mix(questionParts(question));
  if (!answer) throw new Error(`No color for ${question.a} + ${question.b}`);
  return answer;
}

const DECOYS: ColorId[] = [
  'orange',
  'green',
  'purple',
  'pink',
  'lightBlue',
  'grey',
  'mint',
  'lilac',
  'peach',
  'brown',
  'maroon',
  'navy',
];

function pickDecoys(question: Question, rng: Rng): ColorId[] {
  const taken = new Set([questionAnswer(question), question.a, question.b].map((id) => COLORS[id].family));
  const decoys: ColorId[] = [];
  for (const color of shuffle(DECOYS, rng)) {
    const { family } = COLORS[color];
    if (taken.has(family)) continue;
    taken.add(family);
    decoys.push(color);
    if (decoys.length === 2) break;
  }
  return decoys;
}

/**
 * The right answer and two wrong ones, in a random order. A wrong answer is never
 * from the same color family as the answer, the pots, or the other wrong answer,
 * so no two blobs look alike and the pots themselves aren't offered back.
 */
export function guessChoices(question: Question, rng: Rng): ColorId[] {
  return shuffle([questionAnswer(question), ...pickDecoys(question, rng)], rng);
}

// ---------- Make this color ----------

export interface Target {
  color: ColorId;
  who: string;
  /** The hint, and proof in the tests that the target can be made. */
  recipe: Parts;
}

export const TARGETS: Record<Level, Target[]> = {
  0: [
    { color: 'orange', who: '🦊', recipe: { red: 1, yellow: 1 } },
    { color: 'green', who: '🐸', recipe: { yellow: 1, blue: 1 } },
    { color: 'purple', who: '🐙', recipe: { red: 1, blue: 1 } },
  ],
  1: [
    { color: 'pink', who: '🐷', recipe: { red: 1, white: 1 } },
    { color: 'lightBlue', who: '🐳', recipe: { blue: 1, white: 1 } },
    { color: 'grey', who: '🐘', recipe: { black: 1, white: 1 } },
    { color: 'lilac', who: '🦄', recipe: { red: 1, blue: 1, white: 1 } },
    { color: 'mint', who: '🐢', recipe: { yellow: 1, blue: 1, white: 1 } },
    { color: 'peach', who: '🐥', recipe: { red: 1, yellow: 1, white: 1 } },
  ],
  2: [
    { color: 'brown', who: '🐻', recipe: { red: 1, yellow: 1, blue: 1 } },
    { color: 'maroon', who: '🐞', recipe: { red: 1, black: 1 } },
    { color: 'navy', who: '🐧', recipe: { blue: 1, black: 1 } },
    { color: 'olive', who: '🦎', recipe: { yellow: 1, black: 1 } },
    { color: 'darkGreen', who: '🐊', recipe: { yellow: 1, blue: 1, black: 1 } },
    { color: 'tan', who: '🐫', recipe: { red: 1, yellow: 1, blue: 1, white: 1 } },
    { color: 'darkBrown', who: '🦉', recipe: { red: 1, yellow: 1, blue: 1, black: 1 } },
  ],
};

/** The size of the beaker in Make This Color: room to spare, but not endless. */
export const MAKE_CAPACITY = 8;

export function recipePaints(recipe: Parts): Paint[] {
  return PAINTS.filter((paint) => (recipe[paint] ?? 0) > 0);
}
