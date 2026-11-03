import { missingClips } from '@playroom/kit';
import { describe, expect, it } from 'vitest';
import { planChant } from '../chant.ts';
import { makeTrain, MAX_LEVEL, seededRng, THEMES } from '../pattern.ts';
import { en } from './en.ts';
import clips from './sl.clips.json';
import { SL_ITEMS, sl, spokenLines } from './sl.ts';

const everyItem = THEMES.flatMap((theme) => theme.items);

describe('Slovenian lines', () => {
  it('has a clip for every line', () => {
    expect(missingClips(clips, spokenLines())).toEqual([]);
  });

  it('never repeats a line', () => {
    const lines = spokenLines();
    expect(new Set(lines).size).toBe(lines.length);
  });

  it('names every item the trains can carry, and nothing else', () => {
    expect(Object.keys(SL_ITEMS).sort()).toEqual(everyItem.map((item) => item.emoji).sort());
    const lines = spokenLines();
    for (const item of everyItem) expect(lines).toContain(sl.itemName(item));
  });

  it('declares every word the chant can say, on every level', () => {
    const lines = spokenLines();
    for (let level = 1; level <= MAX_LEVEL; level++) {
      for (let seed = 0; seed < 40; seed++) {
        const train = makeTrain(level, seededRng(seed));
        for (const beat of planChant(train, new Set(), sl)) {
          if (beat.word !== null) expect(lines).toContain(beat.word);
        }
      }
    }
  });

  it('declares the cheer for every level done', () => {
    const lines = spokenLines();
    for (let level = 1; level < MAX_LEVEL; level++) expect(lines).toContain(sl.levelDoneSpoken(level));
    expect(lines).toContain(sl.lineDoneSpoken);
    expect(sl.levelDoneSpoken(3)).toBe('Bravo! Tretja stopnja je končana!');
  });

  it('has as many cheers as English, so the same train gets the same cheer', () => {
    expect(sl.cheers).toHaveLength(en.cheers.length);
  });

  it('agrees the growing hint with the item it names', () => {
    const named = (emoji: string) => everyItem.find((item) => item.emoji === emoji)!;
    expect(sl.hintGrowing(named('🦁'))).toBe('Vsakič en lev več!');
    expect(sl.hintGrowing(named('🍌'))).toBe('Vsakič ena banana več!');
    expect(sl.hintGrowing(named('🍎'))).toBe('Vsakič eno jabolko več!');
    expect(en.hintGrowing(named('🍎'))).toBe('One more apple each time!');
  });

  it('never gives the child a gender', () => {
    expect(spokenLines().filter((line) => /\b(si|je) \w+(l|la)\b|priden|pridna/i.test(line))).toEqual([]);
  });
});
