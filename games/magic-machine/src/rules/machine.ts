// The machines as data. A rule turns one whole number into another, or can't (taking 5 from 3, halving 7), and
// a puzzle is one machine or two in a row, the examples it has already made, and what the player has to find.

export type Op = 'add' | 'sub' | 'mul' | 'div';

export interface Rule {
  op: Op;
  n: number;
}

/** One number through the whole contraption: what went in and what came out. */
export interface Pair {
  from: number;
  to: number;
}

/**
 * What the player works out: what comes out of a new number, what the hidden machine does, what went in to make
 * a number, or which part fixes the machine so that every example works.
 */
export type Ask = 'out' | 'rule' | 'in' | 'fix';

export interface Puzzle {
  /** The real rules, first machine first. */
  machines: Rule[];
  /** Which machines show their rule from the start. The rest hide behind a "?" plate. */
  open: boolean[];
  examples: Pair[];
  ask: Ask;
  /** The number going in for "out", the number coming out for "in". Rule questions have none. */
  given: number | null;
}

export const SYMBOL: Record<Op, string> = { add: '+', sub: '−', mul: '×', div: '÷' };

export const ruleKey = (rule: Rule): string => `${rule.op}${rule.n}`;
export const sameRule = (a: Rule, b: Rule): boolean => a.op === b.op && a.n === b.n;
export const ruleText = (rule: Rule): string => `${SYMBOL[rule.op]}${rule.n}`;

const OP_FOR: Record<string, Op> = { '+': 'add', '-': 'sub', x: 'mul', '/': 'div' };

/** Reads "+2", "-1", "x3" or "/2". The specs are written in this repo, so a typo is a bug and throws at once. */
export function readRule(text: string): Rule {
  const found = /^([+\-x/])(\d+)$/.exec(text);
  if (!found) throw new Error(`Bad rule: ${text}`);
  return { op: OP_FOR[found[1]], n: Number(found[2]) };
}

/** One machine on one number, or null when it can't: no negative numbers and no halves. */
export function apply(rule: Rule, value: number): number | null {
  switch (rule.op) {
    case 'add':
      return value + rule.n;
    case 'sub':
      return value >= rule.n ? value - rule.n : null;
    case 'mul':
      return value * rule.n;
    case 'div':
      return value % rule.n === 0 ? value / rule.n : null;
  }
}

/** Every number on its way through, starting with the one that goes in. Stops early if a machine can't. */
export function steps(machines: readonly Rule[], value: number): number[] {
  const seen = [value];
  for (const rule of machines) {
    const next = apply(rule, seen[seen.length - 1]);
    if (next === null) break;
    seen.push(next);
  }
  return seen;
}

export function run(machines: readonly Rule[], value: number): number | null {
  const seen = steps(machines, value);
  return seen.length === machines.length + 1 ? seen[seen.length - 1] : null;
}

export const fits = (machines: readonly Rule[], pair: Pair): boolean => run(machines, pair.from) === pair.to;

/** Which examples the machines get right, in order. */
export const fitsEach = (machines: readonly Rule[], examples: readonly Pair[]): boolean[] => examples.map((pair) => fits(machines, pair));

/** The machine a rule question asks about first: the first one with its plate shut. */
export function hiddenSlot(puzzle: Puzzle): number {
  return puzzle.open.findIndex((open) => !open);
}

/** Every machine with its plate shut, first machine first. */
export const hiddenSlots = (puzzle: Puzzle): number[] => puzzle.open.flatMap((open, at) => (open ? [] : [at]));

/** The machines with one swapped, for trying a rule card in the hidden slot. */
export function withRule(machines: readonly Rule[], slot: number, rule: Rule): Rule[] {
  return machines.map((machine, at) => (at === slot ? rule : machine));
}

/**
 * A rule card fills every shut plate, in order: one rule for one shut plate, or a pair of rules in the right
 * order for two.
 */
export type Card = readonly Rule[];

export const cardKey = (card: Card): string => card.map(ruleKey).join(' ');
export const sameCard = (a: Card, b: Card): boolean => cardKey(a) === cardKey(b);

/** The machines with a card's rules in the shut plates. */
export function withCard(puzzle: Puzzle, card: Card): Rule[] {
  const slots = hiddenSlots(puzzle);
  return puzzle.machines.map((machine, at) => (slots.includes(at) ? card[slots.indexOf(at)] : machine));
}

/** The rules behind the shut plates, as a card. */
export const hiddenCard = (puzzle: Puzzle): Rule[] => hiddenSlots(puzzle).map((at) => puzzle.machines[at]);

export const isRuleAsk = (ask: Ask): boolean => ask === 'rule' || ask === 'fix';
