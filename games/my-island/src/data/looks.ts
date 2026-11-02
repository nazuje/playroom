export interface Look {
  skin: number;
  hair: number;
  hairColor: number;
  outfit: number;
  outfitColor: number;
  hat: number;
}

export const SKINS: readonly number[] = [0xffe0c4, 0xf7c9a0, 0xe0a878, 0xc68958, 0x96603a, 0x69422a];

export const HAIRS = ['short', 'long', 'curly', 'bun', 'spiky', 'braids', 'none'] as const;
export type Hair = (typeof HAIRS)[number];

export const HAIR_COLORS: readonly number[] = [0x2b211c, 0x6b3f22, 0xc27a35, 0xf1cf5e, 0xe2563f, 0x4fa8e8, 0x8c5fe0, 0x37b97d];

export const OUTFITS = ['tee', 'dress', 'overalls', 'dino', 'space', 'raincoat', 'stripes', 'chef'] as const;
export type Outfit = (typeof OUTFITS)[number];
export const OUTFIT_EMOJI: Record<Outfit, string> = {
  tee: '👕',
  dress: '👗',
  overalls: '👖',
  dino: '🦕',
  space: '🚀',
  raincoat: '🧥',
  stripes: '🦓',
  chef: '🧑‍🍳',
};

/** A wide, bright box of paints, in no particular order and sorted by nobody. */
export const OUTFIT_COLORS: readonly number[] = [0xff5a5f, 0xff9f1c, 0xffd23f, 0x3ecf8e, 0x18b7c9, 0x3a86ff, 0x8b5cf6, 0xff70a6];

export const HATS = ['none', 'cap', 'crown', 'straw', 'hardhat', 'wizard', 'beanie', 'flowers', 'pirate'] as const;
export type Hat = (typeof HATS)[number];
export const HAT_EMOJI: Record<Hat, string> = {
  none: '🚫',
  cap: '🧢',
  crown: '👑',
  straw: '👒',
  hardhat: '⛑️',
  wizard: '🧙',
  beanie: '🧶',
  flowers: '🌼',
  pirate: '🏴‍☠️',
};

export const AVATARS = ['🐢', '🦖', '🦄', '🚚', '🐙', '🚀', '🦊', '🌻', '🐸', '🚒', '🦋', '🤖'] as const;

export const startingLook = (seed: number): Look => ({
  skin: seed % SKINS.length,
  hair: seed % (HAIRS.length - 1),
  hairColor: seed % HAIR_COLORS.length,
  outfit: 0,
  outfitColor: seed % OUTFIT_COLORS.length,
  hat: 0,
});

const inRange = (value: unknown, length: number, fallback: number): number =>
  typeof value === 'number' && Number.isInteger(value) && value >= 0 && value < length ? value : fallback;

/** Keeps a saved look on the rails if a future version of the wardrobe has fewer choices. */
export function validLook(raw: Partial<Look> | undefined, fallback: Look): Look {
  return {
    skin: inRange(raw?.skin, SKINS.length, fallback.skin),
    hair: inRange(raw?.hair, HAIRS.length, fallback.hair),
    hairColor: inRange(raw?.hairColor, HAIR_COLORS.length, fallback.hairColor),
    outfit: inRange(raw?.outfit, OUTFITS.length, fallback.outfit),
    outfitColor: inRange(raw?.outfitColor, OUTFIT_COLORS.length, fallback.outfitColor),
    hat: inRange(raw?.hat, HATS.length, fallback.hat),
  };
}
