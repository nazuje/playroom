import { missingClips } from '@playroom/kit';
import { describe, expect, it } from 'vitest';
import { COLORS } from '../mix.ts';
import type { ColorId } from '../mix.ts';
import { QUESTIONS, TARGETS } from '../rounds.ts';
import clips from './sl.clips.json';
import { SL_COLORS, sl, spokenLines } from './sl.ts';

describe('Slovenian lines', () => {
  it('has a clip for every line', () => {
    expect(missingClips(clips, spokenLines())).toEqual([]);
  });

  it('names every color, each one differently', () => {
    const ids = Object.keys(COLORS) as ColorId[];
    expect(Object.keys(SL_COLORS).sort()).toEqual([...ids].sort());
    expect(new Set(ids.map((id) => SL_COLORS[id].nom)).size).toBe(ids.length);
  });

  it('declares every question, request, hint and mix result', () => {
    const lines = spokenLines();
    for (const { a, b } of Object.values(QUESTIONS).flat()) {
      const question = { a: b, b: a };
      expect(lines).toContain(sl.guessAsk({ a, b }));
      expect(lines).toContain(sl.guessAsk(question));
      expect(lines).toContain(sl.guessReveal(question, true));
      expect(lines).toContain(sl.guessReveal(question, false));
    }
    for (const target of Object.values(TARGETS).flat()) {
      expect(lines).toContain(sl.request(target.color));
      expect(lines).toContain(sl.madeIt(target.color));
      expect(lines).toContain(sl.hintSpoken(target.recipe));
    }
    for (const id of Object.keys(COLORS) as ColorId[]) {
      expect(lines).toContain(sl.colorSpoken(id));
      expect(lines).toContain(sl.madeOther(id));
    }
  });

  it('makes colors agree with barva, which is feminine', () => {
    expect(sl.guessReveal({ a: 'red', b: 'yellow' }, true)).toBe('Ja! Rdeča in rumena dasta oranžno!');
    expect(sl.guessReveal({ a: 'red', b: 'white' }, false)).toBe('Oho, presenečenje! Rdeča in bela dasta roza!');
    expect(sl.request('navy')).toBe('Potrebujem temnomodro barvo!');
    expect(sl.request('lilac')).toBe('Potrebujem lila barvo!');
    expect(sl.hintLine({ red: 1, blue: 1, white: 1 })).toBe('Vzemi rdečo, modro in belo.');
    expect(sl.madeIt('green')).toBe('Juhu, to je zelena! Hvala!');
    // A shade of one hue is one word in Slovenian.
    expect(sl.madeOther('taupe')).toBe('Oho, to je sivorjava! Poskusi še enkrat!');
    expect(Object.values(SL_COLORS).filter(({ nom }) => nom.includes(' '))).toEqual([]);
  });

  it('counts stars with the right word', () => {
    expect(sl.roundLine(1)).toBe('Imaš eno zvezdico! Kako lepo mešaš!');
    expect(sl.roundLine(2)).toBe('Imaš dve zvezdici! Kako lepo mešaš!');
    expect(sl.roundLine(3)).toBe('Imaš tri zvezdice! Kako lepo mešaš!');
    expect(sl.roundLine(5)).toBe('Imaš pet zvezdic! Kako lepo mešaš!');
    expect(sl.starsLabel(4)).toBe('4 zvezdice');
  });

  it('never uses a gendered past form about the child', () => {
    expect(spokenLines().filter((line) => /\b(naredil|naredila|zmešal|zmešala|uganil|uganila)\b/i.test(line))).toEqual(
      [],
    );
  });
});
