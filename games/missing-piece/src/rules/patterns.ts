// Every pattern a player might see in one attribute of a grid. The solver tries all of them, so a piece only
// counts as fitting when some pattern explains the whole grid with it in place, and a puzzle is only fair when
// every pattern that explains the visible patches agrees on the missing one.
import { ATTRS, RING, type Attr } from './cells.ts';

/** One attribute's values, by row. */
export type Grid = readonly (readonly number[])[];

export type Pattern =
  /** Each row is one value: "same across the row". A grid of one value is this too. */
  | 'rows'
  /** Each column is one value. */
  | 'cols'
  /** Every value once in each row and once in each column. */
  | 'latin'
  /** The same step from each patch to the next along every row: counts 1, 2, 3, or a quarter turn each time. */
  | 'across'
  /** The same step down every column. */
  | 'down'
  /** Buttons: the last patch of each row is the first two put together. */
  | 'join'
  /** Buttons that are in both of the first two patches cancel out. */
  | 'cancel'
  /** Only the buttons in both stay. */
  | 'both'
  /** The second patch's buttons are taken away from the first. */
  | 'cut'
  | 'joinDown'
  | 'cancelDown'
  | 'bothDown'
  | 'cutDown';

const transpose = (grid: Grid): number[][] => grid[0].map((_, col) => grid.map((row) => row[col]));

const rowsSame = (grid: Grid): boolean => grid.every((row) => row.every((value) => value === row[0]));

function latin(grid: Grid): boolean {
  const size = grid.length;
  if (grid.some((row) => row.length !== size)) return false;
  const symbols = [...new Set(grid[0])].sort((a, b) => a - b);
  if (symbols.length !== size) return false;
  const holds = (line: readonly number[]): boolean => [...line].sort((a, b) => a - b).join() === symbols.join();
  return grid.every(holds) && transpose(grid).every(holds);
}

/** The step from one value to the next, round the ring for turns and corners. Null when a value is off the ring. */
function stepBetween(attr: Attr, from: number, to: number): number | null {
  if (ATTRS[attr].kind === 'ring') {
    if (from >= RING || to >= RING) return null;
    return (((to - from) % RING) + RING) % RING;
  }
  return to - from;
}

/** Every row climbs by the same step, which isn't zero. Rows may start in different places. */
function steps(attr: Attr, grid: Grid): boolean {
  if (grid[0].length < 3) return false;
  const step = stepBetween(attr, grid[0][0], grid[0][1]);
  if (step === null || step === 0) return false;
  return grid.every((row) => row.slice(1).every((value, at) => stepBetween(attr, row[at], value) === step));
}

const OPS = {
  join: (a: number, b: number) => a | b,
  cancel: (a: number, b: number) => a ^ b,
  both: (a: number, b: number) => a & b,
  cut: (a: number, b: number) => a & ~b,
} as const;

export type MarkOp = keyof typeof OPS;
export const markOp = (op: MarkOp, a: number, b: number): number => OPS[op](a, b);

const combines = (op: MarkOp, grid: Grid): boolean =>
  grid[0].length === 3 && grid.every((row) => row[2] === OPS[op](row[0], row[1]));

const NAME_PATTERNS: readonly Pattern[] = ['rows', 'cols', 'latin'];
const LINE_PATTERNS: readonly Pattern[] = [...NAME_PATTERNS, 'across', 'down'];
const MARK_PATTERNS: readonly Pattern[] = [
  ...NAME_PATTERNS,
  ...(['join', 'cancel', 'both', 'cut'] as const).flatMap((op) => [op, `${op}Down` as Pattern]),
];

export const patternsFor = (attr: Attr): readonly Pattern[] =>
  ATTRS[attr].kind === 'names' ? NAME_PATTERNS : ATTRS[attr].kind === 'marks' ? MARK_PATTERNS : LINE_PATTERNS;

export function fits(attr: Attr, pattern: Pattern, grid: Grid): boolean {
  switch (pattern) {
    case 'rows':
      return rowsSame(grid);
    case 'cols':
      return rowsSame(transpose(grid));
    case 'latin':
      return latin(grid);
    case 'across':
      return steps(attr, grid);
    case 'down':
      return steps(attr, transpose(grid));
    case 'join':
    case 'cancel':
    case 'both':
    case 'cut':
      return combines(pattern, grid);
    default:
      return combines(pattern.replace('Down', '') as MarkOp, transpose(grid));
  }
}

/** The patterns that explain a whole grid. Empty means nothing does, so the grid breaks the rule. */
export const fittingPatterns = (attr: Attr, grid: Grid): Pattern[] => patternsFor(attr).filter((pattern) => fits(attr, pattern, grid));

export const fitsSome = (attr: Attr, grid: Grid): boolean => patternsFor(attr).some((pattern) => fits(attr, pattern, grid));
