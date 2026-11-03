// The solver. It never looks at the answer the generator meant: it puts each piece in the gap and asks, for every
// attribute, whether any pattern in patterns.ts explains the whole grid. A piece fits when every attribute is
// explained.
import { ATTRS, type Attr, type Cell } from './cells.ts';
import { fitsSome, fittingPatterns, type Pattern } from './patterns.ts';

/** The patches on show, row by row, with the gap last. */
export interface Shown {
  size: number;
  cells: readonly Cell[];
  attrs: readonly Attr[];
}

/** One attribute of the grid with a value in the gap. */
export function gridOf(shown: Shown, attr: Attr, gapValue: number): number[][] {
  const values = [...shown.cells.map((cell) => cell[attr]), gapValue];
  return Array.from({ length: shown.size }, (_, row) => values.slice(row * shown.size, (row + 1) * shown.size));
}

/** Every value of an attribute that some pattern allows in the gap. A fair puzzle allows exactly one. */
export const gapValues = (shown: Shown, attr: Attr): number[] =>
  ATTRS[attr].values.filter((value) => fitsSome(attr, gridOf(shown, attr, value)));

/** The attributes a piece gets wrong: no pattern explains the grid with it in the gap. */
export const brokenBy = (shown: Shown, piece: Cell): Attr[] => shown.attrs.filter((attr) => !fitsSome(attr, gridOf(shown, attr, piece[attr])));

/** The pieces that fit every attribute. */
export const solve = (shown: Shown, pieces: readonly Cell[]): number[] =>
  pieces.flatMap((piece, at) => (brokenBy(shown, piece).length === 0 ? [at] : []));

/** The patterns that explain an attribute once a piece is in the gap. */
export const patternsWith = (shown: Shown, attr: Attr, piece: Cell): Pattern[] => fittingPatterns(attr, gridOf(shown, attr, piece[attr]));
