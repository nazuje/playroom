import { describe, expect, it } from 'vitest';
import {
  ALL_VARIANTS,
  buildLevels,
  EVERY_PUZZLE,
  FAR_FROM_GIVEN,
  KID_RULES,
  levelFor,
  LEVELS,
  MIDDLE_MOST,
  MOST,
  PICKER,
  shownNumbers,
  temptingFor,
  VARIANTS,
  WORLDS,
  type Level,
} from './levels.ts';
import { apply, fits, fitsEach, hiddenSlot, isRuleAsk, readRule, ruleKey, ruleText, run, sameRule, steps, withRule, type Puzzle } from './machine.ts';
import { answerKeys, inputsFor, machinesFitting, rulesFor, UNIVERSE } from './solve.ts';

const pictureOf = (puzzle: Puzzle): string =>
  [
    puzzle.machines.map((rule, at) => (puzzle.open[at] ? ruleText(rule) : '?')).join(' '),
    puzzle.examples.map((pair) => `${pair.from}>${pair.to}`).join(' '),
    `${puzzle.ask} ${puzzle.given ?? ''}`.trim(),
  ].join(' | ');

const truthKey = (level: Level): string => (typeof level.truth === 'number' ? String(level.truth) : ruleKey(level.truth));
const firstOf = (world: string): Level => LEVELS.find((level) => level.world === world) as Level;

describe('the machines', () => {
  it('reads rules and runs them on whole numbers only', () => {
    expect(readRule('+2')).toEqual({ op: 'add', n: 2 });
    expect(readRule('x3')).toEqual({ op: 'mul', n: 3 });
    expect(() => readRule('*2')).toThrow();
    expect(apply(readRule('-3'), 2)).toBeNull();
    expect(apply(readRule('/2'), 7)).toBeNull();
    expect(apply(readRule('/2'), 8)).toBe(4);
    expect(run([readRule('x2'), readRule('+1')], 3)).toBe(7);
    expect(run([readRule('+3'), readRule('x2')], 3)).toBe(12);
    expect(steps([readRule('-5'), readRule('x2')], 3)).toEqual([3]);
    expect(run([readRule('-5'), readRule('x2')], 3)).toBeNull();
    expect(ruleText(readRule('-1'))).toBe('−1');
  });

  it('checks a rule card against every example', () => {
    const examples = [
      { from: 2, to: 4 },
      { from: 3, to: 6 },
    ];
    expect(fitsEach([readRule('x2')], examples)).toEqual([true, true]);
    expect(fitsEach([readRule('+2')], examples)).toEqual([true, false]);
    expect(withRule([readRule('x2'), readRule('+1')], 1, readRule('-3')).map(ruleText)).toEqual(['×2', '−3']);
  });

  it('runs backwards by searching, and finds no input or one', () => {
    expect(inputsFor([readRule('+3')], 7)).toEqual([4]);
    expect(inputsFor([readRule('/2')], 5)).toEqual([10]);
    expect(inputsFor([readRule('x2')], 7)).toEqual([]);
  });

  it('finds every rule that fits, not only the ones the game uses', () => {
    const puzzle: Puzzle = { machines: [readRule('x2')], open: [false], examples: [{ from: 2, to: 4 }], ask: 'out', given: 5 };
    // One example is not enough: plus two and double both make 2 into 4.
    expect(answerKeys(puzzle).sort()).toEqual(['10', '7']);
    puzzle.examples.push({ from: 3, to: 6 });
    expect(answerKeys(puzzle)).toEqual(['10']);
    expect(rulesFor(puzzle, 0)).toEqual(['mul2']);
    expect(UNIVERSE.length).toBe(48);
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
    expect(pictureOf(LEVELS[0].puzzle)).toBe('? | 1>2 6>7 | out 8');
    expect(LEVELS[0].numbers).toEqual([8, 9, 11]);
  });

  it('gives every level fresh puzzles of the same shape for retries and replays', () => {
    for (const variants of ALL_VARIANTS) {
      expect(variants).toHaveLength(VARIANTS);
      const shapes = variants.map((level) => `${level.answer} ${level.puzzle.ask} ${level.puzzle.open} ${level.puzzle.examples.length}`);
      expect(new Set(shapes).size).toBe(1);
      expect(new Set(variants.map((level) => pictureOf(level.puzzle) + level.puzzle.machines.map(ruleKey))).size).toBe(VARIANTS);
      expect(variants.map((level) => level.variant)).toEqual(Array.from({ length: VARIANTS }, (_, at) => at));
    }
    expect(levelFor(3, 0)).toBe(LEVELS[2]);
    expect(levelFor(3, VARIANTS + 1)).toBe(ALL_VARIANTS[2][1]);
  });

  it('teaches one idea per world, from adding to two machines run backwards', () => {
    expect(WORLDS.map((world) => firstOf(world).puzzle.ask)).toEqual(['out', 'out', 'out', 'in', 'out']);
    expect(WORLDS.map((world) => firstOf(world).answer)).toEqual(['three', 'three', 'picker', 'three', 'picker']);
    const opsIn = (world: string): string[] => [
      ...new Set(EVERY_PUZZLE.filter((level) => level.world === world).flatMap((level) => level.puzzle.machines.map((rule) => rule.op))),
    ];
    expect(opsIn('add')).toEqual(['add']);
    expect(opsIn('take').sort()).toEqual(['add', 'mul', 'sub']);
    expect(EVERY_PUZZLE.some((level) => level.world === 'mix' && level.puzzle.machines.some((rule) => rule.op === 'div'))).toBe(true);
    expect(EVERY_PUZZLE.filter((level) => level.world === 'back').map((level) => level.puzzle.ask)).toContain('fix');
    for (const level of EVERY_PUZZLE) expect(level.puzzle.machines.length).toBe(level.world === 'chain' ? 2 : 1);
    const last = ALL_VARIANTS.at(-1) as Level[];
    for (const level of last) {
      expect(level.puzzle.ask).toBe('in');
      expect(level.puzzle.open).toEqual([false, false]);
      expect(level.puzzle.machines.some((rule) => rule.op === 'mul' || rule.op === 'div')).toBe(true);
    }
  });

  it('keeps every number on screen from 0 to 20, and inside a chain within 40', () => {
    for (const level of EVERY_PUZZLE) {
      for (const value of shownNumbers(level.puzzle)) {
        expect(value, `level ${level.id}`).toBeGreaterThanOrEqual(0);
        expect(value).toBeLessThanOrEqual(MOST);
      }
      if (typeof level.truth === 'number') expect(PICKER).toContain(level.truth);
      for (const pair of level.puzzle.examples) {
        expect(pair.from).not.toBe(pair.to);
        for (const value of steps(level.puzzle.machines, pair.from)) expect(value).toBeLessThanOrEqual(MIDDLE_MOST);
      }
      expect(level.puzzle.examples.length).toBeGreaterThanOrEqual(1);
      expect(level.puzzle.examples.length).toBeLessThanOrEqual(3);
      for (const rule of level.puzzle.machines) expect(KID_RULES.some((kid) => sameRule(kid, rule))).toBe(true);
    }
  });

  it('makes every example true', () => {
    for (const level of EVERY_PUZZLE) for (const pair of level.puzzle.examples) expect(fits(level.puzzle.machines, pair)).toBe(true);
  });

  it('gives every puzzle exactly one answer among 48 possible rules per machine, the one the level expects', () => {
    for (const level of EVERY_PUZZLE) {
      expect(answerKeys(level.puzzle), `level ${level.id}.${level.variant}`).toEqual([truthKey(level)]);
      const shut = level.puzzle.open.flatMap((open, at) => (open ? [] : [at]));
      // A lone shut plate hides exactly one rule, so the rule it shows when solved is the only one.
      if (shut.length === 1) expect(rulesFor(level.puzzle, shut[0])).toEqual([ruleKey(level.puzzle.machines[shut[0]])]);
      expect(machinesFitting(level.puzzle).some((chain) => chain.every((rule, at) => sameRule(rule, level.puzzle.machines[at])))).toBe(true);
    }
  });

  it('answers backwards questions with the one input that makes the number', () => {
    for (const level of EVERY_PUZZLE.filter((one) => one.puzzle.ask === 'in')) {
      expect(inputsFor(level.puzzle.machines, level.puzzle.given as number)).toEqual([level.truth]);
    }
  });

  it('never lets copying a number on screen be right', () => {
    for (const level of EVERY_PUZZLE) {
      if (typeof level.truth !== 'number') continue;
      expect(shownNumbers(level.puzzle), `level ${level.id}.${level.variant}`).not.toContain(level.truth);
      if (level.answer === 'picker') {
        expect(Math.abs(level.truth - (temptingFor(level.puzzle) as number))).toBeGreaterThanOrEqual(FAR_FROM_GIVEN);
      }
    }
  });

  it('shows at least two examples wherever a rule is hidden, since one pair like 2 to 4 fits both plus two and double', () => {
    for (const level of EVERY_PUZZLE) {
      if (level.puzzle.open.every(Boolean)) continue;
      expect(level.puzzle.examples.length, `level ${level.id}`).toBeGreaterThanOrEqual(2);
    }
  });
});

describe('the grown-up end', () => {
  const last = ALL_VARIANTS.slice(-3).flat();

  it('runs two machines backwards, the second hidden and then both', () => {
    expect(ALL_VARIANTS[22].every((level) => level.puzzle.ask === 'in' && level.puzzle.open.join() === 'true,false')).toBe(true);
    expect(ALL_VARIANTS[23].every((level) => level.puzzle.ask === 'in' && level.puzzle.open.join() === 'false,false')).toBe(true);
    expect(ALL_VARIANTS[23].every((level) => level.puzzle.examples.length === 2)).toBe(true);
  });

  it('beats the shortcut: no single rule explains the examples on the last three levels', () => {
    for (const level of last) {
      expect(UNIVERSE.some((rule) => fitsEach([rule], level.puzzle.examples).every(Boolean)), `level ${level.id}.${level.variant}`).toBe(false);
    }
  });

  it('needs both examples on the last level: either one alone allows other answers', () => {
    for (const level of ALL_VARIANTS[23]) {
      for (const pair of level.puzzle.examples) {
        expect(answerKeys({ ...level.puzzle, examples: [pair] }).length, `level 24.${level.variant}`).toBeGreaterThan(1);
      }
    }
  });
});

describe('the answers on offer', () => {
  it('offers three different numbers on the early levels: the right one, the copy, and a real slip', () => {
    for (const level of EVERY_PUZZLE.filter((one) => one.answer === 'three')) {
      expect(new Set(level.numbers).size, `level ${level.id}`).toBe(3);
      expect(level.numbers).toContain(level.truth);
      expect(level.numbers).toContain(level.puzzle.given);
      expect([...level.numbers].sort((a, b) => a - b)).toEqual(level.numbers);
      for (const value of level.numbers) expect(PICKER).toContain(value);
      if (level.puzzle.ask === 'in') expect(level.numbers).toContain(run(level.puzzle.machines, level.puzzle.given as number));
    }
  });

  it('offers 0 to 20 later', () => {
    for (const level of EVERY_PUZZLE.filter((one) => one.answer === 'picker')) expect(level.numbers).toEqual(PICKER);
  });

  it('offers three different rule cards with exactly one that fits every example', () => {
    for (const level of EVERY_PUZZLE.filter((one) => one.answer === 'cards')) {
      expect(isRuleAsk(level.puzzle.ask)).toBe(true);
      expect(new Set(level.cards.map(ruleKey)).size).toBe(3);
      const slot = hiddenSlot(level.puzzle);
      const working = level.cards.filter((card) => fitsEach(withRule(level.puzzle.machines, slot, card), level.puzzle.examples).every(Boolean));
      expect(working).toEqual([level.truth]);
    }
  });

  it('puts the right card in every place across a level, so its place gives nothing away', () => {
    for (const variants of ALL_VARIANTS.filter((list) => list[0].answer === 'cards')) {
      const places = new Set(variants.map((level) => level.cards.findIndex((card) => sameRule(card, level.truth as never))));
      expect(places.size).toBeGreaterThanOrEqual(2);
    }
  });

  it('makes fixing a machine a real check: every wrong part gets some example right', () => {
    for (const level of EVERY_PUZZLE.filter((one) => one.puzzle.ask === 'fix')) {
      const wrong = level.cards.filter((card) => !sameRule(card, level.truth as never));
      for (const card of wrong) expect(fitsEach([card], level.puzzle.examples).some(Boolean), `level ${level.id}.${level.variant}`).toBe(true);
    }
  });
});
