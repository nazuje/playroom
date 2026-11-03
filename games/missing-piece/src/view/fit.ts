// The biggest quilt and pieces that fit the screen with nothing to scroll. Pure, so the sizes can be tested for
// every phone and tablet without a browser. style.css uses the same room for the line, the binding and the basket.

/** Room for the clothesline and pegs above the quilt. */
export const LINE_ROOM = 26;
/** The quilt's binding on each side. */
export const FRAME = 10;
export const CELL_GAP = 6;
/** Room under the quilt, above the basket. */
export const BOARD_FOOT = 10;
export const PIECE_GAP = 10;
/** The basket's own top and bottom edge. */
export const DOCK_EDGE = 28;
/** Space at each side of the screen. */
export const SIDE = 12;
const MOST_CELL = 170;
const MOST_PIECE = 140;
/** Pieces are a little smaller than the patches, so the quilt stays the star. */
const PIECE_RATIO = 0.8;

export interface Fit {
  cell: number;
  piece: number;
  /** Pieces in each row of the basket, and how many rows. */
  perRow: number;
  rows: number;
}

/** The smallest a piece or a patch may be: 64px, or 88px on the first world, which is for age 4. */
export const leastTarget = (big: boolean): number => (big ? 88 : 64);

function tryRows(width: number, height: number, size: number, options: number, rows: number, least: number): Fit {
  const perRow = Math.ceil(options / rows);
  const pieceByWidth = (width - 2 * SIDE - (perRow - 1) * PIECE_GAP) / perRow;
  const cellByWidth = (width - 2 * SIDE - 2 * FRAME - (size - 1) * CELL_GAP) / size;
  const fixed = (size - 1) * CELL_GAP + 2 * FRAME + LINE_ROOM + BOARD_FOOT + (rows - 1) * PIECE_GAP + DOCK_EDGE;
  const first = Math.min(cellByWidth, MOST_CELL, (height - fixed) / (size + rows * PIECE_RATIO));
  const piece = Math.max(least, Math.min(PIECE_RATIO * first, pieceByWidth, MOST_PIECE));
  // Whatever height the pieces leave goes back to the quilt.
  const cell = Math.min(cellByWidth, MOST_CELL, (height - fixed - rows * piece) / size);
  return { cell: Math.floor(cell), piece: Math.floor(piece), perRow, rows };
}

/** The room the quilt and the basket take up together. */
export function heightOf(fit: Fit, size: number): number {
  return size * fit.cell + (size - 1) * CELL_GAP + 2 * FRAME + LINE_ROOM + BOARD_FOOT + fit.rows * fit.piece + (fit.rows - 1) * PIECE_GAP + DOCK_EDGE;
}

export function widthOf(fit: Fit, size: number): number {
  return Math.max(size * fit.cell + (size - 1) * CELL_GAP + 2 * FRAME, fit.perRow * fit.piece + (fit.perRow - 1) * PIECE_GAP) + 2 * SIDE;
}

/** Sizes for a grid of size by size patches and a basket of pieces, in the room under the top bar. */
export function fit(width: number, height: number, size: number, options: number, big: boolean): Fit {
  const least = leastTarget(big);
  const one = tryRows(width, height, size, options, 1, least);
  // One row of pieces when they fit there at a good size, or two rows when one would squeeze them.
  if (widthOf(one, size) <= width && one.piece >= Math.max(least, 0.6 * one.cell)) return one;
  return tryRows(width, height, size, options, 2, least);
}
