// Searches whole numbers for the fruits. The tests use it to prove each puzzle has exactly one answer, the hint
// uses it to find the easiest row, and the skilled bot follows its plan.
import { fruitsIn, holds, sumOf, type Fruit, type Puzzle, type Row, type Values } from './equation.ts';

/**
 * The search goes this high. An all-plus row caps every fruit in it at that row's total, which is 20 at most, and
 * a fruit only ever added in a row that takes others away is capped by their caps plus the total, so no fruit can
 * be worth more than 40. The tests check that, which makes this search a proof. Going past 40 also keeps a few rows
 * on their own, as the hint weighs them, from looking settled just because the numbers ran out.
 */
export const SEARCH_TOP = 60;

/** An all-plus row caps every fruit in it: three apples that make 9 can't be more than 3 each. */
function highest(rows: readonly Row[], fruit: Fruit, top: number): number {
  let most = top;
  for (const row of rows) {
    if (row.terms.some((term) => term.sign < 0)) continue;
    const count = row.terms.reduce((sum, term) => sum + (term.fruit === fruit ? term.count : 0), 0);
    if (count > 0) most = Math.min(most, Math.floor(row.total / count));
  }
  return most;
}

/** Every way to give the unknown fruits whole numbers from 0 up that makes all these rows add up. */
export function assignments(rows: readonly Row[], known: Values, top = SEARCH_TOP): Values[] {
  const unknown = [...new Set(rows.flatMap((row) => fruitsIn(row.terms)))].filter((fruit) => known[fruit] === undefined);
  // Each row is checked as soon as its last unknown fruit has a number, so dead ends stop early.
  const checkAt: Row[][] = unknown.map(() => []);
  for (const row of rows) {
    const last = Math.max(-1, ...fruitsIn(row.terms).map((fruit) => unknown.indexOf(fruit)));
    if (last < 0 && !holds(row, known)) return [];
    if (last >= 0) checkAt[last].push(row);
  }
  const tops = unknown.map((fruit) => highest(rows, fruit, top));
  const found: Values[] = [];
  const values: Values = { ...known };
  const fill = (at: number): void => {
    if (at === unknown.length) {
      found.push(Object.fromEntries(unknown.map((fruit) => [fruit, values[fruit]])) as Values);
      return;
    }
    for (let value = 0; value <= tops[at]; value += 1) {
      values[unknown[at]] = value;
      if (checkAt[at].every((row) => holds(row, values))) fill(at + 1);
    }
    delete values[unknown[at]];
  };
  fill(0);
  return found;
}

/** Every whole-number answer to the whole puzzle. A fair puzzle has exactly one. */
export const solutions = (puzzle: Puzzle): Values[] => assignments(puzzle.clues, {});

/** The next thing to work out: a fruit from the fewest rows that pin it down, or the question once its fruits are known. */
export type Step = { kind: 'fruit'; fruit: Fruit; value: number; rows: number[] } | { kind: 'question'; value: number; rows: number[] };

function subsets(count: number, size: number): number[][] {
  if (size === 0) return [[]];
  const made: number[][] = [];
  for (let first = 0; first <= count - size; first += 1) {
    for (const rest of subsets(count - first - 1, size - 1)) made.push([first, ...rest.map((at) => at + first + 1)]);
  }
  return made;
}

function pinned(puzzle: Puzzle, known: Values, rows: number[]): { fruit: Fruit; value: number } | null {
  const found = assignments(
    rows.map((at) => puzzle.clues[at]),
    known,
  );
  if (!found.length) return null;
  for (const fruit of Object.keys(found[0]) as Fruit[]) {
    const value = found[0][fruit] as number;
    if (found.every((answer) => answer[fruit] === value)) return { fruit, value };
  }
  return null;
}

const unknownIn = (puzzle: Puzzle, known: Values, rows: number[]): number =>
  new Set(rows.flatMap((at) => fruitsIn(puzzle.clues[at].terms)).filter((fruit) => known[fruit] === undefined)).size;

/**
 * The easiest next step. One row with one unknown fruit beats two rows together, which beat three. Rows with
 * nothing unknown left are skipped, and among equals the row nearest the top wins.
 */
export function nextStep(puzzle: Puzzle, known: Values): Step | null {
  const question = sumOf(puzzle.question, known);
  if (question !== null) return { kind: 'question', value: question, rows: [] };
  const open = puzzle.clues.flatMap((row, at) => (fruitsIn(row.terms).some((fruit) => known[fruit] === undefined) ? [at] : []));
  for (let size = 1; size <= open.length; size += 1) {
    const choices = subsets(open.length, size)
      .map((picked) => picked.map((at) => open[at]))
      .sort((a, b) => unknownIn(puzzle, known, a) - unknownIn(puzzle, known, b));
    for (const rows of choices) {
      const found = pinned(puzzle, known, rows);
      if (found) return { kind: 'fruit', ...found, rows };
    }
  }
  return null;
}

/** The whole way through, step by step, as a careful player would go. */
export function plan(puzzle: Puzzle): Step[] {
  const steps: Step[] = [];
  const known: Values = {};
  for (let guard = 0; guard < 10; guard += 1) {
    const step = nextStep(puzzle, known);
    if (!step) break;
    steps.push(step);
    if (step.kind === 'question') return steps;
    known[step.fruit] = step.value;
  }
  throw new Error('This puzzle cannot be worked out step by step');
}
