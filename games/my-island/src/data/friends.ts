export type FriendId = 'tobi' | 'moko' | 'kiki' | 'gogo' | 'nino' | 'bibo' | 'zuzu' | 'pepi';

export interface Friend {
  id: FriendId;
  emoji: string;
  /** Where they stand, in world tiles. */
  x: number;
  z: number;
  /** Which way they face, in radians. */
  facing: number;
  /** The Island Level at which they first appear. */
  level: number;
  /** The part of the island they look after. */
  home: 'beach' | 'farm' | 'pets' | 'bakery' | 'pond' | 'forest' | 'hill' | 'snow';
}

export const FRIENDS: readonly Friend[] = [
  { id: 'tobi', emoji: '🐢', x: 49, z: 60, facing: 0.3, level: 1, home: 'beach' },
  { id: 'moko', emoji: '🐹', x: 35, z: 49, facing: -0.6, level: 1, home: 'farm' },
  { id: 'kiki', emoji: '🦜', x: 36, z: 38, facing: 0.4, level: 1, home: 'pets' },
  { id: 'gogo', emoji: '🐐', x: 55, z: 39, facing: -0.5, level: 1, home: 'bakery' },
  { id: 'nino', emoji: '🐸', x: 66, z: 51, facing: -0.8, level: 1, home: 'pond' },
  { id: 'bibo', emoji: '🍄', x: 64, z: 32, facing: 0.2, level: 1, home: 'forest' },
  { id: 'zuzu', emoji: '🐝', x: 91, z: 44, facing: -1.2, level: 4, home: 'hill' },
  { id: 'pepi', emoji: '🐧', x: 46, z: 13, facing: 0.5, level: 7, home: 'snow' },
];

export const friendById = (id: FriendId): Friend => {
  const found = FRIENDS.find((friend) => friend.id === id);
  if (!found) throw new Error(`Unknown friend ${id}`);
  return found;
};
