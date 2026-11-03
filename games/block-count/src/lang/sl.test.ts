import { missingClips } from '@playroom/kit';
import { describe, expect, it } from 'vitest';
import { en } from './en.ts';
import clips from './sl.clips.json';
import { sl, slCountWord, spokenLines } from './sl.ts';

describe('Slovenian', () => {
  it('has a clip for every line', () => {
    expect(missingClips(clips, spokenLines())).toEqual([]);
  });

  it('never repeats a line', () => {
    const lines = spokenLines();
    expect(new Set(lines).size).toBe(lines.length);
  });

  it('has a line for every world and question, and as many oopses as English', () => {
    expect(Object.keys(sl.ideas)).toEqual(Object.keys(en.ideas));
    expect(Object.keys(sl.worlds)).toEqual(Object.keys(en.worlds));
    expect(Object.keys(sl.asks)).toEqual(Object.keys(en.asks));
    expect(sl.oops).toHaveLength(en.oops.length);
  });

  it('counts out loud with the feminine forms, units first past twenty', () => {
    expect([1, 2, 3, 4, 5, 10, 11, 12, 20, 21, 22, 23, 29, 30].map(slCountWord)).toEqual([
      'ena',
      'dve',
      'tri',
      'štiri',
      'pet',
      'deset',
      'enajst',
      'dvanajst',
      'dvajset',
      'enaindvajset',
      'dvaindvajset',
      'triindvajset',
      'devetindvajset',
      'trideset',
    ]);
  });

  it('puts the noun in the right form for each count', () => {
    expect([2, 3, 4, 5, 21, 22].map(sl.cheerCount)).toEqual(['Dve kocki!', 'Tri kocke!', 'Štiri kocke!', 'Pet kock!', 'Enaindvajset kock!', 'Dvaindvajset kock!']);
    expect(sl.cheerFill(1)).toBe('Še ena kocka!');
  });

  it('never uses a gendered past form about the player', () => {
    expect(spokenLines().filter((line) => /(našel|našla|uganil|uganila|zmagal|zmagala|rešil|rešila|preštel|preštela|priden|pridna)/i.test(line))).toEqual([]);
  });
});
