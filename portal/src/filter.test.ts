import { describe, expect, it } from 'vitest';
import type { Language } from '@playroom/kit';
import {
  NO_FILTERS,
  applyFilter,
  isFiltered,
  languagesIn,
  parseAges,
  restoreFilter,
  skillsIn,
  tileLanguages,
  tileWords,
  type Filters,
} from './filter.ts';
import { GAMES as REGISTRY, MODE_LABELS, type Game, type Mode, type Skill } from './games.ts';

function game(
  slug: string,
  skills: Skill[],
  ages = '4-9',
  modes: Mode[] = ['solo', 'together'],
  languages: Language[] = ['en'],
): Game {
  return { slug, title: slug, emoji: '🎲', tagline: '', skills, ages, modes, languages, color: '#000000', status: 'ready' };
}

const GAMES = [
  game('a', ['reading'], '3-4'),
  game('b', ['world', 'reading'], '4-6', ['together'], ['en', 'sl']),
  game('c', ['memory'], '6-9', ['solo'], ['sl']),
];

describe('skillsIn', () => {
  it('lists each used skill once, in the fixed order', () => {
    expect(skillsIn(GAMES)).toEqual(['world', 'memory', 'reading']);
  });
});

describe('languagesIn', () => {
  it('lists each language once, in the fixed order', () => {
    expect(languagesIn(GAMES)).toEqual(['sl', 'en']);
  });

  it('leaves out a language no game has yet', () => {
    expect(languagesIn([game('a', ['memory'])])).toEqual(['en']);
  });
});

describe('tileWords', () => {
  it('uses the translated name when there is one, and English otherwise', () => {
    const named = { ...game('a', ['memory']), title: 'Memory Zoo', tagline: 'Pairs!' };
    const translated = { ...named, translations: { sl: { title: 'Živalski spomin', tagline: 'Pari!' } } };
    expect(tileWords(translated, 'sl').title).toBe('Živalski spomin');
    expect(tileWords(translated, 'en').title).toBe('Memory Zoo');
    expect(tileWords(named, 'sl').tagline).toBe('Pairs!');
  });
});

describe('tileLanguages', () => {
  it('stays quiet for a game only in English', () => {
    expect(tileLanguages(game('a', ['memory']))).toEqual([]);
  });

  it('shows every language of a game with more than one', () => {
    expect(tileLanguages(game('a', ['memory'], '4-9', ['solo'], ['en', 'sl']))).toEqual(['en', 'sl']);
  });

  it('shows the language of a game that is not in English', () => {
    expect(tileLanguages(game('a', ['memory'], '4-9', ['solo'], ['sl']))).toEqual(['sl']);
  });
});

describe('parseAges', () => {
  it('reads a range', () => {
    expect(parseAges('3-9')).toEqual({ min: 3, max: 9 });
    expect(parseAges('10-12')).toEqual({ min: 10, max: 12 });
  });

  it('gives null for anything else', () => {
    expect(parseAges('')).toBeNull();
    expect(parseAges('4')).toBeNull();
    expect(parseAges('4 to 9')).toBeNull();
  });
});

describe('applyFilter', () => {
  const slugs = (filters: Partial<Filters>) => applyFilter(GAMES, { ...NO_FILTERS, ...filters }).map((g) => g.slug);

  it('shows every game with no filters', () => {
    expect(applyFilter(GAMES, NO_FILTERS)).toEqual(GAMES);
  });

  it('keeps only games with the chosen skill', () => {
    expect(slugs({ skill: 'reading' })).toEqual(['a', 'b']);
  });

  it('keeps only games with the chosen mode', () => {
    expect(slugs({ mode: 'solo' })).toEqual(['a', 'c']);
    expect(slugs({ mode: 'together' })).toEqual(['a', 'b']);
  });

  it('keeps only games in the chosen language', () => {
    expect(slugs({ language: 'en' })).toEqual(['a', 'b']);
    expect(slugs({ language: 'sl' })).toEqual(['b', 'c']);
  });

  it('counts both ends of the age range', () => {
    expect(slugs({ age: 4 })).toEqual(['a', 'b']);
    expect(slugs({ age: 6 })).toEqual(['b', 'c']);
    expect(slugs({ age: 9 })).toEqual(['c']);
    expect(slugs({ age: 12 })).toEqual([]);
  });

  it('never matches an age on a game with an unreadable range', () => {
    const broken = game('x', ['memory'], 'soon');
    expect(applyFilter([broken], { ...NO_FILTERS, age: 4 })).toEqual([]);
  });

  it('combines language with the other filters with AND', () => {
    expect(slugs({ language: 'sl', mode: 'solo' })).toEqual(['c']);
    expect(slugs({ language: 'sl', age: 4 })).toEqual(['b']);
    expect(slugs({ language: 'en', skill: 'reading', mode: 'together', age: 6 })).toEqual(['b']);
    expect(slugs({ language: 'sl', skill: 'memory', mode: 'together' })).toEqual([]);
  });

  it('combines all three filters with AND', () => {
    expect(slugs({ mode: 'together', skill: 'reading' })).toEqual(['a', 'b']);
    expect(slugs({ mode: 'together', age: 6 })).toEqual(['b']);
    expect(slugs({ mode: 'solo', age: 4, skill: 'reading' })).toEqual(['a']);
  });

  it('can come up empty', () => {
    expect(slugs({ mode: 'solo', age: 6, skill: 'reading' })).toEqual([]);
  });
});

describe('the registry', () => {
  it('gives every game a readable age range, at least one mode and a language', () => {
    for (const entry of REGISTRY) {
      expect(entry.languages.length, entry.slug).toBeGreaterThan(0);
      expect(parseAges(entry.ages), entry.slug).not.toBeNull();
      expect(entry.modes.length, entry.slug).toBeGreaterThan(0);
      expect(entry.modes.every((mode) => mode in MODE_LABELS), entry.slug).toBe(true);
    }
  });
});

describe('tile names', () => {
  // A tile on a 320px phone fits about 12 letters a line and shows two lines.
  const MAX_TITLE = 24;
  const MAX_WORD = 12;

  it('fit a phone tile in full, in every language', () => {
    for (const entry of REGISTRY) {
      for (const language of ['en', 'sl'] as const) {
        const { title } = tileWords(entry, language);
        expect([...title].length, `${entry.slug} ${language}: ${title}`).toBeLessThanOrEqual(MAX_TITLE);
        for (const word of title.split(/\s+/)) {
          expect([...word].length, `${entry.slug} ${language}: ${word}`).toBeLessThanOrEqual(MAX_WORD);
        }
      }
    }
  });
});

describe('restoreFilter', () => {
  it('keeps a saved skill that is still available', () => {
    expect(restoreFilter('world', ['world', 'memory'])).toBe('world');
  });

  it('keeps a saved age', () => {
    expect(restoreFilter(6, [4, 6])).toBe(6);
  });

  it('keeps a saved language only while a game has it', () => {
    expect(restoreFilter('sl', ['sl', 'en'])).toBe('sl');
    expect(restoreFilter('sl', ['en'])).toBe('all');
  });

  it('falls back to all for anything else', () => {
    expect(restoreFilter('numbers', ['world'])).toBe('all');
    expect(restoreFilter(null, ['world'])).toBe('all');
  });
});

describe('isFiltered', () => {
  it('is off with nothing chosen and on with anything chosen', () => {
    expect(isFiltered(NO_FILTERS)).toBe(false);
    expect(isFiltered({ ...NO_FILTERS, skill: 'fun' })).toBe(true);
    expect(isFiltered({ ...NO_FILTERS, language: 'sl' })).toBe(true);
  });
});

describe('remembered filters', () => {
  it('restore to nothing chosen when storage holds junk', () => {
    const restored: Filters = {
      mode: restoreFilter('alone', ['solo', 'together']),
      age: restoreFilter('6', [4, 6]),
      skill: restoreFilter({ skill: 'fun' }, skillsIn(REGISTRY)),
      language: restoreFilter('de', languagesIn(REGISTRY)),
    };
    expect(restored).toEqual(NO_FILTERS);
    expect(isFiltered(restored)).toBe(false);
  });
});
