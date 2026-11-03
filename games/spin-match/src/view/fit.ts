// The biggest target and options that fit the screen with nothing to scroll. Pure, so the sizes can be tested for
// every phone and tablet without a browser. style.css uses the same room for the pearls, the ring and the sand.

/** Room for the row of pearls above the target. */
export const PEARLS = 34;
/** The bubble ring around the target, on each side. */
export const RING = 14;
/** Room under the target, above the sand. */
export const FOOT = 10;
export const OPTION_GAP = 12;
/** The sand bed's own top and bottom edge. */
export const DOCK_EDGE = 36;
/** Space at each side of the screen. */
export const SIDE = 12;
/** The "=" between the two slots in "which two are the same?". */
export const EQUALS = 40;
const MOST_TARGET = 300;
const MOST_OPTION = 150;
/**
 * Options are smaller than the target, so the target stays the star. In "which two are the same?" the cards are
 * the puzzle, and the slots only hold the two picked, so cards are nearly as big.
 */
const ratioOf = (layout: Layout): number => (layout.kind === 'pairs' ? 0.95 : 0.58);

export interface Layout {
  kind: 'match' | 'pairs';
  options: number;
  big: boolean;
  helper: boolean;
}

export interface Fit {
  /** The target's box, or each slot's in "which two are the same?". */
  target: number;
  option: number;
  /** Options in each row of the sand bed, and how many rows. */
  perRow: number;
  rows: number;
  /** The ↻ button, or 0 when there is none. */
  helper: number;
}

/** The smallest an option may be: 64px, or 88px on the first world, which is for age 5. */
export const leastTarget = (big: boolean): number => (big ? 88 : 64);
export const helperSize = (big: boolean): number => (big ? 88 : 72);

/** The widest the target may be in the room left by the ring and the ↻ button or the second slot. */
function targetByWidth(width: number, layout: Layout): number {
  const room = width - 2 * SIDE;
  if (layout.kind === 'pairs') return (room - EQUALS) / 2 - 2 * RING;
  // The ↻ button sits on the box's bottom-right corner, outside the round ring, and the target stays centred.
  return room - 2 * RING - (layout.helper ? helperSize(layout.big) : 0);
}

/** Room under the target: the ↻ button hangs half below the corner of its box. */
export const footOf = (helper: number): number => Math.max(FOOT, helper / 2);

function tryRows(width: number, height: number, layout: Layout, rows: number): Fit {
  const least = leastTarget(layout.big);
  const perRow = Math.ceil(layout.options / rows);
  const optionByWidth = (width - 2 * SIDE - (perRow - 1) * OPTION_GAP) / perRow;
  const byWidth = targetByWidth(width, layout);
  const fixed = PEARLS + 2 * RING + footOf(layout.helper ? helperSize(layout.big) : 0) + (rows - 1) * OPTION_GAP + DOCK_EDGE;
  const first = Math.min(byWidth, MOST_TARGET, (height - fixed) / (1 + rows * ratioOf(layout)));
  const option = Math.max(least, Math.min(ratioOf(layout) * first, optionByWidth, MOST_OPTION));
  // Whatever height the options leave goes back to the target.
  const target = Math.min(byWidth, MOST_TARGET, height - fixed - rows * option);
  return { target: Math.floor(target), option: Math.floor(option), perRow, rows, helper: layout.helper ? helperSize(layout.big) : 0 };
}

/** The room the board and the sand bed take up together. */
export const heightOf = (fit: Fit): number =>
  PEARLS + fit.target + 2 * RING + footOf(fit.helper) + fit.rows * fit.option + (fit.rows - 1) * OPTION_GAP + DOCK_EDGE;

export function widthOf(fit: Fit, layout: Layout): number {
  const board = layout.kind === 'pairs' ? 2 * (fit.target + 2 * RING) + EQUALS : fit.target + 2 * RING + fit.helper;
  return Math.max(board, fit.perRow * fit.option + (fit.perRow - 1) * OPTION_GAP) + 2 * SIDE;
}

/** Sizes for a puzzle in the room under the top bar. */
export function fit(width: number, height: number, layout: Layout): Fit {
  const one = tryRows(width, height, layout, 1);
  // One row of options when they fit there at a good size, or two rows when one would squeeze them.
  if (widthOf(one, layout) <= width && one.option >= Math.max(leastTarget(layout.big), 0.38 * one.target)) return one;
  return tryRows(width, height, layout, 2);
}
