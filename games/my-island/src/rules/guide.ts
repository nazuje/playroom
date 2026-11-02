import { RECIPES, recipeById } from '../data/recipes.ts';
import type { CropId } from '../data/crops.ts';
import { collectibleById } from '../data/collection.ts';
import { canBake, missingFor, recipeOpen, treatsHeld } from './bakery.ts';
import type { Find } from './finds.ts';
import { plotStage } from './garden.ts';
import { currentQuest } from './quests.ts';
import type { Say } from './say.ts';
import type { Island } from './state.ts';
import type { Target } from './target.ts';

/** Where the quest marker stands, and what to say about it. */
export interface Guide {
  target: Target;
  say: Say;
  /** The seed to plant, when the next step is planting one. */
  crop?: CropId;
}

const plotWhere = (island: Island, test: (index: number) => boolean): number => island.plots.findIndex((_, index) => test(index));

/** The next step towards having a crop in the bag: pick a ripe one, water one, wait for one, or plant one. */
function growStep(island: Island, crop: CropId | undefined, done: Say): Guide | null {
  const matches = (index: number): boolean => !crop || island.plots[index]?.crop === crop;
  const stage = (index: number): string => plotStage(island.plots[index] ?? { crop: null, growth: 0, watered: false });
  const ripe = plotWhere(island, (index) => matches(index) && stage(index) === 'ripe');
  if (ripe >= 0) return { target: { kind: 'plot', index: ripe }, say: done };
  const dry = plotWhere(island, (index) => matches(index) && stage(index) !== 'empty' && stage(index) !== 'ripe' && !island.plots[index]?.watered);
  if (dry >= 0) return { target: { kind: 'plot', index: dry }, say: { line: 'waterPlant' } };
  const growing = plotWhere(island, (index) => matches(index) && stage(index) !== 'empty');
  if (growing >= 0) return { target: { kind: 'plot', index: growing }, say: { line: 'waitGrow' } };
  const empty = plotWhere(island, (index) => stage(index) === 'empty');
  if (empty >= 0) return { target: { kind: 'plot', index: empty }, say: { line: 'plantFirst' }, crop: crop ?? 'carrot' };
  // Every bed is busy with something else, so free one up first.
  return crop ? growStep(island, undefined, { line: 'pickRipe' }) : null;
}

/** The next step towards a treat in the bag. */
function bakeStep(island: Island, recipeId: string | undefined, done: Say): Guide | null {
  const wanted = recipeId ? [recipeById(recipeId as never)] : RECIPES.filter((recipe) => recipeOpen(island, recipe));
  if (wanted.some((recipe) => canBake(island, recipe))) return { target: { kind: 'place', id: 'bakery' }, say: done };
  const first = wanted[0];
  const missing = first ? (missingFor(island.bag, first)[0] as CropId | undefined) : undefined;
  return growStep(island, missing, { line: 'pickRipe' });
}

const nearest = (finds: readonly Find[], from: { x: number; z: number }): Find | undefined =>
  [...finds].sort((a, b) => Math.hypot(a.x - from.x, a.z - from.z) - Math.hypot(b.x - from.x, b.z - from.z))[0];

/** The quest marker: where to go next for the current quest, and the line that explains it. Null when every quest is done. */
export function guide(island: Island, finds: readonly Find[], from: { x: number; z: number }): Guide | null {
  const quest = currentQuest(island.quests);
  if (!quest) return null;
  const friend: Target = { kind: 'friend', id: quest.friend };
  if (island.quests.stage === 'offered') return { target: friend, say: { needs: quest.friend } };
  if (island.quests.stage === 'ready') return { target: friend, say: { back: quest.friend } };
  const ask: Say = { quest: quest.id };
  const { goal } = quest;
  switch (goal.type) {
    case 'meet':
      return { target: friend, say: ask };
    case 'collect': {
      const matching = finds.filter((find) => {
        const item = collectibleById(find.item);
        return item?.category === goal.category && (!goal.habitat || find.habitat === goal.habitat);
      });
      const closest = nearest(matching, from);
      return closest ? { target: { kind: 'find', uid: closest.uid }, say: ask } : { target: friend, say: ask };
    }
    case 'plant': {
      const empty = plotWhere(island, (index) => !island.plots[index]?.crop);
      if (empty >= 0) return { target: { kind: 'plot', index: empty }, say: ask, crop: goal.crop ?? 'carrot' };
      return growStep(island, undefined, { line: 'pickRipe' }) ?? { target: friend, say: ask };
    }
    case 'water': {
      const dry = plotWhere(island, (index) => {
        const plot = island.plots[index];
        return Boolean(plot?.crop) && !plot?.watered && (plot?.growth ?? 1) < 1;
      });
      if (dry >= 0) return { target: { kind: 'plot', index: dry }, say: ask };
      const empty = plotWhere(island, (index) => !island.plots[index]?.crop);
      if (empty >= 0) return { target: { kind: 'plot', index: empty }, say: { line: 'plantFirst' }, crop: 'carrot' };
      return growStep(island, undefined, { line: 'pickRipe' }) ?? { target: friend, say: ask };
    }
    case 'harvest':
      return growStep(island, goal.crop, ask) ?? { target: friend, say: ask };
    case 'pets':
      return { target: { kind: 'place', id: 'pets' }, say: ask };
    case 'care': {
      const walker = island.pets.findIndex((pet) => pet.following);
      const any = walker >= 0 ? walker : island.pets.length ? 0 : -1;
      return { target: any >= 0 ? { kind: 'pet', index: any } : { kind: 'place', id: 'pets' }, say: ask };
    }
    case 'bake':
      return bakeStep(island, goal.recipe, ask) ?? { target: { kind: 'place', id: 'bakery' }, say: ask };
    case 'give':
      if (treatsHeld(island).length) return { target: { kind: 'friend', id: goal.to }, say: ask };
      return bakeStep(island, undefined, { line: 'bakeFirst' }) ?? { target: { kind: 'place', id: 'bakery' }, say: ask };
    case 'fish':
      return { target: { kind: 'place', id: 'fishing' }, say: ask };
    case 'place':
      return goal.room === 'home' ? { target: { kind: 'place', id: 'house' }, say: ask } : { target: { kind: 'button', id: 'decor' }, say: ask };
    case 'wardrobe':
      return { target: { kind: 'place', id: 'wardrobe' }, say: ask };
    default:
      return { target: friend, say: ask };
  }
}
