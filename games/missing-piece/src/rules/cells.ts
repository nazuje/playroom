// A patch on the quilt, as plain numbers, so the rules and the solver can compare every attribute exactly. The
// view turns these numbers into shapes.

export const SHAPES = ['circle', 'square', 'triangle', 'star', 'heart', 'diamond', 'arrow', 'moon'] as const;
export type ShapeName = (typeof SHAPES)[number];
/** The shapes a 4-year-old knows best. Arrows and moons join when turning matters. */
export const PLAIN_SHAPES: readonly number[] = [0, 1, 2, 3, 4, 5];
/** Shapes that look different after a quarter turn, so a turn can be seen. A circle or a square can't show one. */
export const TURNING_SHAPES: readonly number[] = [2, 4, 6, 7];

export const COLORS = ['red', 'orange', 'yellow', 'green', 'blue', 'purple'] as const;
export type ColorName = (typeof COLORS)[number];

export const FILLS = ['solid', 'striped', 'empty'] as const;
export type FillName = (typeof FILLS)[number];

/** Spots 0 to 3 are the corners going clockwise from the top left, and 4 is the middle. */
export const MIDDLE = 4;
/** Buttons sit on a 3 by 3 grid of spots, one bit each. */
export const MARK_SPOTS = 9;
export const ALL_MARKS = (1 << MARK_SPOTS) - 1;

export interface Cell {
  shape: number;
  color: number;
  fill: number;
  /** 1 to 3 shapes. */
  count: number;
  /** 0 small, 1 medium, 2 big. */
  size: number;
  /** Quarter turns clockwise, 0 to 3. */
  turn: number;
  /** Where a lone shape sits: a corner, or the middle. */
  spot: number;
  /** Which of the 9 button spots are filled, on puzzles where buttons add up or cancel out. 0 otherwise. */
  marks: number;
}

export type Attr = keyof Cell;

/** How an attribute's values relate: names with no order, a line with ends, a ring that wraps, or a set of buttons. */
export type AttrKind = 'names' | 'line' | 'ring' | 'marks';

export interface AttrInfo {
  kind: AttrKind;
  /** Every value it can take. */
  values: readonly number[];
}

const range = (from: number, to: number): number[] => Array.from({ length: to - from + 1 }, (_, at) => from + at);

export const ATTRS: Record<Attr, AttrInfo> = {
  shape: { kind: 'names', values: range(0, SHAPES.length - 1) },
  color: { kind: 'names', values: range(0, COLORS.length - 1) },
  fill: { kind: 'names', values: range(0, FILLS.length - 1) },
  count: { kind: 'line', values: [1, 2, 3] },
  size: { kind: 'line', values: [0, 1, 2] },
  turn: { kind: 'ring', values: [0, 1, 2, 3] },
  spot: { kind: 'ring', values: [0, 1, 2, 3, MIDDLE] },
  marks: { kind: 'marks', values: range(0, ALL_MARKS) },
};

/** The ring of four steps that turns and corners go round. The middle spot is off the ring. */
export const RING = 4;

/** What a shape cell shows. Button puzzles show buttons instead of a count, a size and a spot. */
export const SHAPE_ATTRS: readonly Attr[] = ['shape', 'color', 'fill', 'count', 'size', 'turn', 'spot'];
export const MARK_ATTRS: readonly Attr[] = ['marks', 'shape', 'color', 'fill'];

export const attrsOf = (cells: readonly Cell[]): readonly Attr[] => (cells.some((cell) => cell.marks !== 0) ? MARK_ATTRS : SHAPE_ATTRS);

export const cellKey = (cell: Cell): string =>
  `${SHAPES[cell.shape]}-${COLORS[cell.color]}-${FILLS[cell.fill]}-${cell.count}-${cell.size}-${cell.turn}-${cell.spot}-${cell.marks}`;

export const sameCell = (a: Cell, b: Cell): boolean => cellKey(a) === cellKey(b);

export const withValue = (cell: Cell, attr: Attr, value: number): Cell => ({ ...cell, [attr]: value });

/** How many of the attributes two cells share, for the careless eye that only glances at a neighbour. */
export const likeness = (a: Cell, b: Cell, attrs: readonly Attr[]): number => attrs.filter((attr) => a[attr] === b[attr]).length;

export const bitCount = (marks: number): number => {
  let count = 0;
  for (let bits = marks; bits; bits &= bits - 1) count += 1;
  return count;
};
