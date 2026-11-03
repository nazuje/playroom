/** Any source of numbers from 0 up to 1. Math.random in the game, a seeded one in tests. */
export type Rng = () => number;

export interface Item {
  emoji: string;
  /** Short words on purpose: the "Say it!" chant keeps a steady beat only if each word is quick. */
  name: string;
}

export interface Theme {
  id: string;
  items: readonly Item[];
}

/** A half-open run of car positions, from start up to but not including end. */
export interface Range {
  start: number;
  end: number;
}

/** One empty car, and the answer buttons shown while it is the one being filled. */
export interface Blank {
  index: number;
  answer: Item;
  options: Item[];
}

export interface Train {
  level: number;
  themeId: string;
  /** Which pattern this is, in letters, such as "AAB" or "growing". */
  rule: string;
  question: 'next' | 'missing';
  /** The finished train, left to right, starting with the car behind the engine. */
  cars: Item[];
  /** Empty cars in the order they get filled. */
  blanks: Blank[];
  /** The whole train cut into repeats (or growing steps). The chant rests between them. */
  steps: Range[];
  /** The cars the grown-up hint brackets. */
  hint: Range[];
}

export const MAX_LEVEL = 6;

export const THEMES: readonly Theme[] = [
  {
    id: 'fruit',
    items: [
      { emoji: '🍎', name: 'apple' },
      { emoji: '🍌', name: 'banana' },
      { emoji: '🍇', name: 'grapes' },
      { emoji: '🍊', name: 'orange' },
      { emoji: '🍋', name: 'lemon' },
      { emoji: '🍐', name: 'pear' },
      { emoji: '🍒', name: 'cherry' },
      { emoji: '🍉', name: 'melon' },
    ],
  },
  {
    id: 'animals',
    items: [
      { emoji: '🐱', name: 'cat' },
      { emoji: '🐶', name: 'dog' },
      { emoji: '🐸', name: 'frog' },
      { emoji: '🐷', name: 'pig' },
      { emoji: '🦊', name: 'fox' },
      { emoji: '🐻', name: 'bear' },
      { emoji: '🦁', name: 'lion' },
      { emoji: '🐮', name: 'cow' },
    ],
  },
  {
    id: 'shapes',
    items: [
      { emoji: '⭐', name: 'star' },
      { emoji: '❤️', name: 'heart' },
      { emoji: '🌙', name: 'moon' },
      { emoji: '🔵', name: 'circle' },
      { emoji: '🟩', name: 'square' },
      { emoji: '🔺', name: 'triangle' },
      { emoji: '🔶', name: 'diamond' },
    ],
  },
  {
    id: 'vehicles',
    items: [
      { emoji: '🚗', name: 'car' },
      { emoji: '🚌', name: 'bus' },
      { emoji: '🚲', name: 'bike' },
      { emoji: '⛵', name: 'boat' },
      { emoji: '✈️', name: 'plane' },
      { emoji: '🚀', name: 'rocket' },
      { emoji: '🚜', name: 'tractor' },
    ],
  },
];

export function seededRng(seed: number): Rng {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let mixed = Math.imul(state ^ (state >>> 15), 1 | state);
    mixed = (mixed + Math.imul(mixed ^ (mixed >>> 7), 61 | mixed)) ^ mixed;
    return ((mixed ^ (mixed >>> 14)) >>> 0) / 4294967296;
  };
}

function pick<T>(rng: Rng, list: readonly T[]): T {
  return list[Math.floor(rng() * list.length)];
}

export function shuffle<T>(rng: Rng, list: readonly T[]): T[] {
  const mixed = [...list];
  for (let i = mixed.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [mixed[i], mixed[j]] = [mixed[j], mixed[i]];
  }
  return mixed;
}

/** A pattern in letters, before real items are cast into it. */
interface Draft {
  rule: string;
  question: Train['question'];
  letters: string;
  blanks: number[];
  steps: Range[];
  hint: Range[];
}

function repeated(unit: string, length: number): string {
  return unit.repeat(Math.ceil(length / unit.length)).slice(0, length);
}

function chunks(unitLength: number, length: number): Range[] {
  const steps: Range[] = [];
  for (let start = 0; start < length; start += unitLength) {
    steps.push({ start, end: Math.min(start + unitLength, length) });
  }
  return steps;
}

function touchesBlank(range: Range, blanks: readonly number[]): boolean {
  return blanks.some((blank) => blank >= range.start && blank < range.end);
}

function repeatDraft(unit: string, length: number, blanks: number[], question: Train['question']): Draft {
  const steps = chunks(unit.length, length);
  const firstClear = steps.find((step) => step.end - step.start === unit.length && !touchesBlank(step, blanks));
  if (!firstClear) throw new Error(`No clear repeat of ${unit} in a train of ${length}`);
  return { rule: unit, question, letters: repeated(unit, length), blanks, steps, hint: [firstClear] };
}

/** Two whole repeats, maybe the start of a third, then the empty cars. */
function draftNext(rng: Rng, unit: string, blankCount: number): Draft {
  const extra = Math.floor(rng() * unit.length);
  const visible = unit.length * 2 + extra;
  const blanks = Array.from({ length: blankCount }, (_, i) => visible + i);
  return repeatDraft(unit, visible + blankCount, blanks, 'next');
}

/** Could this car go missing and still leave two whole repeats side by side? */
function leavesTwoRepeats(index: number, unitLength: number, length: number): boolean {
  for (let start = 0; start + unitLength * 2 <= length; start += unitLength) {
    if (!touchesBlank({ start, end: start + unitLength * 2 }, [index])) return true;
  }
  return false;
}

function draftMiddle(rng: Rng, unit: string): Draft {
  const length = unit.length * 3 + Math.floor(rng() * unit.length);
  const inner = Array.from({ length: length - 2 }, (_, i) => i + 1);
  const index = pick(rng, inner.filter((i) => leavesTwoRepeats(i, unit.length, length)));
  return repeatDraft(unit, length, [index], 'missing');
}

/** A B AA B AAA B AAAA B: the first item gets one longer each time. */
const GROWING = 'ABAABAAABAAAAB';
/** Where each growing train stops. Its last car is the empty one, past at least two whole steps. */
const GROWING_LENGTHS = [7, 8, 9, 13, 14];

function growingSteps(letters: string): Range[] {
  const steps: Range[] = [];
  let start = 0;
  for (let i = 0; i < letters.length; i++) {
    if (letters[i] === 'B') {
      steps.push({ start, end: i + 1 });
      start = i + 1;
    }
  }
  if (start < letters.length) steps.push({ start, end: letters.length });
  return steps;
}

function draftGrowing(rng: Rng): Draft {
  const letters = GROWING.slice(0, pick(rng, GROWING_LENGTHS));
  const blank = letters.length - 1;
  const steps = growingSteps(letters);
  const complete = steps.filter((step) => step.end <= blank && letters[step.end - 1] === 'B');
  return { rule: 'growing', question: 'next', letters, blanks: [blank], steps, hint: complete };
}

interface LevelSpec {
  optionCount: number;
  draft: (rng: Rng) => Draft;
}

const twoInARowOrGap = (rng: Rng): Draft => {
  const unit = pick(rng, ['AB', 'ABC', 'AAB', 'ABB']);
  return rng() < 0.5 ? draftNext(rng, unit, 2) : draftMiddle(rng, unit);
};

const LEVELS: readonly LevelSpec[] = [
  { optionCount: 3, draft: (rng) => draftNext(rng, 'AB', 1) },
  { optionCount: 3, draft: (rng) => draftNext(rng, pick(rng, ['AAB', 'ABB']), 1) },
  { optionCount: 4, draft: (rng) => draftNext(rng, 'ABC', 1) },
  { optionCount: 4, draft: (rng) => draftNext(rng, pick(rng, ['AABB', 'ABAC']), 1) },
  { optionCount: 4, draft: twoInARowOrGap },
  { optionCount: 3, draft: draftGrowing },
];

/** The answer, then other items on this train (the tempting ones), then others from the theme. */
function optionsFor(rng: Rng, answer: Item, onTrain: readonly Item[], theme: Theme, count: number): Item[] {
  const others = (list: readonly Item[]) => shuffle(rng, list.filter((item) => item.name !== answer.name));
  const fromTrain = others(onTrain);
  const fromTheme = others(theme.items).filter((item) => !onTrain.includes(item));
  return shuffle(rng, [answer, ...[...fromTrain, ...fromTheme].slice(0, count - 1)]);
}

/** Builds one train. The same level and the same random numbers always give the same train. */
export function makeTrain(level: number, rng: Rng, avoidThemeId?: string): Train {
  const spec = LEVELS[level - 1];
  if (!spec) throw new Error(`No level ${level}`);
  const theme = pick(rng, THEMES.filter((candidate) => candidate.id !== avoidThemeId));
  const draft = spec.draft(rng);

  const cast = new Map<string, Item>();
  const casting = shuffle(rng, theme.items);
  for (const letter of draft.letters) {
    if (!cast.has(letter)) cast.set(letter, casting[cast.size]);
  }
  const cars = [...draft.letters].map((letter) => cast.get(letter) as Item);
  const onTrain = [...cast.values()];

  return {
    level,
    themeId: theme.id,
    rule: draft.rule,
    question: draft.question,
    cars,
    blanks: draft.blanks.map((index) => ({
      index,
      answer: cars[index],
      options: optionsFor(rng, cars[index], onTrain, theme, spec.optionCount),
    })),
    steps: draft.steps,
    hint: draft.hint,
  };
}
