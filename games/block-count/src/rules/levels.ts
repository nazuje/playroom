// The staircase. Each level is a set of three puzzles, made by a small pure generator from a fixed seed, so a
// puzzle is the same on every device and every run, and every retry or replay deals a fresh set. Every puzzle is
// checked by the solver as it is made: from the camera's fixed view, the fewest blocks that explain what shows,
// with nothing floating, are exactly the blocks on the stage.
import { eyeFor, type Point } from './sight.ts';
import { countFromView, emptySpotsShow, hiddenKeys, mapsMatching, pinnedDown, viewOf } from './solve.ts';
import {
  countOf,
  flipped,
  heightsKey,
  mirrored,
  missingFrom,
  openTops,
  sameHeights,
  tallestOf,
  turned,
} from './stack.ts';

export type WorldId = 'see' | 'hide' | 'steps' | 'fill' | 'expert';
export const WORLDS: readonly WorldId[] = ['see', 'hide', 'steps', 'fill', 'expert'];

/** How many blocks? How many more fill the box? Which map from above matches? */
export type Ask = 'count' | 'fill' | 'map';
/** Three big number tokens, every number up to the level's most, or map cards. */
export type AnswerKind = 'three' | 'picker' | 'maps';

export interface Level {
  id: number;
  /** Which of the level's puzzles this is. Every retry and replay moves on to fresh ones. */
  variant: number;
  world: WorldId;
  ask: Ask;
  answer: AnswerKind;
  /** Column heights, heights[z][x], z from the back. */
  heights: number[][];
  width: number;
  depth: number;
  /** The box to fill, as its height over the whole footprint. 0 when there is no box. */
  box: number;
  /** The camera's eye. It never moves, so what shows is the same on every screen. */
  eye: Point;
  /** The turntable turns, as a help on the first worlds. The answer never needs it. */
  turn: boolean;
  /** Blocks on the stage. */
  count: number;
  /** Blocks the camera sees. */
  seen: number;
  /** The blocks that can't be seen, by key. */
  hidden: string[];
  /** The answer: a number, or the place of the right map. */
  truth: number;
  /** The numbers offered, smallest first. Empty on map levels. */
  numbers: number[];
  /** The map cards, in the order they sit. Empty unless the question is a map. */
  maps: number[][][];
  /** Big tokens with dots, for the first world, which is for age 4. */
  big: boolean;
}

/** Puzzles in one go at a level. */
export const SET = 3;
/** Sets per level before they come round again. A level can be skipped after 5 failed tries. */
export const SETS = 5;
export const VARIANTS = SET * SETS;
const MAP_CARDS = 5;

type Shape = 'row' | 'pile' | 'slope' | 'ell';

interface Spec {
  world: WorldId;
  ask: Ask;
  answer: AnswerKind;
  shape: Shape;
  /** Footprints a puzzle may get, as [width, depth]. */
  sizes: [number, number][];
  tallest: number;
  /** Blocks on the stage. */
  cubes: [number, number];
  hidden: [number, number];
  /** For "fill the box": the box height and how many blocks are missing. */
  box?: number;
  missing?: [number, number];
  /**
   * For "fill the box": how far the quick count of empty spots seen from above falls short. Counting only the tops
   * is the classic slip here, and at 2 or more it never wins.
   */
  shortBy?: number;
  /** The highest number offered. */
  most?: number;
  turn?: boolean;
  /** The very first puzzle of the level, so the game starts the same for everyone. */
  first?: number[][];
}

const SPECS: Spec[] = [
  // 1. Every block shows. Rows, then little piles, answered with three big tokens. This world never fails.
  { world: 'see', ask: 'count', answer: 'three', shape: 'row', sizes: [[3, 1], [1, 3]], tallest: 1, cubes: [2, 4], hidden: [0, 0], turn: true, first: [[1, 1, 1]] },
  { world: 'see', ask: 'count', answer: 'three', shape: 'row', sizes: [[4, 1], [1, 4]], tallest: 1, cubes: [3, 5], hidden: [0, 0], turn: true },
  { world: 'see', ask: 'count', answer: 'three', shape: 'pile', sizes: [[2, 1], [3, 1], [2, 2]], tallest: 2, cubes: [3, 4], hidden: [0, 0], turn: true },
  { world: 'see', ask: 'count', answer: 'three', shape: 'pile', sizes: [[3, 1], [2, 2], [3, 2]], tallest: 2, cubes: [4, 5], hidden: [0, 0], turn: true },
  { world: 'see', ask: 'count', answer: 'three', shape: 'pile', sizes: [[3, 2], [2, 2], [3, 1]], tallest: 3, cubes: [5, 5], hidden: [0, 0], turn: true },

  // 2. Two layers, and some blocks hide under others. The turntable still turns. Answered from 1 to 12.
  { world: 'hide', ask: 'count', answer: 'picker', shape: 'pile', sizes: [[2, 2], [3, 2]], tallest: 2, cubes: [4, 7], hidden: [1, 1], most: 12, turn: true },
  { world: 'hide', ask: 'count', answer: 'picker', shape: 'pile', sizes: [[3, 2], [2, 3]], tallest: 2, cubes: [5, 8], hidden: [1, 1], most: 12, turn: true },
  { world: 'hide', ask: 'count', answer: 'picker', shape: 'pile', sizes: [[3, 2], [2, 3]], tallest: 2, cubes: [6, 9], hidden: [2, 2], most: 12, turn: true },
  { world: 'hide', ask: 'count', answer: 'picker', shape: 'pile', sizes: [[3, 2], [2, 3], [3, 3]], tallest: 2, cubes: [7, 10], hidden: [2, 3], most: 12, turn: true },
  { world: 'hide', ask: 'count', answer: 'picker', shape: 'pile', sizes: [[3, 3]], tallest: 2, cubes: [8, 12], hidden: [2, 3], most: 12, turn: true },

  // 3. The camera stays put. Stairs and corners, with blocks holding them up from inside. 1 to 20.
  { world: 'steps', ask: 'count', answer: 'picker', shape: 'slope', sizes: [[3, 2], [2, 3]], tallest: 3, cubes: [6, 12], hidden: [1, 2], most: 20 },
  { world: 'steps', ask: 'count', answer: 'picker', shape: 'ell', sizes: [[3, 3]], tallest: 3, cubes: [7, 13], hidden: [1, 3], most: 20 },
  { world: 'steps', ask: 'count', answer: 'picker', shape: 'slope', sizes: [[3, 3]], tallest: 3, cubes: [9, 16], hidden: [2, 4], most: 20 },
  { world: 'steps', ask: 'count', answer: 'picker', shape: 'ell', sizes: [[3, 3], [4, 3]], tallest: 3, cubes: [10, 18], hidden: [3, 5], most: 20 },
  { world: 'steps', ask: 'count', answer: 'picker', shape: 'slope', sizes: [[3, 3], [4, 3]], tallest: 3, cubes: [12, 20], hidden: [4, 6], most: 20 },

  // 4. How many more fill the box? 1 to 20.
  { world: 'fill', ask: 'fill', answer: 'picker', shape: 'slope', sizes: [[2, 2]], tallest: 2, box: 2, cubes: [3, 6], hidden: [0, 2], missing: [2, 5], shortBy: 1, most: 20 },
  { world: 'fill', ask: 'fill', answer: 'picker', shape: 'slope', sizes: [[3, 2], [2, 3]], tallest: 2, box: 2, cubes: [4, 9], hidden: [0, 3], missing: [3, 8], shortBy: 2, most: 20 },
  { world: 'fill', ask: 'fill', answer: 'picker', shape: 'slope', sizes: [[3, 3]], tallest: 2, box: 2, cubes: [8, 14], hidden: [1, 4], missing: [4, 10], shortBy: 2, most: 20 },
  { world: 'fill', ask: 'fill', answer: 'picker', shape: 'slope', sizes: [[3, 2], [2, 3]], tallest: 3, box: 3, cubes: [6, 13], hidden: [1, 4], missing: [5, 12], shortBy: 3, most: 20 },

  // 5. Grown-up stacks: deep hidden columns, and which map from above matches. Counts go up to 30.
  { world: 'expert', ask: 'count', answer: 'picker', shape: 'slope', sizes: [[3, 3]], tallest: 4, cubes: [14, 22], hidden: [5, 8], most: 30 },
  { world: 'expert', ask: 'map', answer: 'maps', shape: 'slope', sizes: [[3, 3]], tallest: 3, cubes: [9, 18], hidden: [2, 6] },
  { world: 'expert', ask: 'count', answer: 'picker', shape: 'slope', sizes: [[4, 3], [3, 4]], tallest: 4, cubes: [18, 28], hidden: [6, 10], most: 30 },
  { world: 'expert', ask: 'map', answer: 'maps', shape: 'slope', sizes: [[3, 3]], tallest: 4, cubes: [13, 24], hidden: [4, 10] },
  { world: 'expert', ask: 'count', answer: 'picker', shape: 'slope', sizes: [[4, 4]], tallest: 4, cubes: [22, 30], hidden: [9, 14], most: 30 },
];

export const LEVEL_COUNT = SPECS.length;
const SEED = 20261105;

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
const pick = <T>(random: Random, list: readonly T[]): T => list[Math.floor(random() * list.length)];
const between = (random: Random, [low, high]: [number, number]): number => low + Math.floor(random() * (high - low + 1));

function shuffled<T>(random: Random, list: readonly T[]): T[] {
  const pool = [...list];
  for (let at = pool.length - 1; at > 0; at -= 1) {
    const other = Math.floor(random() * (at + 1));
    [pool[at], pool[other]] = [pool[other], pool[at]];
  }
  return pool;
}

const grid = (width: number, depth: number, fill: (x: number, z: number) => number): number[][] =>
  Array.from({ length: depth }, (_, z) => Array.from({ length: width }, (_, x) => fill(x, z)));

// ---------- Shapes ----------

/** A row of blocks along the floor, across or going back, sometimes with a gap or two. */
function rowShape(spec: Spec, random: Random): number[][] {
  const count = between(random, spec.cubes);
  const [width, depth] = pick(random, spec.sizes);
  const line = Array.from({ length: count }, () => 1);
  const gaps = Math.floor(random() * 3);
  for (let gap = 0; gap < gaps && count > 1; gap += 1) line.splice(1 + Math.floor(random() * (line.length - 1)), 0, 0);
  return depth > width ? line.map((height) => [height]) : [line];
}

/** Any little pile: each column from empty up to the tallest. */
function pileShape(spec: Spec, random: Random): number[][] {
  const [width, depth] = pick(random, spec.sizes);
  return grid(width, depth, () => Math.floor(random() * (spec.tallest + 1)));
}

/**
 * Stairs that climb toward the back left, with a little wobble, so the tall columns stand behind the short ones
 * and their tops show while their middles hide.
 */
function slopeShape(spec: Spec, random: Random): number[][] {
  const [width, depth] = pick(random, spec.sizes);
  const across = random() * 1.3;
  const back = random() * 1.3;
  const top = spec.tallest + random() * 1.2;
  const floor = spec.box ? 0 : random() < 0.5 ? 1 : 0;
  return grid(width, depth, (x, z) => {
    const wobble = random() < 0.35 ? (random() < 0.5 ? -1 : 1) : 0;
    return Math.max(floor, Math.min(spec.tallest, Math.round(top - x * across - z * back + wobble)));
  });
}

/** Corners: two arms meeting at the back left, one or two blocks thick. */
function ellShape(spec: Spec, random: Random): number[][] {
  const [width, depth] = pick(random, spec.sizes);
  const thick = random() < 0.5 ? 1 : 2;
  return grid(width, depth, (x, z) => {
    if (x >= thick && z >= thick) return 0;
    const corner = x < thick && z < thick ? 1 : 0;
    return Math.max(1, Math.min(spec.tallest, 1 + Math.floor(random() * spec.tallest) + corner));
  });
}

const SHAPES: Record<Shape, (spec: Spec, random: Random) => number[][]> = { row: rowShape, pile: pileShape, slope: slopeShape, ell: ellShape };

/** A footprint with an empty row or column at its edge would leave the floor mat bigger than the stack. */
function tidy(heights: number[][]): boolean {
  const width = heights[0].length;
  const rowEmpty = (z: number) => heights[z].every((height) => height === 0);
  const colEmpty = (x: number) => heights.every((row) => row[x] === 0);
  return !rowEmpty(0) && !rowEmpty(heights.length - 1) && !colEmpty(0) && !colEmpty(width - 1);
}

// ---------- Answers ----------

/** Three numbers in a row with the answer in turn low, middle and high, so its place gives nothing away. */
function threeNumbers(truth: number, variant: number): number[] {
  const place = variant % 3;
  const low = Math.max(1, truth - place);
  return [low, low + 1, low + 2];
}

/**
 * The map cards. Each wrong map is a classic slip: read in a mirror, seen from behind, turned a quarter, or one
 * column a block too tall or too short. Each one looks different from the camera, so only one map fits the
 * stage. The mirror is always among them, because it is the slip a quick look makes first.
 */
function mapCards(random: Random, heights: number[][], eye: Point, variant: number): number[][][] | null {
  const truthKey = heightsKey(heights);
  const tallest = tallestOf(heights);
  const nudged = shuffled(
    random,
    heights.flatMap((row, z) =>
      row.flatMap((height, x) =>
        [height + 1, height - 1]
          .filter((next) => next >= 1 && next <= Math.max(tallest, 2))
          .map((next) => heights.map((line, at) => line.map((value, across) => (at === z && across === x ? next : value)))),
      ),
    ),
  );
  // The mirror first, then one column off by one, then the other ways round, then more nudges if those match.
  const candidates = [mirrored(heights), ...nudged.slice(0, 1), ...shuffled(random, [flipped(heights), turned(heights), turned(turned(turned(heights)))]), ...nudged.slice(1)];
  const wrong: number[][][] = [];
  const keys = new Set([truthKey]);
  for (const map of candidates) {
    if (wrong.length === MAP_CARDS - 1) break;
    const key = heightsKey(map);
    if (keys.has(key) || map.length !== heights.length || map[0].length !== heights[0].length) continue;
    keys.add(key);
    wrong.push(map);
  }
  // The mirror must be there and different from the stack, or the quick look's first slip would be right.
  if (wrong.length < MAP_CARDS - 1 || heightsKey(mirrored(heights)) === truthKey) return null;
  const cards = [...wrong];
  cards.splice((variant * 2 + 1) % MAP_CARDS, 0, heights);
  if (mapsMatching(heights, eye, cards).length !== 1) return null;
  return cards;
}

// ---------- Building ----------

const pickerNumbers = (most: number): number[] => Array.from({ length: most }, (_, at) => at + 1);

function attempt(spec: Spec, index: number, variant: number, random: Random): Level | null {
  const heights = index === 0 && variant === 0 && spec.first ? spec.first.map((row) => [...row]) : SHAPES[spec.shape](spec, random);
  if (!tidy(heights)) return null;
  const count = countOf(heights);
  if (count < spec.cubes[0] || count > spec.cubes[1]) return null;
  const width = heights[0].length;
  const depth = heights.length;
  const box = spec.box ?? 0;
  const eye = eyeFor(width, depth, Math.max(tallestOf(heights), box, 1));
  const view = viewOf(heights, eye);
  if (!pinnedDown(heights, view)) return null;
  if (!emptySpotsShow(heights, eye, box || tallestOf(heights))) return null;
  const hidden = view.hidden.length;
  if (hidden < spec.hidden[0] || hidden > spec.hidden[1]) return null;
  let truth = countFromView(view);
  if (spec.ask === 'fill') {
    truth = missingFrom(heights, box);
    const [least, most] = spec.missing ?? [1, 99];
    if (truth < least || truth > most) return null;
    if (truth - openTops(heights, box) < (spec.shortBy ?? 0)) return null;
  }
  const base = {
    id: index + 1,
    variant,
    world: spec.world,
    ask: spec.ask,
    answer: spec.answer,
    heights,
    width,
    depth,
    box,
    eye,
    turn: Boolean(spec.turn),
    count,
    seen: view.seen.length,
    hidden: hiddenKeys(view),
    big: spec.world === 'see',
  };
  if (spec.answer === 'maps') {
    const maps = mapCards(random, heights, eye, variant);
    if (!maps) return null;
    return { ...base, truth: maps.findIndex((map) => sameHeights(map, heights)), numbers: [], maps };
  }
  const numbers = spec.answer === 'three' ? threeNumbers(truth, variant) : pickerNumbers(spec.most ?? 20);
  if (!numbers.includes(truth)) return null;
  return { ...base, truth, numbers, maps: [] };
}

const MOST_TRIES = 20000;

function build(index: number): Level[] {
  const spec = SPECS[index];
  const taken = new Set<string>();
  return Array.from({ length: VARIANTS }, (_, variant) => {
    const random = seeded(SEED + index * 7919 + variant * 104729);
    for (let tries = 0; tries < MOST_TRIES; tries += 1) {
      const made = attempt(spec, index, variant, random);
      if (!made || taken.has(heightsKey(made.heights))) continue;
      taken.add(heightsKey(made.heights));
      return made;
    }
    throw new Error(`No puzzle fits level ${index + 1} variant ${variant}`);
  });
}

const built = new Map<number, Level[]>();

/** Every puzzle of a level, made the first time it is asked for. The same call always makes the same ones. */
export function variantsOf(id: number): Level[] {
  if (!SPECS[id - 1]) return [];
  let variants = built.get(id);
  if (!variants) {
    variants = build(id - 1);
    built.set(id, variants);
  }
  return variants;
}

/** The puzzle for a level's nth variant, wrapping round. */
export const levelFor = (id: number, variant: number): Level | undefined => variantsOf(id)[((variant % VARIANTS) + VARIANTS) % VARIANTS];

/** The set for a level's nth go: three fresh puzzles of the same shape, wrapping round after 5 goes. */
export function setFor(id: number, go: number): Level[] {
  const first = (((go % SETS) + SETS) % SETS) * SET;
  return variantsOf(id).slice(first, first + SET);
}

export interface LevelInfo {
  id: number;
  world: WorldId;
  ask: Ask;
  answer: AnswerKind;
}

/** Every level as the map shows it, without making any puzzles. */
export const LEVELS: readonly LevelInfo[] = SPECS.map((spec, index) => ({ id: index + 1, world: spec.world, ask: spec.ask, answer: spec.answer }));

export const levelById = (id: number): LevelInfo | undefined => LEVELS[id - 1];

/**
 * The wrong answer that ends a try, counted across the whole set. The first world never fails. With numbers to
 * pick from that is the fourth, about one slip a puzzle, and with five map cards the third.
 */
export function missLimit(level: Pick<Level, 'world' | 'answer'>): number {
  if (level.world === 'see') return Infinity;
  return level.answer === 'maps' ? 3 : 4;
}
