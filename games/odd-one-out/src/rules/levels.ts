// The staircase. Each go at a level is made by a small pure generator from a fixed seed, so a puzzle is the same
// on every device and every run, and every retry or replay moves on to a fresh one of the same kind. Every puzzle
// is checked by the solver as it is made: exactly one thing breaks the rule the level meant, no other rule the
// game knows singles out anything else, and the careless eye (careless.ts) does what the level needs.
import { rivals } from './careless.ts';
import { alsoIn, clashes, picsIn, type Group } from './pics.ts';
import { aboutOf, oddOnes, rulesSingling, singledBy, type Rule } from './solve.ts';
import {
  ARROW,
  CARD,
  COLORS,
  drawn,
  EVEN_SHAPES,
  LOPSIDED,
  MOST_DOTS,
  picture,
  PLAIN_SHAPES,
  POLYGONS,
  SHAPES,
  thingKey,
  TURNS,
  type Thing,
} from './things.ts';

export type WorldId = 'kinds' | 'looks' | 'count' | 'pairs' | 'tricky';
export const WORLDS: readonly WorldId[] = ['kinds', 'looks', 'count', 'pairs', 'tricky'];

/** The idea a puzzle is about. Each gets a dance once it is solved, and a wordless demo the first time. */
export type Idea =
  | 'group'
  | 'color'
  | 'shape'
  | 'size'
  | 'fill'
  | 'count'
  | 'parity'
  | 'honest'
  | 'pair'
  | 'symmetry'
  | 'mirror'
  | 'sides'
  | 'step'
  | 'alternate';

/** How dots sit on a card: like a dice, in buddy pairs (so an odd one has a dot left alone), or scattered. */
export type DotLayout = 'dice' | 'pairs' | 'scatter';

type Noise = 'color' | 'shape' | 'size' | 'fill';

type Plan =
  | { idea: 'group'; members: readonly Group[]; odd: readonly Group[] }
  | { idea: 'color' | 'shape' | 'size' | 'fill'; noise: readonly Noise[] }
  | { idea: 'count'; layout: DotLayout; noise: readonly Noise[] }
  | { idea: 'parity'; layout: DotLayout; numerals: boolean; noise: readonly Noise[] }
  | { idea: 'honest'; noise: readonly Noise[] }
  | { idea: 'pair'; a: Noise; b: Noise; noise: readonly Noise[] }
  | { idea: 'symmetry' | 'sides'; noise: readonly Noise[] }
  | { idea: 'mirror'; noise: readonly Noise[]; quarters?: boolean }
  | { idea: 'step'; feature: 'dots' | 'turn'; noise: readonly Noise[] }
  | { idea: 'alternate'; feature: 'color' | 'shape'; noise: readonly Noise[] };

interface Spec {
  world: WorldId;
  count: 4 | 5 | 6;
  plans: readonly Plan[];
  /**
   * The careless eye always finds the answer within a try, or never does. Levels that say neither still make it
   * slip on every puzzle, so it runs out of tries there too.
   */
  careless?: 'wins' | 'loses';
}

export interface Puzzle {
  id: number;
  /** Which go at the level this is. Each go is a fresh puzzle. */
  go: number;
  world: WorldId;
  idea: Idea;
  /** The things on the lily pads, in reading order. */
  things: Thing[];
  /** The one that doesn't belong. */
  answer: number;
  /** The rule every other thing keeps. */
  rule: Rule;
  layout: DotLayout;
  /** Where scattered dots land, so a card looks the same every time. */
  seed: number;
  /** The thing the careless eye lands on first. */
  glance: number;
  /** Big things for the first world, which is for age 4. */
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

/**
 * Wrong taps that end a try, counted over its whole set: two fewer than the things on the pond, and never more than
 * three, so tapping every pad in turn can't win. Four things allow 2 misses, five and six allow 3.
 */
export const missLimitFor = (count: number): number => Math.min(count - 2, 3);
/**
 * The first world is for age 4, so its tries never fail: a wrong tap still protests and costs a star, but the set
 * always finishes. Every later world has the limit.
 */
export const missLimit = (puzzle: Pick<Puzzle, 'world' | 'things'>): number => (puzzle.world === 'kinds' ? Infinity : missLimitFor(puzzle.things.length));

// ---------- The staircase ----------

const LOOKS: readonly Noise[] = ['color', 'shape', 'size', 'fill'];
const without = (noise: Noise): Noise[] => LOOKS.filter((one) => one !== noise);
const FOUR: readonly Group[] = ['animals', 'vehicles', 'food', 'toys'];
const SIX: readonly Group[] = ['animals', 'vehicles', 'food', 'toys', 'clothes', 'plants'];

const SYMMETRY: Plan = { idea: 'symmetry', noise: ['color', 'size', 'fill'] };
const MIRROR: Plan = { idea: 'mirror', noise: ['color', 'size'], quarters: true };
const PAIRINGS: readonly Plan[] = [
  { idea: 'pair', a: 'size', b: 'color', noise: ['shape'] },
  { idea: 'pair', a: 'shape', b: 'color', noise: ['size', 'fill'] },
  { idea: 'pair', a: 'fill', b: 'color', noise: ['shape', 'size'] },
  { idea: 'pair', a: 'size', b: 'fill', noise: ['shape', 'color'] },
];
const SEQUENCES: readonly Plan[] = [
  { idea: 'step', feature: 'dots', noise: ['color'] },
  { idea: 'step', feature: 'turn', noise: ['color'] },
  { idea: 'alternate', feature: 'color', noise: ['shape'] },
  { idea: 'alternate', feature: 'shape', noise: ['color'] },
];
const DECOYS: readonly Plan[] = [
  { idea: 'pair', a: 'size', b: 'color', noise: ['shape', 'fill'] },
  { idea: 'pair', a: 'shape', b: 'fill', noise: ['color', 'size'] },
  { idea: 'parity', layout: 'scatter', numerals: false, noise: ['color', 'size'] },
  { idea: 'symmetry', noise: ['color', 'size', 'fill'] },
  { idea: 'mirror', noise: ['color', 'size'] },
];

const SPECS: readonly Spec[] = [
  // 1. Kinds of things: three of a kind and one that isn't, for age 4.
  { world: 'kinds', count: 4, plans: [{ idea: 'group', members: ['animals'], odd: ['vehicles'] }], careless: 'wins' },
  {
    world: 'kinds',
    count: 4,
    plans: [
      { idea: 'group', members: ['vehicles'], odd: ['animals'] },
      { idea: 'group', members: ['animals'], odd: ['food'] },
    ],
    careless: 'wins',
  },
  {
    world: 'kinds',
    count: 4,
    plans: [
      { idea: 'group', members: ['food'], odd: ['toys'] },
      { idea: 'group', members: ['toys'], odd: ['food', 'animals'] },
    ],
    careless: 'wins',
  },
  { world: 'kinds', count: 4, plans: [{ idea: 'group', members: FOUR, odd: FOUR }], careless: 'wins' },
  { world: 'kinds', count: 4, plans: [{ idea: 'group', members: SIX, odd: SIX }], careless: 'wins' },

  // 2. One look: colour, shape, size or fill, with the other looks muddling things more and more.
  { world: 'looks', count: 4, plans: [{ idea: 'color', noise: without('color') }], careless: 'wins' },
  { world: 'looks', count: 4, plans: [{ idea: 'shape', noise: without('shape') }], careless: 'wins' },
  { world: 'looks', count: 4, plans: [{ idea: 'size', noise: without('size') }], careless: 'wins' },
  { world: 'looks', count: 4, plans: [{ idea: 'fill', noise: without('fill') }], careless: 'wins' },
  {
    world: 'looks',
    count: 4,
    plans: LOOKS.map((idea) => ({ idea, noise: without(idea) })),
    careless: 'wins',
  },

  // 3. Counting: dots like a dice, scattered dots, buddy pairs for even and odd, and number cards.
  { world: 'count', count: 5, plans: [{ idea: 'count', layout: 'dice', noise: ['color', 'size'] }] },
  { world: 'count', count: 5, plans: [{ idea: 'count', layout: 'scatter', noise: ['color', 'size'] }] },
  { world: 'count', count: 5, plans: [{ idea: 'parity', layout: 'pairs', numerals: false, noise: ['color', 'size'] }] },
  { world: 'count', count: 5, plans: [{ idea: 'parity', layout: 'dice', numerals: true, noise: ['color', 'size'] }] },
  {
    world: 'count',
    count: 5,
    plans: [
      { idea: 'count', layout: 'scatter', noise: ['color', 'size'] },
      { idea: 'parity', layout: 'scatter', numerals: false, noise: ['color', 'size'] },
      { idea: 'honest', noise: ['color', 'size'] },
    ],
  },

  // 4. Two looks that go together, mirror lines and mirror images. Every thing differs from the others somehow.
  { world: 'pairs', count: 5, plans: [PAIRINGS[0]] },
  { world: 'pairs', count: 5, plans: PAIRINGS.slice(1) },
  { world: 'pairs', count: 5, plans: [SYMMETRY], careless: 'loses' },
  { world: 'pairs', count: 5, plans: [MIRROR], careless: 'loses' },
  { world: 'pairs', count: 5, plans: [...PAIRINGS, SYMMETRY, MIRROR], careless: 'loses' },

  // 5. Grown-up puzzles: hidden rules, sequences, and sets where several things look odd but only one is.
  { world: 'tricky', count: 6, plans: [{ idea: 'sides', noise: ['color', 'size'] }], careless: 'loses' },
  { world: 'tricky', count: 6, plans: SEQUENCES, careless: 'loses' },
  { world: 'tricky', count: 6, plans: DECOYS, careless: 'loses' },
  {
    world: 'tricky',
    count: 6,
    plans: [{ idea: 'sides', noise: ['color', 'size'] }, { idea: 'honest', noise: ['color', 'size'] }, ...SEQUENCES, ...DECOYS],
    careless: 'loses',
  },
];

export const LEVEL_COUNT = SPECS.length;

// ---------- Making a set of things ----------

interface Made {
  things: Thing[];
  answer: number;
  rule: Rule;
  layout: DotLayout;
}

/** Things that carry dots sit on cards or polygons, big enough to count. */
const NOISE_SIZES = [0, 1, 2];
const DOT_SIZES = [1, 2];

/** Each look that muddles a puzzle is on or off for a whole puzzle, then random for every thing. */
function muddle(random: Random, things: Thing[], noise: readonly Noise[], shapes: readonly number[], dotted: boolean): void {
  for (const look of noise) {
    if (random() < 0.3) continue;
    for (const thing of things) {
      if (look === 'color') thing.color = int(random, 0, COLORS.length - 1);
      else if (look === 'size') thing.size = pick(random, dotted ? DOT_SIZES : NOISE_SIZES);
      else if (look === 'fill') thing.fill = int(random, 0, 1);
      else thing.shape = pick(random, shapes);
    }
  }
}

/** Puts the odd thing in at the place this go chose for it. */
function withOdd(place: number, members: Thing[], odd: Thing, rule: Rule, layout: DotLayout = 'dice'): Made {
  const answer = place;
  return { things: [...members.slice(0, answer), odd, ...members.slice(answer)], answer, rule, layout };
}

const copies = (count: number, make: () => Thing): Thing[] => Array.from({ length: count }, make);

function makeGroup(random: Random, plan: Extract<Plan, { idea: 'group' }>, count: number, place: number): Made {
  const members = pick(random, plan.members);
  const odd = pick(
    random,
    plan.odd.filter((group) => group !== members && !clashes(members, group)),
  );
  // No picture a child could put in the other group: nothing in the odd group that could pass for the members' group,
  // and no member that could pass for the odd one's.
  const pics = takeSome(
    random,
    picsIn(members).filter((at) => !alsoIn(at).includes(odd)),
    count - 1,
  ).map(picture);
  const oddPic = pick(
    random,
    picsIn(odd).filter((at) => !alsoIn(at).includes(members)),
  );
  return withOdd(place, pics, picture(oddPic), { kind: 'same', feature: 'group' });
}

function makeLook(random: Random, plan: Extract<Plan, { idea: 'color' | 'shape' | 'size' | 'fill' }>, count: number, place: number): Made {
  const look = plan.idea;
  const pool = look === 'color' ? COLORS.map((_, at) => at) : look === 'shape' ? PLAIN_SHAPES : look === 'size' ? [0, 1, 2] : [0, 1];
  const [shared, other] = takeSome(random, pool, 2);
  const base = drawn({ shape: pick(random, PLAIN_SHAPES), color: int(random, 0, COLORS.length - 1) });
  const members = copies(count, () => ({ ...base }));
  muddle(random, members, plan.noise, PLAIN_SHAPES, false);
  const odd = members.pop() as Thing;
  for (const thing of members) thing[look] = shared;
  odd[look] = other;
  return withOdd(place, members, odd, { kind: 'same', feature: look });
}

const card = (dots: number, color: number): Thing => drawn({ shape: CARD, color, dots });

function makeCount(random: Random, plan: Extract<Plan, { idea: 'count' }>, count: number, place: number): Made {
  const most = plan.layout === 'dice' ? 6 : 7;
  const shared = int(random, plan.layout === 'dice' ? 2 : 3, most - 1);
  const other = shared + pick(random, [1, -1]);
  const color = int(random, 0, COLORS.length - 1);
  const members = copies(count, () => card(shared, color));
  muddle(random, members, plan.noise, [CARD], true);
  const odd = members.pop() as Thing;
  odd.dots = other;
  return withOdd(place, members, odd, { kind: 'same', feature: 'dots' }, plan.layout);
}

function makeParity(random: Random, plan: Extract<Plan, { idea: 'parity' }>, count: number, place: number): Made {
  const evens = [2, 4, 6, 8];
  const odds = [1, 3, 5, 7, 9];
  const [shared, other] = random() < 0.5 ? [evens, odds] : [odds, evens];
  const color = int(random, 0, COLORS.length - 1);
  const values = shared.length >= count - 1 ? takeSome(random, shared, count - 1) : [...shuffled(random, shared), ...takeSome(random, shared, count - 1 - shared.length)];
  const members = values.map((dots) => card(dots, color));
  const odd = card(pick(random, other), color);
  muddle(random, [...members, odd], plan.noise, [CARD], true);
  if (plan.numerals) for (const thing of [...members, odd]) thing.numeral = thing.dots;
  return withOdd(place, members, odd, { kind: 'same', feature: 'parity' }, plan.layout);
}

function makeHonest(random: Random, plan: Extract<Plan, { idea: 'honest' }>, count: number, place: number): Made {
  const values = takeSome(random, [1, 2, 3, 4, 5, 6, 7, 8], count);
  const color = int(random, 0, COLORS.length - 1);
  const things = values.map((dots) => ({ ...card(dots, color), numeral: dots }));
  muddle(random, things, plan.noise, [CARD], true);
  const odd = things.pop() as Thing;
  odd.numeral = Math.max(1, Math.min(MOST_DOTS, odd.dots + pick(random, [1, -1])));
  if (odd.numeral === odd.dots) odd.numeral = odd.dots + 1;
  return withOdd(place, things, odd, { kind: 'same', feature: 'honest' });
}

function lookPool(look: Noise): number[] {
  if (look === 'color') return COLORS.map((_, at) => at);
  if (look === 'shape') return [...PLAIN_SHAPES];
  if (look === 'size') return [0, 2];
  return [0, 1];
}

function makePair(random: Random, plan: Extract<Plan, { idea: 'pair' }>, count: number, place: number): Made {
  const [a1, a2] = takeSome(random, lookPool(plan.a), 2);
  const [b1, b2] = takeSome(random, lookPool(plan.b), 2);
  const members = count - 1;
  const first = members === 4 ? 2 : pick(random, [2, 3]);
  const things = copies(count, () => drawn({ shape: pick(random, PLAIN_SHAPES), color: int(random, 0, COLORS.length - 1) }));
  muddle(random, things, plan.noise, PLAIN_SHAPES, false);
  const odd = things.pop() as Thing;
  things.forEach((thing, at) => {
    thing[plan.a] = at < first ? a1 : a2;
    thing[plan.b] = at < first ? b1 : b2;
  });
  const flip = random() < 0.5;
  odd[plan.a] = flip ? a1 : a2;
  odd[plan.b] = flip ? b2 : b1;
  return withOdd(place, shuffled(random, things), odd, { kind: 'pair', a: plan.a, b: plan.b });
}

function makeSymmetry(random: Random, plan: { noise: readonly Noise[] }, count: number, place: number): Made {
  const things = takeSome(random, EVEN_SHAPES, count - 1).map((shape) => drawn({ shape, color: int(random, 0, COLORS.length - 1) }));
  const odd = drawn({ shape: pick(random, LOPSIDED), color: int(random, 0, COLORS.length - 1), flip: int(random, 0, 1) });
  muddle(
    random,
    [...things, odd],
    plan.noise.filter((look) => look !== 'shape'),
    EVEN_SHAPES,
    false,
  );
  return withOdd(place, things, odd, { kind: 'same', feature: 'symmetric' });
}

function makeMirror(random: Random, plan: { noise: readonly Noise[]; quarters?: boolean }, count: number, place: number): Made {
  const shape = pick(random, LOPSIDED);
  // Quarter turns only, until the grown-up world adds eighths. Five things on four quarter turns share one.
  const pool = Array.from({ length: TURNS }, (_, at) => at).filter((turn) => !plan.quarters || turn % 2 === 0);
  const turns = [...shuffled(random, pool), ...shuffled(random, pool)].slice(0, count);
  const flip = int(random, 0, 1);
  const things = turns.map((turn) => drawn({ shape, turn, flip, color: int(random, 0, COLORS.length - 1) }));
  muddle(
    random,
    things,
    plan.noise.filter((look) => look === 'color' || look === 'size'),
    [shape],
    false,
  );
  const odd = things.pop() as Thing;
  odd.flip = 1 - flip;
  return withOdd(place, things, odd, { kind: 'same', feature: 'handed' });
}

function makeSides(random: Random, plan: { noise: readonly Noise[] }, count: number, place: number): Made {
  const things = copies(count, () => {
    const shape = pick(random, POLYGONS);
    return drawn({ shape, dots: SHAPES[shape].sides as number, color: int(random, 0, COLORS.length - 1) });
  });
  muddle(
    random,
    things,
    plan.noise.filter((look) => look === 'color' || look === 'size'),
    POLYGONS,
    true,
  );
  const odd = things.pop() as Thing;
  odd.dots += pick(random, [1, -1]);
  return withOdd(place, things, odd, { kind: 'same', feature: 'sidesMatch' });
}

/** A row where dots or turns go up or down by the same step, with one place wrong. Places matter here. */
function makeStep(random: Random, plan: Extract<Plan, { idea: 'step' }>, count: number, place: number): Made {
  const color = int(random, 0, COLORS.length - 1);
  let values: number[];
  let wrong: (right: number) => number;
  let make: (value: number) => Thing;
  if (plan.feature === 'dots') {
    const step = pick(
      random,
      [1, -1, 2, -2].filter((one) => Math.abs(one) * (count - 1) < MOST_DOTS),
    );
    const span = step * (count - 1);
    const low = span > 0 ? 1 : 1 - span;
    const high = span > 0 ? MOST_DOTS - span : MOST_DOTS;
    const start = int(random, low, high);
    values = Array.from({ length: count }, (_, at) => start + at * step);
    wrong = (right) => {
      const near = [right - 1, right + 1].filter((value) => value >= 1 && value <= MOST_DOTS);
      return pick(random, near);
    };
    make = (dots) => card(dots, color);
  } else {
    const step = pick(random, [1, 2, TURNS - 1, TURNS - 2]);
    const start = int(random, 0, TURNS - 1);
    values = Array.from({ length: count }, (_, at) => (start + at * step) % TURNS);
    wrong = (right) => (right + pick(random, [2, 3, 4, 5, 6])) % TURNS;
    make = (turn) => drawn({ shape: ARROW, turn, color });
  }
  const things = values.map(make);
  muddle(
    random,
    things,
    plan.noise.filter((look) => look === 'color'),
    [],
    plan.feature === 'dots',
  );
  const answer = place;
  things[answer] = { ...things[answer], [plan.feature]: wrong(values[answer]) };
  return { things, answer, rule: { kind: 'step', feature: plan.feature }, layout: 'dice' };
}

/** A row where two looks take turns, with one place wrong. */
function makeAlternate(random: Random, plan: Extract<Plan, { idea: 'alternate' }>, count: number, place: number): Made {
  const look = plan.feature;
  const pool = look === 'color' ? COLORS.map((_, at) => at) : PLAIN_SHAPES;
  const [first, second, third] = takeSome(random, pool, 3);
  const base = drawn({ shape: pick(random, PLAIN_SHAPES), color: int(random, 0, COLORS.length - 1) });
  const things = copies(count, () => ({ ...base }));
  muddle(random, things, plan.noise, PLAIN_SHAPES, false);
  things.forEach((thing, at) => (thing[look] = at % 2 === 0 ? first : second));
  const answer = place;
  things[answer][look] = random() < 0.5 ? third : answer % 2 === 0 ? second : first;
  return { things, answer, rule: { kind: 'alternate', feature: look }, layout: 'dice' };
}

function makeOne(random: Random, plan: Plan, count: number, place: number): Made {
  switch (plan.idea) {
    case 'group':
      return makeGroup(random, plan, count, place);
    case 'count':
      return makeCount(random, plan, count, place);
    case 'parity':
      return makeParity(random, plan, count, place);
    case 'honest':
      return makeHonest(random, plan, count, place);
    case 'pair':
      return makePair(random, plan, count, place);
    case 'symmetry':
      return makeSymmetry(random, plan, count, place);
    case 'mirror':
      return makeMirror(random, plan, count, place);
    case 'sides':
      return makeSides(random, plan, count, place);
    case 'step':
      return makeStep(random, plan, count, place);
    case 'alternate':
      return makeAlternate(random, plan, count, place);
    default:
      return makeLook(random, plan, count, place);
  }
}

// ---------- Checking a set ----------

/**
 * How many taps the careless eye may waste on one puzzle, at most and at least. The first world can't be lost, so
 * it is free. A level it must win lets it slip once in its whole set, on one puzzle, so it wins with two stars but
 * never three. A level it must lose makes it slip as often as a try allows, on every puzzle, while some wrong thing
 * still looks less odd than the answer. Elsewhere it slips at least once each time, which runs out a try too.
 */
export function carelessBudget(spec: Pick<Spec, 'careless' | 'world' | 'count'>, go: number): { least: number; most: number } {
  if (spec.world === 'kinds') return { least: 0, most: spec.count - 1 };
  const slipsHere = go % SET === Math.floor(go / SET) % SET;
  if (spec.careless === 'wins') return { least: slipsHere ? 1 : 0, most: slipsHere ? 1 : 0 };
  if (spec.careless === 'loses') return { least: missLimitFor(spec.count), most: spec.count - 2 };
  return { least: 1, most: spec.count - 1 };
}

/** Drawn things carry dots only on cards and polygons, and only turn when a turn can be seen. */
function wellDrawn(thing: Thing): boolean {
  if (thing.pic !== null) return true;
  const shape = SHAPES[thing.shape];
  if (thing.dots > 0 && shape.name !== 'card' && shape.sides === null) return false;
  if (thing.dots < 0 || thing.dots > MOST_DOTS) return false;
  if (thing.turn !== 0 && !shape.turnable) return false;
  if (thing.flip !== 0 && shape.symmetric) return false;
  return !(thing.dots > 6 && thing.size === 0);
}

/** Every check a made puzzle must pass. */
export function fair(made: Pick<Made, 'things' | 'answer' | 'rule'>): boolean {
  const { things, answer, rule } = made;
  if (!things.every(wellDrawn)) return false;
  if (singledBy(rule, things).join() !== String(answer)) return false;
  if (oddOnes(things).join() !== String(answer)) return false;
  // About one idea: any other rule that also singles out the answer is about the same looks.
  const about = aboutOf(rule);
  return rulesSingling(things, answer).every((other) => aboutOf(other).every((look) => about.includes(look)));
}

const ATTEMPTS = 6000;

function build(spec: Spec, index: number, go: number): Puzzle {
  const random = seeded(SEED + index * 7919 + go * 104729);
  const budget = carelessBudget(spec, go);
  const distinct = spec.world === 'pairs' || spec.world === 'tricky';
  // Each go settles on one plan, so a level's kinds of puzzle come up evenly however easy each is to make, and on
  // one place for the odd one, drawn from the seed, so no tapping pattern can learn where it will be.
  const first = int(random, 0, spec.plans.length - 1);
  const place = int(random, 0, spec.count - 1);
  for (let attempt = 0; attempt < ATTEMPTS * spec.plans.length; attempt += 1) {
    const plan = spec.plans[(first + Math.floor(attempt / ATTEMPTS)) % spec.plans.length];
    const made = makeOne(random, plan, spec.count, place);
    const glance = int(random, 0, spec.count - 1);
    // The cheap checks first: the careless eye, then the solver.
    const eye = rivals(made.things, made.answer, glance);
    if (eye.ahead < budget.least || eye.ahead + eye.tied > budget.most) continue;
    if (distinct && new Set(made.things.map(thingKey)).size !== made.things.length) continue;
    if (!fair(made)) continue;
    return {
      id: index + 1,
      go,
      world: spec.world,
      idea: plan.idea,
      things: made.things,
      answer: made.answer,
      rule: made.rule,
      layout: made.layout,
      seed: int(random, 1, 1e9),
      glance,
      big: spec.world === 'kinds',
    };
  }
  throw new Error(`No puzzle fits level ${index + 1}, go ${go}`);
}

/** Makes a level's nth go from its seed, without keeping it. */
export function makePuzzle(id: number, go: number): Puzzle | undefined {
  const spec = SPECS[id - 1];
  return spec && Number.isInteger(go) && go >= 0 ? build(spec, id - 1, go) : undefined;
}

/** What the careless eye must do on a level, if anything. */
export const carelessGoal = (id: number): 'wins' | 'loses' | undefined => SPECS[id - 1]?.careless;

/** The careless eye's budget for one go of a level. */
export const carelessBudgetFor = (id: number, go: number): { least: number; most: number } => carelessBudget(SPECS[id - 1], go);

/** The ideas a level can bring, for the tests. */
export const ideasOf = (id: number): Idea[] => [...new Set((SPECS[id - 1]?.plans ?? []).map((plan) => plan.idea))];

const kept = new Map<string, Puzzle>();

/** The puzzle for a level's nth go. The same go always gives the same puzzle. */
export function puzzleFor(id: number, go: number): Puzzle | undefined {
  const key = `${id}:${go}`;
  const found = kept.get(key);
  if (found) return found;
  const puzzle = makePuzzle(id, go);
  if (puzzle) kept.set(key, puzzle);
  return puzzle;
}

/** The puzzles of a level's nth try: three fresh ones of the same kind. */
export const setFor = (id: number, set: number): Puzzle[] => Array.from({ length: SET }, (_, step) => puzzleFor(id, set * SET + step) as Puzzle);

export interface Level {
  id: number;
  world: WorldId;
  count: number;
  big: boolean;
}

export const LEVELS: readonly Level[] = SPECS.map((spec, index) => ({ id: index + 1, world: spec.world, count: spec.count, big: spec.world === 'kinds' }));

export const levelById = (id: number): Level | undefined => LEVELS.find((level) => level.id === id);

/** What a puzzle looks like, so two goes can be told apart. */
export const puzzleKey = (puzzle: Puzzle): string => puzzle.things.map(thingKey).join('|');

