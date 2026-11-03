// The solver. It never looks at the answer the generator meant: it only compares the shapes on screen. An option
// is right when some quarter turn of the target makes exactly that option, painted tiles and face included. In
// "which two are the same?" a pair is right when one card is the other turned.
import { isTurnOf, type Shape } from './shapes.ts';

/** The options that are the target turned. A fair puzzle has exactly one. */
export const solveMatch = (target: Shape, options: readonly Shape[]): number[] =>
  options.flatMap((option, at) => (isTurnOf(target, option) ? [at] : []));

/** Every pair of cards, in order, where one is the other turned. A fair puzzle has exactly one. */
export function solvePairs(cards: readonly Shape[]): [number, number][] {
  const found: [number, number][] = [];
  for (let first = 0; first < cards.length; first += 1) {
    for (let second = first + 1; second < cards.length; second += 1) {
      if (isTurnOf(cards[first], cards[second])) found.push([first, second]);
    }
  }
  return found;
}

/** Every pair of cards, in order. */
export function allPairs(count: number): [number, number][] {
  const pairs: [number, number][] = [];
  for (let first = 0; first < count; first += 1) for (let second = first + 1; second < count; second += 1) pairs.push([first, second]);
  return pairs;
}
