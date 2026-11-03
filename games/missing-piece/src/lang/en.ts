import type { WorldId } from '../rules/levels.ts';

export const en = {
  title: 'Missing Piece',
  description:
    'A patchwork quilt with one patch missing. Spot the rule across the rows and columns and pick the piece that fits: shapes, colours, counts, turns, and patches that add up or cancel out. Picture puzzles for ages 4 to 12, from a 2 by 2 match to grids that challenge a grown-up.',
  home: 'Back to the games',
  sayAgain: 'Say it again',
  showLevels: 'Pick a puzzle',
  restart: 'A new puzzle',
  pickLevel: 'Pick a puzzle!',
  worlds: {
    match: 'Match',
    pair: 'Two at once',
    grow: 'Step by step',
    once: 'Once each',
    tricky: 'Grown-up puzzles',
  } satisfies Record<WorldId, string>,
  /** Said at the start of each world. */
  ideas: {
    match: 'Find the piece that matches!',
    pair: 'Look at the shape and the colour!',
    grow: 'It changes a little, step by step!',
    once: 'Each one only once in every row!',
    tricky: 'Tricky puzzles! Look very closely.',
  } satisfies Record<WorldId, string>,
  ask: 'Which piece fits?',
  cheers: ['Yes! It fits!', 'Perfect fit!', 'Hooray, the quilt is done!'] as [string, string, string],
  /** A wrong piece bounces back out. */
  oops: ['Boing! That one bounced out.', 'Oops! Not that piece.', 'Wobble wobble! Try another one.'] as [string, string, string],
  /** Too many wrong pieces: the try is over, and the next one gets a fresh quilt. */
  failed: 'Oh no, the quilt got all tangled! Here comes a new one.',
  hint: 'Look!',
  canSkip: 'You can skip this puzzle.',
  allDone: 'You finished every quilt!',
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
  retry: 'Try a new quilt',
  gap: 'The missing piece',
  patch: 'A patch',
  piece: (n: number) => `Piece ${n}`,
};

export type Text = typeof en;
