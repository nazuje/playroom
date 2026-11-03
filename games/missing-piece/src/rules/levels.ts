// The staircase. Each go at a level is made by a small pure generator from a fixed seed, so a puzzle is the same
// on every device and every run, and every retry or replay moves on to a fresh one of the same shape. Every
// puzzle is checked by the solver as it is made: the visible patches allow exactly one piece, and each wrong
// piece breaks exactly one rule.
import { rivals } from './careless.ts';
import {
  ALL_MARKS,
  ATTRS,
  attrsOf,
  bitCount,
  cellKey,
  MARK_ATTRS,
  MARK_SPOTS,
  MIDDLE,
  PLAIN_SHAPES,
  RING,
  SHAPE_ATTRS,
  SHAPES,
  TURNING_SHAPES,
  withValue,
  type Attr,
  type Cell,
} from './cells.ts';
import { markOp, type Pattern } from './patterns.ts';
import { brokenBy, gapValues, patternsWith, type Shown } from './solve.ts';

export type WorldId = 'match' | 'pair' | 'grow' | 'once' | 'tricky';
export const WORLDS: readonly WorldId[] = ['match', 'pair', 'grow', 'once', 'tricky'];

/**
 * How the generator means an attribute to go. "same" is one value everywhere; the rest match the patterns of the
 * same name, with "join" for buttons that add up and "cancel" for buttons in both that cancel out.
 */
export type Law = 'same' | 'rows' | 'cols' | 'latin' | 'across' | 'down' | 'join' | 'cancel';
type Plan = Partial<Record<Attr, Law>>;

interface Spec {
  world: WorldId;
  size: 2 | 3;
  options: 3 | 4 | 5 | 6;
  /** The rule sets a puzzle may get. Each go picks one. */
  plans: Plan[];
  /**
   * The careless eye (careless.ts) always finds the answer within one try, or never does. Levels that say neither
   * leave it to luck, though past the first world its first tap is always wrong.
   */
  careless?: 'wins' | 'loses';
}

export interface Level {
  id: number;
  /** Which go at the level this is. Each go is a fresh puzzle. */
  go: number;
  world: WorldId;
  size: number;
  /** Every patch, row by row. The last one is the gap, and holds the answer. */
  cells: Cell[];
  /** The pieces in the basket, in the order they sit. */
  options: Cell[];
  /** Which piece is right. */
  answer: number;
  /** How each attribute in play goes. */
  laws: Record<string, Law>;
  attrs: readonly Attr[];
  /** Big pieces for the first world, which is for age 4. */
  big: boolean;
}

const SEED = 20261103;

/** A small seeded random source (mulberry32), so a puzzle never changes between runs. */
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
const pick = <T>(random: Random, list: readonly T[]): T => list[Math.floor(random() * list.length)];

function shuffled<T>(random: Random, list: readonly T[]): T[] {
  const pool = [...list];
  for (let at = pool.length - 1; at > 0; at -= 1) {
    const other = Math.floor(random() * (at + 1));
    [pool[at], pool[other]] = [pool[other], pool[at]];
  }
  return pool;
}

const takeSome = <T>(random: Random, list: readonly T[], count: number): T[] => shuffled(random, list).slice(0, count);

/** Each try at a level is a set of this many puzzles of the same kind. */
export const SET = 3;

/** Wrong pieces that end a try, counted over its whole set: two with three pieces, so tapping every one never wins, and three with more. */
export const missLimitFor = (options: number): number => (options === 3 ? 2 : 3);
/**
 * The first world is for age 4, so its tries never fail: a wrong piece still bounces out and costs a star, but the
 * set always finishes. Every later world has the limit.
 */
export const missLimit = (level: Level): number => (level.world === 'match' ? Infinity : missLimitFor(level.options.length));

// ---------- The staircase ----------

const PAIRS: Plan[] = (['shape', 'color', 'fill', 'size'] as const).flatMap((first) =>
  (['shape', 'color', 'fill', 'size'] as const).filter((second) => second !== first).map((second) => ({ [first]: 'rows', [second]: 'cols' })),
);

const SPECS: Spec[] = [
  // 1. Match: a 2 by 2 grid and one rule, for age 4.
  { world: 'match', size: 2, options: 3, plans: [{ shape: 'rows' }], careless: 'wins' },
  { world: 'match', size: 2, options: 3, plans: [{ color: 'cols' }], careless: 'wins' },
  { world: 'match', size: 2, options: 3, plans: [{ shape: 'cols' }], careless: 'wins' },
  { world: 'match', size: 2, options: 3, plans: [{ color: 'rows' }], careless: 'wins' },
  {
    world: 'match',
    size: 2,
    options: 3,
    plans: [{ shape: 'rows' }, { shape: 'cols' }, { color: 'rows' }, { color: 'cols' }, { fill: 'rows' }, { size: 'cols' }],
    careless: 'wins',
  },

  // 2. Two rules at once: one along the rows, one down the columns.
  { world: 'pair', size: 2, options: 3, plans: [{ shape: 'rows', color: 'cols' }, { color: 'rows', shape: 'cols' }], careless: 'wins' },
  { world: 'pair', size: 2, options: 3, plans: [{ shape: 'rows', fill: 'cols' }, { fill: 'rows', color: 'cols' }, { color: 'rows', size: 'cols' }], careless: 'wins' },
  { world: 'pair', size: 3, options: 3, plans: [{ shape: 'rows', color: 'cols' }, { color: 'rows', shape: 'cols' }], careless: 'wins' },
  { world: 'pair', size: 3, options: 4, plans: [{ color: 'rows', fill: 'cols' }, { fill: 'rows', shape: 'cols' }, { shape: 'rows', color: 'cols' }], careless: 'wins' },
  { world: 'pair', size: 3, options: 4, plans: PAIRS, careless: 'wins' },

  // 3. Step by step: counts go 1, 2, 3, sizes grow, shapes turn a quarter and hop round the corners.
  { world: 'grow', size: 3, options: 4, plans: [{ count: 'across', shape: 'rows' }, { count: 'across', color: 'rows' }], careless: 'wins' },
  { world: 'grow', size: 3, options: 4, plans: [{ size: 'across', color: 'cols' }, { size: 'across', shape: 'cols' }] },
  { world: 'grow', size: 3, options: 4, plans: [{ turn: 'across', color: 'rows' }, { turn: 'across', fill: 'rows' }] },
  { world: 'grow', size: 3, options: 4, plans: [{ spot: 'across', color: 'cols' }, { spot: 'across', shape: 'cols' }] },
  {
    world: 'grow',
    size: 3,
    options: 4,
    plans: [{ count: 'across', turn: 'down', color: 'rows' }, { size: 'down', turn: 'across', color: 'cols' }],
  },

  // 4. Once each: every shape or colour once in each row and once in each column, then with steps too.
  { world: 'once', size: 3, options: 5, plans: [{ shape: 'latin' }, { color: 'latin' }] },
  { world: 'once', size: 3, options: 5, plans: [{ color: 'latin', shape: 'rows' }, { shape: 'latin', color: 'cols' }, { fill: 'latin', shape: 'rows' }] },
  { world: 'once', size: 3, options: 5, plans: [{ shape: 'latin', color: 'latin' }, { color: 'latin', fill: 'latin' }], careless: 'loses' },
  { world: 'once', size: 3, options: 5, plans: [{ shape: 'latin', count: 'across' }, { color: 'latin', size: 'across' }], careless: 'loses' },
  {
    world: 'once',
    size: 3,
    options: 5,
    plans: [{ color: 'latin', fill: 'latin', size: 'down' }, { shape: 'latin', fill: 'latin', count: 'down' }],
    careless: 'loses',
  },

  // 5. Grown-up puzzles: three rules at once, and buttons that add up or cancel out.
  {
    world: 'tricky',
    size: 3,
    options: 6,
    plans: [{ shape: 'latin', color: 'latin', count: 'across' }, { color: 'latin', fill: 'latin', size: 'across' }, { shape: 'latin', fill: 'latin', turn: 'across' }],
    careless: 'loses',
  },
  { world: 'tricky', size: 3, options: 6, plans: [{ marks: 'join', color: 'latin' }, { marks: 'join', shape: 'latin' }], careless: 'loses' },
  { world: 'tricky', size: 3, options: 6, plans: [{ marks: 'cancel', color: 'latin' }, { marks: 'cancel', shape: 'latin' }], careless: 'loses' },
  {
    world: 'tricky',
    size: 3,
    options: 6,
    plans: [{ marks: 'cancel', shape: 'latin', color: 'latin' }, { marks: 'join', color: 'latin', fill: 'latin' }, { marks: 'cancel', color: 'latin', fill: 'rows' }],
    careless: 'loses',
  },
];

export const LEVEL_COUNT = SPECS.length;

// ---------- Making a grid ----------

function allowedValues(attr: Attr, world: WorldId, plan: Plan): readonly number[] {
  if (attr === 'shape') {
    if (plan.turn) return TURNING_SHAPES;
    return world === 'match' || world === 'pair' ? PLAIN_SHAPES : SHAPES.map((_, at) => at);
  }
  if (attr === 'spot') return [0, 1, 2, 3];
  if (attr === 'color') return [0, 1, 2, 3, 4, 5];
  if (attr === 'fill') return [0, 1, 2];
  if (attr === 'count') return [1, 2, 3];
  if (attr === 'size') return [0, 1, 2];
  return [0, 1, 2, 3];
}

/** The value an attribute keeps when no rule moves it. */
function steadyValue(attr: Attr, random: Random, allowed: readonly number[], plan: Plan): number {
  if (attr === 'shape') return plan.marks ? 0 : pick(random, allowed);
  if (attr === 'color') return pick(random, allowed);
  if (attr === 'count') return 1;
  if (attr === 'size') return plan.marks ? 1 : 2;
  if (attr === 'spot') return MIDDLE;
  return 0;
}

/** A few of the 9 button spots. */
function someMarks(random: Random, low: number, high: number): number {
  return takeSome(random, Array.from({ length: MARK_SPOTS }, (_, at) => at), int(random, low, high)).reduce((marks, bit) => marks | (1 << bit), 0);
}

/** One row of buttons where the third patch is the first two put together, or with the shared ones cancelled. */
function markRow(random: Random, law: 'join' | 'cancel'): number[] {
  for (;;) {
    const first = law === 'join' ? someMarks(random, 2, 3) : someMarks(random, 3, 4);
    const second = law === 'join' ? someMarks(random, 2, 3) : someMarks(random, 2, 4);
    const shared = bitCount(first & second);
    const third = markOp(law, first, second);
    const fair = law === 'join' ? shared <= 1 && bitCount(third) <= 6 : shared >= 1 && shared <= 2 && bitCount(third) >= 2;
    if (fair && third !== first && third !== second) return [first, second, third];
  }
}

function lawGrid(attr: Attr, law: Law, size: number, random: Random, allowed: readonly number[], steady: number): number[][] {
  const each = (value: (row: number, col: number) => number): number[][] =>
    Array.from({ length: size }, (_, row) => Array.from({ length: size }, (_, col) => value(row, col)));
  if (law === 'same') return each(() => steady);
  if (law === 'rows' || law === 'cols') {
    const values = takeSome(random, allowed, size);
    return each((row, col) => values[law === 'rows' ? row : col]);
  }
  if (law === 'latin') {
    const values = takeSome(random, allowed, size);
    const backwards = random() < 0.5;
    return each((row, col) => values[(row + (backwards ? size - col : col)) % size]);
  }
  if (law === 'join' || law === 'cancel') {
    const rows = Array.from({ length: size }, () => markRow(random, law));
    return rows;
  }
  // A step along the rows, or down the columns. Counts and sizes go 1, 2, 3 or back down; turns and corners go
  // round, and each row may start further round.
  const ring = attr === 'turn' || attr === 'spot';
  const step = ring ? pick(random, [1, RING - 1]) : pick(random, [1, -1]);
  const start = ring ? int(random, 0, RING - 1) : step > 0 ? allowed[0] : allowed[allowed.length - 1];
  const shift = ring ? int(random, 1, RING - 1) : 0;
  const at = (along: number, line: number): number => (ring ? (start + line * shift + along * step) % RING : start + along * step);
  return each((row, col) => (law === 'across' ? at(col, row) : at(row, col)));
}

const PATTERN_OF: Record<Law, Pattern> = {
  same: 'rows',
  rows: 'rows',
  cols: 'cols',
  latin: 'latin',
  across: 'across',
  down: 'down',
  join: 'join',
  cancel: 'cancel',
};

interface Made {
  size: number;
  cells: Cell[];
  attrs: readonly Attr[];
  laws: Record<string, Law>;
}

const shownOf = (made: Pick<Made, 'size' | 'cells' | 'attrs'>): Shown => ({ size: made.size, cells: made.cells.slice(0, -1), attrs: made.attrs });

function grid(spec: Spec, random: Random): Made | null {
  const plan = pick(random, spec.plans);
  const attrs = plan.marks ? MARK_ATTRS : SHAPE_ATTRS;
  const values: Partial<Record<Attr, number[][]>> = {};
  const laws: Record<string, Law> = {};
  for (const attr of [...SHAPE_ATTRS, 'marks'] as Attr[]) {
    const allowed = allowedValues(attr, spec.world, plan);
    const law = attrs.includes(attr) ? (plan[attr] ?? 'same') : 'same';
    if (attrs.includes(attr)) laws[attr] = law;
    values[attr] = lawGrid(attr, law, spec.size, random, allowed, steadyValue(attr, random, allowed, plan));
  }
  const cells: Cell[] = [];
  for (let row = 0; row < spec.size; row += 1) {
    for (let col = 0; col < spec.size; col += 1) {
      const cell = {} as Cell;
      for (const attr of Object.keys(values) as Attr[]) cell[attr] = (values[attr] as number[][])[row][col];
      cells.push(cell);
    }
  }
  const made: Made = { size: spec.size, cells, attrs, laws };
  // Fair: for every attribute, the patches on show allow exactly the answer, and the meant rule explains it.
  const shown = shownOf(made);
  const answer = cells[cells.length - 1];
  for (const attr of attrs) {
    const allowedHere = gapValues(shown, attr);
    if (allowedHere.length !== 1 || allowedHere[0] !== answer[attr]) return null;
    if (!patternsWith(shown, attr, answer).includes(PATTERN_OF[laws[attr]])) return null;
  }
  return made;
}

// ---------- Wrong pieces ----------

const STEADY_SLIPS: readonly Attr[] = ['shape', 'color', 'fill'];

/** A wrong value can only be told apart when the piece can show it: turns need a turning shape, and so on. */
function canShow(answer: Cell, attr: Attr, value: number): boolean {
  if (attr === 'turn') return TURNING_SHAPES.includes(answer.shape);
  if (attr === 'shape') return answer.turn === 0 || TURNING_SHAPES.includes(value);
  if (attr === 'spot') return answer.count === 1;
  if (attr === 'count') return answer.spot === MIDDLE;
  if (attr === 'marks') return value > 0 && value <= ALL_MARKS;
  return true;
}

/** Tempting wrong values for one attribute: what its neighbours have, one step too far, the wrong way to combine. */
function slipsFor(made: Made, attr: Attr, random: Random, allowed: readonly number[]): number[] {
  const { size, cells, laws } = made;
  const answer = cells[cells.length - 1];
  const law = laws[attr];
  const gap = cells.length - 1;
  if (law === 'same') return STEADY_SLIPS.includes(attr) ? takeSome(random, allowed, 3) : [];
  const values = cells.slice(0, -1).map((cell) => cell[attr]);
  if (law === 'across' || law === 'down') {
    const before = cells[law === 'across' ? gap - 1 : gap - size][attr];
    const ring = attr === 'turn' || attr === 'spot';
    const step = answer[attr] - before;
    values.push(ring ? (((answer[attr] + step) % RING) + RING) % RING : answer[attr] + step);
  }
  if (law === 'join' || law === 'cancel') {
    const [first, second] = [cells[gap - 2].marks, cells[gap - 1].marks];
    values.push(markOp('join', first, second), markOp('cancel', first, second), markOp('cut', first, second), markOp('cut', second, first));
    const on = Array.from({ length: MARK_SPOTS }, (_, bit) => bit).filter((bit) => answer.marks & (1 << bit));
    const off = Array.from({ length: MARK_SPOTS }, (_, bit) => bit).filter((bit) => !(answer.marks & (1 << bit)));
    values.push(answer.marks & ~(1 << pick(random, on)), answer.marks | (1 << pick(random, off)));
  }
  return [...new Set(values)];
}

interface Slip {
  cell: Cell;
  attr: Attr;
}

function slips(made: Made, spec: Spec, plan: Plan, random: Random): Slip[] {
  const answer = made.cells[made.cells.length - 1];
  const shown = shownOf(made);
  const found: Slip[] = [];
  const seen = new Set([cellKey(answer)]);
  for (const attr of made.attrs) {
    for (const value of slipsFor(made, attr, random, allowedValues(attr, spec.world, plan))) {
      if (value === answer[attr] || !ATTRS[attr].values.includes(value) || !canShow(answer, attr, value)) continue;
      const cell = withValue(answer, attr, value);
      const broken = brokenBy(shown, cell);
      if (broken.length !== 1 || broken[0] !== attr || seen.has(cellKey(cell))) continue;
      seen.add(cellKey(cell));
      found.push({ cell, attr });
    }
  }
  return found;
}

/**
 * How many taps the careless eye may waste on one puzzle, at most and at least. The first world can't be lost, so
 * it is free. A level it must win lets it slip once in its whole set, on one puzzle, so it wins with two stars but
 * never three. A level it must lose makes it slip as often as a try allows, on every puzzle. Elsewhere it slips at
 * least once each time.
 */
export function carelessBudget(spec: Pick<Spec, 'careless' | 'world' | 'options'>, go: number): { least: number; most: number } {
  if (spec.world === 'match') return { least: 0, most: spec.options - 1 };
  const slipsHere = go % SET === Math.floor(go / SET) % SET;
  if (spec.careless === 'wins') return { least: slipsHere ? 1 : 0, most: slipsHere ? 1 : 0 };
  if (spec.careless === 'loses') return { least: missLimitFor(spec.options), most: spec.options - 2 };
  return { least: 1, most: spec.options - 1 };
}

/** A wrong piece that takes its rule's value from the patch beside the gap, or the one above it. */
function copiesNeighbour(made: Made, slip: Slip): boolean {
  if (made.laws[slip.attr] === 'same') return false;
  const gap = made.cells.length - 1;
  const value = slip.cell[slip.attr];
  return value === made.cells[gap - 1][slip.attr] || value === made.cells[gap - made.size][slip.attr];
}

/** Picks the wrong pieces: one for each rule first, then more, until the careless eye behaves as the level needs. */
function chooseSlips(made: Made, spec: Spec, go: number, pool: Slip[], random: Random): Cell[] | null {
  const needed = spec.options - 1;
  const budget = carelessBudget(spec, go);
  const moving = made.attrs.filter((attr) => made.laws[attr] !== 'same');
  const ahead = new Set(pool.filter((slip) => rivals(made, [slip.cell]).ahead === 1));
  const behind = new Set(pool.filter((slip) => rivals(made, [slip.cell]).ahead + rivals(made, [slip.cell]).tied === 0));
  // The first world always offers a piece that copies the patch beside or above the gap in its rule: the slip a
  // 4-year-old is most likely to make, and safe to offer there because a try can't be lost.
  const copies = new Set(spec.world === 'match' ? pool.filter((slip) => copiesNeighbour(made, slip)) : []);
  for (let tries = 0; tries < 80; tries += 1) {
    let order = shuffled(random, pool);
    if (copies.size) order = [...order.filter((slip) => copies.has(slip)), ...order.filter((slip) => !copies.has(slip))];
    // The pieces that look more like the neighbour than the answer does go first when the eye must slip, and the
    // pieces that look less like it go first when it must not.
    if (budget.least > 0) order = [...order.filter((slip) => ahead.has(slip)), ...order.filter((slip) => !ahead.has(slip))];
    else if (budget.most === 0) order = order.filter((slip) => behind.has(slip));
    const chosen: Slip[] = [];
    for (const attr of shuffled(random, moving)) {
      const slip = order.find((one) => one.attr === attr && (budget.least < 2 || ahead.has(one)));
      if (slip && chosen.length < needed) chosen.push(slip);
    }
    for (const slip of order) {
      if (chosen.length >= needed) break;
      if (!chosen.includes(slip)) chosen.push(slip);
    }
    if (chosen.length < needed) return null;
    if (spec.world === 'match' && !chosen.some((slip) => copies.has(slip))) continue;
    const eye = rivals(
      made,
      chosen.map((slip) => slip.cell),
    );
    // "Most" counts ties as slips, so even unlucky tie-breaks stay within it. Some wrong piece always looks less
    // like the neighbour than the answer on a losing level, so taking the least alike piece is no trick either.
    if (eye.ahead >= budget.least && eye.ahead + eye.tied <= budget.most) return chosen.map((slip) => slip.cell);
  }
  return null;
}

const ATTEMPTS = 600;

function build(spec: Spec, index: number, go: number): Level {
  const random = seeded(SEED + index * 7919 + go * 104729);
  for (let attempt = 0; attempt < ATTEMPTS; attempt += 1) {
    const made = grid(spec, random);
    if (!made) continue;
    const plan = Object.fromEntries(Object.entries(made.laws).filter(([, law]) => law !== 'same')) as Plan;
    const wrong = chooseSlips(made, spec, go, slips(made, spec, plan, random), random);
    if (!wrong) continue;
    const answer = int(random, 0, wrong.length);
    const options = [...wrong.slice(0, answer), made.cells[made.cells.length - 1], ...wrong.slice(answer)];
    return {
      id: index + 1,
      go,
      world: spec.world,
      size: spec.size,
      cells: made.cells,
      options,
      answer,
      laws: made.laws,
      attrs: attrsOf(made.cells),
      big: spec.world === 'match',
    };
  }
  throw new Error(`No puzzle fits level ${index + 1}, go ${go}`);
}

/** Makes a level's nth go from its seed, without keeping it. */
export function makeLevel(id: number, go: number): Level | undefined {
  const spec = SPECS[id - 1];
  return spec && Number.isInteger(go) && go >= 0 ? build(spec, id - 1, go) : undefined;
}

/** What the careless eye must do on a level, if anything. */
export const carelessGoal = (id: number): 'wins' | 'loses' | undefined => SPECS[id - 1]?.careless;

/** The careless eye's budget for one go of a level. */
export const carelessBudgetFor = (id: number, go: number): { least: number; most: number } => carelessBudget(SPECS[id - 1], go);

/** The puzzles of a level's nth try: three fresh ones of the same kind. */
export const setFor = (id: number, set: number): Level[] => Array.from({ length: SET }, (_, step) => levelFor(id, set * SET + step) as Level);

const made = new Map<string, Level>();

/** The puzzle for a level's nth go. The same go always gives the same puzzle. */
export function levelFor(id: number, go: number): Level | undefined {
  const key = `${id}:${go}`;
  const kept = made.get(key);
  if (kept) return kept;
  const level = makeLevel(id, go);
  if (level) made.set(key, level);
  return level;
}

/** The first go of each level, which stands for the level on the map. */
export const LEVELS: readonly Level[] = SPECS.map((_, index) => levelFor(index + 1, 0) as Level);

export const levelById = (id: number): Level | undefined => LEVELS.find((level) => level.id === id);

/** The patches on show and the attributes in play, for the solver. */
export const shownFor = (level: Level): Shown => shownOf(level);

/** What a puzzle looks like, so two goes can be told apart. */
export const puzzleKey = (level: Level): string => [...level.cells, ...level.options].map(cellKey).join('|');
