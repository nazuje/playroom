import { describe, expect, it } from 'vitest';
import type { Game } from './games.ts';
import { RECENT_LIMIT, recentGames, recordPlay, restoreRecent } from './recent.ts';

function game(slug: string): Game {
  return { slug, title: slug, emoji: '🎲', tagline: '', skills: ['fun'], ages: '4-9', modes: ['solo'], languages: ['en'], color: '#000000', status: 'ready' };
}

describe('recordPlay', () => {
  it('puts the newest play first', () => {
    expect(recordPlay(['a', 'b'], 'c')).toEqual(['c', 'a', 'b']);
  });

  it('lists a game once, moving it to the front when played again', () => {
    expect(recordPlay(['a', 'b', 'c'], 'b')).toEqual(['b', 'a', 'c']);
    expect(recordPlay(['a'], 'a')).toEqual(['a']);
  });

  it('forgets the oldest past the limit', () => {
    const full = Array.from({ length: RECENT_LIMIT }, (_, n) => `g${n}`);
    const next = recordPlay(full, 'new');
    expect(next).toHaveLength(RECENT_LIMIT);
    expect(next[0]).toBe('new');
    expect(next).not.toContain(`g${RECENT_LIMIT - 1}`);
    expect(recordPlay(['a', 'b', 'c'], 'd', 2)).toEqual(['d', 'a']);
  });

  it('leaves the old list alone', () => {
    const list = ['a'];
    recordPlay(list, 'b');
    expect(list).toEqual(['a']);
  });
});

describe('restoreRecent', () => {
  it('keeps lists of names for each player', () => {
    expect(restoreRecent({ p1: ['a', 'b'], everyone: ['c'] })).toEqual({ p1: ['a', 'b'], everyone: ['c'] });
  });

  it('drops odd values, repeats and anything past the limit', () => {
    const long = Array.from({ length: RECENT_LIMIT + 4 }, (_, n) => `g${n}`);
    expect(restoreRecent({ p1: ['a', 3, null, 'a', 'b'], p2: 'a', p3: long })).toEqual({
      p1: ['a', 'b'],
      p3: long.slice(0, RECENT_LIMIT),
    });
  });

  it('starts empty from anything else', () => {
    expect(restoreRecent(null)).toEqual({});
    expect(restoreRecent(['a'])).toEqual({});
    expect(restoreRecent('a')).toEqual({});
  });
});

describe('recentGames', () => {
  it('keeps the play order and skips games that are gone or hidden', () => {
    const games = [game('a'), game('b'), game('c')];
    expect(recentGames(['c', 'gone', 'a'], games).map((g) => g.slug)).toEqual(['c', 'a']);
  });
});
