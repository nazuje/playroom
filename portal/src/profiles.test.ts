import { describe, expect, it } from 'vitest';
import type { Game } from './games.ts';
import {
  AVATARS,
  DEFAULT_PROFILES,
  EVERYONE,
  MAX_AGE,
  MAX_PROFILES,
  MIN_AGE,
  addProfile,
  editProfile,
  gamesFor,
  removeProfile,
  restoreChosen,
  restoreProfiles,
  type Profile,
} from './profiles.ts';

function game(slug: string, ages: string): Game {
  return { slug, title: slug, emoji: '🎲', tagline: '', skills: ['fun'], ages, modes: ['solo'], languages: ['en'], color: '#000000', status: 'ready' };
}

const FOX: Profile = { id: 'p1', avatar: '🦊', age: 4 };
const BEAR: Profile = { id: 'p2', avatar: '🐻', age: 6 };

describe('restoreProfiles', () => {
  it('starts with a 4-year-old fox and a 6-year-old bear', () => {
    expect(restoreProfiles(null)).toEqual([FOX, BEAR]);
    expect(DEFAULT_PROFILES).toEqual([FOX, BEAR]);
  });

  it('gives fresh copies of the defaults, so editing one never changes them', () => {
    restoreProfiles(undefined)[0].age = 9;
    expect(DEFAULT_PROFILES[0].age).toBe(4);
  });

  it('keeps saved profiles, including an empty list', () => {
    expect(restoreProfiles([BEAR])).toEqual([BEAR]);
    expect(restoreProfiles([])).toEqual([]);
  });

  it('drops entries that make no sense, and repeats', () => {
    const saved = [
      FOX,
      { ...FOX, avatar: '🐻' },
      { id: 'p3', avatar: '💩', age: 5 },
      { id: 'p4', avatar: '🐼', age: 2 },
      { id: 'p5', avatar: '🐼', age: 4.5 },
      { id: EVERYONE, avatar: '🐼', age: 5 },
      { id: '', avatar: '🐼', age: 5 },
      'p6',
      null,
      { id: 'p7', avatar: '🐼', age: 7, name: 'Secret' },
    ];
    expect(restoreProfiles(saved)).toEqual([FOX, { id: 'p7', avatar: '🐼', age: 7 }]);
  });

  it('falls back to the defaults for anything that is not a list', () => {
    expect(restoreProfiles('🦊')).toEqual([FOX, BEAR]);
    expect(restoreProfiles({ p1: FOX })).toEqual([FOX, BEAR]);
  });

  it('keeps no more than the limit', () => {
    const many = AVATARS.map((avatar, n) => ({ id: `p${n + 1}`, avatar, age: 5 }));
    expect(restoreProfiles(many)).toHaveLength(MAX_PROFILES);
  });
});

describe('restoreChosen', () => {
  it('keeps a profile that still exists', () => {
    expect(restoreChosen('p2', [FOX, BEAR])).toBe('p2');
  });

  it('falls back to everyone', () => {
    expect(restoreChosen('p9', [FOX, BEAR])).toBe(EVERYONE);
    expect(restoreChosen(EVERYONE, [FOX])).toBe(EVERYONE);
    expect(restoreChosen(null, [])).toBe(EVERYONE);
  });
});

describe('addProfile', () => {
  it('adds an unused animal with a new id', () => {
    expect(addProfile([FOX, BEAR])).toEqual([FOX, BEAR, { id: 'p3', avatar: '🐼', age: 5 }]);
    expect(addProfile([])).toEqual([{ id: 'p1', avatar: '🦊', age: 5 }]);
  });

  it('never reuses an id, even after a removal', () => {
    expect(addProfile([BEAR]).map((profile) => profile.id)).toEqual(['p2', 'p3']);
  });

  it('stops at the limit', () => {
    let profiles: Profile[] = [];
    for (let n = 0; n < MAX_PROFILES + 3; n += 1) profiles = addProfile(profiles);
    expect(profiles).toHaveLength(MAX_PROFILES);
    expect(new Set(profiles.map((profile) => profile.avatar)).size).toBe(MAX_PROFILES);
  });
});

describe('editProfile', () => {
  it('changes only the chosen profile', () => {
    expect(editProfile([FOX, BEAR], 'p2', { avatar: '🐸', age: 7 })).toEqual([FOX, { id: 'p2', avatar: '🐸', age: 7 }]);
  });

  it('keeps the age in range and the animal on the list', () => {
    expect(editProfile([FOX], 'p1', { age: MIN_AGE - 1 })[0].age).toBe(MIN_AGE);
    expect(editProfile([FOX], 'p1', { age: MAX_AGE + 1 })[0].age).toBe(MAX_AGE);
    expect(editProfile([FOX], 'p1', { avatar: '💩' })[0].avatar).toBe('🦊');
  });
});

describe('removeProfile', () => {
  it('removes one profile and can remove them all', () => {
    expect(removeProfile([FOX, BEAR], 'p1')).toEqual([BEAR]);
    expect(removeProfile([BEAR], 'p2')).toEqual([]);
  });
});

describe('gamesFor', () => {
  const games = [game('small', '3-5'), game('middle', '4-9'), game('big', '6-12'), game('odd', 'soon')];

  it('shows a child only the games whose ages include theirs', () => {
    expect(gamesFor(games, FOX).map((g) => g.slug)).toEqual(['small', 'middle']);
    expect(gamesFor(games, BEAR).map((g) => g.slug)).toEqual(['middle', 'big']);
  });

  it('shows everyone every game', () => {
    expect(gamesFor(games, undefined)).toEqual(games);
  });
});
