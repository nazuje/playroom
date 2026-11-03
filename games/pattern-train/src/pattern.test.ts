import { describe, expect, it } from 'vitest';
import { makeTrain, MAX_LEVEL, seededRng, THEMES, type Train } from './pattern.ts';

const SEEDS = Array.from({ length: 400 }, (_, i) => i * 7 + 1);

function trainsAt(level: number): Train[] {
  return SEEDS.map((seed) => makeTrain(level, seededRng(seed)));
}

function allTrains(): Train[] {
  return Array.from({ length: MAX_LEVEL }, (_, i) => trainsAt(i + 1)).flat();
}

const names = (train: Train) => train.cars.map((car) => car.name);
const repeating = (train: Train) => train.rule !== 'growing';

/** Turns a train back into letters, so tests read like the pattern names. */
function letters(train: Train): string {
  const seen = names(train).filter((name, i, all) => all.indexOf(name) === i);
  return names(train)
    .map((name) => 'ABC'[seen.indexOf(name)])
    .join('');
}

describe('every train', () => {
  it('is reproducible from its random numbers', () => {
    expect(makeTrain(5, seededRng(42))).toEqual(makeTrain(5, seededRng(42)));
  });

  it('has an answer that is the true car at each blank, and among the options', () => {
    for (const train of allTrains()) {
      expect(train.blanks.length).toBeGreaterThan(0);
      for (const blank of train.blanks) {
        expect(blank.answer).toEqual(train.cars[blank.index]);
        expect(blank.options.map((item) => item.name)).toContain(blank.answer.name);
      }
    }
  });

  it('offers 3 or 4 options with no repeats, so the answer is never there twice', () => {
    for (const train of allTrains()) {
      for (const blank of train.blanks) {
        const offered = blank.options.map((item) => item.name);
        expect([3, 4]).toContain(offered.length);
        expect(new Set(offered).size).toBe(offered.length);
      }
    }
  });

  it('offers plausible wrong answers: same theme, and everything else on the train first', () => {
    for (const train of allTrains()) {
      const theme = THEMES.find((candidate) => candidate.id === train.themeId);
      const themeNames = theme?.items.map((item) => item.name) ?? [];
      const onTrain = new Set(names(train));
      for (const blank of train.blanks) {
        const offered = blank.options.map((item) => item.name);
        expect(offered.every((name) => themeNames.includes(name))).toBe(true);
        const tempting = [...onTrain].filter((name) => offered.includes(name));
        expect(tempting.length).toBe(Math.min(onTrain.size, offered.length));
      }
    }
  });

  it('never repeats the avoided theme', () => {
    for (const seed of SEEDS) {
      expect(makeTrain(1, seededRng(seed), 'fruit').themeId).not.toBe('fruit');
    }
  });

  it('has hints and chant steps that sit inside the train', () => {
    for (const train of allTrains()) {
      expect(train.hint.length).toBeGreaterThan(0);
      for (const range of [...train.hint, ...train.steps]) {
        expect(range.start).toBeGreaterThanOrEqual(0);
        expect(range.end).toBeLessThanOrEqual(train.cars.length);
      }
      expect(train.steps[0].start).toBe(0);
      expect(train.steps.at(-1)?.end).toBe(train.cars.length);
    }
  });

  it('never brackets an empty car in the hint', () => {
    for (const train of allTrains()) {
      const empty = train.blanks.map((blank) => blank.index);
      for (const { start, end } of train.hint) {
        expect(empty.some((index) => index >= start && index < end)).toBe(false);
      }
    }
  });
});

describe('repeating patterns', () => {
  it('keep the shape of their unit all the way along', () => {
    for (const train of allTrains().filter(repeating)) {
      const unit = train.rule.length;
      const cars = letters(train);
      expect(cars.slice(0, unit)).toBe(train.rule);
      [...cars].forEach((letter, i) => expect(letter).toBe(cars[i % unit]));
    }
  });

  it('always show two full repeats side by side, so the rule can be worked out', () => {
    for (const train of allTrains().filter(repeating)) {
      const unit = train.rule.length;
      const empty = train.blanks.map((blank) => blank.index);
      let clear = false;
      for (let start = 0; start + unit * 2 <= train.cars.length; start += unit) {
        clear ||= !empty.some((index) => index >= start && index < start + unit * 2);
      }
      expect(clear, `${train.rule} blanks ${empty.join()}`).toBe(true);
    }
  });

  it('bracket exactly one whole unit in the hint', () => {
    for (const train of allTrains().filter(repeating)) {
      expect(train.hint).toHaveLength(1);
      expect(train.hint[0].end - train.hint[0].start).toBe(train.rule.length);
      expect(train.hint[0].start % train.rule.length).toBe(0);
    }
  });
});

describe('levels', () => {
  const rulesAt = (level: number) => new Set(trainsAt(level).map((train) => train.rule));

  it('ramp through the agreed patterns', () => {
    expect(rulesAt(1)).toEqual(new Set(['AB']));
    expect(rulesAt(2)).toEqual(new Set(['AAB', 'ABB']));
    expect(rulesAt(3)).toEqual(new Set(['ABC']));
    expect(rulesAt(4)).toEqual(new Set(['AABB', 'ABAC']));
    expect(rulesAt(6)).toEqual(new Set(['growing']));
  });

  it('put a single blank at the very end up to level 4', () => {
    for (const level of [1, 2, 3, 4]) {
      for (const train of trainsAt(level)) {
        expect(train.blanks.map((blank) => blank.index)).toEqual([train.cars.length - 1]);
        expect(train.question).toBe('next');
      }
    }
  });

  it('level 5 gives two blanks in a row at the end, or one gap inside the train', () => {
    const shapes = new Set<string>();
    for (const train of trainsAt(5)) {
      const empty = train.blanks.map((blank) => blank.index);
      if (train.question === 'next') {
        expect(empty).toEqual([train.cars.length - 2, train.cars.length - 1]);
      } else {
        expect(empty).toHaveLength(1);
        expect(empty[0]).toBeGreaterThan(0);
        expect(empty[0]).toBeLessThan(train.cars.length - 1);
      }
      shapes.add(train.question);
    }
    expect(shapes).toEqual(new Set(['next', 'missing']));
  });

  it('refuse a level that does not exist', () => {
    expect(() => makeTrain(0, seededRng(1))).toThrow();
    expect(() => makeTrain(7, seededRng(1))).toThrow();
  });
});

describe('growing patterns', () => {
  it('follow A B AA B AAA B, with two different items', () => {
    for (const train of trainsAt(6)) {
      expect('ABAABAAABAAAAB'.startsWith(letters(train))).toBe(true);
    }
  });

  it('show at least two whole steps before the blank', () => {
    for (const train of trainsAt(6)) {
      const blank = train.blanks[0].index;
      expect(blank).toBe(train.cars.length - 1);
      expect(letters(train).slice(0, blank).split('B').length - 1).toBeGreaterThanOrEqual(2);
    }
  });

  it('ask both kinds of question: keep going, or stop for the other item', () => {
    const answers = new Set(trainsAt(6).map((train) => letters(train).at(-1)));
    expect(answers).toEqual(new Set(['A', 'B']));
  });

  it('bracket each whole step, each one longer than the last', () => {
    for (const train of trainsAt(6)) {
      const lengths = train.hint.map(({ start, end }) => end - start);
      expect(lengths.length).toBeGreaterThanOrEqual(2);
      lengths.forEach((length, i) => expect(length).toBe(i + 2));
      expect(train.rule).toBe('growing');
    }
  });
});
