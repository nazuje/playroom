import { describe, expect, it } from 'vitest';
import { TRAINS_PER_LEVEL } from './journey.ts';
import { makeTrain, MAX_LEVEL, seededRng, shuffle, type Rng } from './pattern.ts';
import { bestAfter, levelStars, readBest, trainStars, type Stars } from './stars.ts';

const clean = { misses: 0, nudged: false };

describe('trainStars', () => {
  it('gives 3 stars only when every car is right first time', () => {
    expect(trainStars([clean])).toBe(3);
    expect(trainStars([clean, clean])).toBe(3);
  });

  it('gives 2 for one slip and 1 for guessing around', () => {
    expect(trainStars([{ misses: 1, nudged: false }])).toBe(2);
    expect(trainStars([{ misses: 2, nudged: false }])).toBe(1);
    expect(trainStars([{ misses: 3, nudged: false }])).toBe(1);
    expect(trainStars([clean, { misses: 2, nudged: false }])).toBe(2);
    expect(trainStars([{ misses: 2, nudged: false }, { misses: 1, nudged: false }])).toBe(1);
  });

  it('counts the idle nudge as a slip, since it shows the answer', () => {
    expect(trainStars([{ misses: 0, nudged: true }])).toBe(2);
    expect(trainStars([{ misses: 2, nudged: true }])).toBe(1);
  });
});

describe('levelStars', () => {
  it('rounds the trains to the nearest star', () => {
    expect(levelStars([3, 3, 3, 3, 3])).toBe(3);
    expect(levelStars([3, 3, 3, 3, 2])).toBe(3);
    expect(levelStars([3, 2, 2, 2, 1])).toBe(2);
    expect(levelStars([1, 1, 1, 2, 1])).toBe(1);
  });
});

/** Plays a whole level, tapping answers in a random order until the right one lands. */
function playLevel(level: number, rng: Rng, careful: boolean): Stars {
  const trains: Stars[] = [];
  for (let i = 0; i < TRAINS_PER_LEVEL; i++) {
    const train = makeTrain(level, rng);
    const results = train.blanks.map((blank) => {
      if (careful) return clean;
      const order = shuffle(rng, blank.options);
      return { misses: order.findIndex((item) => item.name === blank.answer.name), nudged: false };
    });
    trains.push(trainStars(results));
  }
  return levelStars(trains);
}

describe('careful play beats random tapping', () => {
  it('on every level, over many plays', () => {
    const rng = seededRng(11);
    for (let level = 1; level <= MAX_LEVEL; level++) {
      const plays = 200;
      let careful = 0;
      let random = 0;
      for (let i = 0; i < plays; i++) {
        careful += playLevel(level, rng, true);
        random += playLevel(level, rng, false);
      }
      expect(careful / plays).toBe(3);
      expect(random / plays).toBeLessThan(2.3);
    }
  });
});

describe('best stars', () => {
  it('keeps only sensible saved values', () => {
    expect(readBest({ 1: 3, 2: 2, 3: 7, x: 3, 0: 1, 4: '3' })).toEqual({ 1: 3, 2: 2 });
    expect(readBest(null)).toEqual({});
    expect(readBest('3')).toEqual({});
  });

  it('only ever goes up', () => {
    expect(bestAfter({ 1: 2 }, 1, 3)).toEqual({ 1: 3 });
    expect(bestAfter({ 1: 3 }, 1, 1)).toEqual({ 1: 3 });
    expect(bestAfter({}, 2, 1)).toEqual({ 2: 1 });
  });
});
