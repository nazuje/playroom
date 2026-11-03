import type { Ask, WorldId } from '../rules/levels.ts';

export const en = {
  title: 'Block Count',
  description:
    'A toy theatre of block stacks. How many blocks are on the stage, counting the ones you cannot see? Blocks never float, so every block on top has blocks under it. From a row of 3 to deep stacks, boxes to fill and maps from above that challenge a grown-up. Counting and spatial puzzles for ages 4 to 12.',
  home: 'Back to the games',
  sayAgain: 'Say it again',
  showLevels: 'Pick a show',
  restart: 'New blocks',
  pickLevel: 'Pick a show!',
  worlds: {
    see: 'Every block shows',
    hide: 'Hiding underneath',
    steps: 'Stairs and corners',
    fill: 'Fill the box',
    expert: 'Grown-up stacks',
  } satisfies Record<WorldId, string>,
  /** Said at the start of each world. */
  ideas: {
    see: 'Count the blocks!',
    hide: 'Blocks never float. Some hide underneath!',
    steps: 'The stage stays still now. Find the blocks holding others up!',
    fill: 'How many more blocks fill the box?',
    expert: 'Grown-up stacks! Count every block, even deep inside.',
  } satisfies Record<WorldId, string>,
  asks: {
    count: 'How many blocks?',
    fill: 'How many more fill the box?',
    map: 'Which map from above matches? The pink peg is the front corner.',
  } satisfies Record<Ask, string>,
  lesson: 'A block never floats. There is always a block under it!',
  /** Counting out loud, as blocks bow or get tapped. */
  number: (n: number) => String(n),
  cheerCount: (n: number) => (n === 1 ? 'One block!' : `${n} blocks!`),
  cheerFill: (n: number) => (n === 1 ? 'One more!' : `${n} more!`),
  cheerMap: 'That map matches!',
  hiding: 'Look, some were hiding!',
  nextOne: 'Next stack!',
  oops: ['Wobble wobble! Not quite.', 'Boing! Try again.', 'Oopsy! Look again.'] as [string, string, string],
  failed: 'Too many tries! See what was hiding? Here come new blocks.',
  hint: 'Peek! Some blocks hide inside.',
  canSkip: 'You can skip this show.',
  allDone: 'Bravo! You counted every stack!',
  stars1: 'You did it!',
  stars2: 'Clever counting!',
  stars3: 'Perfect! No mistakes!',
  next: 'Next',
  levels: 'Shows',
  again: 'Play again',
  skip: 'Skip',
  level: (n: number) => `Show ${n}`,
  locked: (n: number) => `Show ${n} is locked`,
  misses: (n: number) => (n === 0 ? 'No mistakes.' : n === 1 ? '1 mistake.' : `${n} mistakes.`),
  retry: 'New blocks',
  less: 'One less',
  more: 'One more',
  ok: 'That many',
  turn: 'Turn the stage',
  map: (n: number) => `Map ${n}`,
  no3d: 'This device can’t draw the 3D stage, sorry! Try another tablet or computer.',
};

export type Text = typeof en;
