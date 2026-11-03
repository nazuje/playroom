// Where the lily pads go and how big they are, with nothing to scroll. Pure, so the sizes can be tested for every
// phone and tablet without a browser. Four sit in a row on a wide screen and in a square on a phone, five like the
// dots of a dice, and six in two rows of three on every screen, the same places rules/solve.ts reads groups from.
// style.css uses the same room for the lotus buds above the pond and the dock below it.

/** Room for the three lotus buds above the pads. */
export const LIGHTS = 40;
/** The dock under the pond, for the skip button. */
export const FOOT = 68;
/** Space at each side of the screen and around the pads. */
export const SIDE = 12;
export const EDGE = 8;
export const GAP = 14;
const MOST = 176;

export type Shape = 'row' | 'square' | 'dice' | 'grid';

export interface Fit {
  size: number;
  shape: Shape;
  /** The top left corner of each pad, in the board. */
  spots: [number, number][];
  width: number;
  height: number;
}

/** The smallest a pad may be: 64px, or 88px on the first world, which is for age 4. */
export const leastTarget = (big: boolean): number => (big ? 88 : 64);

const ROOT2 = Math.SQRT2;

function sizeFor(shape: Shape, count: number, wide: number, tall: number): number {
  if (shape === 'row') return Math.min((wide - (count - 1) * GAP) / count, tall);
  if (shape === 'square') return Math.min((wide - GAP) / 2, (tall - GAP) / 2);
  if (shape === 'dice') return Math.min((wide - ROOT2 * GAP) / (ROOT2 + 1), (tall - ROOT2 * GAP) / (ROOT2 + 1));
  return Math.min((wide - 2 * GAP) / 3, (tall - GAP) / 2);
}

function spotsFor(shape: Shape, count: number, size: number): [number, number][] {
  const step = size + GAP;
  if (shape === 'row') return Array.from({ length: count }, (_, at) => [at * step, 0]);
  if (shape === 'square') return Array.from({ length: count }, (_, at) => [(at % 2) * step, Math.floor(at / 2) * step]);
  if (shape === 'grid') return Array.from({ length: count }, (_, at) => [(at % 3) * step, Math.floor(at / 3) * step]);
  const unit = step / ROOT2;
  return [
    [0, 0],
    [2 * unit, 0],
    [unit, unit],
    [0, 2 * unit],
    [2 * unit, 2 * unit],
  ];
}

/** Sizes and places for a puzzle's pads, in the room under the top bar. */
export function fit(width: number, height: number, count: number): Fit {
  const wide = width - 2 * SIDE;
  const tall = height - LIGHTS - FOOT - 2 * EDGE;
  let shape: Shape = count === 5 ? 'dice' : count === 6 ? 'grid' : 'square';
  // Four in a row on a wide screen, when the pads are as big there as in a square.
  if (count === 4 && Math.min(MOST, sizeFor('row', 4, wide, tall)) >= Math.min(MOST, sizeFor('square', 4, wide, tall))) shape = 'row';
  const size = Math.floor(Math.min(MOST, sizeFor(shape, count, wide, tall)));
  const spots = spotsFor(shape, count, size).map(([x, y]) => [Math.round(x), Math.round(y)] as [number, number]);
  const right = Math.max(...spots.map(([x]) => x)) + size;
  const bottom = Math.max(...spots.map(([, y]) => y)) + size;
  return { size, shape, spots, width: right, height: bottom };
}

/** The room the pond takes, lotus buds and dock included. */
export const heightOf = (sizes: Fit): number => sizes.height + LIGHTS + FOOT + 2 * EDGE;
export const widthOf = (sizes: Fit): number => sizes.width + 2 * SIDE;
