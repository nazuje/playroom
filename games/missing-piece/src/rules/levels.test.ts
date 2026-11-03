import { describe, expect, it } from 'vitest';
import { rivals } from './careless.ts';
import { ATTRS, cellKey, MIDDLE, TURNING_SHAPES } from './cells.ts';
import { carelessGoal, LEVEL_COUNT, LEVELS, levelFor, makeLevel, missLimit, puzzleKey, SET, setFor, shownFor, WORLDS, type Level } from './levels.ts';
import { fits, type Pattern } from './patterns.ts';
import { movingRules } from './play.ts';
import { brokenBy, gapValues, gridOf, solve } from './solve.ts';
import { SCALE, tuneFor } from './tune.ts';

const GOES = 20;
const everyGo: Level[] = LEVELS.flatMap((level) => Array.from({ length: GOES }, (_, go) => levelFor(level.id, go) as Level));
const wrongOf = (level: Level) => level.options.filter((_, at) => at !== level.answer);
const named = (level: Level) => `level ${level.id} go ${level.go}`;

describe('the patterns', () => {
  it('see rows, columns, once-each, steps and buttons', () => {
    expect(fits('shape', 'rows', [[1, 1], [2, 2]])).toBe(true);
    expect(fits('shape', 'cols', [[1, 2], [1, 2]])).toBe(true);
    expect(fits('shape', 'latin', [[0, 1, 2], [1, 2, 0], [2, 0, 1]])).toBe(true);
    expect(fits('shape', 'latin', [[0, 1, 2], [1, 2, 0], [2, 1, 0]])).toBe(false);
    expect(fits('count', 'across', [[1, 2, 3], [1, 2, 3], [1, 2, 3]])).toBe(true);
    expect(fits('count', 'across', [[1, 2, 3], [1, 2, 3], [1, 2, 2]])).toBe(false);
    // A quarter turn each step goes round: 3 turns on to 0.
    expect(fits('turn', 'across', [[1, 2, 3], [2, 3, 0], [3, 0, 1]])).toBe(true);
    // A shape in the middle is off the ring of corners.
    expect(fits('spot', 'across', [[0, 1, 2], [1, 2, 3], [2, 3, 4]])).toBe(false);
    expect(fits('marks', 'join', [[0b11, 0b100, 0b111]])).toBe(true);
    expect(fits('marks', 'cancel', [[0b11, 0b110, 0b101]])).toBe(true);
    expect(fits('marks', 'cancelDown' as Pattern, [[0b11], [0b110], [0b101]])).toBe(true);
  });
});

describe('every puzzle', () => {
  it('has 24 levels in 5 worlds, each opening with its idea', () => {
    expect(LEVEL_COUNT).toBe(24);
    expect([...new Set(LEVELS.map((level) => level.world))]).toEqual([...WORLDS]);
  });

  it('lets the visible patches allow exactly one value of every attribute, the answer', () => {
    for (const level of everyGo) {
      const shown = shownFor(level);
      const answer = level.cells[level.cells.length - 1];
      for (const attr of level.attrs) expect(gapValues(shown, attr), `${named(level)} ${attr}`).toEqual([answer[attr]]);
    }
  });

  it('has exactly one piece that fits every rule, and it is the answer', () => {
    for (const level of everyGo) {
      expect(solve(shownFor(level), level.options), named(level)).toEqual([level.answer]);
      expect(cellKey(level.options[level.answer])).toBe(cellKey(level.cells[level.cells.length - 1]));
    }
  });

  it('makes every wrong piece break exactly one rule, and differ from the answer in exactly that', () => {
    for (const level of everyGo) {
      const answer = level.options[level.answer];
      for (const piece of wrongOf(level)) {
        const broken = brokenBy(shownFor(level), piece);
        expect(broken, named(level)).toHaveLength(1);
        const differs = (Object.keys(ATTRS) as (keyof typeof ATTRS)[]).filter((attr) => piece[attr] !== answer[attr]);
        expect(differs).toEqual(broken);
      }
    }
  });

  it('never offers the same piece twice', () => {
    for (const level of everyGo) expect(new Set(level.options.map(cellKey)).size, named(level)).toBe(level.options.length);
  });

  it('explains every moving rule with the pattern the level meant', () => {
    const patternOf: Record<string, Pattern> = { rows: 'rows', cols: 'cols', latin: 'latin', across: 'across', down: 'down', join: 'join', cancel: 'cancel' };
    for (const level of everyGo) {
      const answer = level.cells[level.cells.length - 1];
      for (const attr of movingRules(level)) {
        expect(fits(attr, patternOf[level.laws[attr]], gridOf(shownFor(level), attr, answer[attr])), `${named(level)} ${attr}`).toBe(true);
      }
    }
  });

  it('only turns shapes that look different turned, and only moves a lone shape to a corner', () => {
    for (const level of everyGo) {
      for (const cell of [...level.cells, ...level.options]) {
        if (cell.turn !== 0) expect(TURNING_SHAPES).toContain(cell.shape);
        if (cell.spot !== MIDDLE) expect(cell.count).toBe(1);
      }
    }
  });

  it('is the same every time it is made, and every go is a fresh puzzle', () => {
    for (const level of LEVELS) {
      expect(puzzleKey(makeLevel(level.id, 3) as Level)).toBe(puzzleKey(levelFor(level.id, 3) as Level));
      const keys = Array.from({ length: GOES }, (_, go) => puzzleKey(levelFor(level.id, go) as Level));
      expect(new Set(keys).size, `level ${level.id}`).toBe(GOES);
    }
  });

  it('moves the right piece around the basket', () => {
    for (const level of LEVELS) {
      const places = new Set(Array.from({ length: GOES }, (_, go) => (levelFor(level.id, go) as Level).answer));
      expect(places.size, `level ${level.id}`).toBeGreaterThanOrEqual(3);
    }
  });
});

describe('the staircase', () => {
  const inWorld = (world: string) => everyGo.filter((level) => level.world === world);

  it('starts with a 2 by 2 grid, one rule and three big pieces', () => {
    for (const level of inWorld('match')) {
      expect(level.size).toBe(2);
      expect(level.options).toHaveLength(3);
      expect(level.big).toBe(true);
      expect(movingRules(level)).toHaveLength(1);
    }
  });

  it('then two rules, then steps, then once each, then the grown-up puzzles', () => {
    for (const level of inWorld('pair')) {
      expect(movingRules(level)).toHaveLength(2);
      expect(level.options.length).toBeGreaterThanOrEqual(3);
      expect(level.options.length).toBeLessThanOrEqual(4);
    }
    for (const level of inWorld('grow')) {
      expect(level.size).toBe(3);
      expect(level.options).toHaveLength(4);
      expect(movingRules(level).some((attr) => ['across', 'down'].includes(level.laws[attr]))).toBe(true);
    }
    for (const level of inWorld('once')) {
      expect(level.options).toHaveLength(5);
      expect(movingRules(level).some((attr) => level.laws[attr] === 'latin')).toBe(true);
    }
    for (const level of inWorld('tricky')) {
      expect(level.options).toHaveLength(6);
      const rules = movingRules(level);
      expect(rules.length >= 3 || rules.some((attr) => ['join', 'cancel'].includes(level.laws[attr]))).toBe(true);
    }
  });

  const SETS = GOES / 2;
  const slipsIn = (set: Level[]) => {
    const each = set.map((puzzle) => rivals(puzzle, wrongOf(puzzle)));
    // The fewest taps the careless eye can waste on the set, and the most, with ties going against it.
    return { least: each.reduce((sum, eye) => sum + eye.ahead, 0), most: each.reduce((sum, eye) => sum + eye.ahead + eye.tied, 0), each };
  };

  it('offers a piece that copies the patch beside or above the gap on every first-world puzzle', () => {
    for (const level of inWorld('match')) {
      const gap = level.cells.length - 1;
      const [attr] = movingRules(level);
      const neighbours = [level.cells[gap - 1][attr], level.cells[gap - level.size][attr]];
      const copies = wrongOf(level).filter((piece) => neighbours.includes(piece[attr]) && piece[attr] !== level.cells[gap][attr]);
      expect(copies.length, named(level)).toBeGreaterThanOrEqual(1);
    }
  });

  it('makes copying the neighbour cost a miss in every set past the first world, so careless play never earns three stars there', () => {
    for (const level of LEVELS.filter((one) => one.world !== 'match')) {
      for (let set = 0; set < SETS; set += 1) expect(slipsIn(setFor(level.id, set)).least, `level ${level.id} set ${set}`).toBeGreaterThanOrEqual(1);
    }
  });

  it('lets the careless eye win every try of the early levels and lose every try of the late ones', () => {
    for (const level of LEVELS) {
      const goal = carelessGoal(level.id);
      for (let set = 0; set < SETS; set += 1) {
        const puzzles = setFor(level.id, set);
        const { least, most, each } = slipsIn(puzzles);
        const where = `level ${level.id} set ${set}`;
        if (goal === 'wins') expect(most, where).toBeLessThan(missLimit(level));
        if (goal === 'loses') {
          // It runs out on the very first puzzle.
          expect(each[0].ahead, where).toBeGreaterThanOrEqual(missLimit(level));
          // Taking the piece least like the neighbour is no trick either.
          for (const [at, eye] of each.entries()) expect(eye.ahead + eye.tied, where).toBeLessThan(puzzles[at].options.length - 1);
        }
        if (goal === undefined && level.world !== 'match') expect(least, where).toBeGreaterThanOrEqual(missLimit(level));
      }
    }
    const early = LEVELS.filter((level) => level.world === 'match' || level.world === 'pair');
    expect(early.every((level) => carelessGoal(level.id) === 'wins')).toBe(true);
    expect(LEVELS.filter((level) => level.world === 'tricky' || level.world === 'once').every((level) => carelessGoal(level.id) !== 'wins')).toBe(true);
  });

  it('makes guessing at random rarely win a late try', () => {
    // Taps in a random order: the chance a whole set of three is done within the miss limit.
    const chance = (options: number, limit: number): number => {
      // Misses on one puzzle are 0 to options - 1, each as likely.
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
    expect(chance(6, 3)).toBeLessThan(0.1);
    expect(chance(5, 3)).toBeLessThan(0.17);
    expect(chance(4, 3)).toBeLessThan(0.35);
  });
});

describe('the tune', () => {
  it('plays one note per patch, the same along a row of one shape, climbing as counts grow', () => {
    for (const level of everyGo) {
      const tune = tuneFor(level);
      expect(tune).toHaveLength(level.cells.length);
      for (const step of tune) expect(SCALE[step]).toBeGreaterThan(0);
    }
    const rows = levelFor(1, 0) as Level;
    const [a, b, c, d] = tuneFor(rows);
    expect(a).toBe(b);
    expect(c).toBe(d);
    expect(a).not.toBe(c);
    const counts = everyGo.find((level) => level.laws.count === 'across' && movingRules(level).length === 2) as Level;
    const first = tuneFor(counts).slice(0, 3);
    const climbing = counts.cells[0].count < counts.cells[2].count;
    expect(climbing ? first[0] < first[2] : first[0] > first[2]).toBe(true);
  });
});
