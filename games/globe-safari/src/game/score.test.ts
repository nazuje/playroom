import { describe, expect, it } from 'vitest';
import { REGIONS } from '../data/regions.ts';
import { CLUE_COUNT, mostStarsFor, pickRound, ROUND_SIZE, starsFor } from './score.ts';

function seeded(seed: number): () => number {
  let value = seed;
  return () => {
    value = (value * 9301 + 49297) % 233280;
    return value / 233280;
  };
}

describe('starsFor', () => {
  it('gives fewer stars the more clues the family needed', () => {
    expect(starsFor(1, true)).toBe(3);
    expect(starsFor(2, true)).toBe(2);
    expect(starsFor(3, true)).toBe(1);
  });

  it('gives no stars when the answer was shown without a guess', () => {
    for (let clues = 1; clues <= CLUE_COUNT; clues++) expect(starsFor(clues, false)).toBe(0);
  });

  it('never goes outside 0 to 3', () => {
    expect(starsFor(0, true)).toBe(3);
    expect(starsFor(9, true)).toBe(1);
  });

  it('makes guessing always worth more than not guessing', () => {
    for (let clues = 1; clues <= CLUE_COUNT; clues++) expect(starsFor(clues, true)).toBeGreaterThan(starsFor(clues, false));
  });
});

describe('pickRound', () => {
  const animals = REGIONS[0].animals;

  it('takes a round of distinct animals from the place', () => {
    const round = pickRound(animals, new Set(), seeded(3));
    expect(round).toHaveLength(Math.min(ROUND_SIZE, animals.length));
    expect(new Set(round.map((animal) => animal.id)).size).toBe(round.length);
    for (const animal of round) expect(animals).toContain(animal);
  });

  it('brings animals not met yet before repeats', () => {
    const first = pickRound(animals, new Set(), seeded(5));
    const second = pickRound(animals, new Set(first.map((animal) => animal.id)), seeded(8));
    const ids = (list: readonly { id: string }[]) => list.map((animal) => animal.id).sort();
    const unseen = animals.filter((animal) => !first.includes(animal));
    expect(ids(second.slice(0, unseen.length))).toEqual(ids(unseen));
  });

  it('fits every place, with at most the round size', () => {
    for (const region of REGIONS) {
      expect(region.animals.length, region.id).toBeGreaterThanOrEqual(ROUND_SIZE);
      expect(pickRound(region.animals, new Set())).toHaveLength(ROUND_SIZE);
    }
    expect(mostStarsFor(ROUND_SIZE)).toBe(15);
  });
});
