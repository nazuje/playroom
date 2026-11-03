import { missingClips } from '@playroom/kit';
import { describe, expect, it } from 'vitest';
import { en } from './en.ts';
import clips from './sl.clips.json';
import { sl, spokenLines } from './sl.ts';

describe('Slovenian', () => {
  it('has a clip for every line', () => {
    expect(missingClips(clips, spokenLines())).toEqual([]);
  });

  it('never repeats a line', () => {
    const lines = spokenLines();
    expect(new Set(lines).size).toBe(lines.length);
  });

  it('has a line for every world and group, and as many cheers and protests as English', () => {
    expect(Object.keys(sl.ideas)).toEqual(Object.keys(en.ideas));
    expect(Object.keys(sl.worlds)).toEqual(Object.keys(en.worlds));
    expect(Object.keys(sl.groups)).toEqual(Object.keys(en.groups));
    expect(sl.oops).toHaveLength(en.oops.length);
    expect(sl.cheers).toHaveLength(en.cheers.length);
  });

  it('never uses a gendered past form about the player', () => {
    expect(spokenLines().filter((line) => /(našel|našla|uganil|uganila|zmagal|zmagala|rešil|rešila|priden|pridna)/i.test(line))).toEqual([]);
  });
});
