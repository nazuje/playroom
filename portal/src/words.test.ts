import { describe, expect, it } from 'vitest';
import { en, sl } from './words.ts';

describe('portal words', () => {
  it('count years in Slovenian', () => {
    expect([3, 4, 5, 12].map(sl.age)).toEqual(['3 leta', '4 leta', '5 let', '12 let']);
    expect(en.age(4)).toBe('Age 4');
  });

  it('name every shelf in both languages', () => {
    expect(Object.keys(sl.shelves)).toEqual(Object.keys(en.shelves));
    for (const words of [en, sl]) for (const heading of Object.values(words.shelves)) expect(heading).not.toBe('');
  });
});
