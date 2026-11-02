import { store } from '@playroom/kit';
import type { SaveStorage } from './rules/save.ts';

const PREFIX = 'playroom:';

/** The kit's store, which never throws, plus a direct look at whether a key holds anything at all. */
export const deviceStorage: SaveStorage = {
  get: (key, fallback) => store.get(key, fallback),
  set: (key, value) => store.set(key, value),
  has(key) {
    return localStorage.getItem(PREFIX + key) !== null;
  },
};
