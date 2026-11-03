import { describe, expect, it } from 'vitest';
import { allItems, describe as picture, difference, openMystery, tapItem, type Board } from './board.ts';
import { boardFor, buildLevels, LEVELS, levelFor, MOST_ANSWER, MOST_WEIGHT, trayMakes, WORLDS, type Level } from './levels.ts';
import { balanced, peakSideCount, readOff, solutions, stepsTo } from './solve.ts';

const MOST_ON_A_SIDE = 6;
const asking = LEVELS.filter((level) => level.ask.length > 0);
const levelBoards = LEVELS.filter((level) => level.ask.length === 0);

describe('the staircase', () => {
  it('has 24 levels in five worlds, in order', () => {
    expect(LEVELS.map((level) => level.id)).toEqual(Array.from({ length: 24 }, (_, at) => at + 1));
    const worlds = [...new Set(LEVELS.map((level) => level.world))];
    expect(worlds).toEqual(WORLDS);
    for (let at = 1; at < LEVELS.length; at += 1) {
      expect(WORLDS.indexOf(LEVELS[at].world)).toBeGreaterThanOrEqual(WORLDS.indexOf(LEVELS[at - 1].world));
    }
  });

  it('makes the same levels every time', () => {
    expect(buildLevels()).toEqual(LEVELS);
    expect(picture(boardFor(LEVELS[0]).seesaws[0])).toBe('box+1=5');
    expect(picture(boardFor(LEVELS[23]).seesaws[1])).toBe('hat+box+3=hat+hat+6');
  });

  it('keeps every weight, answer and stack within what the screen shows', () => {
    for (const level of LEVELS) {
      for (const plan of level.seesaws) {
        for (const token of [...plan.left, ...plan.right]) {
          if (typeof token === 'number') expect(token).toBeGreaterThanOrEqual(1);
          if (typeof token === 'number') expect(token).toBeLessThanOrEqual(MOST_WEIGHT);
        }
        expect(plan.left.length).toBeLessThanOrEqual(MOST_ON_A_SIDE);
        expect(plan.right.length).toBeLessThanOrEqual(MOST_ON_A_SIDE);
      }
      for (const value of Object.values(level.values)) {
        expect(value).toBeGreaterThanOrEqual(1);
        expect(value).toBeLessThanOrEqual(MOST_ANSWER);
      }
    }
  });

  it('gives every puzzle exactly one whole-number answer, the one the level expects', () => {
    for (const level of asking) {
      const found = solutions(level);
      expect(found, `level ${level.id}`).toHaveLength(1);
      expect(found[0]).toEqual(level.values);
      expect(balanced(boardFor(level), level.values)).toBe(true);
    }
  });

  it('offers three different numbers, one of them right, while the picker offers 0 to 20', () => {
    for (const level of asking) {
      if (level.answer === 'three') {
        expect(new Set(level.choices).size).toBe(3);
        expect(level.choices).toContain(level.values[level.ask[0]]);
        expect(level.choices.every((n) => n >= 1)).toBe(true);
      } else {
        expect(level.answer).toBe('picker');
        expect(level.choices).toEqual(Array.from({ length: MOST_ANSWER + 1 }, (_, n) => n));
      }
    }
  });

  it('starts the first worlds with three choices and ends on the picker', () => {
    expect(LEVELS.filter((level) => level.world === 'box').every((level) => level.answer === 'three')).toBe(true);
    expect(LEVELS.filter((level) => level.world === 'two' || level.world === 'both').every((level) => level.answer === 'picker')).toBe(true);
  });

  it('can always be worked out with taps alone, every mystery in the order it is asked', () => {
    for (const level of asking) {
      let board: Board = boardFor(level);
      for (const mystery of level.ask) {
        const steps = stepsTo(board, mystery);
        expect(steps, `level ${level.id} ${mystery}`).not.toBeNull();
        for (const id of steps ?? []) {
          board = tapItem(board, id, { fixedGiven: false }).board;
          expect(balanced(board, level.values)).toBe(true);
        }
        expect(readOff(board, mystery)).toBe(level.values[mystery]);
        board = openMystery(board, mystery, level.values[mystery] as number);
      }
    }
  });

  it('needs more thinking further up: the last world takes the most taps', () => {
    const taps = (id: number) => stepsTo(boardFor(LEVELS[id - 1]), LEVELS[id - 1].ask[0])?.length ?? 0;
    expect(taps(1)).toBe(1);
    expect(taps(24)).toBeGreaterThanOrEqual(4);
    expect(taps(19)).toBeGreaterThanOrEqual(3);
  });

  it('puts two seesaws only in the last world, with a box and a hat', () => {
    for (const level of LEVELS) {
      expect(level.seesaws.length).toBe(level.world === 'two' ? 2 : 1);
      if (level.world === 'two') expect([...level.ask].sort()).toEqual(['box', 'hat']);
    }
  });
});

describe('"make it level" boards', () => {
  it('start tipped away from the open side, and the tray can level them', () => {
    expect(levelBoards.map((level) => level.world)).toEqual(['level', 'level', 'level', 'level']);
    for (const level of levelBoards) {
      const board = boardFor(level);
      const lean = difference(board.seesaws[0], {});
      const need = level.open === 'right' ? -lean : lean;
      expect(need, `level ${level.id}`).toBeGreaterThan(0);
      expect(trayMakes(level.tray, need)).not.toBeNull();
      expect(new Set(level.tray).size).toBe(level.tray.length);
    }
  });

  it('teaches with one matching weight first, then sums', () => {
    const [first, ...rest] = levelBoards;
    const need = (level: typeof first) => Math.abs(difference(boardFor(level).seesaws[0], {}));
    expect(first.tray).toContain(need(first));
    for (const level of rest) expect(level.tray).not.toContain(need(level));
  });
});

describe('every tap keeps a level seesaw level', () => {
  it('holds for any order of taps on every level', () => {
    for (const level of asking) {
      let board = boardFor(level);
      let turn = level.id;
      for (let tapCount = 0; tapCount < 30; tapCount += 1) {
        const items = allItems(board);
        if (!items.length) break;
        turn = (turn * 31 + 7) % 9973;
        board = tapItem(board, items[turn % items.length].id, { fixedGiven: false }).board;
        expect(balanced(board, level.values), `level ${level.id}`).toBe(true);
      }
    }
  });
});

describe('every try gets a fresh puzzle of the same shape', () => {
  const VARIANTS = 25;
  const mysteriesOn = (plan: Level['seesaws'][number]) =>
    [plan.left, plan.right].map((side) => side.filter((token) => typeof token === 'string').sort().join('+'));
  const tries = (level: Level): Level[] => Array.from({ length: VARIANTS }, (_, variant) => levelFor(level.id, variant) as Level);

  it('meets the first puzzle as it always was, and later tries differ', () => {
    for (const level of LEVELS) {
      expect(levelFor(level.id, 0)).toBe(level);
      const kinds = new Set(tries(level).map((one) => JSON.stringify([one.seesaws, one.choices, one.tray])));
      // The smallest tray level has only a couple of ways to be made, and 3 boxes = 18 a handful.
      expect(kinds.size, `level ${level.id}`).toBeGreaterThanOrEqual(level.id === 6 ? 2 : 4);
      expect(levelFor(level.id, 7)).toEqual(levelFor(level.id, 7));
    }
  });

  it('keeps one whole answer, the same shape, and room on the screen for every try', () => {
    for (const level of LEVELS) {
      for (const one of tries(level)) {
        const where = `level ${one.id} try ${one.variant}`;
        expect(one.world).toBe(level.world);
        expect(one.answer).toBe(level.answer);
        expect(one.seesaws.map(mysteriesOn), where).toEqual(level.seesaws.map(mysteriesOn));
        expect(one.open).toBe(level.open);
        expect(peakSideCount(one), where).toBeLessThanOrEqual(MOST_ON_A_SIDE);
        for (const value of Object.values(one.values)) expect(value).toBeLessThanOrEqual(MOST_ANSWER);
        if (!one.ask.length) {
          const lean = difference(boardFor(one).seesaws[0], {});
          expect(trayMakes(one.tray, one.open === 'right' ? -lean : lean), where).not.toBeNull();
          continue;
        }
        expect(solutions(one), where).toEqual([one.values]);
        if (one.answer === 'three') expect(one.choices).toContain(one.values.box);
        let board = boardFor(one);
        for (const mystery of one.ask) {
          const steps = stepsTo(board, mystery);
          expect(steps, where).not.toBeNull();
          for (const id of steps ?? []) board = tapItem(board, id, { fixedGiven: false }).board;
          expect(readOff(board, mystery), where).toBe(one.values[mystery]);
          board = openMystery(board, mystery, one.values[mystery] as number);
        }
      }
    }
  });

  it('keeps the last world to two rows of two on a phone while it is worked out', () => {
    for (const level of LEVELS.filter((one) => one.world === 'two')) {
      for (const one of tries(level)) expect(peakSideCount(one), `level ${one.id} try ${one.variant}`).toBeLessThanOrEqual(4);
    }
  });
});

describe('where the right number sits in a row of three', () => {
  const TRIES = 300;
  const threeLevels = LEVELS.filter((level) => level.answer === 'three');
  /** Every three-choice puzzle in the order a child would meet them: each level's tries, level by level. */
  const places = threeLevels.flatMap((level) =>
    Array.from({ length: TRIES }, (_, variant) => {
      const one = levelFor(level.id, variant) as Level;
      return one.choices.indexOf(one.values.box as number);
    }),
  );

  it('always shows the tempting wrong number and puts the answer first, middle and last about equally', () => {
    for (const level of threeLevels) {
      const counts = [0, 0, 0];
      for (let variant = 0; variant < TRIES; variant += 1) {
        const one = levelFor(level.id, variant) as Level;
        counts[one.choices.indexOf(one.values.box as number)] += 1;
      }
      for (const count of counts) expect(count / TRIES, `level ${level.id}: ${counts}`).toBeGreaterThan(0.25);
      for (const count of counts) expect(count / TRIES, `level ${level.id}: ${counts}`).toBeLessThan(0.42);
    }
  });

  it('lets no fixed way of tapping beat chance by more than 1.3 times', () => {
    const chance = 1 / 3;
    const strategies: Record<string, (at: number) => number> = {
      'always first': () => 0,
      'always middle': () => 1,
      'always last': () => 2,
      cycle: (at) => at % 3,
      'reverse cycle': (at) => 2 - (at % 3),
      'same as last puzzle': (at) => (at === 0 ? 0 : places[at - 1]),
      'avoid the last two places': (at) => {
        if (at < 2) return 0;
        const recent = [places[at - 1], places[at - 2]];
        return [0, 1, 2].find((place) => !recent.includes(place)) ?? (places[at - 1] + 1) % 3;
      },
    };
    for (const [name, pick] of Object.entries(strategies)) {
      const wins = places.filter((place, at) => pick(at) === place).length;
      expect(wins / places.length / chance, name).toBeLessThan(1.3);
    }
  });
});
