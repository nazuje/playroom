import type { WorldId } from '../rules/levels.ts';
import type { Ask, Rule } from '../rules/machine.ts';

const NUMBER_WORDS = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten'];
const capitalized = (words: string): string => words[0].toUpperCase() + words.slice(1);

/** What a machine does, as a child would say it: "plus two", "double", "half". */
function ruleName(rule: Rule): string {
  const n = NUMBER_WORDS[rule.n] ?? String(rule.n);
  if (rule.op === 'add') return `plus ${n}`;
  if (rule.op === 'sub') return `minus ${n}`;
  if (rule.op === 'mul') return rule.n === 2 ? 'double' : `times ${n}`;
  return rule.n === 2 ? 'half' : `divided by ${n}`;
}

export const en = {
  title: 'Magic Machine',
  description:
    'A silly machine with a secret rule inside. A number goes in, a new one comes out: guess what comes out, find the rule, run it backwards, and chain two machines. Functions for ages 5 to 12, from plus one to puzzles that make a grown-up think.',
  home: 'Back to the games',
  sayAgain: 'Say it again',
  showLevels: 'Pick a level',
  restart: 'Start this level again',
  pickLevel: 'Pick a level!',
  worlds: {
    add: 'Adding machines',
    take: 'Take away and double',
    mix: 'Secret rules',
    back: 'Backwards',
    chain: 'Two machines',
  } satisfies Record<WorldId, string>,
  ideas: {
    add: 'A number goes in, and a new number comes out!',
    take: 'This machine can take away, or double!',
    mix: 'Look at all the numbers. What is the secret?',
    back: 'Backwards! What went into the machine?',
    chain: 'Two machines, one after the other!',
  } satisfies Record<WorldId, string>,
  /** One example read out: "2 goes in, 4 comes out." */
  pair: (from: number, to: number): string => `${from} goes in, ${to} comes out.`,
  askOut: (n: number): string => `${n} goes in. What comes out?`,
  askIn: (n: number): string => `${n} comes out. What went in?`,
  asks: {
    rule: 'What does the machine do?',
    fix: 'Fix the machine! Which part works for every number?',
  } satisfies Record<Exclude<Ask, 'out' | 'in'>, string>,
  askSecond: 'What does the second machine do?',
  askPair: 'Fix both machines! Which part goes first, and which goes second?',
  /** Between the puzzles of a shift. */
  nextOne: 'One more machine!',
  /** The rules behind the plates, read out: "Double, then plus one!" */
  rules: (rules: readonly Rule[]): string => `${capitalized(rules.map(ruleName).join(', then '))}!`,
  ruleLabel: (rule: Rule): string => ruleName(rule),
  /** A shut plate that isn't being asked about. */
  secret: "Shh! It's a secret.",
  cheer: (n: number): string => `Yes! ${n}!`,
  cheerRule: 'Yes! It works for every number!',
  /** A wrong answer: the machine coughs, clunks or sputters. */
  oops: ['Pfft! The machine coughed.', 'Clunk! Not that one.', 'Sputter sputter! Try again.'] as [string, string, string],
  /** Too many wrong answers: the try is over, and the next one gets a fresh machine. */
  failed: 'Oh no, the machine went all wobbly! Here comes a new one.',
  hint: 'Look at this!',
  peek: 'Peek inside!',
  checkAll: 'Check every number!',
  canSkip: 'You can skip this level.',
  allDone: 'You fixed every machine!',
  stars1: 'You did it!',
  stars2: 'Clever thinking!',
  stars3: 'Perfect! No mistakes!',
  next: 'Next level',
  levels: 'Levels',
  again: 'Play again',
  skip: 'Skip',
  level: (n: number) => `Level ${n}`,
  locked: (n: number) => `Level ${n} is locked`,
  misses: (n: number) => (n === 0 ? 'No mistakes.' : n === 1 ? '1 mistake.' : `${n} mistakes.`),
  retry: 'Try a new machine',
  less: 'One less',
  more: 'One more',
  ok: 'Put it in',
  plate: 'The machine',
  number: (n: number) => String(n),
};

export type Text = typeof en;
