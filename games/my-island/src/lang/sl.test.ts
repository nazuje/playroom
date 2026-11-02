import { missingClips } from '@playroom/kit';
import { describe, expect, it } from 'vitest';
import { FRIENDS } from '../data/friends.ts';
import { QUESTS } from '../data/quests.ts';
import { TOP_LEVEL } from '../data/levels.ts';
import { LINE_KEYS } from '../rules/say.ts';
import { en } from './en.ts';
import { words } from './index.ts';
import clips from './sl.clips.json';
import { sl, spokenLines } from './sl.ts';

describe('Slovenian', () => {
  it('has a clip for every line', () => {
    expect(missingClips(clips, spokenLines())).toEqual([]);
  });

  it('keeps to about 150 spoken lines', () => {
    expect(spokenLines().length).toBeLessThanOrEqual(150);
  });

  it('has a line for every quest, friend, level and plain line, in both languages', () => {
    for (const text of [en, sl]) {
      for (const quest of QUESTS) expect(text.quests[quest.id], quest.id).toBeTruthy();
      for (const friend of FRIENDS) {
        expect(text.needs[friend.id]).toBeTruthy();
        expect(text.backTo[friend.id]).toBeTruthy();
        expect(text.chat[friend.id]).toBeTruthy();
      }
      for (let level = 2; level <= TOP_LEVEL; level += 1) expect(words({ level }, text)).toBeTruthy();
      for (const key of LINE_KEYS) expect(text.lines[key], key).toBeTruthy();
    }
  });

  it('keeps every spoken line short', () => {
    for (const line of spokenLines()) expect(line.split(/\s+/).length, line).toBeLessThanOrEqual(12);
  });

  it('every line the game can say is in the list', () => {
    const lines = new Set(spokenLines());
    for (const quest of QUESTS) expect(lines.has(words({ quest: quest.id }, sl))).toBe(true);
    for (let thanks = 0; thanks < 5; thanks += 1) expect(lines.has(words({ thanks }, sl))).toBe(true);
  });
});
