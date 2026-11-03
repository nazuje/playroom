import { describe, expect, it } from 'vitest';
import { GAMES as REGISTRY, SKILL_LABELS, type Game, type Skill } from './games.ts';
import { NEW_COUNT, SKILL_SHELVES, buildShelves, type ShelfId } from './shelves.ts';

function game(slug: string, skills: Skill[]): Game {
  return { slug, title: slug, emoji: '🎲', tagline: '', skills, ages: '4-9', modes: ['solo'], languages: ['en'], color: '#000000', status: 'ready' };
}

const slugsOn = (games: Game[], id: ShelfId, recent: Game[] = []) =>
  buildShelves(games, recent).find((shelf) => shelf.id === id)?.games.map((g) => g.slug);

describe('buildShelves', () => {
  const games = [
    game('maze', ['logic', 'challenge']),
    game('pop', ['fun']),
    game('fly', ['3d', 'action', 'fun']),
    game('globe', ['world']),
    game('words', ['reading']),
    game('hop', ['moving']),
    game('sums', ['numbers']),
    game('paint', ['colors']),
  ];

  it('shows the last six added on the new shelf, newest first', () => {
    expect(slugsOn(games, 'new')).toEqual(['paint', 'sums', 'hop', 'words', 'globe', 'fly']);
    expect(NEW_COUNT).toBe(6);
  });

  it('shows every game as new while there are fewer than six', () => {
    expect(slugsOn(games.slice(0, 2), 'new')).toEqual(['pop', 'maze']);
  });

  it('puts a game on every shelf one of its skills belongs to, in registry order', () => {
    expect(slugsOn(games, 'brain')).toEqual(['maze', 'words', 'sums', 'paint']);
    expect(slugsOn(games, 'fun')).toEqual(['pop', 'fly']);
    expect(slugsOn(games, 'action')).toEqual(['fly', 'hop']);
    expect(slugsOn(games, 'challenge')).toEqual(['maze']);
    expect(slugsOn(games, 'explore')).toEqual(['globe']);
  });

  it('keeps the shelves in a steady order', () => {
    const ids = buildShelves(games, [games[1]]).map((shelf) => shelf.id);
    expect(ids).toEqual(['new', 'recent', 'brain', 'fun', 'action', 'challenge', 'explore']);
  });

  it('shows the played-lately shelf as given, and hides it when empty', () => {
    expect(slugsOn(games, 'recent', [games[3], games[0]])).toEqual(['globe', 'maze']);
    expect(slugsOn(games, 'recent')).toBeUndefined();
  });

  it('puts games still coming soon after the playable ones', () => {
    const soon = { ...game('soon', ['fun']), status: 'coming-soon' as const };
    expect(slugsOn([game('pop', ['fun']), soon, game('band', ['fun'])], 'new')).toEqual(['band', 'pop', 'soon']);
    expect(slugsOn([soon, game('pop', ['fun'])], 'fun')).toEqual(['pop', 'soon']);
  });

  it('leaves out shelves with nothing on them', () => {
    expect(buildShelves([game('pop', ['fun'])], []).map((shelf) => shelf.id)).toEqual(['new', 'fun']);
    expect(buildShelves([], [])).toEqual([]);
  });
});

describe('shelves and the registry', () => {
  it('give every skill a shelf, so a new game always lands on one', () => {
    const shelved = new Set(SKILL_SHELVES.flatMap((shelf) => shelf.skills));
    for (const skill of Object.keys(SKILL_LABELS) as Skill[]) expect(shelved.has(skill), skill).toBe(true);
  });

  it('put every registered game on at least one skill shelf', () => {
    const skillShelves = buildShelves(REGISTRY, []).filter((shelf) => shelf.id !== 'new');
    for (const entry of REGISTRY) {
      expect(skillShelves.some((shelf) => shelf.games.includes(entry)), entry.slug).toBe(true);
    }
  });
});
