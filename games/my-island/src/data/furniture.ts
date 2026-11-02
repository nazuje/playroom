export type Room = 'home' | 'outdoor';

/** The house's floor, in tiles. */
export const ROOM = { width: 9, depth: 7 };

export interface Furniture {
  id: string;
  emoji: string;
  price: number;
  level: number;
  room: Room;
  /** Floor tiles it covers before turning: wide, deep. */
  size: readonly [number, number];
  /** Goes under everything else and can be walked on, like a rug. */
  flat?: boolean;
}

export const FURNITURE: readonly Furniture[] = [
  // Indoors
  { id: 'bed', emoji: '🛏️', price: 0, level: 1, room: 'home', size: [2, 3] },
  { id: 'table', emoji: '🍽️', price: 0, level: 1, room: 'home', size: [2, 2] },
  { id: 'rug', emoji: '🟪', price: 3, level: 1, room: 'home', size: [3, 2], flat: true },
  { id: 'chair', emoji: '🪑', price: 3, level: 1, room: 'home', size: [1, 1] },
  { id: 'lamp', emoji: '💡', price: 4, level: 1, room: 'home', size: [1, 1] },
  { id: 'teddy', emoji: '🧸', price: 4, level: 1, room: 'home', size: [1, 1] },
  { id: 'truckToy', emoji: '🚚', price: 5, level: 2, room: 'home', size: [2, 1] },
  { id: 'dinoToy', emoji: '🦕', price: 5, level: 2, room: 'home', size: [1, 1] },
  { id: 'sofa', emoji: '🛋️', price: 8, level: 3, room: 'home', size: [3, 1] },
  { id: 'shelf', emoji: '📚', price: 8, level: 3, room: 'home', size: [2, 1] },
  { id: 'plant', emoji: '🪴', price: 4, level: 3, room: 'home', size: [1, 1] },
  { id: 'fishbowl', emoji: '🐠', price: 6, level: 4, room: 'home', size: [1, 1] },
  { id: 'piano', emoji: '🎹', price: 12, level: 5, room: 'home', size: [2, 1] },
  { id: 'rocketLamp', emoji: '🚀', price: 10, level: 6, room: 'home', size: [1, 1] },
  { id: 'castleBed', emoji: '🏰', price: 16, level: 7, room: 'home', size: [3, 3] },
  { id: 'globe', emoji: '🌍', price: 10, level: 8, room: 'home', size: [1, 1] },
  // Outdoors
  { id: 'bench', emoji: '🪵', price: 4, level: 1, room: 'outdoor', size: [2, 1] },
  { id: 'flowerpot', emoji: '🌷', price: 2, level: 1, room: 'outdoor', size: [1, 1] },
  { id: 'lantern', emoji: '🏮', price: 3, level: 1, room: 'outdoor', size: [1, 1] },
  { id: 'fence', emoji: '🚧', price: 2, level: 2, room: 'outdoor', size: [2, 1] },
  { id: 'swing', emoji: '🎠', price: 8, level: 3, room: 'outdoor', size: [2, 1] },
  { id: 'picnic', emoji: '🧺', price: 5, level: 3, room: 'outdoor', size: [2, 2] },
  { id: 'truckStatue', emoji: '🚛', price: 8, level: 4, room: 'outdoor', size: [2, 1] },
  { id: 'windmill', emoji: '🌀', price: 10, level: 5, room: 'outdoor', size: [2, 2] },
  { id: 'dinoStatue', emoji: '🦖', price: 12, level: 6, room: 'outdoor', size: [2, 2] },
  { id: 'snowman', emoji: '⛄', price: 6, level: 7, room: 'outdoor', size: [1, 1] },
  { id: 'fountain', emoji: '⛲', price: 14, level: 8, room: 'outdoor', size: [3, 3] },
  { id: 'rainbowArch', emoji: '🌈', price: 15, level: 10, room: 'outdoor', size: [3, 1] },
];

export const furnitureById = (id: string): Furniture | undefined => FURNITURE.find((item) => item.id === id);
