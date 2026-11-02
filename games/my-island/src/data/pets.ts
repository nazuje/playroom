export type PetId = 'kitten' | 'puppy' | 'bunny' | 'duckling' | 'piglet' | 'chick' | 'dino' | 'pony';

export interface Pet {
  id: PetId;
  emoji: string;
  /** The Island Level that lets this pet come home with you. */
  level: number;
  body: number;
  belly: number;
  ears: 'cat' | 'dog' | 'bunny' | 'none' | 'pig' | 'horse';
  /** Bird and dino pets have a beak or a snout in place of a nose. */
  snout: number;
}

export const PETS: readonly Pet[] = [
  { id: 'kitten', emoji: '🐱', level: 1, body: 0xffa94d, belly: 0xfff0d9, ears: 'cat', snout: 0xff8fa3 },
  { id: 'puppy', emoji: '🐶', level: 2, body: 0xc48a58, belly: 0xf6e3c9, ears: 'dog', snout: 0x3d2c29 },
  { id: 'bunny', emoji: '🐰', level: 3, body: 0xf2ece4, belly: 0xffd6e0, ears: 'bunny', snout: 0xff8fa3 },
  { id: 'duckling', emoji: '🐥', level: 5, body: 0xffd93b, belly: 0xffeb8a, ears: 'none', snout: 0xff9b2b },
  { id: 'piglet', emoji: '🐷', level: 6, body: 0xff9fb5, belly: 0xffc8d4, ears: 'pig', snout: 0xf27e9b },
  { id: 'chick', emoji: '🐧', level: 7, body: 0x4a5a78, belly: 0xf4f6fb, ears: 'none', snout: 0xffa928 },
  { id: 'dino', emoji: '🦖', level: 8, body: 0x54c762, belly: 0xc5f07c, ears: 'none', snout: 0x3aa04a },
  { id: 'pony', emoji: '🦄', level: 9, body: 0xdcc8ff, belly: 0xffffff, ears: 'horse', snout: 0xc7a9ff },
];

export const petById = (id: PetId): Pet => {
  const found = PETS.find((pet) => pet.id === id);
  if (!found) throw new Error(`Unknown pet ${id}`);
  return found;
};

export type CareAction = 'feed' | 'brush' | 'play';
export const CARE_ACTIONS: readonly { id: CareAction; emoji: string }[] = [
  { id: 'feed', emoji: '🍖' },
  { id: 'brush', emoji: '🪮' },
  { id: 'play', emoji: '🎾' },
];

/** Things a happy pet does on its own. They are only ever funny, never a request for anything. */
export const TRICKS = ['spin', 'hop', 'wiggle', 'roll', 'sneeze', 'zoom'] as const;
export type Trick = (typeof TRICKS)[number];

/** A pet joins you for walks in a little gang. More than this and the rest play at the Pet Corner. */
export const MOST_FOLLOWERS = 3;
