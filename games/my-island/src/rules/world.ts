import {
  BEACH,
  BRIDGE,
  BUILDINGS,
  FARM,
  FOREST,
  HILL_LAND,
  MAIN_DOCK,
  MAIN_LAND,
  PATHS,
  PLACES,
  PLAZA,
  POND,
  SNOW_DOCK,
  SNOW_LAND,
  WORLD_DEPTH,
  WORLD_WIDTH,
  type Area,
  type Blob,
} from '../data/map.ts';
import { makeRandom } from './rng.ts';

export type Tile = 'sea' | 'sand' | 'grass' | 'path' | 'plaza' | 'soil' | 'forest' | 'pond' | 'hill' | 'snow' | 'bridge' | 'dock';

export interface Tree {
  x: number;
  z: number;
  size: number;
  kind: number;
}

export interface World {
  width: number;
  depth: number;
  tiles: Tile[];
  /** Tiles a tree, a wall or a rock stands on. */
  blocked: Uint8Array;
  /** Height at each grid corner, (width + 1) by (depth + 1). */
  heights: Float32Array;
  trees: Tree[];
  rocks: Tree[];
}

const index = (x: number, z: number): number => z * WORLD_WIDTH + x;
const inside = (x: number, z: number): boolean => x >= 0 && z >= 0 && x < WORLD_WIDTH && z < WORLD_DEPTH;

const wobble = (x: number, z: number): number =>
  Math.sin(x * 0.31 + z * 0.17) * 0.05 + Math.sin(x * 0.11 - z * 0.27 + 2) * 0.05 + Math.sin(x * 0.53 + z * 0.61) * 0.025;

/** Above 0 inside the oval, about 1 at its middle. */
const within = ({ x, z, rx, rz }: Blob, px: number, pz: number): number =>
  1 - Math.hypot((px - x) / rx, (pz - z) / rz);

const onLand = (blobs: readonly Blob[], x: number, z: number): boolean =>
  blobs.some((blob) => within(blob, x, z) + wobble(x, z) > 0);

function stamp(tiles: Tile[], x: number, z: number, radius: number, tile: Tile): void {
  for (let dz = -radius; dz <= radius; dz += 1) {
    for (let dx = -radius; dx <= radius; dx += 1) {
      const px = Math.round(x + dx);
      const pz = Math.round(z + dz);
      if (!inside(px, pz)) continue;
      const here = tiles[index(px, pz)];
      if (here !== 'sea' && here !== 'pond') tiles[index(px, pz)] = tile;
    }
  }
}

/** Tiles from each tile to the nearest sea, for sand and for the height of the shore. */
function seaDistance(tiles: readonly Tile[]): Int32Array {
  const distance = new Int32Array(tiles.length).fill(-1);
  let frontier: number[] = [];
  tiles.forEach((tile, at) => {
    if (tile === 'sea') {
      distance[at] = 0;
      frontier.push(at);
    }
  });
  while (frontier.length) {
    const next: number[] = [];
    for (const at of frontier) {
      const x = at % WORLD_WIDTH;
      const z = (at - x) / WORLD_WIDTH;
      for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
        const px = x + dx;
        const pz = z + dz;
        if (!inside(px, pz)) continue;
        const to = index(px, pz);
        if (distance[to] !== -1) continue;
        distance[to] = (distance[at] ?? 0) + 1;
        next.push(to);
      }
    }
    frontier = next;
  }
  return distance;
}

function layTiles(): { tiles: Tile[]; coast: Int32Array } {
  const tiles: Tile[] = [];
  for (let z = 0; z < WORLD_DEPTH; z += 1) {
    for (let x = 0; x < WORLD_WIDTH; x += 1) {
      const land = onLand(MAIN_LAND, x, z) || onLand([HILL_LAND], x, z) || onLand([SNOW_LAND], x, z);
      tiles.push(land ? 'grass' : 'sea');
    }
  }
  const coast = seaDistance(tiles);
  for (let z = 0; z < WORLD_DEPTH; z += 1) {
    for (let x = 0; x < WORLD_WIDTH; x += 1) {
      const at = index(x, z);
      if (tiles[at] === 'sea') continue;
      if (within(SNOW_LAND, x, z) > -0.3 && z < 22) tiles[at] = 'snow';
      else if (within(HILL_LAND, x, z) > -0.3 && x > 76) tiles[at] = (coast[at] ?? 9) <= 1 ? 'sand' : 'hill';
      else if ((coast[at] ?? 9) <= 2 || (within(BEACH, x, z) > 0 && z >= 59)) tiles[at] = 'sand';
      else if (within(FOREST, x, z) > 0) tiles[at] = 'forest';
      if (within(POND, x, z) + wobble(x, z) * 0.5 > 0) tiles[at] = 'pond';
    }
  }
  for (const corners of PATHS) {
    for (let leg = 0; leg + 1 < corners.length; leg += 1) {
      const [ax, az] = corners[leg] ?? [0, 0];
      const [bx, bz] = corners[leg + 1] ?? [0, 0];
      const steps = Math.ceil(Math.hypot(bx - ax, bz - az) * 2);
      for (let step = 0; step <= steps; step += 1) {
        const t = step / steps;
        stamp(tiles, ax + (bx - ax) * t, az + (bz - az) * t, 1, 'path');
      }
    }
  }
  for (let z = FARM.z0; z <= FARM.z1; z += 1) {
    for (let x = FARM.x0; x <= FARM.x1; x += 1) if (tiles[index(x, z)] !== 'sea') tiles[index(x, z)] = 'soil';
  }
  for (let z = PLAZA.z - PLAZA.r; z <= PLAZA.z + PLAZA.r; z += 1) {
    for (let x = PLAZA.x - PLAZA.r; x <= PLAZA.x + PLAZA.r; x += 1) {
      if (Math.hypot(x - PLAZA.x, z - PLAZA.z) <= PLAZA.r) tiles[index(x, z)] = 'plaza';
    }
  }
  for (let x = BRIDGE.x0; x <= BRIDGE.x1; x += 1) {
    for (let z = BRIDGE.z - 1; z <= BRIDGE.z + 1; z += 1) tiles[index(x, z)] = 'bridge';
  }
  for (const { x, z0, z1 } of [MAIN_DOCK, SNOW_DOCK]) {
    for (let z = z0; z <= z1; z += 1) {
      for (let dx = -1; dx <= 1; dx += 1) if (tiles[index(x + dx, z)] === 'sea') tiles[index(x + dx, z)] = 'dock';
    }
  }
  return { tiles, coast };
}

const FLAT: Record<Tile, number> = {
  sea: -1.1,
  pond: -0.75,
  sand: 0.12,
  grass: 0.3,
  path: 0.28,
  plaza: 0.3,
  soil: 0.26,
  forest: 0.34,
  hill: 0.5,
  snow: 0.42,
  bridge: 0.34,
  dock: 0.34,
};

function tileHeight(tile: Tile, x: number, z: number, coast: number): number {
  let height = FLAT[tile];
  if (tile === 'sand') height = coast === 1 ? -0.28 : coast === 2 ? -0.02 : height + Math.sin(x * 0.7 + z * 0.4) * 0.03;
  if (tile === 'hill') {
    const rise = Math.max(0, within(HILL_LAND, x, z)) ** 0.8;
    height += rise * 2.6;
  }
  if (tile === 'snow') height = coast === 1 ? -0.2 : height + Math.max(0, within(SNOW_LAND, x, z)) * 0.9;
  if (tile === 'grass' || tile === 'forest') height += Math.sin(x * 0.45 + 1) * Math.sin(z * 0.5) * 0.07;
  return height;
}

function cornerHeights(tiles: readonly Tile[], coast: Int32Array): Float32Array {
  const heights = new Float32Array((WORLD_WIDTH + 1) * (WORLD_DEPTH + 1));
  for (let z = 0; z <= WORLD_DEPTH; z += 1) {
    for (let x = 0; x <= WORLD_WIDTH; x += 1) {
      let sum = 0;
      let count = 0;
      for (const [dx, dz] of [[-1, -1], [0, -1], [-1, 0], [0, 0]] as const) {
        const px = x + dx;
        const pz = z + dz;
        if (!inside(px, pz)) continue;
        const at = index(px, pz);
        sum += tileHeight(tiles[at] ?? 'sea', px, pz, coast[at] ?? 0);
        count += 1;
      }
      heights[z * (WORLD_WIDTH + 1) + x] = count ? sum / count : FLAT.sea;
    }
  }
  // Planks are level, whatever the ground around them does.
  tiles.forEach((tile, at) => {
    if (tile !== 'bridge' && tile !== 'dock') return;
    const x = at % WORLD_WIDTH;
    const z = (at - x) / WORLD_WIDTH;
    for (const [dx, dz] of [[0, 0], [1, 0], [0, 1], [1, 1]] as const) heights[(z + dz) * (WORLD_WIDTH + 1) + x + dx] = FLAT.dock;
  });
  return heights;
}

/** Nothing leafy may stand on a walkway or within reach of something a child needs to tap. */
function clearSpots(friends: readonly (readonly [number, number])[]): (x: number, z: number) => boolean {
  return (x, z) => friends.every(([fx, fz]) => Math.hypot(x - fx, z - fz) > 2.6);
}

function scatter(
  tiles: readonly Tile[],
  blocked: Uint8Array,
  isFree: (x: number, z: number) => boolean,
): { trees: Tree[]; rocks: Tree[] } {
  const random = makeRandom(4242);
  const trees: Tree[] = [];
  const rocks: Tree[] = [];
  const taken = (x: number, z: number, gap: number): boolean =>
    [...trees, ...rocks].some((tree) => Math.hypot(tree.x - x, tree.z - z) < gap);
  for (let z = 0; z < WORLD_DEPTH; z += 1) {
    for (let x = 0; x < WORLD_WIDTH; x += 1) {
      const tile = tiles[index(x, z)];
      const chance = tile === 'forest' ? 0.5 : tile === 'grass' ? 0.035 : tile === 'hill' ? 0.05 : tile === 'snow' ? 0.04 : tile === 'sand' ? 0.002 : 0;
      if (random() > chance || !isFree(x, z)) continue;
      if (taken(x, z, tile === 'forest' ? 2.2 : 5)) continue;
      const isRock = random() < (tile === 'snow' ? 0.25 : 0.13);
      const item = { x, z, size: 0.85 + random() * 0.55, kind: Math.floor(random() * 3) };
      (isRock ? rocks : trees).push(item);
      blocked[index(x, z)] = 1;
    }
  }
  return { trees, rocks };
}

export function buildWorld(friendSpots: readonly (readonly [number, number])[], extraClear: readonly (readonly [number, number])[] = []): World {
  const { tiles, coast } = layTiles();
  const blocked = new Uint8Array(tiles.length);
  for (const { x, z, w, d } of BUILDINGS) {
    for (let dz = 0; dz < d; dz += 1) for (let dx = 0; dx < w; dx += 1) blocked[index(x + dx, z + dz)] = 1;
  }
  for (const [x, z] of friendSpots) blocked[index(x, z)] = 1;
  const keepClear = clearSpots([...friendSpots, ...extraClear, ...PLACES.map(({ stand }) => stand)]);
  const { trees, rocks } = scatter(tiles, blocked, keepClear);
  const world: World = {
    width: WORLD_WIDTH,
    depth: WORLD_DEPTH,
    tiles,
    blocked,
    heights: cornerHeights(tiles, coast),
    trees,
    rocks,
  };
  return world;
}

export const tileAt = (world: World, x: number, z: number): Tile =>
  inside(Math.floor(x), Math.floor(z)) ? (world.tiles[index(Math.floor(x), Math.floor(z))] ?? 'sea') : 'sea';

/** The ground's height anywhere, smooth between corners. */
export function heightAt(world: World, x: number, z: number): number {
  const px = Math.min(Math.max(x, 0), world.width - 0.001);
  const pz = Math.min(Math.max(z, 0), world.depth - 0.001);
  const fx = Math.floor(px);
  const fz = Math.floor(pz);
  const tx = px - fx;
  const tz = pz - fz;
  const row = world.width + 1;
  const a = world.heights[fz * row + fx] ?? 0;
  const b = world.heights[fz * row + fx + 1] ?? 0;
  const c = world.heights[(fz + 1) * row + fx] ?? 0;
  const d = world.heights[(fz + 1) * row + fx + 1] ?? 0;
  return (a * (1 - tx) + b * tx) * (1 - tz) + (c * (1 - tx) + d * tx) * tz;
}

export interface Openings {
  bridge: boolean;
}

const WALKABLE: Record<Tile, boolean> = {
  sea: false,
  pond: false,
  sand: true,
  grass: true,
  path: true,
  plaza: true,
  soil: true,
  forest: true,
  hill: true,
  snow: true,
  bridge: true,
  dock: true,
};

/** Can feet go on this tile? The bridge only counts once it has been built. */
export function walkable(world: World, x: number, z: number, open: Openings): boolean {
  if (!inside(x, z)) return false;
  const at = index(x, z);
  if (world.blocked[at]) return false;
  const tile = world.tiles[at] ?? 'sea';
  if (tile === 'bridge') return open.bridge;
  return WALKABLE[tile];
}

export function areaAt(world: World, x: number, z: number): Area {
  const tile = tileAt(world, x, z);
  if (tile === 'snow' || z < 22) return 'snow';
  if (x > 79 || tile === 'hill') return 'hill';
  if (tile === 'sand') return 'beach';
  if (tile === 'soil' || x < 34) return 'farm';
  if (tile === 'forest') return 'forest';
  if (Math.hypot(x - POND.x, z - POND.z) < 9) return 'pond';
  return 'village';
}
