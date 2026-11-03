// One try at a level: a set of three puzzles of the same kind, the things tapped, misses over the whole set, the
// end of a try, and which friend a wrongly tapped thing points to. Pure, so the tests and the bots can play it too.
import { missLimit, type Idea, type Puzzle } from './levels.ts';
import { featureOf } from './solve.ts';

export interface Play {
  /** The set's puzzles, in order. */
  puzzles: readonly Puzzle[];
  /** Which puzzle is on the pond now. */
  at: number;
  /** Wrong taps over the whole set so far. */
  misses: number;
  /** Things wrongly tapped on this puzzle, by place, so they can be dimmed. */
  tried: number[];
  /** Every puzzle of the set is done. */
  won: boolean;
  /** The try ended with too many wrong taps. */
  failed: boolean;
}

export const startPlay = (puzzles: readonly Puzzle[]): Play => ({ puzzles, at: 0, misses: 0, tried: [], won: false, failed: false });

export const puzzleOf = (play: Play): Puzzle => play.puzzles[play.at];

export interface Answered {
  play: Play;
  right: boolean;
  /** The right tap finished a puzzle that isn't the set's last, and the next one comes up. */
  solvedOne: boolean;
  /** For a wrong tap: another thing that keeps the rule along with it, to show they belong together. */
  buddy: number | null;
}

export function answer(play: Play, index: number): Answered | null {
  const puzzle = puzzleOf(play);
  if (play.won || play.failed || play.tried.includes(index) || !puzzle.things[index]) return null;
  if (index === puzzle.answer) {
    const last = play.at === play.puzzles.length - 1;
    const next = last ? { ...play, won: true } : { ...play, at: play.at + 1, tried: [] };
    return { play: next, right: true, solvedOne: !last, buddy: null };
  }
  const misses = play.misses + 1;
  return {
    play: { ...play, misses, failed: misses >= missLimit(puzzle), tried: [...play.tried, index] },
    right: false,
    solvedOne: false,
    buddy: buddyOf(puzzle, index),
  };
}

/** Every thing that keeps the rule: all but the odd one. */
export const members = (puzzle: Puzzle): number[] => puzzle.things.flatMap((_, at) => (at === puzzle.answer ? [] : [at]));

/**
 * The friend a wrongly tapped thing shows it belongs with: one that shares its value of the rule, the next one
 * along in a sequence, or the one two along when two looks take turns. Only one friend, so the hint narrows the
 * choice without giving the answer away.
 */
export function buddyOf(puzzle: Puzzle, tapped: number): number | null {
  const others = members(puzzle).filter((at) => at !== tapped);
  const { rule, things } = puzzle;
  const near = (list: number[]) => [...list].sort((a, b) => Math.abs(a - tapped) - Math.abs(b - tapped) || a - b)[0] ?? null;
  if (rule.kind === 'pair') {
    const mine = featureOf(things[tapped], rule.a, tapped, things.length);
    const same = others.filter((at) => featureOf(things[at], rule.a, at, things.length) === mine);
    return near(same.length ? same : others);
  }
  if (rule.kind === 'alternate') {
    const same = others.filter((at) => at % 2 === tapped % 2);
    return near(same.length ? same : others);
  }
  return near(others);
}

/** How the friends who keep the rule dance together once the odd one is gone, so the rule shows itself. */
export type Dance = 'hop' | 'glow' | 'spin' | 'pulse' | 'wiggle' | 'count' | 'sway' | 'groups' | 'flip' | 'align' | 'wave';

const DANCES: Record<Idea, Dance> = {
  group: 'hop',
  color: 'glow',
  shape: 'spin',
  size: 'pulse',
  fill: 'wiggle',
  count: 'count',
  parity: 'sway',
  honest: 'hop',
  pair: 'groups',
  symmetry: 'flip',
  mirror: 'align',
  sides: 'count',
  step: 'wave',
  alternate: 'groups',
};

export const danceFor = (idea: Idea): Dance => DANCES[idea];

/** The groups that take turns in the "groups" dance: by the first look of a pairing, or by even and odd places. */
export function groupsOf(puzzle: Puzzle): number[][] {
  const { rule, things } = puzzle;
  const keep = members(puzzle);
  if (rule.kind === 'pair') {
    const values = [...new Set(keep.map((at) => featureOf(things[at], rule.a, at, things.length)))];
    return values.map((value) => keep.filter((at) => featureOf(things[at], rule.a, at, things.length) === value));
  }
  if (rule.kind === 'alternate') return [keep.filter((at) => at % 2 === 0), keep.filter((at) => at % 2 === 1)];
  return [keep];
}
