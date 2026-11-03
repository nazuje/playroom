// The careless eye: a child in a hurry who doesn't turn anything in their head. They glance at the target and grab
// the option that looks most like it as it lies, then the next most alike (shapes.ts glance). That is the classic
// slip in rotation puzzles: a mirror image, or the same shape with one tile moved, often looks more like the target
// than the real answer, which is turned. In "which two are the same?" they grab the two cards that look most alike.
// The generator uses this to make sure the slip never wins a late level, and the careless bot plays it on the real
// game.
import { allPairs } from './solve.ts';
import { glance, type Shape } from './shapes.ts';

type Random = () => number;

export interface Rivals {
  /** Wrong choices that look more alike than the right one. */
  ahead: number;
  /** Wrong choices that look just as alike. */
  tied: number;
}

/** How many wrong options the careless eye prefers to the answer, and how many it likes just as much. */
export function rivals(target: Shape, options: readonly Shape[], answer: number): Rivals {
  const right = glance(target, options[answer]);
  let ahead = 0;
  let tied = 0;
  options.forEach((option, at) => {
    if (at === answer) return;
    const look = glance(target, option);
    if (look > right) ahead += 1;
    else if (look === right) tied += 1;
  });
  return { ahead, tied };
}

/** The order the careless eye taps the options in. Ties go by the random source. */
export function carelessOrder(target: Shape, options: readonly Shape[], random: Random): number[] {
  const tiebreak = options.map(() => random());
  return options
    .map((option, at) => ({ at, look: glance(target, option) }))
    .sort((a, b) => b.look - a.look || tiebreak[a.at] - tiebreak[b.at])
    .map(({ at }) => at);
}

const pairLook = (cards: readonly Shape[], [first, second]: readonly [number, number]): number => glance(cards[first], cards[second]);

/** For "which two are the same?": how many wrong pairs look more alike than the right pair, or just as alike. */
export function pairRivals(cards: readonly Shape[], pair: readonly [number, number]): Rivals {
  const right = pairLook(cards, pair);
  let ahead = 0;
  let tied = 0;
  for (const other of allPairs(cards.length)) {
    if (other[0] === pair[0] && other[1] === pair[1]) continue;
    const look = pairLook(cards, other);
    if (look > right) ahead += 1;
    else if (look === right) tied += 1;
  }
  return { ahead, tied };
}

/** The order the careless eye tries pairs in. Ties go by the random source. */
export function carelessPairs(cards: readonly Shape[], random: Random): [number, number][] {
  const pairs = allPairs(cards.length);
  const tiebreak = pairs.map(() => random());
  return pairs
    .map((pair, at) => ({ pair, at, look: pairLook(cards, pair) }))
    .sort((a, b) => b.look - a.look || tiebreak[a.at] - tiebreak[b.at])
    .map(({ pair }) => pair);
}
