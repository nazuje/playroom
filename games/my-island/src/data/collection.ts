export type Category = 'shell' | 'bug' | 'flower' | 'fish';
export type Habitat = 'beach' | 'forest' | 'pond' | 'hill' | 'snow';

export interface Collectible {
  id: string;
  category: Category;
  emoji: string;
  /** Turns the emoji's colours, so one picture can be several different finds. In degrees. */
  hue: number;
  habitat: Habitat;
  /** 1 is common, 2 is a nice find, 3 is a lucky one, 4 is a very rare once-in-a-while. */
  rarity: 1 | 2 | 3 | 4;
  /** Colour of its little 3D model in the world. */
  color: number;
}

const item = (
  id: string,
  category: Category,
  emoji: string,
  hue: number,
  habitat: Habitat,
  rarity: Collectible['rarity'],
  color: number,
): Collectible => ({ id, category, emoji, hue, habitat, rarity, color });

export const COLLECTION: readonly Collectible[] = [
  item('shell-swirl', 'shell', '🐚', 0, 'beach', 1, 0xffc9a8),
  item('shell-pink', 'shell', '🐚', 300, 'beach', 1, 0xff9ec4),
  item('shell-blue', 'shell', '🐚', 170, 'beach', 2, 0x7cc6ff),
  item('shell-clam', 'shell', '🦪', 0, 'beach', 1, 0xe8e0d0),
  item('shell-star', 'shell', '⭐', 0, 'beach', 2, 0xffa94d),
  item('shell-crab', 'shell', '🦀', 0, 'beach', 3, 0xff6b4a),
  item('shell-pearl', 'shell', '🦪', 220, 'snow', 2, 0xd9e8ff),
  item('shell-ice', 'shell', '🐚', 130, 'snow', 3, 0xa8f0ff),

  item('bug-ladybird', 'bug', '🐞', 0, 'forest', 1, 0xe5372a),
  item('bug-bee', 'bug', '🐝', 0, 'forest', 1, 0xffc93c),
  item('bug-ant', 'bug', '🐜', 0, 'forest', 1, 0x7a3b2a),
  item('bug-beetle', 'bug', '🐞', 190, 'forest', 2, 0x2f8fd8),
  item('bug-snail', 'bug', '🐌', 0, 'forest', 2, 0xc78a4d),
  item('bug-caterpillar', 'bug', '🐛', 0, 'hill', 2, 0x7ed957),
  item('bug-butterfly', 'bug', '🦋', 0, 'hill', 2, 0x4ca6ff),
  item('bug-pinkfly', 'bug', '🦋', 110, 'hill', 3, 0xff77c8),
  item('bug-golden', 'bug', '🦋', 210, 'forest', 4, 0xffd700),

  item('flower-daisy', 'flower', '🌼', 0, 'forest', 1, 0xffe066),
  item('flower-tulip', 'flower', '🌷', 0, 'forest', 1, 0xff6b9d),
  item('flower-rose', 'flower', '🌹', 0, 'forest', 2, 0xe63946),
  item('flower-sun', 'flower', '🌻', 0, 'hill', 1, 0xffc300),
  item('flower-cherry', 'flower', '🌸', 0, 'hill', 1, 0xffb3d1),
  item('flower-hibiscus', 'flower', '🌺', 0, 'hill', 2, 0xff5a7a),
  item('flower-blue', 'flower', '🌷', 200, 'hill', 3, 0x6aa6ff),
  item('flower-snow', 'flower', '🌸', 180, 'snow', 2, 0xc8f4ff),

  item('fish-little', 'fish', '🐟', 0, 'pond', 1, 0x5dade2),
  item('fish-stripe', 'fish', '🐠', 0, 'pond', 1, 0xffa62b),
  item('fish-puffer', 'fish', '🐡', 0, 'pond', 2, 0xf1c40f),
  item('fish-green', 'fish', '🐟', 240, 'pond', 2, 0x58d68d),
  item('fish-purple', 'fish', '🐠', 240, 'pond', 2, 0xb388ff),
  item('fish-boot', 'fish', '🥾', 0, 'pond', 3, 0x9c6b3f),
  item('fish-crown', 'fish', '👑', 0, 'pond', 4, 0xffd700),
];

export const collectibleById = (id: string): Collectible | undefined => COLLECTION.find((entry) => entry.id === id);

/** Rare surprises, which get their own page in the book. */
export const SURPRISES = [
  { id: 'rainbow', emoji: '🌈' },
  { id: 'star', emoji: '🌠' },
  { id: 'parade', emoji: '🎉' },
  { id: 'butterfly', emoji: '🦋' },
  { id: 'whale', emoji: '🐋' },
] as const;
export type SurpriseId = (typeof SURPRISES)[number]['id'];
