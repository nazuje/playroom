// The careless eye: a child in a hurry who glances at the patch just left of the gap and grabs the piece that
// looks most like it, then the next most alike, using the patch above to break a tie. Copying a neighbour is the
// classic slip in grid puzzles. The generator uses this to make sure that slip never wins a late level, and the
// careless bot plays it on the real game.
import { likeness, type Attr, type Cell } from './cells.ts';

export interface Eyed {
  size: number;
  /** Every patch, the answer last. */
  cells: readonly Cell[];
  options: readonly Cell[];
  answer: number;
  attrs: readonly Attr[];
}

type Board = Pick<Eyed, 'size' | 'cells' | 'attrs'>;

/** How alike a piece looks to the patch on the left, then to the one above. */
export function glance(eyed: Board, piece: Cell): [number, number] {
  const gap = eyed.size * eyed.size - 1;
  return [likeness(piece, eyed.cells[gap - 1], eyed.attrs), likeness(piece, eyed.cells[gap - eyed.size], eyed.attrs)];
}

const compare = (a: [number, number], b: [number, number]): number => a[0] - b[0] || a[1] - b[1];

/** How many wrong pieces the careless eye prefers to the answer, and how many it likes just as much. */
export function rivals(board: Board, wrong: readonly Cell[]): { ahead: number; tied: number } {
  const answer = glance(board, board.cells[board.cells.length - 1]);
  let ahead = 0;
  let tied = 0;
  for (const piece of wrong) {
    const order = compare(glance(board, piece), answer);
    if (order > 0) ahead += 1;
    else if (order === 0) tied += 1;
  }
  return { ahead, tied };
}

/** The order the careless eye taps the pieces in. Ties go by the random source. */
export function carelessOrder(eyed: Eyed, random: () => number): number[] {
  const tiebreak = eyed.options.map(() => random());
  return eyed.options
    .map((piece, at) => ({ at, look: glance(eyed, piece) }))
    .sort((a, b) => compare(b.look, a.look) || tiebreak[a.at] - tiebreak[b.at])
    .map(({ at }) => at);
}
