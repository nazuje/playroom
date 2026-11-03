// The careless eye: a child in a hurry who doesn't look for a rule. Their eye lands on one thing, and they tap
// whatever looks most different from it, then the next most different. That is the classic slip in odd-one-out
// puzzles: comparing two things instead of seeing the whole group, so when the eye lands on the odd one, every
// other thing looks wrong. Colour jumps out most, then size, shape and fill; a different number of dots or a turn
// is easy to miss, and a mirror image is missed altogether. The generator uses this to make sure the slip never
// wins a late level, and the careless bot plays it on the real game.
import { PICS } from './pics.ts';
import type { Thing } from './things.ts';

type Look = (thing: Thing) => number | string;

const LOOKS: readonly (readonly [Look, number])[] = [
  [(thing) => (thing.pic === null ? thing.color : PICS[thing.pic].hue), 5],
  [(thing) => (thing.pic === null ? thing.size : 0), 4],
  [(thing) => (thing.pic === null ? thing.shape : PICS[thing.pic].group), 4],
  [(thing) => thing.fill, 4],
  [(thing) => thing.dots, 2],
  [(thing) => thing.turn, 2],
];

/** How different one thing looks from another, to a quick glance. */
export function unlike(a: Thing, b: Thing): number {
  let total = 0;
  for (const [look, weight] of LOOKS) if (look(a) !== look(b)) total += weight;
  return total;
}

/** How many things the careless eye taps before the answer for sure, and how many it likes just as much. */
export function rivals(things: readonly Thing[], answer: number, glance: number): { ahead: number; tied: number } {
  const mine = unlike(things[answer], things[glance]);
  let ahead = 0;
  let tied = 0;
  for (let at = 0; at < things.length; at += 1) {
    if (at === answer) continue;
    const theirs = unlike(things[at], things[glance]);
    if (theirs > mine) ahead += 1;
    else if (theirs === mine) tied += 1;
  }
  return { ahead, tied };
}

/** The order the careless eye taps in, starting from the thing it glanced at. Ties go by the random source. */
export function carelessOrder(things: readonly Thing[], glance: number, random: () => number): number[] {
  const tiebreak = things.map(() => random());
  return things
    .map((thing, at) => ({ at, look: unlike(thing, things[glance]) }))
    .sort((a, b) => b.look - a.look || tiebreak[a.at] - tiebreak[b.at])
    .map(({ at }) => at);
}
