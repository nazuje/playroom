import type { Fruit, Row, Term } from '../rules/equation.ts';
import type { WorldId } from '../rules/levels.ts';

const NAMES: Record<Fruit, { one: string; many: string }> = {
  apple: { one: 'apple', many: 'apples' },
  banana: { one: 'banana', many: 'bananas' },
  strawberry: { one: 'strawberry', many: 'strawberries' },
  pear: { one: 'pear', many: 'pears' },
  orange: { one: 'orange', many: 'oranges' },
  lemon: { one: 'lemon', many: 'lemons' },
  pineapple: { one: 'pineapple', many: 'pineapples' },
  watermelon: { one: 'watermelon', many: 'watermelons' },
};

const COUNT_WORDS = ['zero', 'one', 'two', 'three', 'four', 'five'];
const countWord = (n: number): string => COUNT_WORDS[n] ?? String(n);
const capitalized = (words: string): string => words[0].toUpperCase() + words.slice(1);

function termWords(term: Term): string {
  const name = NAMES[term.fruit];
  if (term.shape === 'bunch') return `${countWord(term.count)} ${name.many}`;
  if (term.shape === 'times') return `${countWord(term.count)} times ${name.one}`;
  return name.one;
}

const expression = (terms: readonly Term[]): string =>
  terms.map((term, at) => (at === 0 ? '' : term.sign > 0 ? ' plus ' : ' minus ') + termWords(term)).join('');

/** A single bunch is plural: "three bananas make 9". Anything else is a sum: "apple plus apple makes 6". */
const verb = (terms: readonly Term[]): string => (terms.length === 1 && terms[0].shape === 'bunch' ? 'make' : 'makes');

export const en = {
  title: 'Fruit Code',
  description:
    'Picture puzzles where every fruit hides a number. Crack one fruit and its number sticks to every copy, so the next row gets easier: first sums, then real systems of equations that make a grown-up think. For ages 5 to 12.',
  home: 'Back to the games',
  sayAgain: 'Say it again',
  showLevels: 'Pick a level',
  restart: 'Start this level again',
  pickLevel: 'Pick a level!',
  worlds: {
    one: 'One fruit',
    two: 'Two fruits',
    chain: 'Fruit chain',
    count: 'Count and take away',
    system: 'Code breakers',
  } satisfies Record<WorldId, string>,
  ideas: {
    one: 'Every fruit hides a number. The same fruit is always the same number!',
    two: 'Find one number first, then use it to find the next!',
    chain: 'Three fruits! Crack them one by one.',
    count: 'Count every fruit! And watch out for minus.',
    system: 'Tricky! Put two rows together to crack the code.',
  } satisfies Record<WorldId, string>,
  /** A clue row read out: "Apple plus apple makes 6." */
  row: (row: Row): string => `${capitalized(expression(row.terms))} ${verb(row.terms)} ${row.total}.`,
  /** The question, or one fruit to work out: "How much is banana plus pear?" */
  ask: (terms: readonly Term[]): string => `How much is ${expression(terms)}?`,
  found: (fruit: Fruit, n: number): string => `Yes! ${capitalized(NAMES[fruit].one)} is ${n}!`,
  cheer: (n: number): string => `Yes! It's ${n}!`,
  /** A wrong number: the fruit blows a raspberry, squishes, or rolls its eyes. */
  oops: ["Pfffft! That doesn't add up.", 'Squish! Try another number.', 'Oh no, not that one!'] as [string, string, string],
  /** Too many wrong numbers: the try is over, and the next one gets a fresh puzzle. */
  failed: 'Oh no, the fruits got all mixed up! Try a new code.',
  hint: 'Look at this row!',
  canSkip: 'You can skip this level.',
  allDone: 'You cracked every code!',
  stars1: 'You did it!',
  stars2: 'Good thinking!',
  stars3: 'Perfect! No mistakes!',
  next: 'Next level',
  levels: 'Levels',
  again: 'Play again',
  skip: 'Skip',
  close: 'Close',
  level: (n: number) => `Level ${n}`,
  locked: (n: number) => `Level ${n} is locked`,
  misses: (n: number) => (n === 0 ? 'No mistakes.' : n === 1 ? '1 mistake.' : `${n} mistakes.`),
  /** For screen readers on a picture in a row. */
  termLabel: (term: Term, value: number | undefined): string => (value === undefined ? termWords(term) : `${termWords(term)}, ${term.count * value}`),
  sayRow: 'Say this row',
  retry: 'Try a new code',
  less: 'One less',
  more: 'One more',
  ok: 'This number',
  pickFor: (terms: readonly Term[]): string => `Pick the number for ${expression(terms)}`,
};

export type Text = typeof en;
