// The staircase. Each go at a level is made by a small pure generator from a fixed seed, so a puzzle is the same
// on every device and every run, and every retry or replay moves on to a fresh one of the same kind. Every puzzle
// is checked as it is made: the target has no symmetry, so "turned" and "backwards" can always be told apart;
// exactly one option is the target turned; every wrong option is a mirror image, a shape with one tile moved, a
// colour on the wrong tile, or on the first worlds a clearly different shape; and no two options are the same
// critter. The careless eye (careless.ts) is checked too, so it wins the early levels and loses the late ones.
import { carelessOrder, pairRivals, rivals } from './careless.ts';
import {
  BODY,
  bare,
  FACE,
  fromRows,
  freeKey,
  GEM,
  glance,
  grow,
  keyOf,
  mirror,
  movedVersions,
  neighbours,
  noSymmetry,
  relation,
  repainted,
  sideOf,
  SPOT,
  STRIPE,
  turn,
  turns,
  type Shape,
  type Tile,
} from './shapes.ts';
import { solveMatch, solvePairs } from './solve.ts';

export type WorldId = 'spin' | 'turn' | 'mirror' | 'colour' | 'tricky';
export const WORLDS: readonly WorldId[] = ['spin', 'turn', 'mirror', 'colour', 'tricky'];

/** "Which one is the target turned?", or "which two are the same?". */
export type Kind = 'match' | 'pairs';

/** What makes a wrong option wrong. */
export type Slip = 'mirror' | 'moved' | 'paint' | 'shape';

/**
 * The ↻ button that turns the target on screen, on the first three worlds. It is always fine to use, but it is a
 * hint: a set where it was used earns 2 stars at most, so turning the target until it matches never buys 3.
 */
export type Helper = 'hint' | 'none';

interface Spec {
  world: WorldId;
  kind: Kind;
  /** Options under the target, or cards in "which two are the same?". */
  options: number;
  /** How many tiles a critter may have. */
  cells: readonly number[];
  /** The longest side of any critter's box, in tiles. */
  side: number;
  /** The quarter turns, clockwise, that the right option may be turned by. */
  turns: readonly number[];
  face: boolean;
  /** Accent colours painted on tiles. */
  accents: readonly number[];
  /** The kinds of wrong option a puzzle may offer. */
  slips: readonly Slip[];
  /** The kinds of wrong option every puzzle offers at least one of. */
  needs: readonly Slip[];
  helper: Helper;
  /** The careless eye always wins a try of the level, or always loses it. */
  careless: 'wins' | 'loses';
  /** Hand-picked critters, for the first world. Otherwise critters are grown at random. */
  shapes?: readonly (readonly string[])[];
  /**
   * Whether the plain shape, before any paint, may have a symmetry. Only the first worlds allow it, where no option
   * is a mirror image. From the mirror world on, a symmetric shape would make a mirror image look like a turn.
   */
  symmetric: boolean;
}

export interface Puzzle {
  id: number;
  /** Which go at the level this is. Each go is a fresh puzzle. */
  go: number;
  world: WorldId;
  kind: Kind;
  /** The critter on top, as shown. In "which two are the same?" it is the critter the cards come from, and hidden. */
  target: Tile[];
  /** The options, or the cards, in the order they sit. */
  options: Tile[][];
  /** The right option. In "which two are the same?", the first card of the right pair. */
  answer: number;
  /** The right pair of cards, in "which two are the same?". */
  pair: [number, number] | null;
  /** What is wrong with each option, compared with the target: null for the right ones. */
  slips: (Slip | null)[];
  helper: Helper;
  /** Big options for the first world, which is for age 5. */
  big: boolean;
  /** The longest side of any critter here, in tiles, so they are all drawn at one scale. */
  side: number;
  /** The critters' body colour. */
  body: number;
}

export const BODY_COLORS = 5;
const SEED = 20261104;

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
const pick = <T>(random: Random, list: readonly T[]): T => list[Math.floor(random() * list.length)];

function shuffled<T>(random: Random, list: readonly T[]): T[] {
  const pool = [...list];
  for (let at = pool.length - 1; at > 0; at -= 1) {
    const other = Math.floor(random() * (at + 1));
    [pool[at], pool[other]] = [pool[other], pool[at]];
  }
  return pool;
}

/** Each try at a level is a set of this many puzzles of the same kind. */
export const SET = 3;

/** Wrong taps that end a try, counted over its whole set: two with three options, so tapping every one never wins, and three with more. */
export const missLimitFor = (options: number): number => (options <= 3 ? 2 : 3);

/** The first world is for age 5, so its tries never fail: a wrong option still costs a star, but the set always finishes. */
export const missLimit = (puzzle: Pick<Puzzle, 'world' | 'options'>): number =>
  puzzle.world === 'spin' ? Infinity : missLimitFor(puzzle.options.length);

// ---------- The staircase ----------

const L4 = ['#.', '#.', '##'];
const T4 = ['###', '.#.'];
const S4 = ['.##', '##.'];
/** Simple shapes for the first worlds' wrong options: a line, a square, a little corner and the first critters. */
const SIMPLE = [L4, T4, S4, ['###'], ['####'], ['##', '##'], ['#.', '##']];

const SPIN = { world: 'spin', kind: 'match', options: 2, side: 3, turns: [1, 2], face: true, accents: [], slips: ['shape'], needs: [], helper: 'hint', careless: 'wins', symmetric: true } as const;
const TURN = { world: 'turn', kind: 'match', options: 3, side: 3, turns: [1, 2], face: true, accents: [], slips: ['shape'], needs: [], helper: 'hint', careless: 'wins', symmetric: true } as const;
const MIRROR = { world: 'mirror', kind: 'match', options: 4, side: 4, turns: [1, 2, 3], face: true, accents: [], helper: 'hint', symmetric: false } as const;
const COLOUR = { world: 'colour', kind: 'match', options: 4, side: 4, turns: [1, 2, 3], face: true, helper: 'none', careless: 'loses', symmetric: false } as const;
const TRICKY = { world: 'tricky', options: 5, side: 4, turns: [1, 2, 3], face: false, accents: [GEM], helper: 'none', careless: 'loses', symmetric: false } as const;

const SPECS: Spec[] = [
  // 1. Spin: big friendly critters and two options, to find out what "turned" means. ↻ turns the target, as a hint.
  { ...SPIN, cells: [4], shapes: [L4] },
  { ...SPIN, cells: [4], shapes: [T4] },
  { ...SPIN, cells: [4], shapes: [S4, L4] },
  { ...SPIN, cells: [4], shapes: [L4, T4, S4] },

  // 2. Turn: three options, a quarter or half turn, ↻ still there. Wrong options are clearly different shapes.
  { ...TURN, cells: [4] },
  { ...TURN, cells: [4] },
  { ...TURN, cells: [4, 5] },
  { ...TURN, cells: [5] },
  { ...TURN, cells: [5] },

  // 3. Mirror: one option is the target backwards. ↻ is there for the last time.
  { ...MIRROR, cells: [4, 5], slips: ['mirror', 'shape'], needs: ['mirror'], careless: 'wins' },
  { ...MIRROR, cells: [5], slips: ['mirror', 'shape'], needs: ['mirror'], careless: 'wins' },
  { ...MIRROR, cells: [5], slips: ['mirror', 'moved'], needs: ['mirror', 'moved'], careless: 'wins' },
  { ...MIRROR, cells: [5], slips: ['mirror', 'moved'], needs: ['mirror', 'moved'], careless: 'loses' },
  { ...MIRROR, cells: [5], slips: ['mirror', 'moved'], needs: ['mirror', 'moved'], careless: 'loses' },

  // 4. Colours: bigger critters with painted tiles, wrong options backwards or with one tile moved. No ↻.
  { ...COLOUR, cells: [5], accents: [SPOT], slips: ['mirror', 'moved'], needs: ['mirror', 'moved'] },
  { ...COLOUR, cells: [5, 6], accents: [SPOT], slips: ['mirror', 'moved', 'paint'], needs: ['mirror', 'moved'] },
  { ...COLOUR, cells: [6], accents: [SPOT, STRIPE], slips: ['mirror', 'moved', 'paint'], needs: ['mirror', 'moved'] },
  { ...COLOUR, cells: [6], accents: [SPOT, STRIPE], slips: ['mirror', 'moved', 'paint'], needs: ['mirror', 'paint'] },
  { ...COLOUR, cells: [6], accents: [SPOT, STRIPE], slips: ['mirror', 'moved', 'paint'], needs: ['mirror', 'moved', 'paint'] },

  // 5. Grown-up: near twins of six or seven tiles, five options all backwards or one tile off, then "which two are the same?".
  { ...TRICKY, kind: 'match', cells: [6], slips: ['mirror', 'moved', 'paint'], needs: ['mirror', 'moved', 'paint'] },
  { ...TRICKY, kind: 'match', cells: [6, 7], slips: ['mirror', 'moved', 'paint'], needs: ['mirror', 'moved'] },
  { ...TRICKY, kind: 'match', cells: [7], slips: ['mirror', 'moved', 'paint'], needs: ['mirror', 'moved'] },
  { ...TRICKY, kind: 'pairs', cells: [6], slips: ['mirror', 'moved', 'paint'], needs: ['mirror', 'moved'] },
  { ...TRICKY, kind: 'pairs', cells: [7], slips: ['mirror', 'moved', 'paint'], needs: ['mirror', 'moved'] },
];

export const LEVEL_COUNT = SPECS.length;

// ---------- Making a critter ----------

/** The way a face on an end tile looks: away from the one tile it joins. */
function lookOutwards(shape: Shape, tile: Tile): number {
  const [next] = neighbours(shape, tile);
  if (!next) return 0;
  if (next.y > tile.y) return 0;
  if (next.x < tile.x) return 1;
  if (next.y < tile.y) return 2;
  return 3;
}

/** Puts a face on an end of the shape, looking outwards, and the accents on other tiles. Null when it can't do that without a symmetry. */
function decorate(spec: Spec, shape: Shape, random: Random): Tile[] | null {
  const ends = shuffled(
    random,
    shape.filter((tile) => neighbours(shape, tile).length === 1),
  );
  const faces = spec.face ? [...ends, ...shuffled(random, shape.filter((tile) => !ends.includes(tile)))] : [null];
  for (const face of faces) {
    const painted = shape.map((tile) => (tile === face ? { ...tile, paint: FACE, look: lookOutwards(shape, tile) } : { ...tile }));
    const plain = shuffled(
      random,
      painted.filter((tile) => tile.paint === BODY),
    );
    spec.accents.forEach((accent, at) => {
      if (plain[at]) plain[at].paint = accent;
    });
    if (noSymmetry(painted)) return painted;
  }
  return null;
}

/** A plain shape for the level: hand-picked on the first world, grown at random after. */
function plainShape(spec: Spec, random: Random): Tile[] {
  if (spec.shapes) return fromRows(pick(random, spec.shapes));
  for (;;) {
    const shape = grow(random, pick(random, spec.cells), spec.side);
    if (spec.symmetric || noSymmetry(shape)) return shape;
  }
}

/** A critter for the level, turned and maybe mirrored any way, which is how it shows on top. */
function critter(spec: Spec, random: Random): Tile[] | null {
  const plain = plainShape(spec, random);
  const painted = decorate(spec, plain, random);
  if (!painted) return null;
  const flipped = random() < 0.5 ? mirror(painted) : painted;
  return turn(flipped, Math.floor(random() * 4));
}

/** How many tiles must change to make one plain shape from the other, turned or mirrored the best way. */
export function tilesApart(a: Shape, b: Shape): number {
  const first = bare(a);
  const best = Math.max(...[...turns(bare(b)), ...turns(mirror(bare(b)))].map((image) => glance(first, image)));
  // glance on plain shapes is 4 × overlap − |a| − |b|.
  const overlap = (best + first.length + b.length) / 4;
  return first.length + b.length - 2 * overlap;
}

/** A key that is the same for a critter and its turns, so two options that are one critter can be told. */
export const turnKey = (shape: Shape): string => turns(shape).map(keyOf).sort()[0];

// ---------- Wrong options ----------

interface Candidate {
  shape: Tile[];
  slip: Slip;
}

/** A plain shape clearly unlike the target, painted the same way, for the first worlds. */
function otherShapes(spec: Spec, target: Shape, random: Random): Tile[][] {
  const made: Tile[][] = [];
  const seen = new Set([freeKey(target)]);
  const sizes = spec.shapes ? SIMPLE.map((rows) => fromRows(rows)) : [];
  for (let tries = 0; made.length < 8 && tries < 60; tries += 1) {
    const plain = spec.shapes ? pick(random, sizes) : grow(random, Math.max(3, pick(random, spec.cells) + pick(random, [-1, 0, 0, 1])), spec.side);
    const key = freeKey(plain);
    if (seen.has(key) || tilesApart(target, plain) < 2) continue;
    seen.add(key);
    const painted = decorate({ ...spec, face: true, accents: [] }, plain, random) ?? plain.map((tile, at) => (at === 0 ? { ...tile, paint: FACE } : tile));
    made.push(painted);
  }
  return made;
}

/** Every tempting wrong option the level allows, turned every way, each checked to be what it says it is. */
function candidates(spec: Spec, target: Tile[], random: Random): Candidate[] {
  const found: Candidate[] = [];
  const seen = new Set<string>();
  const add = (shapes: Tile[][], slip: Slip): void => {
    for (const one of shapes) {
      for (const turned of turns(one)) {
        const key = keyOf(turned);
        if (seen.has(key) || sideOf(turned) > spec.side) continue;
        const is = relation(target, turned);
        if (is === 'turned' || (slip === 'mirror') !== (is === 'mirror')) continue;
        seen.add(key);
        found.push({ shape: turned, slip });
      }
    }
  };
  if (spec.slips.includes('mirror')) add([mirror(target)], 'mirror');
  if (spec.slips.includes('moved')) add(movedVersions(target), 'moved');
  if (spec.slips.includes('paint')) add(repainted(target), 'paint');
  if (spec.slips.includes('shape')) add(otherShapes(spec, target, random), 'shape');
  return found;
}

/**
 * How many taps the careless eye may waste on one puzzle, at least and at most. The first world can't be lost, so
 * it is free. A level it must win lets it slip once in its whole set, on one puzzle, so it wins with two stars but
 * never three. A level it must lose makes it slip at least once on every puzzle, which runs a try out by the end of
 * the set, while some wrong option always looks less alike than the answer, so taking the least alike is no trick
 * either.
 */
export function carelessBudget(spec: Pick<Spec, 'careless' | 'world' | 'options' | 'kind'>, go: number): { least: number; most: number } {
  const wrong = spec.kind === 'pairs' ? (spec.options * (spec.options - 1)) / 2 - 1 : spec.options - 1;
  if (spec.world === 'spin') return { least: 0, most: wrong };
  if (spec.careless === 'wins') {
    const slipsHere = go % SET === Math.floor(go / SET) % SET;
    return slipsHere ? { least: 1, most: 1 } : { least: 0, most: 0 };
  }
  return { least: 1, most: wrong - 1 };
}

/** Picks wrong options so every needed kind is there, no two are the same critter, and the careless eye behaves as the level needs. */
function chooseWrong(spec: Spec, target: Tile[], answer: Tile[], pool: Candidate[], go: number, random: Random): Candidate[] | null {
  const needed = spec.options - 1;
  const budget = carelessBudget(spec, go);
  const right = glance(target, answer);
  const ahead = pool.filter((one) => glance(target, one.shape) > right);
  const behind = pool.filter((one) => glance(target, one.shape) < right);
  for (let tries = 0; tries < 40; tries += 1) {
    const most = Math.min(budget.most, needed);
    const wantAhead = spec.world === 'spin' ? -1 : budget.least + Math.floor(random() * (most - budget.least + 1));
    // Kinds the level needs go first, so a short list still has one of each.
    const kindsFirst = (list: Candidate[]): Candidate[] => {
      const order = shuffled(random, list);
      const needs = shuffled(random, spec.needs);
      return [...needs.flatMap((kind) => order.filter((one) => one.slip === kind).slice(0, 1)), ...order];
    };
    const chosen: Candidate[] = [];
    const keys = new Set([turnKey(answer)]);
    const take = (list: Candidate[], count: number): void => {
      for (const one of list) {
        if (chosen.length >= count) return;
        const key = turnKey(one.shape);
        if (keys.has(key)) continue;
        keys.add(key);
        chosen.push(one);
      }
    };
    if (wantAhead < 0) take(kindsFirst(pool), needed);
    else {
      take(kindsFirst(ahead), wantAhead);
      take(kindsFirst(behind), needed);
    }
    if (chosen.length < needed) continue;
    if (!spec.needs.every((kind) => chosen.some((one) => one.slip === kind))) continue;
    if (wantAhead >= 0 && chosen.filter((one) => ahead.includes(one)).length !== wantAhead) continue;
    return chosen;
  }
  return null;
}

const ATTEMPTS = 400;

function buildMatch(spec: Spec, index: number, go: number, random: Random): Puzzle | null {
  const target = critter(spec, random);
  if (!target || sideOf(target) > spec.side) return null;
  const quarters = pick(random, spec.turns);
  const answer = turn(target, quarters);
  if (keyOf(answer) === keyOf(target)) return null;
  const wrong = chooseWrong(spec, target, answer, candidates(spec, target, random), go, random);
  if (!wrong) return null;
  const at = Math.floor(random() * (wrong.length + 1));
  const options = [...wrong.slice(0, at).map((one) => one.shape), answer, ...wrong.slice(at).map((one) => one.shape)];
  const slips = [...wrong.slice(0, at).map((one) => one.slip), null, ...wrong.slice(at).map((one) => one.slip)];
  // The solver has the last word: exactly one option is the target turned.
  const solved = solveMatch(target, options);
  if (solved.length !== 1 || solved[0] !== at) return null;
  const eye = rivals(target, options, at);
  const budget = carelessBudget(spec, go);
  if (eye.ahead < budget.least || eye.ahead + eye.tied > budget.most) return null;
  return {
    id: index + 1,
    go,
    world: spec.world,
    kind: 'match',
    target,
    options,
    answer: at,
    pair: null,
    slips,
    helper: spec.helper,
    big: spec.world === 'spin',
    side: Math.max(...[target, ...options].map(sideOf)),
    body: Math.floor(random() * BODY_COLORS),
  };
}

/** "Which two are the same?": two cards are one critter turned two ways, and three are near twins. */
function buildPairs(spec: Spec, index: number, go: number, random: Random): Puzzle | null {
  const base = critter(spec, random);
  if (!base || sideOf(base) > spec.side) return null;
  const [first, second] = shuffled(random, [0, 1, 2, 3]);
  const twins = [turn(base, first), turn(base, second)];
  const pool = candidates(spec, base, random);
  const budget = carelessBudget(spec, go);
  for (let tries = 0; tries < 60; tries += 1) {
    const needs = spec.needs.map((kind) => pick(random, pool.filter((one) => one.slip === kind)));
    if (needs.some((one) => !one)) return null;
    const rest = shuffled(random, pool).filter((one) => !needs.includes(one));
    const wrong = [...needs, ...rest].slice(0, spec.options - 2);
    const keys = new Set([turnKey(base), ...wrong.map((one) => turnKey(one.shape))]);
    if (keys.size !== spec.options - 1) continue;
    const order = shuffled(
      random,
      Array.from({ length: spec.options }, (_, at) => at),
    );
    const cards: Tile[][] = [];
    const slips: (Slip | null)[] = [];
    for (const at of order) {
      cards.push(at < 2 ? twins[at] : wrong[at - 2].shape);
      slips.push(at < 2 ? null : wrong[at - 2].slip);
    }
    const pair = [order.indexOf(0), order.indexOf(1)].sort((a, b) => a - b) as [number, number];
    const solved = solvePairs(cards);
    if (solved.length !== 1 || solved[0][0] !== pair[0] || solved[0][1] !== pair[1]) continue;
    const eye = pairRivals(cards, pair);
    if (eye.ahead < budget.least || eye.ahead + eye.tied > budget.most) continue;
    return {
      id: index + 1,
      go,
      world: spec.world,
      kind: 'pairs',
      target: base,
      options: cards,
      answer: pair[0],
      pair,
      slips,
      helper: spec.helper,
      big: false,
      side: Math.max(...cards.map(sideOf)),
      body: Math.floor(random() * BODY_COLORS),
    };
  }
  return null;
}

function build(spec: Spec, index: number, go: number, before: ReadonlySet<string>): Puzzle {
  const random = seeded(SEED + index * 7919 + go * 104729);
  for (let attempt = 0; attempt < ATTEMPTS; attempt += 1) {
    const made = spec.kind === 'pairs' ? buildPairs(spec, index, go, random) : buildMatch(spec, index, go, random);
    if (made && !before.has(puzzleKey(made))) return made;
  }
  throw new Error(`No puzzle fits level ${index + 1}, go ${go}`);
}

/**
 * Goes come in runs of this many, and no go repeats a puzzle from earlier in its run, so ten sets in a row are all
 * fresh even on the first world, where there are few critters to choose from.
 */
const RUN = 30;

/** Makes a level's nth go from its seed, without keeping it. */
export function makePuzzle(id: number, go: number): Puzzle | undefined {
  const spec = SPECS[id - 1];
  if (!spec || !Number.isInteger(go) || go < 0) return undefined;
  const before = new Set<string>();
  for (let earlier = go - (go % RUN); earlier < go; earlier += 1) before.add(puzzleKey(puzzleFor(id, earlier) as Puzzle));
  return build(spec, id - 1, go, before);
}

/** What the careless eye must do on a level. */
export const carelessGoal = (id: number): 'wins' | 'loses' | undefined => SPECS[id - 1]?.careless;

/** The careless eye's budget for one go of a level. */
export const carelessBudgetFor = (id: number, go: number): { least: number; most: number } => carelessBudget(SPECS[id - 1], go);

/** The answer turns a level may use. */
export const turnsFor = (id: number): readonly number[] => SPECS[id - 1]?.turns ?? [];

/** Whether a level's plain shapes may have a symmetry. */
export const mayBeSymmetric = (id: number): boolean => SPECS[id - 1]?.symmetric ?? false;

/** The kinds of wrong option every puzzle of a level offers. */
export const needsFor = (id: number): readonly Slip[] => SPECS[id - 1]?.needs ?? [];

const made = new Map<string, Puzzle>();

/** The puzzle for a level's nth go. The same go always gives the same puzzle. */
export function puzzleFor(id: number, go: number): Puzzle | undefined {
  const key = `${id}:${go}`;
  const kept = made.get(key);
  if (kept) return kept;
  const puzzle = makePuzzle(id, go);
  if (puzzle) made.set(key, puzzle);
  return puzzle;
}

/** The puzzles of a level's nth try: three fresh ones of the same kind. */
export const setFor = (id: number, set: number): Puzzle[] => Array.from({ length: SET }, (_, step) => puzzleFor(id, set * SET + step) as Puzzle);

export interface Level {
  id: number;
  world: WorldId;
  kind: Kind;
  options: number;
  helper: Helper;
  big: boolean;
}

/** Every level, for the map. */
export const LEVELS: readonly Level[] = SPECS.map((spec, index) => ({
  id: index + 1,
  world: spec.world,
  kind: spec.kind,
  options: spec.options,
  helper: spec.helper,
  big: spec.world === 'spin',
}));

export const levelById = (id: number): Level | undefined => LEVELS.find((level) => level.id === id);

/** What a puzzle looks like, so two goes can be told apart. */
export const puzzleKey = (puzzle: Puzzle): string => [puzzle.target, ...puzzle.options].map(keyOf).join('|');

export type Surprise = 'golden' | 'swimmer';

/**
 * About one set in eight is a surprise, the same one on every device: golden critters, or a turtle or a fish that
 * swims past doing a spin each time a critter snaps into place.
 */
export function surpriseFor(id: number, set: number): Surprise | null {
  const random = seeded(SEED * 3 + id * 613 + set * 7727);
  if (random() >= 1 / 8) return null;
  return random() < 0.5 ? 'golden' : 'swimmer';
}

/** The order the careless eye taps a match puzzle's options in, for the careless bot. */
export const carelessTaps = (puzzle: Puzzle, random: Random): number[] => carelessOrder(puzzle.target, puzzle.options, random);
