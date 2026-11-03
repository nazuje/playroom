// The staircase. Each level is made by a small pure generator from a fixed seed, so the numbers are the same on
// every device and every run, and the tests can prove each puzzle has exactly one answer.
import {
  cardKey,
  fitsEach,
  hiddenCard,
  hiddenSlot,
  hiddenSlots,
  isRuleAsk,
  readRule,
  ruleKey,
  run,
  sameCard,
  steps,
  withCard,
  type Ask,
  type Card,
  type Pair,
  type Puzzle,
  type Rule,
} from './machine.ts';
import { answerKeys, rulesFor, UNIVERSE } from './solve.ts';

export type WorldId = 'add' | 'take' | 'mix' | 'back' | 'chain';
export const WORLDS: readonly WorldId[] = ['add', 'take', 'mix', 'back', 'chain'];

/** Three big number tokens, rule cards, or every number from 0 to 20. */
export type AnswerKind = 'three' | 'cards' | 'picker';

export interface Level {
  id: number;
  /** Which of the level's puzzles this is. Every retry and replay moves on to a fresh one of the same shape. */
  variant: number;
  world: WorldId;
  puzzle: Puzzle;
  answer: AnswerKind;
  /** The numbers offered, smallest first. Empty on rule-card levels. */
  numbers: number[];
  /** The rule cards offered, in the order they sit, each filling every shut plate. Empty on number levels. */
  cards: Card[];
  /** The right answer: a number, or the rules behind the shut plates. */
  truth: number | Card;
}

/** Puzzles in one go at a level: a short shift at the machine, all of the same shape. */
export const SHIFT = 3;
/** Shifts per level before they come round again. A level can be skipped after 5 failed tries, so a child never meets the same puzzle twice in a row of tries. */
export const SHIFTS = 5;
export const VARIANTS = SHIFT * SHIFTS;

export const MOST = 20;
/** A number on its way between two machines may go this high. Everything the player sees stays from 0 to 20. */
export const MIDDLE_MOST = 40;
export const PICKER: readonly number[] = Array.from({ length: MOST + 1 }, (_, n) => n);
/** On 0 to 20 levels the answer sits at least this far from the number given, so copying it, or one next to it, never works. */
export const FAR_FROM_GIVEN = 3;

/** Every rule a card or a machine in the game can show. The solver tries many more. */
export const KID_RULES: readonly Rule[] = [
  ...['+1', '+2', '+3', '+4', '+5', '+6', '+7', '+8', '+9', '+10'],
  ...['-1', '-2', '-3', '-4', '-5'],
  ...['x2', 'x3', '/2'],
].map(readRule);

/** A small seeded random source (mulberry32), so a level never changes between runs. */
export function seeded(seed: number): () => number {
  // Nearby seeds start mulberry32 on related numbers, so the seed is mixed first and early draws don't line up.
  let state = Math.imul((seed >>> 0) ^ (seed >>> 16), 0x45d9f3b);
  state = Math.imul(state ^ (state >>> 16), 0x45d9f3b);
  state = (state ^ (state >>> 16)) >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let mixed = Math.imul(state ^ (state >>> 15), 1 | state);
    mixed ^= mixed + Math.imul(mixed ^ (mixed >>> 7), 61 | mixed);
    return ((mixed ^ (mixed >>> 14)) >>> 0) / 4294967296;
  };
}

type Random = () => number;
const pick = <T>(random: Random, list: readonly T[]): T => list[Math.floor(random() * list.length)];

/** A seeded Fisher-Yates shuffle. */
function shuffled<T>(random: Random, list: readonly T[]): T[] {
  const out = [...list];
  for (let at = out.length - 1; at > 0; at -= 1) {
    const other = Math.floor(random() * (at + 1));
    [out[at], out[other]] = [out[other], out[at]];
  }
  return out;
}

function takeSome<T>(random: Random, list: readonly T[], count: number): T[] {
  const pool = [...list];
  const picked: T[] = [];
  while (picked.length < count && pool.length) picked.push(...pool.splice(Math.floor(random() * pool.length), 1));
  return picked;
}

// ---------- Levels ----------

interface Spec {
  world: WorldId;
  ask: Ask;
  answer: AnswerKind;
  /** The rules each machine can get, first machine first. */
  pools: string[][];
  open: boolean[];
  examples: number;
  /** The lowest and highest number that goes in. */
  inputs: [number, number];
  /**
   * Rule cards that each make some example come out right, so checking one example is never enough: "one" wrong
   * card like that, or "all" of them.
   */
  trap?: 'one' | 'all';
  /** The wrong cards to draw from, when the level should keep to rules a child has met. */
  cards?: string[];
  /** How many cards to offer. Three early on, four or five later, so a guess rarely lands. */
  cardCount?: number;
  /** At least one machine multiplies or halves, so no single plus or minus does the same job. */
  scale?: boolean;
  /** No single machine could have made the examples, so the shortcut of one plus, minus or times fails. */
  notSingle?: boolean;
}

const ADD_SOME = ['+3', '+4', '+5', '+6', '+7', '-3', '-4', '-5'];
const MIXED = ['+4', '+5', '+6', '+7', '+8', '+9', '-3', '-4', '-5', 'x2', 'x3', '/2'];
const SMALL = ['+1', '+2', '+3', '-1', '-2', 'x2'];
const FIRST = ['x2', 'x3', '+1', '+2', '+3'];
const SECOND = ['+1', '+2', '+3', '+4', '+5', '-1', '-2', '-3', 'x2'];
const THIRD = ['/2', 'x2', '+1', '+2', '+3', '-1', '-2'];
/** Wrong parts for the hidden second machine: every kid rule and bigger pluses and minuses, so there are always four that fit some example. */
const WIDE = [
  ...KID_RULES.map((rule) => `${{ add: '+', sub: '-', mul: 'x', div: '/' }[rule.op]}${rule.n}`),
  ...Array.from({ length: 10 }, (_, at) => `+${at + 11}`),
  ...Array.from({ length: 5 }, (_, at) => `-${at + 6}`),
];

const SPECS: Spec[] = [
  // 1. Adding machines: what comes out?
  { world: 'add', ask: 'out', answer: 'three', pools: [['+1']], open: [false], examples: 2, inputs: [1, 8] },
  { world: 'add', ask: 'out', answer: 'three', pools: [['+2']], open: [false], examples: 2, inputs: [1, 9] },
  { world: 'add', ask: 'out', answer: 'three', pools: [['+3']], open: [false], examples: 2, inputs: [1, 10] },
  { world: 'add', ask: 'out', answer: 'three', pools: [['+1', '+2', '+3', '+4']], open: [false], examples: 2, inputs: [1, 12] },

  // 2. Take away and double, then name the rule.
  { world: 'take', ask: 'out', answer: 'three', pools: [['-1']], open: [false], examples: 2, inputs: [2, 10] },
  { world: 'take', ask: 'out', answer: 'three', pools: [['x2']], open: [false], examples: 2, inputs: [1, 7] },
  { world: 'take', ask: 'out', answer: 'three', pools: [['-1', '-2', 'x2', '+2']], open: [false], examples: 2, inputs: [2, 9] },
  { world: 'take', ask: 'rule', answer: 'cards', pools: [['+2', '-1', 'x2', '+1', '-2']], open: [false], examples: 2, inputs: [1, 8], cards: SMALL },
  { world: 'take', ask: 'rule', answer: 'cards', pools: [['x2', '+3', '-2', '+2', '-1']], open: [false], examples: 2, inputs: [1, 8], trap: 'one', cards: SMALL },

  // 3. Secret rules, from three examples, answered with 0 to 20.
  { world: 'mix', ask: 'out', answer: 'picker', pools: [['+10']], open: [false], examples: 3, inputs: [1, 10] },
  { world: 'mix', ask: 'out', answer: 'picker', pools: [['/2']], open: [false], examples: 3, inputs: [2, 20] },
  { world: 'mix', ask: 'out', answer: 'picker', pools: [['x3']], open: [false], examples: 3, inputs: [1, 6] },
  { world: 'mix', ask: 'out', answer: 'picker', pools: [MIXED], open: [false], examples: 3, inputs: [1, 20] },
  { world: 'mix', ask: 'out', answer: 'picker', pools: [MIXED], open: [false], examples: 2, inputs: [1, 20] },

  // 4. Backwards: what went in? And fix the machine with the one part that works for every example.
  { world: 'back', ask: 'in', answer: 'three', pools: [['+1', '+2', '+3', '-1', '-2']], open: [true], examples: 1, inputs: [1, 12] },
  // Only times and half machines can have three wrong parts that each fit an example, such as +2, +3 and +5 for double.
  { world: 'back', ask: 'fix', answer: 'cards', pools: [['x2', 'x3', '/2']], open: [false], examples: 3, inputs: [1, 10], trap: 'all', cardCount: 4 },
  { world: 'back', ask: 'in', answer: 'picker', pools: [ADD_SOME], open: [false], examples: 2, inputs: [1, 20] },
  { world: 'back', ask: 'in', answer: 'picker', pools: [['x2', 'x3', '/2']], open: [false], examples: 2, inputs: [1, 20] },
  { world: 'back', ask: 'in', answer: 'picker', pools: [MIXED], open: [false], examples: 2, inputs: [1, 20] },

  // 5. Machines in a row: through both, the hidden second one, fixing both at once with the parts in the right
  // order, and all the way back.
  { world: 'chain', ask: 'out', answer: 'picker', pools: [FIRST, SECOND], open: [true, true], examples: 1, inputs: [1, 8] },
  { world: 'chain', ask: 'rule', answer: 'cards', pools: [FIRST, SECOND], open: [true, false], examples: 2, inputs: [1, 8], trap: 'all', cardCount: 5, cards: WIDE },
  { world: 'chain', ask: 'fix', answer: 'cards', pools: [FIRST, SECOND], open: [false, false], examples: 2, inputs: [1, 8], trap: 'all', cardCount: 5, scale: true, notSingle: true },
  // The grown-up end: back through two machines with the second hidden, then back through three machines with
  // one and then two of them hidden. No single rule explains the examples, and on the last level each example
  // alone fits many pairs of machines, so only both together pin them down.
  { world: 'chain', ask: 'in', answer: 'picker', pools: [FIRST, SECOND], open: [true, false], examples: 2, inputs: [1, 9], scale: true, notSingle: true },
  { world: 'chain', ask: 'in', answer: 'picker', pools: [FIRST, SECOND, THIRD], open: [true, false, true], examples: 2, inputs: [1, 9], scale: true, notSingle: true },
  { world: 'chain', ask: 'in', answer: 'picker', pools: [FIRST, SECOND, THIRD], open: [false, true, false], examples: 2, inputs: [1, 9], scale: true, notSingle: true },
];

const SEED = 20261104;

/** Every number on screen: the examples, the given number, and the numbers on open plates. */
export function shownNumbers(puzzle: Puzzle): number[] {
  const numbers = puzzle.examples.flatMap((pair) => [pair.from, pair.to]);
  if (puzzle.given !== null) numbers.push(puzzle.given);
  puzzle.machines.forEach((rule, at) => {
    if (puzzle.open[at]) numbers.push(rule.n);
  });
  return [...new Set(numbers)];
}

/** The quick guess a child in a hurry makes: the number already on the machine. */
export const temptingFor = (puzzle: Puzzle): number | null => puzzle.given;

/** Every number along the way stays whole, the ones on screen within 0 to 20 and the ones inside within 40. */
function travelsWell(machines: readonly Rule[], from: number): boolean {
  const seen = steps(machines, from);
  if (seen.length !== machines.length + 1) return false;
  return seen.every((value, at) => value >= 0 && value <= (at === 0 || at === seen.length - 1 ? MOST : MIDDLE_MOST));
}

/**
 * A wrong card trips up a quick checker when it gets some example right: in the shut plates, or, for one shut
 * plate among several machines, as if it were the only machine.
 */
export function trapsFor(puzzle: Puzzle, card: Card): boolean {
  if (fitsEach(withCard(puzzle, card), puzzle.examples).some(Boolean)) return true;
  return card.length === 1 && puzzle.machines.length > 1 && fitsEach(card, puzzle.examples).some(Boolean);
}

/** Every card the level could offer: one rule for one shut plate, or a pair from the machines' pools for two. */
function possibleCards(spec: Spec, puzzle: Puzzle): Card[] {
  const slots = hiddenSlots(puzzle);
  const all: Card[] =
    slots.length === 1
      ? (spec.cards ? spec.cards.map(readRule) : KID_RULES).map((rule) => [rule])
      : (([first, second]) => first.flatMap((one) => second.map((two) => [one, two])))(slots.map((at) => spec.pools[at].map(readRule)));
  return [...new Map(all.map((card) => [cardKey(card), card])).values()];
}

function cardsFor(spec: Spec, random: Random, puzzle: Puzzle): Card[] | null {
  const truth = hiddenCard(puzzle);
  const count = spec.cardCount ?? 3;
  const others = possibleCards(spec, puzzle).filter((card) => !sameCard(card, truth));
  const traps = others.filter((card) => trapsFor(puzzle, card));
  // With two shut plates, the same two parts the wrong way round is the trap that teaches order.
  const swapped = truth.length === 2 ? traps.filter((card) => sameCard(card, [truth[1], truth[0]])) : [];
  let wrong: Card[];
  if (spec.trap === 'all') wrong = [...swapped, ...takeSome(random, traps.filter((card) => !swapped.includes(card)), count - 1 - swapped.length)];
  else if (spec.trap === 'one') {
    const first = takeSome(random, traps, 1);
    wrong = [...first, ...takeSome(random, others.filter((card) => !first.includes(card)), count - 2)];
  } else wrong = takeSome(random, others, count - 1);
  if (wrong.length < count - 1) return null;
  // Shuffled with the puzzle's own seed, so the right card's place follows no pattern from puzzle to puzzle.
  return shuffled(random, [...wrong, truth]);
}

/**
 * The right number, the quick copy of the given number, and one more mistake a child really makes, in a seeded
 * shuffle. Smallest first would give the answer away: on a plus machine the copy is always smaller, so the answer
 * could never come first.
 */
function threeNumbers(random: Random, puzzle: Puzzle, answer: number): number[] | null {
  const given = puzzle.given as number;
  // Backwards, the classic slip is running the machine forwards.
  const forwards = puzzle.ask === 'in' ? run(puzzle.machines, given) : null;
  const near = [answer + 1, answer - 1, answer + 2, answer - 2];
  const third = forwards !== null ? [forwards] : near;
  const pool = [...new Set(third)].filter((n) => n >= 0 && n <= MOST && n !== answer && n !== given);
  if (!pool.length) return null;
  return shuffled(random, [answer, given, pick(random, pool)]);
}

interface Made {
  puzzle: Puzzle;
  truth: number | Card;
}

function attempt(spec: Spec, random: Random, machines: Rule[]): Made | null {
  const [low, high] = spec.inputs;
  const asked = spec.ask === 'out' || spec.ask === 'in' ? 1 : 0;
  const inputs = takeSome(
    random,
    Array.from({ length: high - low + 1 }, (_, at) => low + at),
    spec.examples + asked,
  );
  if (inputs.some((input) => !travelsWell(machines, input))) return null;
  const examples: Pair[] = inputs
    .slice(0, spec.examples)
    .map((from) => ({ from, to: run(machines, from) as number }))
    .sort((a, b) => a.from - b.from);
  // A number that comes out unchanged looks like the machine did nothing.
  if (examples.some((pair) => pair.from === pair.to)) return null;
  const last = inputs[inputs.length - 1];
  const given = spec.ask === 'out' ? last : spec.ask === 'in' ? (run(machines, last) as number) : null;
  const puzzle: Puzzle = { machines, open: [...spec.open], examples, ask: spec.ask, given };
  const slot = hiddenSlot(puzzle);
  const truth: number | Card = isRuleAsk(spec.ask) ? hiddenCard(puzzle) : spec.ask === 'out' ? (run(machines, last) as number) : last;
  // The quick checks first, so the solver only runs on puzzles that could pass.
  if (typeof truth === 'number') {
    if (shownNumbers(puzzle).includes(truth)) return null;
    if (spec.answer === 'picker' && Math.abs(truth - (given as number)) < FAR_FROM_GIVEN) return null;
  }
  if (spec.notSingle && UNIVERSE.some((rule) => fitsEach([rule], examples).every(Boolean))) return null;
  const keys = answerKeys(puzzle);
  if (keys.length !== 1 || keys[0] !== (typeof truth === 'number' ? String(truth) : cardKey(truth))) return null;
  // A lone shut plate hides exactly one rule, so showing it once solved is never a fib.
  if (spec.open.filter((open) => !open).length === 1 && rulesFor(puzzle, slot).length !== 1) return null;
  return { puzzle, truth };
}

const shapeOf = ({ puzzle }: Made): string => JSON.stringify([puzzle.machines, puzzle.examples, puzzle.given]);
const machinesKey = (machines: readonly Rule[]): string => machines.map(ruleKey).join(' ');
const scales = (machines: readonly Rule[]): boolean => machines.some((rule) => rule.op === 'mul' || rule.op === 'div');

const SAMPLE_INPUTS = Array.from({ length: MOST }, (_, at) => at + 1);
const outputsOf = (machines: readonly Rule[]): string => SAMPLE_INPUTS.map((input) => run(machines, input) ?? '-').join(',');

/**
 * Two machines with both plates shut must be the only pair that does their job: plus one then double is the same
 * as double then plus two, so a card question could never tell them apart.
 */
let pairJobs: Map<string, number> | null = null;

function onlyPair(machines: readonly Rule[]): boolean {
  if (!pairJobs) {
    pairJobs = new Map();
    for (const first of UNIVERSE) {
      for (const second of UNIVERSE) {
        const job = outputsOf([first, second]);
        pairJobs.set(job, (pairJobs.get(job) ?? 0) + 1);
      }
    }
  }
  return pairJobs.get(outputsOf(machines)) === 1;
}

/** Every way to fill the machines from their pools. */
function combos(spec: Spec): Rule[][] {
  let all: Rule[][] = [[]];
  for (const pool of spec.pools) all = all.flatMap((chain) => pool.map((text) => [...chain, readRule(text)]));
  const pairCards = isRuleAsk(spec.ask) && spec.open.every((open) => !open) && spec.pools.length === 2;
  return all.filter((machines) => (!spec.scale || scales(machines)) && (!pairCards || onlyPair(machines)));
}

const TRIES_PER_MACHINE = 300;
/** Card levels move on sooner: some machines can never have enough tempting wrong cards, however the examples fall. */
const TRIES_PER_CARD_MACHINE = 30;

/** How far a fixed way of guessing the answer's place may beat chance, over a level's puzzles in play order. */
export const MOST_OVER_CHANCE = 1.3;

/**
 * How well the best fixed strategy does at guessing the place: always first, always last, cycling forwards or
 * backwards, or the same place as 1 to 6 puzzles ago. As a multiple of chance, so 1 is no better than a guess.
 */
export function bestStrategy(places: readonly number[], count: number): number {
  const chance = 1 / count;
  const rate = (hits: number, tries: number): number => hits / tries / chance;
  const scores = [
    rate(places.filter((place) => place === 0).length, places.length),
    rate(places.filter((place) => place === count - 1).length, places.length),
    rate(places.filter((place, at) => place === at % count).length, places.length),
    rate(places.filter((place, at) => place === count - 1 - (at % count)).length, places.length),
    ...[1, 2, 3, 4, 5, 6].map((lag) => rate(places.slice(lag).filter((place, at) => place === places[at]).length, places.length - lag)),
  ];
  return Math.max(...scores);
}

/**
 * Where the right answer sits on each of a level's puzzles: every place equally often, in a seeded order that no
 * fixed strategy can follow. Of many seeded orders it keeps the first one that passes, or the best it saw.
 */
function plannedPlaces(random: Random, count: number, puzzles: number): number[] {
  const even = Array.from({ length: puzzles }, (_, at) => at % count);
  let best = even;
  let bestScore = Infinity;
  for (let tries = 0; tries < 4000; tries += 1) {
    const order = shuffled(random, even);
    const score = bestStrategy(order, count);
    if (score < bestScore) {
      best = order;
      bestScore = score;
    }
    if (score <= MOST_OVER_CHANCE) break;
  }
  return best;
}

/** Moves the right answer to its planned place, with the wrong ones shuffled around it. */
function placed<T>(random: Random, list: readonly T[], isRight: (item: T) => boolean, place: number): T[] {
  const wrong = shuffled(random, list.filter((item) => !isRight(item)));
  wrong.splice(place, 0, list.find(isRight) as T);
  return wrong;
}

function build(spec: Spec, index: number, seed = SEED): Level[] {
  const levels = makeVariants(spec, index, seed);
  if (spec.answer === 'picker') return levels;
  const random = seeded(seed + index * 7919 + 31337);
  const places = plannedPlaces(random, spec.answer === 'cards' ? (spec.cardCount ?? 3) : 3, levels.length);
  return levels.map((level, at) =>
    level.answer === 'cards'
      ? { ...level, cards: placed(random, level.cards, (card) => sameCard(card, level.truth as Card), places[at]) }
      : { ...level, numbers: placed(random, level.numbers, (value) => value === level.truth, places[at]) },
  );
}

function makeVariants(spec: Spec, index: number, seed: number): Level[] {
  const taken = new Set<string>();
  const used = new Set<string>();
  return Array.from({ length: VARIANTS }, (_, variant) => {
    const random = seeded(seed + index * 7919 + variant * 104729);
    // Machines the level hasn't used yet go first, so its fresh puzzles also get fresh rules.
    const order = takeSome(random, combos(spec), Infinity).sort((a, b) => Number(used.has(machinesKey(a))) - Number(used.has(machinesKey(b))));
    for (const machines of order) {
      for (let tries = 0; tries < (spec.answer === 'cards' ? TRIES_PER_CARD_MACHINE : TRIES_PER_MACHINE); tries += 1) {
        const made = attempt(spec, random, machines);
        if (!made || taken.has(shapeOf(made))) continue;
        const cards = spec.answer === 'cards' ? cardsFor(spec, random, made.puzzle) : [];
        const numbers =
          spec.answer === 'picker' ? [...PICKER] : spec.answer === 'three' ? threeNumbers(random, made.puzzle, made.truth as number) : [];
        if (!cards || !numbers) continue;
        taken.add(shapeOf(made));
        used.add(machinesKey(machines));
        return { id: index + 1, variant, world: spec.world, ...made, answer: spec.answer, numbers, cards };
      }
    }
    throw new Error(`No puzzle fits level ${index + 1}`);
  });
}

/** Makes every puzzle of the whole staircase from its seeds, by level and then variant. The same call always makes the same ones. */
export const buildLevels = (): Level[][] => SPECS.map((spec, index) => build(spec, index));
/** One level's puzzles, from the game's seed or another, so the tests can check many seeds. */
export const buildLevel = (index: number, seed = SEED): Level[] => build(SPECS[index], index, seed);

export const ALL_VARIANTS: readonly (readonly Level[])[] = buildLevels();

/** The first puzzle of each level, which stands for the level on the map. */
export const LEVELS: readonly Level[] = ALL_VARIANTS.map((variants) => variants[0]);

/** Every puzzle of every level. */
export const EVERY_PUZZLE: readonly Level[] = ALL_VARIANTS.flat();

export const levelById = (id: number): Level | undefined => LEVELS.find((level) => level.id === id);

/** The puzzle for a level's nth variant, wrapping round. */
export const levelFor = (id: number, variant: number): Level | undefined => ALL_VARIANTS[id - 1]?.[((variant % VARIANTS) + VARIANTS) % VARIANTS];

/** The shift for a level's nth go: three fresh puzzles of the same shape, wrapping round after 5 goes. */
export function shiftFor(id: number, go: number): Level[] {
  const variants = ALL_VARIANTS[id - 1];
  if (!variants) return [];
  const first = (((go % SHIFTS) + SHIFTS) % SHIFTS) * SHIFT;
  return variants.slice(first, first + SHIFT);
}
