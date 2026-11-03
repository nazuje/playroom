import { missingClips } from '@playroom/kit';
import { describe, expect, it } from 'vitest';
import type { Term } from '../rules/equation.ts';
import { EVERY_PUZZLE, questionValue } from '../rules/levels.ts';
import { en } from './en.ts';
import clips from './sl.clips.json';
import { sl, spokenLines } from './sl.ts';

const term = (fruit: Term['fruit'], shape: Term['shape'] = 'one', count = 1, sign: 1 | -1 = 1): Term => ({ fruit, shape, count, sign });

describe('Slovenian', () => {
  it('has a clip for every line', () => {
    expect(missingClips(clips, spokenLines())).toEqual([]);
  });

  it('never repeats a line', () => {
    const lines = spokenLines();
    expect(new Set(lines).size).toBe(lines.length);
  });

  it('can say every row, question and found fruit of every puzzle', () => {
    const lines = spokenLines();
    for (const level of EVERY_PUZZLE) {
      for (const row of level.puzzle.clues) expect(lines).toContain(sl.row(row));
      expect(lines).toContain(sl.ask(level.puzzle.question));
      expect(lines).toContain(sl.cheer(questionValue(level)));
      for (const [fruit, value] of Object.entries(level.values)) {
        expect(lines).toContain(sl.found(fruit as Term['fruit'], value));
        expect(lines).toContain(sl.ask([term(fruit as Term['fruit'])]));
      }
    }
  });

  it('reads rows with the right number forms and verbs', () => {
    expect(sl.row({ terms: [term('apple'), term('apple')], total: 4 })).toBe('Jabolko plus jabolko je štiri.');
    expect(sl.row({ terms: [term('banana', 'bunch', 3)], total: 15 })).toBe('Tri banane so petnajst.');
    expect(sl.row({ terms: [term('pineapple', 'bunch', 2), term('pear')], total: 7 })).toBe('Dva ananasa plus hruška je sedem.');
    expect(sl.row({ terms: [term('banana', 'bunch', 2)], total: 2 })).toBe('Dve banani sta dve.');
    expect(sl.row({ terms: [term('orange', 'times', 2), term('pear', 'one', 1, -1)], total: 1 })).toBe('Dvakrat pomaranča minus hruška je ena.');
    expect(sl.ask([term('banana'), term('pear')])).toBe('Koliko je banana plus hruška?');
    expect(sl.found('apple', 3)).toBe('Tako je, tri!');
  });

  it('reads the same rows in English', () => {
    expect(en.row({ terms: [term('apple'), term('apple')], total: 6 })).toBe('Apple plus apple makes 6.');
    expect(en.row({ terms: [term('strawberry', 'bunch', 3)], total: 12 })).toBe('Three strawberries make 12.');
    expect(en.row({ terms: [term('orange', 'times', 2), term('pear', 'one', 1, -1)], total: 1 })).toBe('Two times orange minus pear makes 1.');
  });

  it('has a line for every world', () => {
    expect(Object.keys(sl.ideas)).toEqual(Object.keys(en.ideas));
    expect(Object.keys(sl.worlds)).toEqual(Object.keys(en.worlds));
    expect(sl.oops).toHaveLength(en.oops.length);
  });

  it('never uses a gendered past form about the player', () => {
    expect(spokenLines().filter((line) => /(našel|našla|uganil|uganila|zmagal|zmagala|razvozlal|priden|pridna)/i.test(line))).toEqual([]);
  });
});
