import type { Category, Habitat } from './collection.ts';
import type { CropId } from './crops.ts';
import type { FriendId } from './friends.ts';
import type { CareAction } from './pets.ts';
import type { TreatId } from './recipes.ts';

export type Goal =
  /** Just reaching the friend is the whole job. */
  | { type: 'meet' }
  | { type: 'collect'; category: Category; count: number; habitat?: Habitat }
  | { type: 'plant'; count: number; crop?: CropId }
  | { type: 'water'; count: number }
  | { type: 'harvest'; count: number; crop?: CropId }
  /** Counts pets already at home, so a child who adopted early isn't sent to adopt again. */
  | { type: 'pets'; count: number }
  | { type: 'care'; count: number; action?: CareAction }
  | { type: 'bake'; count: number; recipe?: TreatId }
  | { type: 'give'; count: number; to: FriendId }
  | { type: 'fish'; count: number }
  | { type: 'place'; count: number; room: 'home' | 'outdoor' }
  | { type: 'wardrobe' };

export interface Quest {
  id: string;
  friend: FriendId;
  goal: Goal;
  /** Shells it pays when you go back and say so. */
  shells: number;
  /** The picture on the quest card. */
  emoji: string;
}

const quest = (number: number, friend: FriendId, goal: Goal, shells: number, emoji: string): Quest => ({
  id: `q${number}`,
  friend,
  goal,
  shells,
  emoji,
});

/** The ladder, in order. Every third quest or so raises the Island Level: see LEVEL_STEPS in levels.ts. */
export const QUESTS: readonly Quest[] = [
  quest(1, 'tobi', { type: 'collect', category: 'shell', count: 3 }, 3, '🐚'),
  quest(2, 'moko', { type: 'plant', count: 1, crop: 'carrot' }, 3, '🥕'),
  quest(3, 'moko', { type: 'water', count: 1 }, 3, '💧'),

  quest(4, 'moko', { type: 'harvest', count: 1, crop: 'carrot' }, 4, '🥕'),
  quest(5, 'kiki', { type: 'pets', count: 1 }, 4, '🐾'),
  quest(6, 'kiki', { type: 'care', count: 1, action: 'brush' }, 4, '🪮'),

  quest(7, 'gogo', { type: 'bake', count: 1, recipe: 'muffin' }, 5, '🧁'),
  quest(8, 'gogo', { type: 'give', count: 1, to: 'tobi' }, 5, '🎁'),
  quest(9, 'nino', { type: 'fish', count: 1 }, 5, '🐟'),

  quest(10, 'zuzu', { type: 'meet' }, 5, '🌉'),
  quest(11, 'zuzu', { type: 'collect', category: 'flower', count: 3 }, 6, '🌸'),
  quest(12, 'zuzu', { type: 'collect', category: 'bug', count: 2 }, 6, '🐞'),

  quest(13, 'tobi', { type: 'place', count: 1, room: 'home' }, 6, '🛋️'),
  quest(14, 'tobi', { type: 'wardrobe' }, 6, '👕'),
  quest(15, 'moko', { type: 'plant', count: 3 }, 6, '🌱'),

  quest(16, 'gogo', { type: 'bake', count: 2 }, 7, '🍪'),
  quest(17, 'bibo', { type: 'give', count: 1, to: 'bibo' }, 7, '🎁'),
  quest(18, 'nino', { type: 'fish', count: 3 }, 7, '🐠'),

  quest(19, 'pepi', { type: 'meet' }, 8, '⛵'),
  quest(20, 'pepi', { type: 'collect', category: 'shell', count: 3, habitat: 'snow' }, 8, '❄️'),
  quest(21, 'pepi', { type: 'give', count: 1, to: 'pepi' }, 8, '🎁'),

  quest(22, 'kiki', { type: 'pets', count: 2 }, 8, '🐾'),
  quest(23, 'kiki', { type: 'care', count: 2, action: 'play' }, 8, '🎾'),
  quest(24, 'bibo', { type: 'place', count: 1, room: 'outdoor' }, 8, '🌷'),
  quest(25, 'bibo', { type: 'place', count: 3, room: 'outdoor' }, 9, '🏮'),

  quest(26, 'moko', { type: 'harvest', count: 5 }, 9, '🌽'),
  quest(27, 'gogo', { type: 'bake', count: 3 }, 9, '🎂'),
  quest(28, 'tobi', { type: 'collect', category: 'shell', count: 10 }, 10, '🐚'),
  quest(29, 'zuzu', { type: 'give', count: 1, to: 'zuzu' }, 10, '🎁'),
  quest(30, 'tobi', { type: 'meet' }, 20, '🎉'),
];

export const goalCount = (goal: Goal): number => ('count' in goal ? goal.count : 1);
