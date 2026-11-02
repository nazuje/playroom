import type { Area } from '../data/map.ts';
import type { FriendId } from '../data/friends.ts';

/** Every plain spoken line, by name. The words live in src/lang, so rules can ask for a line without knowing the language. */
export const LINE_KEYS = [
  'pickIsland',
  'pickAvatar',
  'makeYou',
  'welcome',
  'pickSeed',
  'waterIt',
  'watered',
  'growing',
  'harvested',
  'locked',
  'rain',
  'petCorner',
  'newPet',
  'feed',
  'brush',
  'play',
  'follow',
  'stay',
  'bakery',
  'bowl',
  'oven',
  'baked',
  'needCrops',
  'giveIt',
  'yum',
  'fishStart',
  'fishCaught',
  'fishMiss',
  'newFind',
  'book',
  'house',
  'decorOut',
  'placed',
  'needShells',
  'noRoom',
  'wardrobe',
  'looksGreat',
  'bridgeShut',
  'boatShut',
  'sail',
  'sailHome',
  'rainbow',
  'star',
  'parade',
  'butterfly',
  'whale',
  'plantFirst',
  'waterPlant',
  'waitGrow',
  'pickRipe',
  'bakeFirst',
  'allDone',
] as const;
export type LineKey = (typeof LINE_KEYS)[number];

/** Something to say, described rather than written out. */
export type Say =
  | { line: LineKey }
  | { quest: string }
  | { thanks: number }
  | { needs: FriendId }
  | { back: FriendId }
  | { chat: FriendId }
  | { level: number }
  | { area: Area };

export type Sound = 'pop' | 'boing' | 'ding' | 'whoosh' | 'bonk' | 'dig' | 'burp' | 'toot' | 'tada';

export type Panel = 'seeds' | 'bakery' | 'pets' | 'care' | 'fishing' | 'give' | 'wardrobe' | 'house';

/** What one action did, for the screen and the speaker to show. */
export interface Outcome {
  say: Say[];
  /** Said after a pause, as a moment of its own. */
  then?: Say[];
  sound?: Sound;
  open?: Panel;
  /** Confetti. */
  cheer?: boolean;
  shells?: number;
  /** A new Island Level just reached. */
  level?: number;
  quest?: 'accepted' | 'progress' | 'ready' | 'finished';
  /** A book entry seen for the first time. */
  first?: string;
}

export const outcome = (extra: Partial<Outcome> = {}): Outcome => ({ say: [], ...extra });
