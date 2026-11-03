import { missingClips } from '@playroom/kit';
import type { Topology } from 'topojson-specification';
import countriesRaw from 'world-atlas/countries-50m.json?raw';
import { describe, expect, it } from 'vitest';
import { REGIONS } from '../data/regions.ts';
import { CLUE_COUNT, mostStarsFor, ROUND_SIZE, starsFor } from '../game/score.ts';
import { countryFeatures, prettyCountryName } from '../geo/countries.ts';
import { SL_COUNTRIES } from './countries.ts';
import { en } from './en.ts';
import { SL_PLACES } from './places/index.ts';
import clips from './sl.clips.json';
import { sl, spokenLines } from './sl.ts';

describe('Slovenian lines', () => {
  it('has a clip for every line', () => {
    expect(missingClips(clips, spokenLines())).toEqual([]);
  });

  it('translates every place and every animal in it, and nothing else', () => {
    expect(Object.keys(SL_PLACES).sort()).toEqual(REGIONS.map((region) => region.id).sort());
    for (const region of REGIONS) {
      const ids = region.animals.map((animal) => animal.id).sort();
      expect(Object.keys(SL_PLACES[region.id].animals).sort(), region.id).toEqual(ids);
    }
  });

  it('declares every line the game can speak about every place', () => {
    const lines = new Set(spokenLines());
    for (const region of REGIONS) {
      const place = sl.place(region);
      expect(place).not.toBe(region);
      expect(lines.has(sl.placeSpoken(place)), region.id).toBe(true);
      for (const animal of region.animals) {
        const said = sl.animal(region, animal);
        expect(said).not.toBe(animal);
        expect(said.clues).toHaveLength(3);
        for (const clue of said.clues) expect(lines.has(clue), `${region.id}/${animal.id}: ${clue}`).toBe(true);
        expect(lines.has(sl.factSpoken(said)), `${region.id}/${animal.id}`).toBe(true);
      }
    }
  });

  it('declares every line the round itself says, however it goes', () => {
    const lines = new Set(spokenLines());
    expect(lines.has(sl.hint)).toBe(true);
    expect(lines.has(sl.whoAmI)).toBe(true);
    for (let clues = 1; clues <= CLUE_COUNT; clues++) {
      for (const guessed of [true, false]) expect(lines.has(sl.outcome(starsFor(clues, guessed)))).toBe(true);
    }
    for (let total = 0; total <= mostStarsFor(ROUND_SIZE); total++) expect(lines.has(sl.cheer(total)), String(total)).toBe(true);
    expect(sl.cheer(1)).toBe('Juhu! Imate eno zvezdico! Zdaj poznate pet novih živali.');
    expect(sl.cheer(11)).toBe('Juhu! Imate enajst zvezdic! Zdaj poznate pet novih živali.');
  });

  it('keeps every spoken line free of digits and English units, so the voice reads it as written', () => {
    expect(spokenLines().filter((line) => /\d|miles|mph|km\/h/.test(line))).toEqual([]);
  });

  it('never uses a gendered past form about the players', () => {
    const words = [sl.gotIt, sl.hint, sl.reveal, sl.nextClue, sl.tapMe];
    expect(words.filter((line) => /(uganil|našel|našla|ugotovil)/i.test(line))).toEqual([]);
  });

  it('names every country the map can show', () => {
    const topology = JSON.parse(countriesRaw) as Topology;
    const names = new Set(countryFeatures(topology).map((country) => prettyCountryName(country.properties.name)));
    expect([...names].filter((name) => !(name in SL_COUNTRIES))).toEqual([]);
    expect(sl.country('Slovenia')).toBe('Slovenija');
    expect(en.country('Slovenia')).toBe('Slovenia');
  });

  it('counts stars with the right word', () => {
    expect(sl.stars(0)).toBe('0 zvezdic');
    expect(sl.stars(1)).toBe('1 zvezdica');
    expect(sl.stars(2)).toBe('2 zvezdici');
    expect(sl.stars(3)).toBe('3 zvezdice');
    expect(sl.stars(5)).toBe('5 zvezdic');
    expect(sl.stars(101)).toBe('101 zvezdica');
  });
});
