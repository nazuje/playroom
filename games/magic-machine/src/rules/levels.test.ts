import { describe, expect, it } from 'vitest';
import {
  ALL_VARIANTS,
  bestStrategy,
  buildLevel,
  buildLevels,
  MOST_OVER_CHANCE,
  EVERY_PUZZLE,
  FAR_FROM_GIVEN,
  KID_RULES,
  levelFor,
  LEVELS,
  MIDDLE_MOST,
  MOST,
  PICKER,
  SHIFT,
  SHIFTS,
  shiftFor,
  shownNumbers,
  trapsFor,
  temptingFor,
  VARIANTS,
  WORLDS,
  type Level,
} from './levels.ts';
import { apply, cardKey, fits, fitsEach, hiddenSlots, isRuleAsk, readRule, ruleKey, ruleText, run, sameCard, sameRule, steps, withCard, withRule, type Card, type Puzzle } from './machine.ts';
import { answerKeys, inputsFor, machinesFitting, rulesFor, UNIVERSE } from './solve.ts';

const pictureOf = (puzzle: Puzzle): string =>
  [
    puzzle.machines.map((rule, at) => (puzzle.open[at] ? ruleText(rule) : '?')).join(' '),
    puzzle.examples.map((pair) => `${pair.from}>${pair.to}`).join(' '),
    `${puzzle.ask} ${puzzle.given ?? ''}`.trim(),
  ].join(' | ');

const truthKey = (level: Level): string => (typeof level.truth === 'number' ? String(level.truth) : cardKey(level.truth));
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
  it('has 25 levels in five worlds, in order', () => {
    expect(LEVELS.map((level) => level.id)).toEqual(Array.from({ length: 25 }, (_, at) => at + 1));
    expect([...new Set(LEVELS.map((level) => level.world))]).toEqual(WORLDS);
    for (let at = 1; at < LEVELS.length; at += 1) {
      expect(WORLDS.indexOf(LEVELS[at].world)).toBeGreaterThanOrEqual(WORLDS.indexOf(LEVELS[at - 1].world));
    }
  });

  it('makes the same levels every time', () => {
    expect(buildLevels()).toEqual(ALL_VARIANTS);
    expect(pictureOf(LEVELS[0].puzzle)).toBe('? | 2>3 7>8 | out 8');
    expect(LEVELS[0].numbers).toEqual([9, 8, 7]);
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

  it('makes each go a shift of three fresh puzzles, and every go before they come round again a new shift', () => {
    expect(VARIANTS).toBe(SHIFT * SHIFTS);
    for (const { id } of LEVELS) {
      const seen = Array.from({ length: SHIFTS }, (_, go) => shiftFor(id, go)).flat();
      expect(seen.map((level) => level.variant)).toEqual(Array.from({ length: VARIANTS }, (_, at) => at));
      expect(shiftFor(id, SHIFTS)).toEqual(shiftFor(id, 0));
      expect(shiftFor(id, 0)).toHaveLength(SHIFT);
    }
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
    for (const level of EVERY_PUZZLE) expect(level.puzzle.machines.length).toBe(level.world === 'chain' ? (level.id >= 24 ? 3 : 2) : 1);
    const last = ALL_VARIANTS.at(-1) as Level[];
    for (const level of last) {
      expect(level.puzzle.ask).toBe('in');
      expect(level.puzzle.open).toEqual([false, true, false]);
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
  const byId = (id: number): readonly Level[] => ALL_VARIANTS[id - 1];
  const hard = [22, 23, 24, 25].flatMap(byId);

  it('fixes both machines at once, then runs two and three machines backwards', () => {
    expect(byId(22).every((level) => level.puzzle.ask === 'fix' && level.puzzle.open.join() === 'false,false' && level.cards.length === 5)).toBe(true);
    expect(byId(23).every((level) => level.puzzle.ask === 'in' && level.puzzle.open.join() === 'true,false')).toBe(true);
    expect(byId(24).every((level) => level.puzzle.ask === 'in' && level.puzzle.open.join() === 'true,false,true')).toBe(true);
    expect(byId(25).every((level) => level.puzzle.ask === 'in' && level.puzzle.open.join() === 'false,true,false')).toBe(true);
    for (const level of hard) expect(level.puzzle.examples.length).toBe(2);
  });

  it('beats the shortcut: no single rule explains the examples on the last four levels', () => {
    for (const level of hard) {
      expect(UNIVERSE.some((rule) => fitsEach([rule], level.puzzle.examples).every(Boolean)), `level ${level.id}.${level.variant}`).toBe(false);
    }
  });

  it('pins two hidden machines down only with both examples: either one alone fits many pairs and other answers', () => {
    for (const level of [...byId(22), ...byId(25)]) {
      for (const pair of level.puzzle.examples) {
        const alone = { ...level.puzzle, examples: [pair] };
        expect(machinesFitting(alone).length, `level ${level.id}.${level.variant}`).toBeGreaterThan(5);
        expect(answerKeys(alone).length, `level ${level.id}.${level.variant}`).toBeGreaterThan(1);
      }
    }
  });

  it('lets only one pair of parts in one order do the job of two hidden machines', () => {
    for (const level of byId(22)) {
      expect(machinesFitting(level.puzzle).map(cardKey)).toEqual([cardKey(level.truth as Card)]);
    }
  });
});

describe('the answers on offer', () => {
  it('offers three different numbers on the early levels: the right one, the copy, and a real slip', () => {
    for (const level of EVERY_PUZZLE.filter((one) => one.answer === 'three')) {
      expect(new Set(level.numbers).size, `level ${level.id}`).toBe(3);
      expect(level.numbers).toContain(level.truth);
      expect(level.numbers).toContain(level.puzzle.given);
      for (const value of level.numbers) expect(PICKER).toContain(value);
      if (level.puzzle.ask === 'in') expect(level.numbers).toContain(run(level.puzzle.machines, level.puzzle.given as number));
    }
  });

  it('offers 0 to 20 later', () => {
    for (const level of EVERY_PUZZLE.filter((one) => one.answer === 'picker')) expect(level.numbers).toEqual(PICKER);
  });

  it('offers different rule cards with exactly one that fits every example: three early, four or five later', () => {
    for (const level of EVERY_PUZZLE.filter((one) => one.answer === 'cards')) {
      expect(isRuleAsk(level.puzzle.ask)).toBe(true);
      expect(new Set(level.cards.map(cardKey)).size).toBe(level.cards.length);
      expect(level.cards.length).toBe(level.world === 'take' ? 3 : level.id >= 21 ? 5 : 4);
      for (const card of level.cards) expect(card).toHaveLength(hiddenSlots(level.puzzle).length);
      const working = level.cards.filter((card) => fitsEach(withCard(level.puzzle, card), level.puzzle.examples).every(Boolean));
      expect(working).toEqual([level.truth]);
    }
  });

  it('puts the right card in every place across a level, so its place gives nothing away', () => {
    for (const variants of ALL_VARIANTS.filter((list) => list[0].answer === 'cards')) {
      const places = new Set(variants.map((level) => level.cards.findIndex((card) => sameCard(card, level.truth as Card))));
      expect(places.size).toBeGreaterThanOrEqual(3);
    }
  });

  it('keeps every wrong card tempting after world 2: each one gets some example right', () => {
    for (const level of EVERY_PUZZLE.filter((one) => one.answer === 'cards' && one.world !== 'take')) {
      const wrong = level.cards.filter((card) => !sameCard(card, level.truth as Card));
      for (const card of wrong) expect(trapsFor(level.puzzle, card), `level ${level.id}.${level.variant} ${cardKey(card)}`).toBe(true);
    }
  });

  it('makes fixing a single machine a real check: every wrong part alone gets some example right', () => {
    for (const level of EVERY_PUZZLE.filter((one) => one.puzzle.ask === 'fix' && one.puzzle.machines.length === 1)) {
      const wrong = level.cards.filter((card) => !sameCard(card, level.truth as Card));
      for (const card of wrong) expect(fitsEach(card, level.puzzle.examples).some(Boolean), `level ${level.id}.${level.variant}`).toBe(true);
    }
  });
});

describe('where the right answer sits', () => {
  // Many seeds, each giving a level's 15 puzzles in the order they are played.
  const SEEDS = Array.from({ length: 30 }, (_, at) => 777 + at * 1000003);
  const STRATEGIES: Record<string, (pos: number, at: number, n: number, seq: readonly number[]) => boolean> = {
    'always first': (pos) => pos === 0,
    'always last': (pos, _at, n) => pos === n - 1,
    'cycle': (pos, at, n) => pos === at % n,
    'reverse cycle': (pos, at, n) => pos === n - 1 - (at % n),
    ...Object.fromEntries(
      [1, 2, 3, 4, 5, 6].map((lag) => [`same as ${lag} ago`, (pos: number, at: number, _n: number, seq: readonly number[]) => at >= lag && pos === seq[at - lag]]),
    ),
  };

  for (const base of LEVELS.filter((level) => level.answer !== 'picker')) {
    it(`gives nothing away on level ${base.id}: an even spread, and no fixed strategy beats chance`, () => {
      const seq = SEEDS.flatMap((seed) =>
        buildLevel(base.id - 1, seed).map((level) =>
          level.answer === 'cards' ? level.cards.findIndex((card) => sameCard(card, level.truth as Card)) : level.numbers.indexOf(level.truth as number),
        ),
      );
      const n = base.answer === 'cards' ? base.cards.length : base.numbers.length;
      const chance = 1 / n;
      expect(seq.every((pos) => pos >= 0)).toBe(true);
      for (let place = 0; place < n; place += 1) {
        const share = seq.filter((pos) => pos === place).length / seq.length;
        expect(share / chance, `level ${base.id} place ${place}`).toBeGreaterThan(0.75);
        expect(share / chance, `level ${base.id} place ${place}`).toBeLessThan(1.25);
      }
      // The shipped puzzles too, not only on average: no strategy beats chance over the level as it is played.
      const shipped = ALL_VARIANTS[base.id - 1].map((level) =>
        level.answer === 'cards' ? level.cards.findIndex((card) => sameCard(card, level.truth as Card)) : level.numbers.indexOf(level.truth as number),
      );
      expect(bestStrategy(shipped, n), `level ${base.id} as shipped`).toBeLessThanOrEqual(MOST_OVER_CHANCE);
      for (const [name, guess] of Object.entries(STRATEGIES)) {
        const lag = Number(/(\d+) ago/.exec(name)?.[1] ?? 0);
        const tries = seq.length - lag;
        const wins = seq.filter((pos, at) => guess(pos, at, n, seq)).length;
        expect(wins / tries / chance, `level ${base.id}: ${name}`).toBeLessThanOrEqual(1.3);
      }
    }, 60000);
  }
});
