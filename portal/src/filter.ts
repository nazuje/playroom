import { LANGUAGES, type Language } from '@playroom/kit';
import { SKILL_LABELS, type Game, type Mode, type Skill } from './games.ts';

export const AGES = [4, 6] as const;

export interface Filters {
  mode: Mode | 'all';
  age: (typeof AGES)[number] | 'all';
  skill: Skill | 'all';
  language: Language | 'all';
}

export const NO_FILTERS: Filters = { mode: 'all', age: 'all', skill: 'all', language: 'all' };

/** The skills at least one game teaches, in the same steady order every time. */
export function skillsIn(games: readonly Game[]): Skill[] {
  const used = new Set(games.flatMap((game) => game.skills));
  return (Object.keys(SKILL_LABELS) as Skill[]).filter((skill) => used.has(skill));
}

/** The languages at least one game has, in the same steady order every time. */
export function languagesIn(games: readonly Game[]): Language[] {
  const used = new Set(games.flatMap((game) => game.languages));
  return (Object.keys(LANGUAGES) as Language[]).filter((language) => used.has(language));
}

/** The languages worth showing on a tile. A game only in English says nothing, since that's the usual case. */
export function tileLanguages({ languages }: Game): Language[] {
  return languages.length > 1 || languages[0] !== 'en' ? languages : [];
}

/** The name a tile shows in this language, falling back to the English name. */
export function tileWords(game: Game, language: Language): { title: string; tagline: string } {
  return game.translations?.[language] ?? game;
}

/** Reads a range such as "4-9". Anything else gives null. */
export function parseAges(ages: string): { min: number; max: number } | null {
  const match = /^(\d+)-(\d+)$/.exec(ages);
  return match ? { min: Number(match[1]), max: Number(match[2]) } : null;
}

/** Whether an age falls inside a game's range, ends included. An unreadable range suits nobody. */
export function suitsAge(game: Game, age: number): boolean {
  const range = parseAges(game.ages);
  return range !== null && range.min <= age && age <= range.max;
}

/** Every filter must agree for a game to show. */
export function applyFilter(games: readonly Game[], { mode, age, skill, language }: Filters): Game[] {
  return games.filter(
    (game) =>
      (mode === 'all' || game.modes.includes(mode)) &&
      (age === 'all' || suitsAge(game, age)) &&
      (skill === 'all' || game.skills.includes(skill)) &&
      (language === 'all' || game.languages.includes(language)),
  );
}

/** Whether a grown-up has narrowed the games down at all. */
export function isFiltered(filters: Filters): boolean {
  return (Object.keys(NO_FILTERS) as (keyof Filters)[]).some((key) => filters[key] !== 'all');
}

/** A remembered filter can go stale when the registry changes, so it falls back to everything. */
export function restoreFilter<T>(saved: unknown, options: readonly T[]): T | 'all' {
  return options.find((option) => option === saved) ?? 'all';
}
