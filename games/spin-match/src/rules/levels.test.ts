import { describe, expect, it } from 'vitest';
import { pairRivals, rivals } from './careless.ts';
import {
  carelessGoal,
  LEVEL_COUNT,
  LEVELS,
  levelById,
  missLimit,
  needsFor,
  puzzleFor,
  makePuzzle,
  puzzleKey,
  SET,
  setFor,
  surpriseFor,
  tilesApart,
  turnKey,
  turnsFor,
  WORLDS,
  type Puzzle,
} from './levels.ts';
import { feedbackFor } from './play.ts';
import { ACCENTS, bare, difference, FACE, freeKey, isTurnOf, keyOf, noSymmetry, relation, sideOf, turnBetween } from './shapes.ts';
import { allPairs, solveMatch, solvePairs } from './solve.ts';

const GOES = 20;
const everyGo: Puzzle[] = LEVELS.flatMap((level) => Array.from({ length: GOES }, (_, go) => puzzleFor(level.id, go) as Puzzle));
const matches = everyGo.filter((puzzle) => puzzle.kind === 'match');
const pairs = everyGo.filter((puzzle) => puzzle.kind === 'pairs');
const named = (puzzle: Puzzle) => `level ${puzzle.id} go ${puzzle.go}`;
const wrongOf = (puzzle: Puzzle) => puzzle.options.flatMap((option, at) => (puzzle.slips[at] ? [{ option, slip: puzzle.slips[at], at }] : []));
const inWorld = (world: string) => everyGo.filter((puzzle) => puzzle.world === world);

describe('every puzzle', () => {
  it('has 24 levels in 5 worlds, in order', () => {
    expect(LEVEL_COUNT).toBe(24);
    expect([...new Set(LEVELS.map((level) => level.world))]).toEqual([...WORLDS]);
    expect(WORLDS.map((world) => LEVELS.filter((level) => level.world === world).length)).toEqual([4, 5, 5, 5, 5]);
  });

  it('has a target with no symmetry, so a turn never looks like itself and a mirror image never looks like a turn', () => {
    for (const puzzle of everyGo) {
      expect(noSymmetry(puzzle.target), named(puzzle)).toBe(true);
      // From the mirror world on, the plain shape has none either, so backwards shows in the outline, not only the paint.
      if (!['spin', 'turn'].includes(puzzle.world)) expect(noSymmetry(bare(puzzle.target)), named(puzzle)).toBe(true);
    }
  });

  it('has exactly one option that is the target turned, by a quarter turn the level allows, never unturned', () => {
    for (const puzzle of matches) {
      expect(solveMatch(puzzle.target, puzzle.options), named(puzzle)).toEqual([puzzle.answer]);
      const quarters = turnBetween(puzzle.target, puzzle.options[puzzle.answer]);
      expect(turnsFor(puzzle.id), named(puzzle)).toContain(quarters);
      expect(keyOf(puzzle.options[puzzle.answer])).not.toBe(keyOf(puzzle.target));
    }
  });

  it('has exactly one pair of cards that are the same critter turned, in "which two are the same?"', () => {
    expect(pairs.length).toBeGreaterThan(0);
    for (const puzzle of pairs) {
      expect(solvePairs(puzzle.options), named(puzzle)).toEqual([puzzle.pair]);
      const [first, second] = puzzle.pair as [number, number];
      expect(puzzle.answer).toBe(first);
      expect(isTurnOf(puzzle.target, puzzle.options[first])).toBe(true);
      expect(isTurnOf(puzzle.target, puzzle.options[second])).toBe(true);
      expect(keyOf(puzzle.options[first])).not.toBe(keyOf(puzzle.options[second]));
    }
  });

  it('never has a wrong option that is a turn of the target, and each one is what it says', () => {
    for (const puzzle of everyGo) {
      for (const { option, slip } of wrongOf(puzzle)) {
        const where = `${named(puzzle)} ${slip}`;
        const is = relation(puzzle.target, option);
        expect(is, where).not.toBe('turned');
        expect(is === 'mirror', where).toBe(slip === 'mirror');
        if (slip === 'moved') {
          // One tile moved: the best turn of the target matches all but that one.
          const { wrong, missing } = difference(puzzle.target, option);
          expect([wrong.length, missing.length], where).toEqual([1, 1]);
          expect(option).toHaveLength(puzzle.target.length);
        }
        if (slip === 'paint') {
          // The same outline, turned, with one colour on the wrong tile.
          expect(isTurnOf(bare(puzzle.target), bare(option)), where).toBe(true);
          const { wrong, missing } = difference(puzzle.target, option);
          expect([wrong.length, missing.length], where).toEqual([2, 2]);
        }
        if (slip === 'shape') {
          expect(freeKey(option), where).not.toBe(freeKey(puzzle.target));
          expect(tilesApart(puzzle.target, option), where).toBeGreaterThanOrEqual(2);
        }
      }
    }
  });

  it('shows each wrong option the right way: a mirror flips, a moved tile or colour lights up, another shape wobbles', () => {
    for (const puzzle of matches) {
      for (const { option, slip } of wrongOf(puzzle)) {
        const shown = feedbackFor(puzzle.target, option, slip);
        const where = `${named(puzzle)} ${slip}`;
        if (slip === 'mirror') expect(shown.kind, where).toBe('mirror');
        if (slip === 'shape') expect(shown.kind, where).toBe('shape');
        if (slip === 'moved') expect(shown.kind === 'tiles' && shown.wrong.length, where).toBe(1);
        if (slip === 'paint') expect(shown.kind === 'tiles' && shown.wrong.length, where).toBe(2);
      }
    }
  });

  it('never offers the same critter twice, turned or not, except the right pair', () => {
    for (const puzzle of everyGo) {
      const keys = puzzle.options.map(turnKey);
      expect(new Set(keys).size, named(puzzle)).toBe(puzzle.kind === 'pairs' ? puzzle.options.length - 1 : puzzle.options.length);
    }
  });

  it('offers every kind of wrong option the level needs', () => {
    for (const puzzle of everyGo) {
      for (const kind of needsFor(puzzle.id)) expect(puzzle.slips, `${named(puzzle)} ${kind}`).toContain(kind);
    }
  });

  it('fits every critter in a box of 4 by 4 tiles, the same for all of a puzzle', () => {
    for (const puzzle of everyGo) {
      for (const shape of [puzzle.target, ...puzzle.options]) expect(sideOf(shape)).toBeLessThanOrEqual(puzzle.side);
      expect(puzzle.side).toBeLessThanOrEqual(4);
    }
  });

  it('is the same every time it is made, and every go is a fresh puzzle', () => {
    for (const level of LEVELS) {
      expect(puzzleKey(makePuzzle(level.id, 3) as Puzzle)).toBe(puzzleKey(puzzleFor(level.id, 3) as Puzzle));
      const keys = Array.from({ length: GOES }, (_, go) => puzzleKey(puzzleFor(level.id, go) as Puzzle));
      expect(new Set(keys).size, `level ${level.id}`).toBe(GOES);
    }
  });

  it('moves the right option around', () => {
    for (const level of LEVELS) {
      const places = new Set(Array.from({ length: GOES }, (_, go) => (puzzleFor(level.id, go) as Puzzle).answer));
      expect(places.size, `level ${level.id}`).toBeGreaterThanOrEqual(level.kind === 'match' && level.options === 2 ? 2 : 3);
    }
  });
});

describe('where the right answer sits', () => {
  // Every go of a level in play order: the sets of every try and replay follow one another.
  const RUN = 40;
  /** The first world has only two places, so it is quick to make and needs more goes to tell luck from a pattern. */
  const lengthOf = (id: number): number => (levelById(id)?.options === 2 ? RUN * 3 : RUN);
  const runOf = (id: number): Puzzle[] => Array.from({ length: lengthOf(id) }, (_, go) => puzzleFor(id, go) as Puzzle);
  /** Where the answer is, as one of the places a child can tap: an option, or one of the pairs of cards. */
  const placeOf = (puzzle: Puzzle): number => {
    if (puzzle.kind === 'match') return puzzle.answer;
    const [first, second] = puzzle.pair as [number, number];
    return allPairs(puzzle.options.length).findIndex(([a, b]) => a === first && b === second);
  };
  const placesIn = (puzzle: Puzzle): number => (puzzle.kind === 'match' ? puzzle.options.length : allPairs(puzzle.options.length).length);

  /** Strategies that tap by place, never looking: each guesses a place from the go and the last answer. */
  const strategies = (places: number): [string, (go: number, step: number, last: number | null) => number][] => [
    ...Array.from({ length: places }, (_, at) => [`always place ${at}`, () => at] as [string, () => number]),
    ...Array.from({ length: places }, (_, shift) => [`cycling from ${shift}`, (go: number) => (go + shift) % places] as [string, (go: number) => number]),
    ...Array.from({ length: places }, (_, shift) => [`cycling within a set from ${shift}`, (_go: number, step: number) => (step + shift) % places] as [string, (go: number, step: number) => number]),
    ['the same as last time', (_go, _step, last) => last ?? 0],
    ['one along from last time', (_go, _step, last) => ((last ?? 0) + 1) % places],
    ['one back from last time', (_go, _step, last) => ((last ?? 0) + places - 1) % places],
  ];

  it('is a seeded shuffle: the same every time, and every place gets the answer', () => {
    for (const level of LEVELS) {
      const run = runOf(level.id);
      for (const go of [5, 17, 33]) expect(placeOf(makePuzzle(level.id, go) as Puzzle), `level ${level.id} go ${go}`).toBe(placeOf(run[go]));
      if (level.kind === 'match') expect(new Set(run.map(placeOf)).size, `level ${level.id}`).toBe(level.options);
    }
  }, 60000);

  it('lets no tapping-by-place strategy beat chance by much, across sets and tries, in any world or in pairs', () => {
    // Levels with the same number of places are pooled, so there are enough goes to tell luck from a pattern.
    const groups = new Map<number, Puzzle[][]>();
    for (const level of LEVELS) {
      const run = runOf(level.id);
      const places = placesIn(run[0]);
      groups.set(places, [...(groups.get(places) ?? []), run]);
    }
    for (const [places, runs] of groups) {
      const chance = 1 / places;
      const tries = runs.reduce((sum, run) => sum + run.length, 0);
      // Three standard deviations of pure luck, and never less than 8 points.
      const allowed = chance + Math.max(0.08, 3 * Math.sqrt((chance * (1 - chance)) / tries));
      for (const [name, guess] of strategies(places)) {
        let hits = 0;
        for (const run of runs) {
          let last: number | null = null;
          run.forEach((puzzle, go) => {
            if (guess(go, go % SET, last) === placeOf(puzzle)) hits += 1;
            last = placeOf(puzzle);
          });
        }
        expect(hits / tries, `${places} places, ${name}`).toBeLessThan(allowed);
      }
    }
  }, 60000);
});

describe('the staircase', () => {
  it('starts with big four-tile critters with a face, two options and ↻ as a hint', () => {
    for (const puzzle of inWorld('spin')) {
      expect(puzzle.options).toHaveLength(2);
      expect(puzzle.big).toBe(true);
      expect(puzzle.helper).toBe('hint');
      expect(puzzle.target).toHaveLength(4);
      expect(puzzle.target.filter((tile) => tile.paint === FACE)).toHaveLength(1);
      expect(missLimit(puzzle)).toBe(Infinity);
    }
  });

  it('then three options turned a quarter or a half, wrong ones clearly other shapes, ↻ still there', () => {
    for (const puzzle of inWorld('turn')) {
      expect(puzzle.options).toHaveLength(3);
      expect(puzzle.helper).toBe('hint');
      expect([1, 2]).toContain(turnBetween(puzzle.target, puzzle.options[puzzle.answer]));
      expect(new Set(puzzle.slips.filter(Boolean))).toEqual(new Set(['shape']));
    }
    for (const puzzle of [...inWorld('spin'), ...inWorld('turn')]) expect(puzzle.slips).not.toContain('mirror');
  });

  it('then mirrors, with ↻ as a hint, then painted tiles with no ↻, then near twins of six or seven tiles', () => {
    for (const puzzle of inWorld('mirror')) {
      expect(puzzle.options).toHaveLength(4);
      expect(puzzle.helper).toBe('hint');
      expect(puzzle.slips).toContain('mirror');
    }
    for (const puzzle of inWorld('colour')) {
      expect(puzzle.options).toHaveLength(4);
      expect(puzzle.helper).toBe('none');
      expect([5, 6]).toContain(puzzle.target.length);
      expect(puzzle.target.some((tile) => (ACCENTS as readonly number[]).includes(tile.paint))).toBe(true);
      expect(puzzle.slips).toContain('mirror');
      expect(puzzle.slips.some((slip) => slip === 'moved' || slip === 'paint')).toBe(true);
    }
    for (const puzzle of inWorld('tricky')) {
      expect(puzzle.options).toHaveLength(5);
      expect(puzzle.helper).toBe('none');
      expect([6, 7]).toContain(puzzle.target.length);
      // No face to follow: only the outline and one gem.
      expect(puzzle.target.some((tile) => tile.paint === FACE)).toBe(false);
      for (const slip of puzzle.slips) expect([null, 'mirror', 'moved', 'paint']).toContain(slip);
    }
    expect(LEVELS.filter((level) => level.kind === 'pairs').map((level) => level.id)).toEqual([23, 24]);
  });

  const SETS = GOES / 2;
  const eyeOf = (puzzle: Puzzle) => (puzzle.kind === 'pairs' ? pairRivals(puzzle.options, puzzle.pair as [number, number]) : rivals(puzzle.target, puzzle.options, puzzle.answer));
  const wrongChoices = (puzzle: Puzzle) => (puzzle.kind === 'pairs' ? (puzzle.options.length * (puzzle.options.length - 1)) / 2 - 1 : puzzle.options.length - 1);

  it('lets the careless eye win every try of the early levels, never with three stars, and lose every try of the late ones', () => {
    for (const level of LEVELS) {
      const goal = carelessGoal(level.id);
      for (let set = 0; set < SETS; set += 1) {
        const puzzles = setFor(level.id, set);
        const each = puzzles.map(eyeOf);
        const least = each.reduce((sum, eye) => sum + eye.ahead, 0);
        const most = each.reduce((sum, eye) => sum + eye.ahead + eye.tied, 0);
        const where = `level ${level.id} set ${set}`;
        if (level.world === 'spin') continue;
        // Copying how the target lies costs a miss in every set past the first world.
        expect(least, where).toBeGreaterThanOrEqual(1);
        if (goal === 'wins') expect(most, where).toBeLessThan(missLimit(puzzles[0]));
        if (goal === 'loses') {
          expect(least, where).toBeGreaterThanOrEqual(missLimit(puzzles[0]));
          // It slips on every puzzle, and taking the least alike option is no trick either.
          for (const [at, eye] of each.entries()) {
            expect(eye.ahead, where).toBeGreaterThanOrEqual(1);
            expect(eye.ahead + eye.tied, where).toBeLessThan(wrongChoices(puzzles[at]));
          }
        }
      }
    }
    const early = LEVELS.filter((level) => level.id <= 12);
    expect(early.every((level) => carelessGoal(level.id) === 'wins')).toBe(true);
    expect(LEVELS.filter((level) => level.id > 12).every((level) => carelessGoal(level.id) === 'loses')).toBe(true);
  });

  it('makes about one set in eight a surprise, the same every time', () => {
    const all = LEVELS.flatMap((level) => Array.from({ length: 40 }, (_, set) => surpriseFor(level.id, set)));
    const share = all.filter(Boolean).length / all.length;
    expect(share).toBeGreaterThan(0.08);
    expect(share).toBeLessThan(0.18);
    expect(new Set(all.filter(Boolean))).toEqual(new Set(['golden', 'swimmer']));
    expect(surpriseFor(7, 3)).toBe(surpriseFor(7, 3));
  });

  it('makes guessing at random rarely win a late try', () => {
    // Taps in a random order: the chance a whole set of three is done within the miss limit.
    const chance = (options: number, limit: number): number => {
      let ways = [1];
      for (let puzzle = 0; puzzle < SET; puzzle += 1) {
        const next = new Array(ways.length + options - 1).fill(0);
        ways.forEach((p, misses) => {
          for (let more = 0; more < options; more += 1) next[misses + more] += p / options;
        });
        ways = next;
      }
      return ways.slice(0, limit).reduce((sum, p) => sum + p, 0);
    };
    expect(chance(3, 2)).toBeLessThan(0.15);
    expect(chance(4, 3)).toBeLessThan(0.35);
    expect(chance(5, 3)).toBeLessThan(0.17);
    // Ten pairs to pick from.
    expect(chance(10, 3)).toBeLessThan(0.02);
  });
});
