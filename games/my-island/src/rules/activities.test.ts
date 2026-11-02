import { describe, expect, it } from 'vitest';
import { cropById } from '../data/crops.ts';
import { MOST_FOLLOWERS } from '../data/pets.ts';
import { recipeById } from '../data/recipes.ts';
import { bake, canBake, giveTreat, missingFor, treatsHeld } from './bakery.ts';
import { MISSES_TO_SURE, fishAt, inZone, landFish, pickWeighted, zoneFor } from './fishing.ts';
import { cropsOpen, growGarden, harvest, HARVEST_YIELD, openPlots, plant, plotStage, rainOnGarden, water } from './garden.ts';
import { adopt, care, heartsShown, petLock, setFollowing } from './pets.ts';
import { newIsland } from './state.ts';
import { COLLECTION } from '../data/collection.ts';

const atLevel = (done: number) => {
  const island = newIsland(0);
  island.quests.done = done;
  return island;
};

describe('the garden', () => {
  it('grows a watered carrot in under a minute of play, and an unwatered one more slowly', () => {
    const island = newIsland(0);
    expect(plant(island, 0, 'carrot')).toBe(true);
    expect(plant(island, 1, 'carrot')).toBe(true);
    water(island, 0);
    growGarden(island, cropById('carrot').growSeconds);
    expect(plotStage(island.plots[0]!)).toBe('ripe');
    expect(plotStage(island.plots[1]!)).not.toBe('ripe');
    growGarden(island, cropById('carrot').growSeconds);
    expect(plotStage(island.plots[1]!)).toBe('ripe');
  });

  it('never wilts, whatever time passes', () => {
    const island = newIsland(0);
    plant(island, 0, 'strawberry');
    growGarden(island, 1e7);
    expect(island.plots[0]).toMatchObject({ crop: 'strawberry', growth: 1 });
  });

  it('only plants seeds the Island Level has opened, in empty beds', () => {
    const island = newIsland(0);
    expect(plant(island, 0, 'melon')).toBe(false);
    expect(plant(island, 0, 'carrot')).toBe(true);
    expect(plant(island, 0, 'strawberry')).toBe(false);
    expect(cropsOpen(1).map(({ id }) => id)).toEqual(['carrot', 'strawberry']);
  });

  it('harvests into the bag and frees the bed', () => {
    const island = newIsland(0);
    plant(island, 2, 'carrot');
    expect(harvest(island, 2)).toBeNull();
    growGarden(island, 999);
    expect(harvest(island, 2)).toBe('carrot');
    expect(island.bag.carrot).toBe(HARVEST_YIELD);
    expect(island.plots[2]?.crop).toBeNull();
  });

  it('waters only what is growing, and rain waters it all', () => {
    const island = newIsland(0);
    expect(water(island, 0)).toBe(false);
    plant(island, 0, 'carrot');
    plant(island, 1, 'carrot');
    expect(water(island, 0)).toBe(true);
    expect(water(island, 0)).toBe(false);
    rainOnGarden(island);
    expect(island.plots[1]?.watered).toBe(true);
  });

  it('adds beds as the island grows and never takes them away', () => {
    const island = atLevel(30);
    openPlots(island);
    expect(island.plots).toHaveLength(12);
    island.quests.done = 0;
    openPlots(island);
    expect(island.plots).toHaveLength(12);
  });
});

describe('pets', () => {
  it('opens pets by Island Level, one of each kind', () => {
    const island = newIsland(0);
    expect(petLock(island, { id: 'puppy', level: 2 } as never)).toBe('later');
    expect(adopt(island, 'puppy')).toBe(-1);
    expect(adopt(island, 'kitten')).toBe(0);
    expect(adopt(island, 'kitten')).toBe(-1);
  });

  it('only ever adds love, and every care gets a funny trick back', () => {
    const island = atLevel(30);
    adopt(island, 'kitten');
    for (const action of ['feed', 'brush', 'play'] as const) expect(care(island, 0, action)).toBeTruthy();
    expect(island.pets[0]?.hearts).toBe(3);
    expect(heartsShown(0)).toBe(1);
    expect(heartsShown(1000)).toBe(5);
  });

  it('walks with a gang of three at most, sending the longest walker home to make room', () => {
    const island = atLevel(30);
    for (const kind of ['kitten', 'puppy', 'bunny', 'duckling'] as const) adopt(island, kind);
    expect(island.pets.filter(({ following }) => following)).toHaveLength(MOST_FOLLOWERS);
    expect(island.pets[3]?.following).toBe(false);
    setFollowing(island, 3, true);
    expect(island.pets.filter(({ following }) => following)).toHaveLength(MOST_FOLLOWERS);
    expect(island.pets[0]?.following).toBe(false);
  });
});

describe('the bakery', () => {
  it('says what is missing and bakes once it is all there', () => {
    const island = newIsland(0);
    const tart = recipeById('tart');
    expect(missingFor(island.bag, tart)).toEqual(['strawberry', 'strawberry']);
    island.bag.strawberry = 1;
    expect(missingFor(island.bag, tart)).toEqual(['strawberry']);
    island.bag.strawberry = 2;
    expect(canBake(island, tart)).toBe(true);
    expect(bake(island, 'tart')).toBe(true);
    expect(island.bag).toEqual({ tart: 1 });
  });

  it('keeps recipes for later levels closed', () => {
    const island = newIsland(0);
    island.bag = { tomato: 5, corn: 5 };
    expect(bake(island, 'pizza')).toBe(false);
  });

  it('turns a gift into kindness and shells', () => {
    const island = newIsland(0);
    island.bag = { muffin: 1 };
    expect(treatsHeld(island)).toEqual(['muffin']);
    expect(giveTreat(island, 'tobi', 'muffin')).toBe(true);
    expect(giveTreat(island, 'tobi', 'muffin')).toBe(false);
    expect(island.kindness.tobi).toBe(1);
    expect(island.shells).toBe(2);
  });
});

describe('fishing', () => {
  it('bobs back and forth and never runs out', () => {
    expect(fishAt(0)).toBe(0);
    expect(fishAt(1.3)).toBeCloseTo(1);
    expect(fishAt(2.6 * 1000 + 0.65)).toBeCloseTo(0.5);
  });

  it('grows the green part with every miss until nobody can miss', () => {
    const widths = [0, 1, 2, MISSES_TO_SURE].map((misses) => {
      const zone = zoneFor(misses);
      return zone.to - zone.from;
    });
    expect(widths[1]).toBeGreaterThan(widths[0]!);
    expect(widths[2]).toBeGreaterThan(widths[1]!);
    for (let at = 0; at <= 1; at += 0.05) expect(inZone(zoneFor(MISSES_TO_SURE), at)).toBe(true);
    for (const misses of [0, 1, 2, 3, 9]) {
      const zone = zoneFor(misses, true);
      expect(zone.from).toBeGreaterThanOrEqual(0);
      expect(zone.to).toBeLessThanOrEqual(1.0001);
    }
  });

  it('picks common fish most and rare ones now and then', () => {
    const fish = COLLECTION.filter(({ category }) => category === 'fish');
    const tally: Record<string, number> = {};
    for (let roll = 0; roll < 1; roll += 0.001) {
      const id = pickWeighted(fish, roll)?.id ?? '';
      tally[id] = (tally[id] ?? 0) + 1;
    }
    expect(tally['fish-little']).toBeGreaterThan(tally['fish-crown'] ?? 0);
    expect(tally['fish-crown']).toBeGreaterThan(0);
  });

  it('lands a fish in the book with a shell', () => {
    const island = newIsland(0);
    const first = landFish(island, 0.01);
    expect(first.first).toBe(true);
    expect(landFish(island, 0.01).first).toBe(false);
    expect(island.shells).toBe(2);
  });
});
