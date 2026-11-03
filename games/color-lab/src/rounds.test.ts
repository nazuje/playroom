import { describe, expect, it } from 'vitest';
import { COLORS, mix, PAINTS, sameColor, totalParts } from './mix.ts';
import {
  guessChoices,
  MAKE_CAPACITY,
  pickRound,
  pickSurprise,
  POTS,
  QUESTIONS,
  questionAnswer,
  ROUND_SIZE,
  shuffle,
  sideSwapped,
  SURPRISE_CHANCE,
  TARGETS,
} from './rounds.ts';
import type { Level, Rng } from './rounds.ts';
import { en } from './lang/en.ts';

const LEVELS: Level[] = [0, 1, 2];
const ALL_QUESTIONS = LEVELS.flatMap((level) => QUESTIONS[level]);
const ALL_TARGETS = LEVELS.flatMap((level) => TARGETS[level]);

/** A small repeatable generator, so failures can be reproduced. */
function seeded(seed: number): Rng {
  let state = seed;
  return () => {
    state = (state * 1664525 + 1013904223) % 4294967296;
    return state / 4294967296;
  };
}

describe('Guess questions', () => {
  it('every mix has a name and a color', () => {
    for (const question of ALL_QUESTIONS) {
      const answer = COLORS[questionAnswer(question)];
      expect(answer.name).not.toBe('');
      expect(answer.hex).toMatch(/^#[0-9a-f]{6}$/);
    }
  });

  it('every pot matches the color its paint really makes', () => {
    for (const [color, parts] of Object.entries(POTS)) expect(mix(parts)).toBe(color);
  });

  it('never asks the same question twice', () => {
    const keys = ALL_QUESTIONS.map(({ a, b }) => [a, b].sort().join('+'));
    expect(new Set(keys).size).toBe(keys.length);
  });

  it('says the headline mixes the way a parent expects', () => {
    expect(en.guessReveal({ a: 'red', b: 'yellow' }, true)).toBe('Yes! Red and yellow make orange!');
    expect(en.guessReveal({ a: 'red', b: 'green' }, false)).toBe('Ooh, surprise! Red and green make brown!');
    expect(en.guessReveal({ a: 'black', b: 'white' }, true)).toBe('Yes! Black and white make grey!');
  });

  it('offers the right answer and two wrong ones that are all different', () => {
    for (const question of ALL_QUESTIONS) {
      for (let seed = 0; seed < 200; seed++) {
        const choices = guessChoices(question, seeded(seed));
        const answer = questionAnswer(question);
        expect(choices).toHaveLength(3);
        expect(new Set(choices).size).toBe(3);
        expect(choices.filter((choice) => choice === answer)).toHaveLength(1);
      }
    }
  });

  it('keeps every blob easy to tell apart, and never offers the pots back', () => {
    for (const question of ALL_QUESTIONS) {
      for (let seed = 0; seed < 200; seed++) {
        const choices = guessChoices(question, seeded(seed));
        const families = choices.map((choice) => COLORS[choice].family);
        expect(new Set(families).size).toBe(3);
        const decoys = choices.filter((choice) => choice !== questionAnswer(question));
        for (const decoy of decoys) {
          expect(COLORS[decoy].family).not.toBe(COLORS[question.a].family);
          expect(COLORS[decoy].family).not.toBe(COLORS[question.b].family);
        }
      }
    }
  });
});

describe('Make targets', () => {
  it('every recipe really makes its target', () => {
    for (const target of ALL_TARGETS) {
      const made = mix(target.recipe);
      expect(made).toBe(target.color);
    }
  });

  it('every target has a name and a color, and fits in the beaker', () => {
    for (const target of ALL_TARGETS) {
      expect(COLORS[target.color].name).not.toBe('');
      expect(totalParts(target.recipe)).toBeLessThanOrEqual(MAKE_CAPACITY);
    }
  });

  it('every target is a different color from the others', () => {
    for (const target of ALL_TARGETS) {
      const lookalikes = ALL_TARGETS.filter((other) => sameColor(other.color, target.color));
      expect(lookalikes).toEqual([target]);
    }
  });

  it('starts simple, then adds white and black, then three-paint colors', () => {
    const uses = (level: Level, paint: 'white' | 'black') =>
      TARGETS[level].some((target) => (target.recipe[paint] ?? 0) > 0);
    expect(uses(0, 'white') || uses(0, 'black')).toBe(false);
    expect(uses(1, 'white') && uses(1, 'black')).toBe(true);
    expect(TARGETS[2].map((target) => target.color)).toContain('brown');
  });

  it('every paint gets used somewhere', () => {
    for (const paint of PAINTS) {
      expect(ALL_TARGETS.some((target) => (target.recipe[paint] ?? 0) > 0)).toBe(true);
    }
  });

  it('gives hints in plain words', () => {
    expect(en.hintLine({ red: 1, white: 1 })).toBe('Try red and white.');
    expect(en.hintLine({ red: 1, blue: 1, white: 1 })).toBe('Try red, blue and white.');
  });
});

describe('rounds', () => {
  it('shuffles without losing anything', () => {
    expect(shuffle([1, 2, 3, 4], seeded(7)).sort()).toEqual([1, 2, 3, 4]);
  });

  it('never repeats within a round, and stops at the round size', () => {
    const big = pickRound(QUESTIONS[1], seeded(3));
    expect(big).toHaveLength(ROUND_SIZE);
    expect(new Set(big).size).toBe(ROUND_SIZE);
    expect(pickRound(TARGETS[0], seeded(3))).toHaveLength(TARGETS[0].length);
  });

  it('starts a round with questions the last round did not ask', () => {
    for (let seed = 0; seed < 50; seed++) {
      const last = pickRound(QUESTIONS[0], seeded(seed));
      const now = pickRound(QUESTIONS[0], seeded(seed + 100), last);
      const fresh = QUESTIONS[0].filter((question) => !last.includes(question));
      expect(new Set(now.slice(0, fresh.length))).toEqual(new Set(fresh));
      expect(new Set(now).size).toBe(ROUND_SIZE);
    }
  });

  it('has more Easy questions than one round asks, so rounds differ', () => {
    expect(QUESTIONS[0].length).toBeGreaterThan(ROUND_SIZE);
  });

  it('swaps pots without changing the answer', () => {
    for (const question of ALL_QUESTIONS) {
      for (let seed = 0; seed < 10; seed++) {
        expect(questionAnswer(sideSwapped(question, seeded(seed)))).toBe(questionAnswer(question));
      }
    }
  });

  it('keeps surprises rare', () => {
    const rng = seeded(11);
    let surprises = 0;
    for (let mix = 0; mix < 6000; mix++) if (pickSurprise(rng)) surprises += 1;
    expect(surprises / 6000).toBeGreaterThan(SURPRISE_CHANCE * 0.7);
    expect(surprises / 6000).toBeLessThan(SURPRISE_CHANCE * 1.3);
  });
});
