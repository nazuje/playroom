import { describe, expect, it } from 'vitest';
import { fruitsIn, holds, loneFruit, picture, rowPicture, sumOf, termWorth, type Puzzle } from './equation.ts';
import { ALL_VARIANTS, buildLevels, EVERY_PUZZLE, levelFor, LEVELS, MOST, PICKER, questionValue, readTemplate, temptingFor, VARIANTS, WORLDS } from './levels.ts';
import { assignments, nextStep, plan, SEARCH_TOP, solutions } from './solve.ts';

const pictureOf = (puzzle: Puzzle): string => [...puzzle.clues.map(rowPicture), `${picture(puzzle.question)}=?`].join(' | ');
const picker = EVERY_PUZZLE.filter((level) => level.answer === 'picker');

describe('the rows', () => {
  it('reads templates with bunches, times and take-away', () => {
    expect(readTemplate('A+A')).toEqual([
      { letter: 'A', shape: 'one', count: 1, sign: 1 },
      { letter: 'A', shape: 'one', count: 1, sign: 1 },
    ]);
    expect(readTemplate('b3A-B')).toEqual([
      { letter: 'A', shape: 'bunch', count: 3, sign: 1 },
      { letter: 'B', shape: 'one', count: 1, sign: -1 },
    ]);
    expect(readTemplate('x2A+B')[0]).toEqual({ letter: 'A', shape: 'times', count: 2, sign: 1 });
    expect(() => readTemplate('-A')).toThrow();
    expect(() => readTemplate('A*B')).toThrow();
  });

  it('adds up pictures only once every fruit in them is known', () => {
    const terms = [
      { fruit: 'banana' as const, shape: 'bunch' as const, count: 3, sign: 1 as const },
      { fruit: 'pear' as const, shape: 'one' as const, count: 1, sign: -1 as const },
    ];
    expect(sumOf(terms, { banana: 2 })).toBeNull();
    expect(sumOf(terms, { banana: 2, pear: 1 })).toBe(5);
    expect(termWorth(terms[0], 2)).toBe(6);
    expect(picture(terms)).toBe('3bananas-pear');
  });
});

describe('the staircase', () => {
  it('has 24 levels in five worlds, in order', () => {
    expect(LEVELS.map((level) => level.id)).toEqual(Array.from({ length: 24 }, (_, at) => at + 1));
    expect([...new Set(LEVELS.map((level) => level.world))]).toEqual(WORLDS);
    for (let at = 1; at < LEVELS.length; at += 1) {
      expect(WORLDS.indexOf(LEVELS[at].world)).toBeGreaterThanOrEqual(WORLDS.indexOf(LEVELS[at - 1].world));
    }
  });

  it('makes the same levels every time', () => {
    expect(buildLevels()).toEqual(ALL_VARIANTS);
    expect(pictureOf(LEVELS[0].puzzle)).toBe('apple+apple=4 | apple=?');
    expect(pictureOf(LEVELS[4].puzzle)).toBe('apple+apple=6 | apple+banana=4 | banana=?');
  });

  it('gives every level fresh puzzles of the same shape for retries and replays', () => {
    for (const variants of ALL_VARIANTS) {
      expect(variants).toHaveLength(VARIANTS);
      const shapes = variants.map((level) => level.puzzle.clues.map((row) => row.terms.map((term) => `${term.shape}${term.count}${term.sign}`).join()).join('|'));
      expect(new Set(shapes).size).toBe(1);
      expect(new Set(variants.map((level) => pictureOf(level.puzzle))).size).toBe(VARIANTS);
      expect(new Set(variants.map((level) => level.id)).size).toBe(1);
      expect(variants.map((level) => level.variant)).toEqual(Array.from({ length: VARIANTS }, (_, at) => at));
    }
    expect(levelFor(3, 0)).toBe(LEVELS[2]);
    expect(levelFor(3, VARIANTS + 1)).toBe(ALL_VARIANTS[2][1]);
  });

  it('starts each world with something quick and builds to three fruits with times and take-away', () => {
    const firsts = WORLDS.map((world) => LEVELS.find((level) => level.world === world)!);
    expect(firsts.map((level) => level.puzzle.clues.length)).toEqual([1, 2, 3, 2, 2]);
    const last = LEVELS.at(-1)!;
    expect(new Set(last.puzzle.clues.flatMap((row) => fruitsIn(row.terms))).size).toBe(3);
    expect(last.puzzle.clues.some((row) => row.terms.some((term) => term.shape === 'times'))).toBe(true);
    expect(last.puzzle.clues.some((row) => row.terms.some((term) => term.sign < 0))).toBe(true);
  });

  it('keeps every number from 0 to 20 and every row short enough for a phone', () => {
    for (const level of EVERY_PUZZLE) {
      for (const value of Object.values(level.values)) {
        expect(value).toBeGreaterThanOrEqual(0);
        expect(value).toBeLessThanOrEqual(MOST);
      }
      for (const row of level.puzzle.clues) {
        expect(row.total, `level ${level.id}`).toBeGreaterThanOrEqual(0);
        expect(row.total).toBeLessThanOrEqual(MOST);
        expect(row.terms.length).toBeLessThanOrEqual(3);
        // A bunch or a "2 ×" picture is wider, so a row holds at most one of them next to one more fruit.
        if (row.terms.some((term) => term.shape !== 'one')) expect(row.terms.length).toBeLessThanOrEqual(2);
      }
      expect(questionValue(level)).toBeLessThanOrEqual(MOST);
      expect(level.puzzle.clues.length + 1).toBeGreaterThanOrEqual(2);
      expect(level.puzzle.clues.length + 1).toBeLessThanOrEqual(4);
    }
  });

  it('caps every fruit well inside the search, so finding one answer there proves there is only one', () => {
    for (const level of EVERY_PUZZLE) {
      const caps = new Map<string, number>();
      // An all-plus row caps each fruit in it. In a row that takes away, the fruits added are capped by the total plus
      // the most the others can be, and the fruits taken away by the most the added ones can be, less the total.
      for (let pass = 0; pass < 3; pass += 1) {
        for (const row of level.puzzle.clues) {
          const plus = row.terms.filter((term) => term.sign > 0);
          const minus = row.terms.filter((term) => term.sign < 0);
          const cap = (fruit: string, most: number): void => {
            caps.set(fruit, Math.min(caps.get(fruit) ?? Infinity, most));
          };
          const capped = (terms: typeof plus): number | null =>
            terms.every((term) => caps.has(term.fruit)) ? terms.reduce((sum, term) => sum + term.count * (caps.get(term.fruit) as number), 0) : null;
          if (!minus.length) for (const term of plus) cap(term.fruit, row.total / term.count);
          const takenMost = capped(minus);
          if (minus.length && plus.length === 1 && takenMost !== null) cap(plus[0].fruit, (row.total + takenMost) / plus[0].count);
          const addedMost = capped(plus);
          if (addedMost !== null) for (const term of minus) cap(term.fruit, (addedMost - row.total) / term.count);
        }
      }
      for (const fruit of new Set(level.puzzle.clues.flatMap((row) => fruitsIn(row.terms)))) {
        expect(caps.get(fruit), `level ${level.id} ${fruit}`).toBeLessThanOrEqual(SEARCH_TOP);
      }
      for (const fruit of fruitsIn(level.puzzle.question)) expect(caps.has(fruit)).toBe(true);
    }
  });

  it('gives every puzzle exactly one whole-number answer, the one the level expects', () => {
    for (const level of EVERY_PUZZLE) {
      const found = solutions(level.puzzle);
      expect(found, `level ${level.id}`).toHaveLength(1);
      expect(found[0]).toEqual(level.values);
      for (const row of level.puzzle.clues) expect(holds(row, level.values)).toBe(true);
    }
  });

  it('gives different fruits different numbers', () => {
    for (const level of EVERY_PUZZLE) {
      const values = Object.values(level.values);
      expect(new Set(values).size).toBe(values.length);
    }
  });

  it('can be worked out one fruit at a time, ending with the question', () => {
    for (const level of EVERY_PUZZLE) {
      const steps = plan(level.puzzle);
      expect(steps.at(-1)).toEqual({ kind: 'question', value: questionValue(level), rows: [] });
      for (const step of steps) if (step.kind === 'fruit') expect(step.value).toBe(level.values[step.fruit]);
    }
  });

  it('never lets two rows on their own look settled when they are not', () => {
    for (const level of EVERY_PUZZLE) {
      const known = {};
      const step = nextStep(level.puzzle, known);
      if (step?.kind !== 'fruit') continue;
      const rows = step.rows.map((at) => level.puzzle.clues[at]);
      const found = assignments(rows, known);
      expect(found.every((values) => values[step.fruit] === step.value)).toBe(true);
    }
  });

  it('makes the code breakers compare rows: no row there has only one fruit to find', () => {
    for (const level of EVERY_PUZZLE.filter((one) => one.world === 'system')) {
      for (const row of level.puzzle.clues) expect(fruitsIn(row.terms).length, `level ${level.id}`).toBeGreaterThanOrEqual(2);
      expect(nextStep(level.puzzle, {})?.rows.length).toBeGreaterThanOrEqual(2);
    }
  });

  it('counts pictures fairly: a bunch is worth each fruit in it', () => {
    const counting = EVERY_PUZZLE.filter((level) => level.world === 'count');
    expect(counting.some((level) => level.puzzle.clues.some((row) => row.terms.some((term) => term.shape === 'bunch')))).toBe(true);
    expect(counting.some((level) => level.puzzle.clues.some((row) => row.terms.some((term) => term.sign < 0)))).toBe(true);
  });
});

describe('the number buttons', () => {
  it('offers three different numbers for every fruit and the question on the early levels, one of them right', () => {
    for (const level of EVERY_PUZZLE.filter((one) => one.answer === 'three')) {
      const lone = loneFruit(level.puzzle);
      for (const [target, choices] of Object.entries(level.choices)) {
        const truth = target === 'question' ? questionValue(level) : level.values[target as keyof typeof level.values];
        expect(new Set(choices).size, `level ${level.id} ${target}`).toBe(3);
        expect(choices).toContain(truth);
        expect([...choices!].sort((a, b) => a - b)).toEqual(choices);
      }
      if (lone) expect(level.choices.question).toEqual(level.choices[lone]);
    }
  });

  it('offers 0 to 20 later, where copying a number from the board is never right', () => {
    for (const level of picker) {
      expect(level.choices.question).toEqual(PICKER);
      for (const row of level.puzzle.clues) expect(Math.abs(row.total - questionValue(level))).toBeGreaterThanOrEqual(3);
      expect(Math.abs(temptingFor(level.puzzle, fruitsIn(level.puzzle.question)) - questionValue(level))).toBeGreaterThanOrEqual(3);
    }
  });
});
