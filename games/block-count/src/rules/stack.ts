// A stack of toy blocks as data. Blocks never float, so every block stands on the floor or on another block, and a
// stack is the same thing as a height map: how tall each column of the floor grid is. x runs left to right, z from
// the back (0) to the front, and y is the layer, 0 on the floor.

export type Cube = readonly [x: number, y: number, z: number];

/** Column heights by row from the back, then by column from the left: heights[z][x]. */
export type Heights = readonly (readonly number[])[];

export const cubeKey = ([x, y, z]: Cube): string => `${x},${y},${z}`;

export const widthOf = (heights: Heights): number => heights[0]?.length ?? 0;
export const depthOf = (heights: Heights): number => heights.length;
export const tallestOf = (heights: Heights): number => Math.max(0, ...heights.flat());
export const countOf = (heights: Heights): number => heights.flat().reduce((sum, height) => sum + height, 0);

/**
 * Every block of a stack, in the order they count off: the bottom layer first, each layer from the back row to the
 * front and from left to right, so the count climbs the stack the way it was built.
 */
export function cubesOf(heights: Heights): Cube[] {
  const cubes: Cube[] = [];
  const tallest = tallestOf(heights);
  for (let y = 0; y < tallest; y += 1) {
    heights.forEach((row, z) =>
      row.forEach((height, x) => {
        if (y < height) cubes.push([x, y, z]);
      }),
    );
  }
  return cubes;
}

/**
 * The fewest blocks that can hold up these ones: each block and every block under it down to the floor, because
 * blocks never float. Returned as heights over the given footprint.
 */
export function heldUp(cubes: readonly Cube[], width: number, depth: number): number[][] {
  const heights = Array.from({ length: depth }, () => Array.from({ length: width }, () => 0));
  for (const [x, y, z] of cubes) heights[z][x] = Math.max(heights[z][x], y + 1);
  return heights;
}

export const heightsKey = (heights: Heights): string => heights.map((row) => row.join('')).join('/');

export const sameHeights = (a: Heights, b: Heights): boolean => heightsKey(a) === heightsKey(b);

/** Left and right swapped, as if read in a mirror. */
export const mirrored = (heights: Heights): number[][] => heights.map((row) => [...row].reverse());

/** Back and front swapped, as if seen from behind. */
export const flipped = (heights: Heights): number[][] => [...heights].reverse().map((row) => [...row]);

/** A quarter turn, so rows become columns. Only square footprints keep their shape. */
export const turned = (heights: Heights): number[][] =>
  Array.from({ length: widthOf(heights) }, (_, z) => Array.from({ length: depthOf(heights) }, (_, x) => heights[depthOf(heights) - 1 - x][z]));

/** Columns that aren't full up to a box's height: the empty spots a quick look sees from above. */
export const openTops = (heights: Heights, boxHeight: number): number => heights.flat().filter((height) => height < boxHeight).length;

/** How many more blocks fill a box of this height over the stack's footprint. */
export const missingFrom = (heights: Heights, boxHeight: number): number =>
  heights.flat().reduce((sum, height) => sum + Math.max(0, boxHeight - height), 0);
