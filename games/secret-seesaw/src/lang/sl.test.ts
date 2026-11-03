import { missingClips } from '@playroom/kit';
import { describe, expect, it } from 'vitest';
import { LEVELS, MOST_ANSWER, MOST_WEIGHT } from '../rules/levels.ts';
import { en } from './en.ts';
import clips from './sl.clips.json';
import { MOST_SPOKEN, sl, spokenLines } from './sl.ts';

describe('Slovenian', () => {
  it('has a clip for every line', () => {
    expect(missingClips(clips, spokenLines())).toEqual([]);
  });

  it('never repeats a line', () => {
    const lines = spokenLines();
    expect(new Set(lines).size).toBe(lines.length);
  });

  it('can say every number a weight or an answer can be', () => {
    expect(MOST_SPOKEN).toBeGreaterThanOrEqual(Math.max(MOST_ANSWER, MOST_WEIGHT));
    const lines = spokenLines();
    for (const level of LEVELS) {
      for (const value of Object.values(level.values)) expect(lines).toContain(sl.cheer(value));
      for (const plan of level.seesaws) {
        for (const token of [...plan.left, ...plan.right]) if (typeof token === 'number') expect(lines).toContain(sl.number(token));
      }
    }
  });

  it('counts out loud in the feminine forms', () => {
    expect([1, 2, 3, 4, 5].map(sl.number)).toEqual(['Ena', 'Dve', 'Tri', 'Štiri', 'Pet']);
    expect(sl.cheer(17)).toBe('Tako je, sedemnajst!');
    expect(sl.number(0)).toBe('Nič');
  });

  it('has a line for every world and mystery', () => {
    expect(Object.keys(sl.ideas)).toEqual(Object.keys(en.ideas));
    expect(Object.keys(sl.worlds)).toEqual(Object.keys(en.worlds));
    expect(Object.keys(sl.ask)).toEqual(Object.keys(en.ask));
  });

  it('never uses a gendered past form about the player', () => {
    expect(spokenLines().filter((line) => /(našel|našla|uganil|uganila|zmagal|zmagala|priden|pridna)/i.test(line))).toEqual([]);
  });
});
