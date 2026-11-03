// The staircase. Each level is made by a small pure generator from a fixed seed, so the numbers are the same on
// every device and every run, and the tests can prove each puzzle has exactly one answer.
import { fitsEach, hiddenSlot, isRuleAsk, readRule, ruleKey, run, sameRule, steps, withRule, type Ask, type Pair, type Puzzle, type Rule } from './machine.ts';
import { answerKeys, rulesFor, UNIVERSE } from './solve.ts';

export type WorldId = 'add' | 'take' | 'mix' | 'back' | 'chain';
export const WORLDS: readonly WorldId[] = ['add', 'take', 'mix', 'back', 'chain'];

/** Three big number tokens, three rule cards, or every number from 0 to 20. */
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
  /** The rule cards offered, in the order they sit. Empty on number levels. */
  cards: Rule[];
  /** The right answer: a number, or the rule behind the shut plate. */
  truth: number | Rule;
}

/** Puzzles per level. A level can be skipped after 5 failed tries, so a child never sees the same one twice in a row of tries. */
export const VARIANTS = 5;

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
  { world: 'take', ask: 'rule', answer: 'cards', pools: [['x2', '+3', '-2', '+2', '-1']], open: [false], examples: 2, inputs: [1, 8], trap: 'one', cards: [...SMALL, '+3'] },

  // 3. Secret rules, from three examples, answered with 0 to 20.
  { world: 'mix', ask: 'out', answer: 'picker', pools: [['+10']], open: [false], examples: 3, inputs: [1, 10] },
  { world: 'mix', ask: 'out', answer: 'picker', pools: [['/2']], open: [false], examples: 3, inputs: [2, 20] },
  { world: 'mix', ask: 'out', answer: 'picker', pools: [['x3']], open: [false], examples: 3, inputs: [1, 6] },
  { world: 'mix', ask: 'out', answer: 'picker', pools: [MIXED], open: [false], examples: 3, inputs: [1, 20] },
  { world: 'mix', ask: 'out', answer: 'picker', pools: [MIXED], open: [false], examples: 2, inputs: [1, 20] },

  // 4. Backwards: what went in? And fix the machine with the one part that works for every example.
  { world: 'back', ask: 'in', answer: 'three', pools: [['+1', '+2', '+3', '-1', '-2']], open: [true], examples: 1, inputs: [1, 12] },
  { world: 'back', ask: 'fix', answer: 'cards', pools: [['x2', 'x3', '+2', '+3', '+4', '+5', '-2', '/2']], open: [false], examples: 3, inputs: [1, 10], trap: 'all' },
  { world: 'back', ask: 'in', answer: 'picker', pools: [ADD_SOME], open: [false], examples: 2, inputs: [1, 20] },
  { world: 'back', ask: 'in', answer: 'picker', pools: [['x2', 'x3', '/2']], open: [false], examples: 2, inputs: [1, 20] },
  { world: 'back', ask: 'in', answer: 'picker', pools: [MIXED], open: [false], examples: 2, inputs: [1, 20] },

  // 5. Two machines in a row: through both, the hidden second one, and all the way back.
  { world: 'chain', ask: 'out', answer: 'picker', pools: [FIRST, SECOND], open: [true, true], examples: 1, inputs: [1, 8] },
  { world: 'chain', ask: 'rule', answer: 'cards', pools: [FIRST, SECOND], open: [true, false], examples: 2, inputs: [1, 8], trap: 'one' },
  { world: 'chain', ask: 'out', answer: 'picker', pools: [FIRST, SECOND], open: [true, false], examples: 2, inputs: [1, 8], scale: true, notSingle: true },
  // The grown-up end: back through two machines with the second one hidden, then with both hidden and only two
  // examples, where no single rule explains them.
  { world: 'chain', ask: 'in', answer: 'picker', pools: [FIRST, SECOND], open: [true, false], examples: 2, inputs: [1, 9], scale: true, notSingle: true },
  { world: 'chain', ask: 'in', answer: 'picker', pools: [FIRST, SECOND], open: [false, false], examples: 2, inputs: [1, 9], scale: true, notSingle: true },
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

/** A wrong card trips up a quick checker when it gets some example right, alone or in place of both machines. */
function trapsFor(puzzle: Puzzle, slot: number, card: Rule): boolean {
  if (fitsEach(withRule(puzzle.machines, slot, card), puzzle.examples).some(Boolean)) return true;
  return puzzle.machines.length > 1 && fitsEach([card], puzzle.examples).some(Boolean);
}

function cardsFor(spec: Spec, random: Random, puzzle: Puzzle): Rule[] | null {
  const slot = hiddenSlot(puzzle);
  const truth = puzzle.machines[slot];
  const offered = spec.cards ? spec.cards.map(readRule) : KID_RULES;
  const others = offered.filter((rule) => !sameRule(rule, truth));
  const traps = others.filter((rule) => trapsFor(puzzle, slot, rule));
  let wrong: Rule[];
  if (spec.trap === 'all') wrong = takeSome(random, traps, 2);
  else if (spec.trap === 'one') {
    const first = takeSome(random, traps, 1);
    wrong = [...first, ...takeSome(random, others.filter((rule) => !first.some((one) => sameRule(one, rule))), 1)];
  } else wrong = takeSome(random, others, 2);
  if (wrong.length < 2) return null;
  // The right card sits anywhere, so its place gives nothing away.
  const cards = [...wrong];
  cards.splice(int(random, 0, 2), 0, truth);
  return cards;
}

/** The right number, the quick copy of the given number, and one more mistake a child really makes, smallest first. */
function threeNumbers(random: Random, puzzle: Puzzle, answer: number): number[] | null {
  const given = puzzle.given as number;
  // Backwards, the classic slip is running the machine forwards.
  const forwards = puzzle.ask === 'in' ? run(puzzle.machines, given) : null;
  const near = [answer + 1, answer - 1, answer + 2, answer - 2];
  const third = forwards !== null ? [forwards] : near;
  const pool = [...new Set(third)].filter((n) => n >= 0 && n <= MOST && n !== answer && n !== given);
  if (!pool.length) return null;
  return [answer, given, pick(random, pool)].sort((a, b) => a - b);
}

interface Made {
  puzzle: Puzzle;
  truth: number | Rule;
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
  const truth: number | Rule = isRuleAsk(spec.ask) ? machines[slot] : spec.ask === 'out' ? (run(machines, last) as number) : last;
  if (spec.notSingle && UNIVERSE.some((rule) => fitsEach([rule], examples).every(Boolean))) return null;
  const keys = answerKeys(puzzle);
  if (keys.length !== 1 || keys[0] !== (typeof truth === 'number' ? String(truth) : ruleKey(truth))) return null;
  // A lone shut plate hides exactly one rule, so showing it once solved is never a fib.
  if (spec.open.filter((open) => !open).length === 1 && rulesFor(puzzle, slot).length !== 1) return null;
  if (typeof truth === 'number') {
    if (shownNumbers(puzzle).includes(truth)) return null;
    if (spec.answer === 'picker' && Math.abs(truth - (given as number)) < FAR_FROM_GIVEN) return null;
  }
  return { puzzle, truth };
}

const shapeOf = ({ puzzle }: Made): string => JSON.stringify([puzzle.machines, puzzle.examples, puzzle.given]);
const machinesKey = (machines: readonly Rule[]): string => machines.map(ruleKey).join(' ');
const scales = (machines: readonly Rule[]): boolean => machines.some((rule) => rule.op === 'mul' || rule.op === 'div');

/** Every way to fill the machines from their pools. */
function combos(spec: Spec): Rule[][] {
  let all: Rule[][] = [[]];
  for (const pool of spec.pools) all = all.flatMap((chain) => pool.map((text) => [...chain, readRule(text)]));
  return all.filter((machines) => !spec.scale || scales(machines));
}

const TRIES_PER_MACHINE = 300;

function build(spec: Spec, index: number): Level[] {
  const taken = new Set<string>();
  const used = new Set<string>();
  return Array.from({ length: VARIANTS }, (_, variant) => {
    const random = seeded(SEED + index * 7919 + variant * 104729);
    // Machines the level hasn't used yet go first, so its fresh puzzles also get fresh rules.
    const order = takeSome(random, combos(spec), Infinity).sort((a, b) => Number(used.has(machinesKey(a))) - Number(used.has(machinesKey(b))));
    for (const machines of order) {
      for (let tries = 0; tries < TRIES_PER_MACHINE; tries += 1) {
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
export const buildLevels = (): Level[][] => SPECS.map(build);

export const ALL_VARIANTS: readonly (readonly Level[])[] = buildLevels();

/** The first puzzle of each level, which stands for the level on the map. */
export const LEVELS: readonly Level[] = ALL_VARIANTS.map((variants) => variants[0]);

/** Every puzzle of every level. */
export const EVERY_PUZZLE: readonly Level[] = ALL_VARIANTS.flat();

export const levelById = (id: number): Level | undefined => LEVELS.find((level) => level.id === id);

/** The puzzle for a level's nth go, wrapping round. */
export const levelFor = (id: number, go: number): Level | undefined => ALL_VARIANTS[id - 1]?.[((go % VARIANTS) + VARIANTS) % VARIANTS];
