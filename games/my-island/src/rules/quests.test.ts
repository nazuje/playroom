import { describe, expect, it } from 'vitest';
import { FRIENDS } from '../data/friends.ts';
import { BOAT_LEVEL, BRIDGE_LEVEL, LEVEL_STEPS, TOP_LEVEL } from '../data/levels.ts';
import { QUESTS } from '../data/quests.ts';
import { acceptQuest, finishQuest, levelFor, recordEvent } from './quests.ts';
import { newIsland } from './state.ts';

describe('the quest ladder', () => {
  it('has about 30 quests from 6 to 8 friends, reaching level 10 at the end', () => {
    expect(QUESTS).toHaveLength(30);
    expect(new Set(QUESTS.map(({ friend }) => friend)).size).toBe(FRIENDS.length);
    expect(levelFor(QUESTS.length)).toBe(TOP_LEVEL);
    expect(TOP_LEVEL).toBe(10);
    expect([...LEVEL_STEPS].sort((a, b) => a - b)).toEqual([...LEVEL_STEPS]);
  });

  it('never asks a friend for help before that friend can be reached', () => {
    QUESTS.forEach((quest, done) => {
      const friend = FRIENDS.find(({ id }) => id === quest.friend)!;
      expect(levelFor(done), quest.id).toBeGreaterThanOrEqual(friend.level);
    });
    expect(FRIENDS.find(({ id }) => id === 'zuzu')?.level).toBe(BRIDGE_LEVEL);
    expect(FRIENDS.find(({ id }) => id === 'pepi')?.level).toBe(BOAT_LEVEL);
  });

  it('starts a job when the friend is spoken to, counts it, and pays on handing in', () => {
    const island = newIsland(0);
    expect(recordEvent(island, { type: 'collect', category: 'shell', habitat: 'beach' })).toBe(false);
    acceptQuest(island);
    expect(island.quests.stage).toBe('active');
    recordEvent(island, { type: 'collect', category: 'bug', habitat: 'forest' });
    recordEvent(island, { type: 'collect', category: 'shell', habitat: 'beach' });
    recordEvent(island, { type: 'collect', category: 'shell', habitat: 'beach' });
    expect(island.quests.count).toBe(2);
    expect(recordEvent(island, { type: 'collect', category: 'shell', habitat: 'beach' })).toBe(true);
    const paid = finishQuest(island);
    expect(paid.shells).toBe(QUESTS[0]?.shells);
    expect(island.quests).toEqual({ done: 1, stage: 'offered', count: 0 });
  });

  it('pays nothing for a job not yet done', () => {
    const island = newIsland(0);
    expect(finishQuest(island).shells).toBe(0);
  });
});
