import { describe, expect, it } from 'vitest';
import { CROPS, type CropId } from '../data/crops.ts';
import { FURNITURE } from '../data/furniture.ts';
import { PETS } from '../data/pets.ts';
import { QUESTS } from '../data/quests.ts';
import { RECIPES } from '../data/recipes.ts';
import { bakeable, treatsHeld } from './bakery.ts';
import { guide, type Guide } from './guide.ts';
import { theWorld } from './island.ts';
import {
  adoptPet,
  arrive,
  bakeTreat,
  buyItem,
  carePet,
  catchFish,
  dressUp,
  give,
  goTo,
  here,
  moveNear,
  leaveHouse,
  plantSeed,
  putItem,
  putNear,
  setDecorating,
  startPlay,
  tick,
  type Play,
} from './play.ts';
import { petsOpen } from './pets.ts';
import { currentQuest, islandLevel } from './quests.ts';
import type { Outcome } from './say.ts';
import { newIsland } from './state.ts';
import type { Target } from './target.ts';

const STEP = 0.1;

/** Walks to a target the way the game does, a frame at a time, and does what's there on arrival. */
function walkTo(play: Play, target: Target): Outcome | null {
  goTo(play, target);
  for (let frame = 0; frame < 3000; frame += 1) {
    const { arrived } = tick(play, STEP);
    if (arrived) return arrive(play, arrived);
    if (!play.pending && play.walker.route.length === 0) return null;
  }
  throw new Error(`Never arrived at ${JSON.stringify(target)}`);
}

function wait(play: Play, seconds: number): void {
  for (let spent = 0; spent < seconds; spent += STEP) tick(play, STEP);
}

/** Does what a child would do in a panel that has just opened, following the quest. */
function usePanel(play: Play, result: Outcome, target: Target, hint: Guide): Outcome | null {
  const { island } = play;
  const quest = currentQuest(island.quests);
  const goal = quest?.goal;
  switch (result.open) {
    case 'seeds': {
      if (target.kind !== 'plot') return null;
      const crop: CropId = hint.crop ?? (goal && 'crop' in goal && goal.crop ? goal.crop : CROPS[0]!.id);
      return plantSeed(play, target.index, crop);
    }
    case 'bakery': {
      const recipe = goal?.type === 'bake' && goal.recipe ? RECIPES.find(({ id }) => id === goal.recipe) : bakeable(island)[0];
      return recipe ? bakeTreat(play, recipe.id) : null;
    }
    case 'pets': {
      const pet = petsOpen(island)[0];
      return pet ? adoptPet(play, pet.id) : null;
    }
    case 'care':
      return target.kind === 'pet' ? carePet(play, target.index, goal?.type === 'care' && goal.action ? goal.action : 'feed') : null;
    case 'fishing':
      return catchFish(play);
    case 'give': {
      const treat = treatsHeld(island)[0];
      return target.kind === 'friend' && treat ? give(play, target.id, treat) : null;
    }
    case 'house': {
      const item = Object.keys(island.stock)[0] ?? 'chair';
      if (!island.stock[item]) buyItem(play, item);
      const placed = putItem(play, 'home', item, 3, 3, 0).outcome;
      leaveHouse(play);
      return placed;
    }
    case 'wardrobe':
      return dressUp(play, { ...island.look, hat: (island.look.hat + 1) % 5 });
    default:
      return null;
  }
}

function decorateOutside(play: Play): Outcome | null {
  setDecorating(play, true);
  const item = FURNITURE.find(({ room, level, price }) => room === 'outdoor' && level <= islandLevel(play.island) && price <= play.island.shells);
  if (item) {
    buyItem(play, item.id);
    const { x, z } = here(play);
    const placed = putItem(play, 'outdoor', item.id, x + 3, z + 3, 0).outcome;
    setDecorating(play, false);
    return placed;
  }
  setDecorating(play, false);
  return null;
}

describe('the whole quest ladder, played by following the marker', () => {
  it('finishes all 30 quests from a brand new island, reaching Island Level 10', () => {
    const play = startPlay(newIsland(0), theWorld());
    const levels: number[] = [];
    let steps = 0;
    while (currentQuest(play.island.quests) && steps < 900) {
      steps += 1;
      const hint = guide(play.island, play.finds.list, play.walker);
      if (!hint) break;
      if ('line' in hint.say && hint.say.line === 'waitGrow') {
        wait(play, 5);
        continue;
      }
      if (hint.target.kind === 'button') {
        const placed = decorateOutside(play);
        if (placed?.level) levels.push(placed.level);
        continue;
      }
      const result = walkTo(play, hint.target);
      if (!result) continue;
      if (result.level) levels.push(result.level);
      const used = usePanel(play, result, hint.target, hint);
      if (used?.level) levels.push(used.level);
    }
    expect(play.island.quests.done).toBe(QUESTS.length);
    expect(islandLevel(play.island)).toBe(10);
    expect(levels).toEqual([2, 3, 4, 5, 6, 7, 8, 9, 10]);
    expect(play.island.pets.length).toBeGreaterThanOrEqual(2);
    expect(play.island.outdoor.length).toBeGreaterThanOrEqual(4);
    expect(play.island.shells).toBeGreaterThanOrEqual(0);
  });
});

describe('free play', () => {
  it('never blocks a child who ignores every quest', () => {
    const play = startPlay(newIsland(1), theWorld());
    expect(walkTo(play, { kind: 'plot', index: 0 })?.open).toBe('seeds');
    plantSeed(play, 0, 'strawberry');
    expect(walkTo(play, { kind: 'place', id: 'pets' })?.open).toBe('pets');
    adoptPet(play, 'kitten');
    expect(walkTo(play, { kind: 'place', id: 'fishing' })?.open).toBe('fishing');
    expect(catchFish(play).shells).toBe(1);
    expect(walkTo(play, { kind: 'place', id: 'house' })?.open).toBe('house');
    leaveHouse(play);
    expect(walkTo(play, { kind: 'place', id: 'wardrobe' })?.open).toBe('wardrobe');
    expect(play.island.quests.done).toBe(0);
  });

  it('keeps Flower Hill shut until the bridge, and says why', () => {
    const play = startPlay(newIsland(0), theWorld());
    expect(goTo(play, { kind: 'ground', x: 92, z: 44 }).blocked).toBe('bridge');
    play.island.quests.done = 9;
    expect(goTo(play, { kind: 'ground', x: 92, z: 44 }).blocked).toBeNull();
  });

  it('sails to Snowy Isle once the boat is ready, and back', () => {
    const play = startPlay(newIsland(0), theWorld());
    expect(walkTo(play, { kind: 'place', id: 'boat' })?.say).toEqual([{ line: 'boatShut' }]);
    play.island.quests.done = 18;
    walkTo(play, { kind: 'place', id: 'boat' });
    expect(play.walker.z).toBeLessThan(22);
    const back = walkTo(play, { kind: 'place', id: 'bakery' });
    expect(back?.say).toEqual([{ line: 'sailHome' }]);
    expect(walkTo(play, { kind: 'place', id: 'bakery' })?.open).toBe('bakery');
  });

  it('lets pets follow along and do funny things on their own', () => {
    const play = startPlay(newIsland(0), theWorld());
    play.island.quests.done = 30;
    for (const pet of PETS.slice(0, 4)) adoptPet(play, pet.id);
    walkTo(play, { kind: 'place', id: 'fishing' });
    wait(play, 1);
    const followers = play.island.pets.map((pet, index) => ({ pet, body: play.bodies[index]! })).filter(({ pet }) => pet.following);
    expect(followers).toHaveLength(3);
    for (const { body } of followers) expect(Math.hypot(body.x - play.walker.x, body.z - play.walker.z)).toBeLessThan(5);
    let tricks = 0;
    for (let frame = 0; frame < 400; frame += 1) tricks += tick(play, STEP).tricks.length;
    expect(tricks).toBeGreaterThan(0);
  });

  it('grows the garden while the child plays elsewhere', () => {
    const play = startPlay(newIsland(0), theWorld());
    walkTo(play, { kind: 'plot', index: 0 });
    plantSeed(play, 0, 'carrot');
    walkTo(play, { kind: 'plot', index: 0 });
    walkTo(play, { kind: 'place', id: 'fishing' });
    wait(play, 60);
    expect(walkTo(play, { kind: 'plot', index: 0 })?.say[0]).toEqual({ line: 'harvested' });
  });
});

describe('decorating near a tap', () => {
  it('puts a decoration on the nearest free spot and moves it the same way', () => {
    const island = newIsland(0);
    island.shells = 50;
    const play = startPlay(island, theWorld());
    buyItem(play, 'bench');
    const first = putNear(play, 'outdoor', 'bench', 40, 40);
    expect(first.uid).not.toBeNull();
    buyItem(play, 'bench');
    const second = putNear(play, 'outdoor', 'bench', 40, 40);
    expect(second.uid).not.toBeNull();
    const [a, b] = island.outdoor;
    expect(a && b && (a.x !== b.x || a.z !== b.z)).toBe(true);
    expect(moveNear(play, 'outdoor', first.uid ?? -1, 38, 38)).toBe(true);
  });

  it('says so kindly when nothing fits', () => {
    const play = startPlay(newIsland(0), theWorld());
    const result = putNear(play, 'outdoor', 'bench', 2, 2);
    expect(result.uid).toBeNull();
    expect(result.outcome.say).toEqual([{ line: 'noRoom' }]);
  });
});
