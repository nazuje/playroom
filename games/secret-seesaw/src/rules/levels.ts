// The staircase. Each level is made by a small pure generator from a fixed seed, so the numbers are the same on
// every device and every run, and the tests can prove each puzzle has exactly one whole-number answer.
import type { Board, Item, Mystery, Seesaw, SideName, Values } from './board.ts';

export type WorldId = 'box' | 'level' | 'boxes' | 'both' | 'two';
export const WORLDS: readonly WorldId[] = ['box', 'level', 'boxes', 'both', 'two'];

/** A box, a hat, or a plain weight. */
export type Token = Mystery | number;

export interface SeesawPlan {
  left: Token[];
  right: Token[];
}

export interface Level {
  id: number;
  world: WorldId;
  seesaws: SeesawPlan[];
  /** What each mystery really weighs. */
  values: Values;
  /** The mysteries to work out, in order. Empty on "make it level" boards. */
  ask: Mystery[];
  /** Three big numbers to pick from, or every number from 0 to 20. */
  answer: 'three' | 'picker' | 'none';
  /** The numbers shown, smallest first. */
  choices: number[];
  /** Weights in the tray, on "make it level" boards. */
  tray: number[];
  /** The side tray weights go on. */
  open: SideName | null;
}

export const MOST_ANSWER = 20;
export const MOST_WEIGHT = 20;
const PICKER = Array.from({ length: MOST_ANSWER + 1 }, (_, n) => n);

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
const boxes = (count: number, mystery: Mystery = 'box'): Token[] => Array.from({ length: count }, () => mystery);
const weights = (...values: number[]): Token[] => values.filter((value) => value > 0);

/** Tries a generator until its numbers fit. Every generator finds a fit within a few tries from its seed. */
function draw<T>(random: Random, make: (random: Random) => T | null): T {
  for (let tries = 0; tries < 10000; tries += 1) {
    const made = make(random);
    if (made) return made;
  }
  throw new Error('No level fits these rules');
}

/** Two close wrong numbers and the right one, smallest first. */
function threeChoices(random: Random, answer: number, tempting: number): number[] {
  const near = [answer - 1, answer + 1, answer + 2, answer - 2, tempting];
  const pool = [...new Set(near)].filter((n) => n >= 1 && n <= MOST_ANSWER && n !== answer);
  const picked: number[] = [];
  while (picked.length < 2) {
    const at = Math.floor(random() * pool.length);
    picked.push(...pool.splice(at, 1));
  }
  return [answer, ...picked].sort((a, b) => a - b);
}

interface Made {
  seesaws: SeesawPlan[];
  values: Values;
  ask?: Mystery[];
  tempting?: number;
  tray?: number[];
  open?: SideName;
}

// ---------- 1. The box: box + a = b ----------

function boxPlus({ most, two, boxRight }: { most: number; two: boolean; boxRight: boolean }) {
  return (random: Random): Made | null => {
    const x = int(random, 2, most - 1);
    const a = int(random, 1, most - x);
    const c = two ? int(random, 1, most - x) : 0;
    const b = x + a + c;
    if (b > most || x === a || x === c || a === c || x === b) return null;
    const boxSide = [...(boxRight ? weights(a) : []), 'box' as Token, ...(boxRight ? [] : weights(a)), ...weights(c)];
    const plain = weights(b);
    return { seesaws: [boxRight ? { left: plain, right: boxSide } : { left: boxSide, right: plain }], values: { box: x }, tempting: b };
  };
}

// ---------- 2. Make it level ----------

/** Some different whole numbers from 1 to the top, smallest first. */
function pickDistinct(random: Random, count: number, top: number): number[] {
  const pool = Array.from({ length: top }, (_, n) => n + 1);
  const picked: number[] = [];
  while (picked.length < count) picked.push(...pool.splice(Math.floor(random() * pool.length), 1));
  return picked.sort((a, b) => a - b);
}

/** Can some of the tray make exactly this much? */
export function trayMakes(tray: readonly number[], need: number): number[] | null {
  const best = new Map<number, number[]>([[0, []]]);
  for (const value of tray) {
    for (const [sum, used] of [...best]) {
      const next = sum + value;
      if (!best.has(next)) best.set(next, [...used, value]);
    }
  }
  return best.get(need) ?? null;
}

function makeLevel({ need, given, open, size, single }: { need: [number, number]; given: number; open: SideName; size: number; single: boolean }) {
  return (random: Random): Made | null => {
    const want = int(random, need[0], need[1]);
    const near = given > 0 ? int(random, 1, 4) : 0;
    const far = want + near;
    const split = far > 5 ? int(random, 2, far - 2) : 0;
    const farWeights = split ? weights(split, far - split) : weights(far);
    const tray = pickDistinct(random, size, Math.max(size, Math.min(6, want)));
    const works = trayMakes(tray, want);
    if (!works || tray.includes(want) !== single) return null;
    if (farWeights.some((value) => (value as number) > MOST_WEIGHT)) return null;
    const openSide = weights(near);
    const plan = open === 'right' ? { left: farWeights, right: openSide } : { left: openSide, right: farWeights };
    return { seesaws: [plan], values: {}, tray, open };
  };
}

// ---------- 3. Many boxes: k boxes + a = b ----------

function manyBoxes({ count, extra, most, split }: { count: number; extra: boolean; most: number; split: boolean }) {
  return (random: Random): Made | null => {
    const x = int(random, 2, most);
    const a = extra ? int(random, 1, 6) : 0;
    const total = count * x + a;
    const first = split ? int(random, 3, total - 3) : total;
    const right = weights(first, total - first);
    if (x === a || right.some((value) => (value as number) > MOST_WEIGHT)) return null;
    return { seesaws: [{ left: [...boxes(count), ...weights(a)], right }], values: { box: x }, tempting: total - a };
  };
}

// ---------- 4. Boxes on both sides: m boxes + a = n boxes + b ----------

function bothSides({ more, fewer, extra, flip }: { more: number; fewer: number; extra: boolean; flip: boolean }) {
  return (random: Random): Made | null => {
    const x = int(random, 2, 9);
    const a = extra ? int(random, 1, 6) : 0;
    const b = (more - fewer) * x + a;
    if (b > MOST_WEIGHT || x === a) return null;
    const heavy = [...boxes(more), ...weights(a)];
    const light = [...boxes(fewer), ...weights(b)];
    return { seesaws: [flip ? { left: light, right: heavy } : { left: heavy, right: light }], values: { box: x }, tempting: b - a };
  };
}

// ---------- 5. A box and a hat on two seesaws ----------

const two = {
  /** box + a = b, hat = box + c */
  chain: (random: Random): Made | null => {
    const x = int(random, 3, 8);
    const a = int(random, 1, 6);
    const c = int(random, 3, 7);
    if (x + a > MOST_WEIGHT || x === a) return null;
    return {
      seesaws: [{ left: ['box', a], right: [x + a] }, { left: ['hat'], right: ['box', c] }],
      values: { box: x, hat: x + c },
      ask: ['box', 'hat'],
    };
  },
  /** box + box = b, hat + a = box + c */
  doubled: (random: Random): Made | null => {
    const x = int(random, 3, 9);
    const a = int(random, 1, 4);
    const c = int(random, a + 3, 9);
    if (2 * x > MOST_WEIGHT || x === a || x === c) return null;
    return {
      seesaws: [{ left: ['box', 'box'], right: [2 * x] }, { left: ['hat', a], right: ['box', c] }],
      values: { box: x, hat: x + c - a },
      ask: ['box', 'hat'],
    };
  },
  /** box + hat = b, hat = box + c */
  swap: (random: Random): Made | null => {
    const x = int(random, 2, 7);
    const c = int(random, 3, 6);
    const b = 2 * x + c;
    if (b > MOST_WEIGHT || x === c) return null;
    return {
      seesaws: [{ left: ['box', 'hat'], right: [b] }, { left: ['hat'], right: ['box', c] }],
      values: { box: x, hat: x + c },
      ask: ['box', 'hat'],
    };
  },
  /** box + hat = b, box + a = hat + c */
  tidyThenSwap: (random: Random): Made | null => {
    const y = int(random, 2, 7);
    const d = int(random, 2, 5);
    const a = int(random, 1, 5);
    const x = y + d;
    const b = x + y;
    if (b > MOST_WEIGHT || a + d > MOST_WEIGHT || y === a) return null;
    return {
      seesaws: [{ left: ['hat', 'box'], right: [b] }, { left: ['box', a], right: ['hat', a + d] }],
      values: { box: x, hat: y },
      ask: ['hat', 'box'],
    };
  },
  /** box + box + hat = b, box + hat + a = hat + hat + c */
  grownUp: (random: Random): Made | null => {
    const y = int(random, 2, 5);
    const d = int(random, 1, 3);
    const a = int(random, 1, 6);
    const x = y + d;
    const b = 2 * x + y;
    if (b > MOST_WEIGHT || a + d > MOST_WEIGHT || y === d) return null;
    return {
      seesaws: [{ left: ['box', 'box', 'hat'], right: [b] }, { left: ['hat', 'box', a], right: ['hat', 'hat', a + d] }],
      values: { box: x, hat: y },
      ask: ['hat', 'box'],
    };
  },
};

interface Spec {
  world: WorldId;
  answer: Level['answer'];
  make: (random: Random) => Made | null;
}

const SPECS: Spec[] = [
  { world: 'box', answer: 'three', make: boxPlus({ most: 5, two: false, boxRight: false }) },
  { world: 'box', answer: 'three', make: boxPlus({ most: 6, two: false, boxRight: false }) },
  { world: 'box', answer: 'three', make: boxPlus({ most: 8, two: false, boxRight: true }) },
  { world: 'box', answer: 'three', make: boxPlus({ most: 10, two: false, boxRight: false }) },
  { world: 'box', answer: 'three', make: boxPlus({ most: 10, two: true, boxRight: true }) },

  { world: 'level', answer: 'none', make: makeLevel({ need: [2, 3], given: 0, open: 'right', size: 3, single: true }) },
  { world: 'level', answer: 'none', make: makeLevel({ need: [4, 6], given: 0, open: 'right', size: 3, single: false }) },
  { world: 'level', answer: 'none', make: makeLevel({ need: [5, 7], given: 1, open: 'left', size: 4, single: false }) },
  { world: 'level', answer: 'none', make: makeLevel({ need: [7, 9], given: 1, open: 'right', size: 5, single: false }) },

  { world: 'boxes', answer: 'three', make: manyBoxes({ count: 2, extra: false, most: 5, split: false }) },
  { world: 'boxes', answer: 'three', make: manyBoxes({ count: 2, extra: true, most: 6, split: false }) },
  { world: 'boxes', answer: 'picker', make: manyBoxes({ count: 3, extra: false, most: 6, split: false }) },
  { world: 'boxes', answer: 'picker', make: manyBoxes({ count: 3, extra: true, most: 6, split: false }) },
  { world: 'boxes', answer: 'picker', make: manyBoxes({ count: 4, extra: true, most: 7, split: true }) },

  { world: 'both', answer: 'picker', make: bothSides({ more: 2, fewer: 1, extra: false, flip: false }) },
  { world: 'both', answer: 'picker', make: bothSides({ more: 2, fewer: 1, extra: true, flip: true }) },
  { world: 'both', answer: 'picker', make: bothSides({ more: 3, fewer: 1, extra: true, flip: false }) },
  { world: 'both', answer: 'picker', make: bothSides({ more: 4, fewer: 2, extra: true, flip: true }) },
  { world: 'both', answer: 'picker', make: bothSides({ more: 5, fewer: 2, extra: true, flip: false }) },

  { world: 'two', answer: 'picker', make: two.chain },
  { world: 'two', answer: 'picker', make: two.doubled },
  { world: 'two', answer: 'picker', make: two.swap },
  { world: 'two', answer: 'picker', make: two.tidyThenSwap },
  { world: 'two', answer: 'picker', make: two.grownUp },
];

const SEED = 20261103;

function build(spec: Spec, index: number): Level {
  const random = seeded(SEED + index * 7919);
  const made = draw(random, spec.make);
  const ask = made.ask ?? (made.values.box === undefined ? [] : ['box' as Mystery]);
  const first = ask[0];
  const choices =
    spec.answer === 'three' && first ? threeChoices(random, made.values[first] as number, made.tempting ?? 0) : spec.answer === 'picker' ? PICKER : [];
  return {
    id: index + 1,
    world: spec.world,
    seesaws: made.seesaws,
    values: made.values,
    ask,
    answer: spec.answer,
    choices,
    tray: made.tray ?? [],
    open: made.open ?? null,
  };
}

/** Makes the whole staircase from its seeds. The same call always makes the same levels. */
export const buildLevels = (): Level[] => SPECS.map(build);

export const LEVELS: readonly Level[] = buildLevels();

export const levelById = (id: number): Level | undefined => LEVELS.find((level) => level.id === id);

function itemFor(token: Token, id: string): Item {
  return typeof token === 'number' ? { id, kind: 'weight', value: token } : { id, kind: 'mystery', mystery: token };
}

/** The starting board. Item ids are fixed by place, so the game, the tests and the bots all agree on them. */
export function boardFor(level: Level): Board {
  const seesaws: Seesaw[] = level.seesaws.map((plan, at) => ({
    left: plan.left.map((token, index) => itemFor(token, `s${at}l${index}`)),
    right: plan.right.map((token, index) => itemFor(token, `s${at}r${index}`)),
  }));
  return { seesaws, tray: level.tray.map((value, index) => ({ id: `t${index}`, kind: 'weight', value })), made: 0 };
}
