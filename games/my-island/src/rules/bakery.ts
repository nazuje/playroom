import type { FriendId } from '../data/friends.ts';
import { RECIPES, isTreat, recipeById, type Recipe, type TreatId } from '../data/recipes.ts';
import { islandLevel, recordEvent } from './quests.ts';
import type { Island } from './state.ts';

/** Shells a friend gives back for a treat, so kindness pays as well as quests do. */
export const GIFT_SHELLS = 2;

export const recipeOpen = (island: Island, recipe: Recipe): boolean => recipe.level <= islandLevel(island);

/** The ingredients still to grow for a recipe, one entry per missing piece. */
export function missingFor(bag: Readonly<Record<string, number>>, recipe: Recipe): string[] {
  const left: Record<string, number> = { ...bag };
  const missing: string[] = [];
  for (const crop of recipe.needs) {
    if ((left[crop] ?? 0) > 0) left[crop] = (left[crop] ?? 0) - 1;
    else missing.push(crop);
  }
  return missing;
}

export const canBake = (island: Island, recipe: Recipe): boolean => recipeOpen(island, recipe) && missingFor(island.bag, recipe).length === 0;

export const bakeable = (island: Island): Recipe[] => RECIPES.filter((recipe) => canBake(island, recipe));

export function bake(island: Island, id: TreatId): boolean {
  const recipe = recipeById(id);
  if (!canBake(island, recipe)) return false;
  for (const crop of recipe.needs) {
    island.bag[crop] = (island.bag[crop] ?? 0) - 1;
    if ((island.bag[crop] ?? 0) <= 0) delete island.bag[crop];
  }
  island.bag[id] = (island.bag[id] ?? 0) + 1;
  recordEvent(island, { type: 'bake', recipe: id });
  return true;
}

export const treatsHeld = (island: Island): TreatId[] =>
  Object.keys(island.bag).filter((id): id is TreatId => isTreat(id) && (island.bag[id] ?? 0) > 0);

export function giveTreat(island: Island, friend: FriendId, treat: TreatId): boolean {
  if ((island.bag[treat] ?? 0) <= 0) return false;
  island.bag[treat] = (island.bag[treat] ?? 0) - 1;
  if ((island.bag[treat] ?? 0) <= 0) delete island.bag[treat];
  island.kindness[friend] = (island.kindness[friend] ?? 0) + 1;
  island.shells += GIFT_SHELLS;
  recordEvent(island, { type: 'give', to: friend });
  return true;
}
