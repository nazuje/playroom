import { BOAT_LEVEL, BRIDGE_LEVEL, LEVEL_STEPS, PLOTS_BY_LEVEL } from '../data/levels.ts';
import { goalCount, QUESTS, type Goal, type Quest } from '../data/quests.ts';
import type { Island, QuestProgress } from './state.ts';

/** Something the player did, which may count towards the current quest. */
export type GameEvent =
  | { type: 'collect'; category: string; habitat: string }
  | { type: 'plant'; crop: string }
  | { type: 'water' }
  | { type: 'harvest'; crop: string }
  | { type: 'care'; action: string }
  | { type: 'bake'; recipe: string }
  | { type: 'give'; to: string }
  | { type: 'fish' }
  | { type: 'place'; room: string }
  | { type: 'wardrobe' };

export function levelFor(done: number): number {
  let level = 1;
  LEVEL_STEPS.forEach((step, index) => {
    if (done >= step) level = index + 1;
  });
  return level;
}

export const islandLevel = (island: Island): number => levelFor(island.quests.done);
export const bridgeOpen = (island: Island): boolean => islandLevel(island) >= BRIDGE_LEVEL;
export const boatOpen = (island: Island): boolean => islandLevel(island) >= BOAT_LEVEL;

export function plotsForLevel(level: number): number {
  let plots = 0;
  for (const step of PLOTS_BY_LEVEL) if (level >= step.level) plots = step.plots;
  return plots;
}

export const currentQuest = (progress: QuestProgress): Quest | null => QUESTS[progress.done] ?? null;

function counts(goal: Goal, event: GameEvent): boolean {
  if (goal.type !== event.type) return false;
  switch (event.type) {
    case 'collect':
      return goal.type === 'collect' && goal.category === event.category && (!goal.habitat || goal.habitat === event.habitat);
    case 'plant':
      return goal.type === 'plant' && (!goal.crop || goal.crop === event.crop);
    case 'harvest':
      return goal.type === 'harvest' && (!goal.crop || goal.crop === event.crop);
    case 'care':
      return goal.type === 'care' && (!goal.action || goal.action === event.action);
    case 'bake':
      return goal.type === 'bake' && (!goal.recipe || goal.recipe === event.recipe);
    case 'give':
      return goal.type === 'give' && goal.to === event.to;
    case 'place':
      return goal.type === 'place' && goal.room === event.room;
    default:
      return true;
  }
}

/** How far along the current quest is, in the terms the card shows. */
export function questCount(island: Island): number {
  const quest = currentQuest(island.quests);
  if (!quest) return 0;
  return quest.goal.type === 'pets' ? Math.min(island.pets.length, quest.goal.count) : island.quests.count;
}

function settle(island: Island): void {
  const quest = currentQuest(island.quests);
  if (!quest || island.quests.stage !== 'active') return;
  if (questCount(island) >= goalCount(quest.goal)) island.quests.stage = 'ready';
}

/**
 * The friend has been spoken to: the job starts now. Anything already done towards it since the
 * last job was handed in still counts, so a child who picked up shells first isn't sent to do it again.
 */
export function acceptQuest(island: Island): void {
  const quest = currentQuest(island.quests);
  if (!quest || island.quests.stage !== 'offered') return;
  island.quests.stage = quest.goal.type === 'meet' ? 'ready' : 'active';
  settle(island);
}

/** Feeds an event to the current quest, even one not yet asked for. Returns true if that just finished its job. */
export function recordEvent(island: Island, event: GameEvent): boolean {
  const quest = currentQuest(island.quests);
  if (!quest || island.quests.stage === 'ready') return false;
  if (counts(quest.goal, event)) island.quests.count += 1;
  if (island.quests.stage !== 'active') return false;
  settle(island);
  return (island.quests.stage as string) === 'ready';
}

/** Re-checks a job that depends on what you have, such as how many pets are at home. */
export function recheckQuest(island: Island): boolean {
  const before = island.quests.stage;
  settle(island);
  return before === 'active' && (island.quests.stage as string) === 'ready';
}

/** Hands the job in. Returns the shells earned and any new Island Level reached. */
export function finishQuest(island: Island): { shells: number; level: number | null } {
  const quest = currentQuest(island.quests);
  if (!quest || island.quests.stage !== 'ready') return { shells: 0, level: null };
  const before = islandLevel(island);
  island.quests = { done: island.quests.done + 1, stage: 'offered', count: 0 };
  island.shells += quest.shells;
  const after = islandLevel(island);
  return { shells: quest.shells, level: after > before ? after : null };
}
