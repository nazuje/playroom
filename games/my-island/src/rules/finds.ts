import { COLLECTION, collectibleById, type Collectible, type Habitat } from '../data/collection.ts';
import { pickWeighted } from './fishing.ts';
import { recordEvent } from './quests.ts';
import { makeRandom } from './rng.ts';
import type { Island } from './state.ts';
import { tileAt, type World } from './world.ts';

export type FindHabitat = Exclude<Habitat, 'pond'>;
export const FIND_HABITATS: readonly FindHabitat[] = ['beach', 'forest', 'hill', 'snow'];

/** How many finds lie about in each place at once. */
export const FIND_TARGETS: Readonly<Record<FindHabitat, number>> = { beach: 6, forest: 7, hill: 6, snow: 5 };
/** Seconds of play before a picked-up find is replaced somewhere else. */
export const REFILL_SECONDS = 4;
const GAP = 3;

export interface Find {
  uid: number;
  item: string;
  habitat: FindHabitat;
  x: number;
  z: number;
}

export interface Finds {
  list: Find[];
  nextUid: number;
  nextFillAt: number;
  random: () => number;
}

export type Spots = Readonly<Record<FindHabitat, readonly (readonly [number, number])[]>>;

const HABITAT_TILE: Readonly<Record<FindHabitat, string>> = { beach: 'sand', forest: 'forest', hill: 'hill', snow: 'snow' };

/** Every tile where something could be found, by habitat. Beach finds stay on the south shore, where the beach is. */
export function findSpots(world: World, free: (x: number, z: number) => boolean): Spots {
  const spots: Record<FindHabitat, [number, number][]> = { beach: [], forest: [], hill: [], snow: [] };
  for (let z = 0; z < world.depth; z += 1) {
    for (let x = 0; x < world.width; x += 1) {
      if (!free(x, z)) continue;
      const tile = tileAt(world, x, z);
      for (const habitat of FIND_HABITATS) {
        if (tile !== HABITAT_TILE[habitat]) continue;
        if (habitat === 'beach' && (z < 58 || x > 76)) continue;
        spots[habitat].push([x, z]);
      }
    }
  }
  return spots;
}

const choicesFor = (habitat: FindHabitat): Collectible[] =>
  COLLECTION.filter((item) => item.habitat === habitat && item.category !== 'fish');

export function newFinds(seed: number): Finds {
  return { list: [], nextUid: 1, nextFillAt: 0, random: makeRandom(seed) };
}

function addOne(finds: Finds, spots: Spots, habitat: FindHabitat, free: (x: number, z: number) => boolean): boolean {
  const options = spots[habitat];
  if (!options.length) return false;
  for (let tries = 0; tries < 16; tries += 1) {
    const [x, z] = options[Math.floor(finds.random() * options.length)] ?? [0, 0];
    if (!free(x, z)) continue;
    if (finds.list.some((find) => Math.hypot(find.x - x, find.z - z) < GAP)) continue;
    const item = pickWeighted(choicesFor(habitat), finds.random());
    if (!item) return false;
    finds.list.push({ uid: finds.nextUid, item: item.id, habitat, x, z });
    finds.nextUid += 1;
    return true;
  }
  return false;
}

/** Tops every habitat up to its number. With `all`, fills at once; otherwise adds one when it is time. */
export function fillFinds(finds: Finds, spots: Spots, clock: number, free: (x: number, z: number) => boolean, all = false): boolean {
  if (!all && clock < finds.nextFillAt) return false;
  let added = false;
  for (const habitat of FIND_HABITATS) {
    const want = FIND_TARGETS[habitat];
    while (finds.list.filter((find) => find.habitat === habitat).length < want) {
      if (!addOne(finds, spots, habitat, free)) break;
      added = true;
      if (!all) break;
    }
  }
  finds.nextFillAt = clock + REFILL_SECONDS;
  return added;
}

export interface Taken {
  item: string;
  first: boolean;
  /** The very rare golden butterfly also counts as a surprise. */
  golden: boolean;
}

/** Picks a find up into the book. Shells also go in the purse, because shells are what the island trades in. */
export function takeFind(island: Island, finds: Finds, uid: number, clock: number): Taken | null {
  const at = finds.list.findIndex((find) => find.uid === uid);
  const find = finds.list[at];
  if (!find) return null;
  finds.list.splice(at, 1);
  finds.nextFillAt = clock + REFILL_SECONDS;
  const item = collectibleById(find.item);
  const first = !island.book[find.item];
  island.book[find.item] = (island.book[find.item] ?? 0) + 1;
  if (item?.category === 'shell') island.shells += 1;
  const golden = item?.rarity === 4;
  if (golden) island.book['surprise:butterfly'] = (island.book['surprise:butterfly'] ?? 0) + 1;
  recordEvent(island, { type: 'collect', category: item?.category ?? 'shell', habitat: find.habitat });
  return { item: find.item, first, golden };
}
