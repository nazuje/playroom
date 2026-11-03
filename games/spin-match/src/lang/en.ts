import type { WorldId } from '../rules/levels.ts';

export const en = {
  title: 'Spin Match',
  description:
    'Mental-rotation puzzles in a sunny coral reef. Which little critter is the same shape, just turned? Watch out for the ones that are backwards, like in a mirror. For ages 5 to 12, from big friendly shapes with a spin button to near twins that challenge a grown-up.',
  home: 'Back to the games',
  sayAgain: 'Say it again',
  showLevels: 'Pick a puzzle',
  restart: 'A new puzzle',
  pickLevel: 'Pick a puzzle!',
  worlds: {
    spin: 'Spin',
    turn: 'Turn',
    mirror: 'Mirror',
    colour: 'Colours',
    tricky: 'Grown-up puzzles',
  } satisfies Record<WorldId, string>,
  /** Said at the start of each world. */
  ideas: {
    spin: 'Find the same critter, just turned!',
    turn: 'Turn it in your head!',
    mirror: 'Watch out! Some are backwards.',
    colour: 'Look at the colours too!',
    tricky: 'Tricky ones! Look very closely.',
  } satisfies Record<WorldId, string>,
  ask: 'Which one is the same, just turned?',
  askPair: 'Which two are the same?',
  cheers: ['Click! A perfect match!', 'Yes! The same, just turned!', 'Spin and snap!'] as [string, string, string],
  /** A wrong option that is a mirror image flips over. */
  backwards: ['That one is backwards!', 'Oops! That one is like in a mirror.'] as [string, string],
  /** A wrong option with one tile or colour in another place. */
  moved: ['One square is in a different place!', 'Look, one bit is different!'] as [string, string],
  /** A wrong option that is another shape altogether. */
  otherShape: ['Boing! That is a different shape.', 'Wobble wobble! Not that one.'] as [string, string],
  /** Too many wrong choices: the try is over, and the next one gets fresh critters. */
  failed: 'Whoa, the critters got dizzy! Here come new ones.',
  hint: 'Look!',
  canSkip: 'You can skip this puzzle.',
  allDone: 'You matched every critter!',
  stars1: 'You did it!',
  stars2: 'Clever!',
  stars3: 'Perfect! No mistakes!',
  next: 'Next',
  levels: 'Puzzles',
  again: 'Play again',
  skip: 'Skip',
  level: (n: number) => `Puzzle ${n}`,
  locked: (n: number) => `Puzzle ${n} is locked`,
  misses: (n: number) => (n === 0 ? 'No mistakes.' : n === 1 ? '1 mistake.' : `${n} mistakes.`),
  helped: 'With a little help from ↻.',
  retry: 'Try new critters',
  target: 'The critter to match',
  helper: 'Turn it',
  option: (n: number) => `Critter ${n}`,
  tray: 'The two you picked',
};

export type Text = typeof en;
