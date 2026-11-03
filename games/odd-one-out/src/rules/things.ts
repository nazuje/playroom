// A thing on a lily pad, as plain numbers: either a picture (an emoji from pics.ts) or a drawn shape with a
// colour, a size, a fill, maybe some dots, a turn and a mirror. The solver reads only these numbers, and the view
// draws them, so what the rules see is exactly what the child sees.

export interface ShapeInfo {
  name: string;
  /** Straight sides of a polygon, or null for anything that isn't one. */
  sides: number | null;
  /** Round edges (1), only straight ones (0), or null where it doesn't apply. */
  curvy: number | null;
  /** The same flipped left to right. */
  symmetric: boolean;
  /** Looks different when turned, so a turn can be seen. */
  turnable: boolean;
}

/** Every shape the game draws, by index. view/art.ts has a path for each. */
export const SHAPES: readonly ShapeInfo[] = [
  { name: 'circle', sides: null, curvy: 1, symmetric: true, turnable: false },
  { name: 'square', sides: 4, curvy: 0, symmetric: true, turnable: false },
  { name: 'triangle', sides: 3, curvy: 0, symmetric: true, turnable: false },
  { name: 'star', sides: null, curvy: 0, symmetric: true, turnable: false },
  { name: 'heart', sides: null, curvy: 1, symmetric: true, turnable: false },
  // A crescent lying like a smile, so it is the same flipped left to right.
  { name: 'moon', sides: null, curvy: 1, symmetric: true, turnable: false },
  { name: 'pentagon', sides: 5, curvy: 0, symmetric: true, turnable: false },
  { name: 'hexagon', sides: 6, curvy: 0, symmetric: true, turnable: false },
  { name: 'cross', sides: null, curvy: 0, symmetric: true, turnable: false },
  { name: 'arrow', sides: null, curvy: 0, symmetric: true, turnable: true },
  // The lopsided ones: no mirror line, so a flipped one can never be turned back into the others.
  { name: 'flag', sides: null, curvy: 0, symmetric: false, turnable: true },
  { name: 'boot', sides: null, curvy: 1, symmetric: false, turnable: true },
  { name: 'ell', sides: null, curvy: 0, symmetric: false, turnable: true },
  // A playing card for dots, with round corners.
  { name: 'card', sides: null, curvy: null, symmetric: true, turnable: false },
];

export const shapeId = (name: string): number => {
  const at = SHAPES.findIndex((shape) => shape.name === name);
  if (at < 0) throw new Error(`No shape called ${name}`);
  return at;
};

export const CIRCLE = shapeId('circle');
export const CARD = shapeId('card');
export const ARROW = shapeId('arrow');
/** Shapes a 6-year-old can name, for the first drawn world. */
export const PLAIN_SHAPES: readonly number[] = ['circle', 'square', 'triangle', 'star', 'heart', 'moon'].map(shapeId);
/** Every shape that is the same flipped, for the symmetry puzzles. */
export const EVEN_SHAPES: readonly number[] = ['circle', 'square', 'triangle', 'star', 'heart', 'moon', 'pentagon', 'hexagon', 'cross', 'arrow'].map(shapeId);
export const LOPSIDED: readonly number[] = ['flag', 'boot', 'ell'].map(shapeId);
export const POLYGONS: readonly number[] = ['triangle', 'square', 'pentagon', 'hexagon'].map(shapeId);

export const COLORS = ['red', 'orange', 'yellow', 'green', 'blue', 'purple'] as const;
export const SIZES = 3;
/** Eight turns of 45 degrees make a full circle. */
export const TURNS = 8;
export const MOST_DOTS = 9;

export interface Thing {
  /** An emoji from pics.ts, or null for a drawn shape. */
  pic: number | null;
  shape: number;
  color: number;
  /** 0 small, 1 medium, 2 big. */
  size: number;
  /** 0 solid, 1 empty. */
  fill: number;
  dots: number;
  /** Eighths of a turn, clockwise. */
  turn: number;
  /** 1 when drawn mirrored. */
  flip: number;
  /** A number written on a card, or null. */
  numeral: number | null;
}

export const drawn = (parts: Partial<Thing> = {}): Thing => ({
  pic: null,
  shape: CIRCLE,
  color: 0,
  size: 2,
  fill: 0,
  dots: 0,
  turn: 0,
  flip: 0,
  numeral: null,
  ...parts,
});

export const picture = (pic: number): Thing => ({ ...drawn(), pic });

/** One string per look, so the bots can check the screen shows what the rules made. */
export const thingKey = (thing: Thing): string =>
  thing.pic !== null
    ? `p${thing.pic}`
    : `${SHAPES[thing.shape].name}-${thing.color}-${thing.size}-${thing.fill}-${thing.dots}-${thing.turn}-${thing.flip}-${thing.numeral ?? 'x'}`;
