import { missingClips } from '@playroom/kit';
import { describe, expect, it } from 'vitest';
import { EVERY_PUZZLE, KID_RULES } from '../rules/levels.ts';
import { readRule } from '../rules/machine.ts';
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

  it('can say every example, question and rule of every puzzle, and every card', () => {
    const lines = spokenLines();
    for (const level of EVERY_PUZZLE) {
      const { puzzle } = level;
      for (const pair of puzzle.examples) expect(lines).toContain(sl.pair(pair.from, pair.to));
      expect(lines).toContain(sl.rules(puzzle.machines));
      for (const rule of puzzle.machines) expect(lines).toContain(sl.rules([rule]));
      if (puzzle.ask === 'out') expect(lines).toContain(sl.askOut(puzzle.given as number));
      if (puzzle.ask === 'in') expect(lines).toContain(sl.askIn(puzzle.given as number));
      if (typeof level.truth === 'number') expect(lines).toContain(sl.cheer(level.truth));
      for (const card of level.cards) expect(lines).toContain(sl.rules([card]));
    }
    for (const rule of KID_RULES) expect(lines).toContain(sl.rules([rule]));
  });

  it('reads examples and rules with the counting forms', () => {
    expect(sl.pair(2, 4)).toBe('Noter gre dve, ven pride štiri.');
    expect(sl.pair(1, 0)).toBe('Noter gre ena, ven pride nič.');
    expect(sl.askOut(15)).toBe('Noter gre petnajst. Kaj pride ven?');
    expect(sl.askIn(20)).toBe('Ven pride dvajset. Kaj je šlo noter?');
    expect(sl.rules([readRule('x2'), readRule('+1')])).toBe('Podvoji, potem plus ena!');
    expect(sl.rules([readRule('/2')])).toBe('Razpolovi!');
    expect(sl.rules([readRule('-2')])).toBe('Minus dve!');
    expect(sl.rules([readRule('x3')])).toBe('Krat tri!');
    expect(sl.cheer(7)).toBe('Tako je, sedem!');
  });

  it('reads the same in English', () => {
    expect(en.pair(2, 4)).toBe('2 goes in, 4 comes out.');
    expect(en.rules([readRule('x2'), readRule('+1')])).toBe('Double, then plus one!');
    expect(en.rules([readRule('/2')])).toBe('Half!');
    expect(en.rules([readRule('+10')])).toBe('Plus ten!');
  });

  it('has a line for every world', () => {
    expect(Object.keys(sl.ideas)).toEqual(Object.keys(en.ideas));
    expect(Object.keys(sl.worlds)).toEqual(Object.keys(en.worlds));
    expect(sl.oops).toHaveLength(en.oops.length);
  });

  it('never uses a gendered past form about the player', () => {
    expect(spokenLines().filter((line) => /(našel|našla|uganil|uganila|zmagal|zmagala|popravil|popravila|priden|pridna)/i.test(line))).toEqual([]);
  });
});
