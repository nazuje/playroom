import type { CropId } from './crops.ts';

export type TreatId = 'muffin' | 'tart' | 'pizza' | 'bread' | 'pie' | 'cake' | 'cookie' | 'icecream';

export interface Recipe {
  id: TreatId;
  emoji: string;
  level: number;
  /** One entry per tap into the bowl, so three entries mean three taps. */
  needs: readonly CropId[];
}

export const RECIPES: readonly Recipe[] = [
  { id: 'muffin', emoji: '🧁', level: 1, needs: ['carrot'] },
  { id: 'tart', emoji: '🥧', level: 1, needs: ['strawberry', 'strawberry'] },
  { id: 'pizza', emoji: '🍕', level: 3, needs: ['tomato', 'corn'] },
  { id: 'bread', emoji: '🥖', level: 3, needs: ['corn', 'corn'] },
  { id: 'pie', emoji: '🍰', level: 5, needs: ['pumpkin', 'carrot'] },
  { id: 'cookie', emoji: '🍪', level: 6, needs: ['strawberry', 'corn'] },
  { id: 'icecream', emoji: '🍦', level: 8, needs: ['melon', 'strawberry'] },
  { id: 'cake', emoji: '🎂', level: 9, needs: ['carrot', 'strawberry', 'pumpkin'] },
];

export const recipeById = (id: TreatId): Recipe => {
  const found = RECIPES.find((recipe) => recipe.id === id);
  if (!found) throw new Error(`Unknown recipe ${id}`);
  return found;
};

export const isTreat = (id: string): id is TreatId => RECIPES.some((recipe) => recipe.id === id);
