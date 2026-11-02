import { ROOM, furnitureById, type Furniture, type Room } from '../data/furniture.ts';
import { islandLevel, recordEvent } from './quests.ts';
import type { Island, PlacedItem } from './state.ts';

/** Can a tile take furniture at all? Outdoors this is the island; indoors it is the room floor. */
export type Ground = (x: number, z: number) => boolean;

export const roomList = (island: Island, room: Room): PlacedItem[] => (room === 'home' ? island.home : island.outdoor);

/** Width and depth on the floor after turning. */
export function footprint(item: Furniture, turn: number): readonly [number, number] {
  const [wide, deep] = item.size;
  return turn % 2 === 0 ? [wide, deep] : [deep, wide];
}

export function tilesOf(placed: PlacedItem): [number, number][] {
  const item = furnitureById(placed.item);
  if (!item) return [];
  const [wide, deep] = footprint(item, placed.turn);
  const tiles: [number, number][] = [];
  for (let dz = 0; dz < deep; dz += 1) for (let dx = 0; dx < wide; dx += 1) tiles.push([placed.x + dx, placed.z + dz]);
  return tiles;
}

/** The front door stays clear, so nobody is ever shut in or out. */
export const DOOR = { x: Math.floor(ROOM.width / 2), z: ROOM.depth - 1 };

export const indoorGround: Ground = (x, z) =>
  x >= 0 && z >= 0 && x < ROOM.width && z < ROOM.depth && !(x === DOOR.x && z === DOOR.z);

/** Does the item fit here? A rug can lie under other things, but two solid things can't share a tile. */
export function fits(placed: readonly PlacedItem[], item: Furniture, x: number, z: number, turn: number, ground: Ground, ignore = -1): boolean {
  const [wide, deep] = footprint(item, turn);
  const flat = Boolean(item.flat);
  for (let dz = 0; dz < deep; dz += 1) for (let dx = 0; dx < wide; dx += 1) if (!ground(x + dx, z + dz)) return false;
  for (const other of placed) {
    if (other.uid === ignore) continue;
    const otherItem = furnitureById(other.item);
    if (!otherItem || Boolean(otherItem.flat) !== flat) continue;
    const [otherWide, otherDeep] = footprint(otherItem, other.turn);
    const apart = x + wide <= other.x || other.x + otherWide <= x || z + deep <= other.z || other.z + otherDeep <= z;
    if (!apart) return false;
  }
  return true;
}

/** The fitting spot nearest a tap, so a near miss still places the thing. */
export function nearestFit(
  placed: readonly PlacedItem[],
  item: Furniture,
  x: number,
  z: number,
  turn: number,
  ground: Ground,
  ignore = -1,
  reach = 3,
): { x: number; z: number } | null {
  const [wide, deep] = footprint(item, turn);
  const left = Math.round(x - (wide - 1) / 2);
  const top = Math.round(z - (deep - 1) / 2);
  let best: { x: number; z: number; away: number } | null = null;
  for (let dz = -reach; dz <= reach; dz += 1) {
    for (let dx = -reach; dx <= reach; dx += 1) {
      const away = Math.hypot(dx, dz);
      if (best && away >= best.away) continue;
      if (fits(placed, item, left + dx, top + dz, turn, ground, ignore)) best = { x: left + dx, z: top + dz, away };
    }
  }
  return best ? { x: best.x, z: best.z } : null;
}

export type BuyResult = 'bought' | 'shells' | 'later';

export function buy(island: Island, id: string): BuyResult {
  const item = furnitureById(id);
  if (!item || item.level > islandLevel(island)) return 'later';
  if (island.shells < item.price) return 'shells';
  island.shells -= item.price;
  island.stock[id] = (island.stock[id] ?? 0) + 1;
  return 'bought';
}

/** Takes one from the cupboard and puts it down. Returns what was placed, or null if it doesn't fit nearby. */
export function placeItem(island: Island, room: Room, id: string, x: number, z: number, turn: number, ground: Ground): PlacedItem | null {
  const item = furnitureById(id);
  if (!item || item.room !== room || (island.stock[id] ?? 0) <= 0) return null;
  const list = roomList(island, room);
  const spot = nearestFit(list, item, x, z, turn, ground);
  if (!spot) return null;
  const placed: PlacedItem = { uid: island.nextUid, item: id, x: spot.x, z: spot.z, turn: turn % 4 };
  island.nextUid += 1;
  island.stock[id] = (island.stock[id] ?? 0) - 1;
  if ((island.stock[id] ?? 0) <= 0) delete island.stock[id];
  list.push(placed);
  recordEvent(island, { type: 'place', room });
  return placed;
}

/** A quarter turn. If it no longer fits, it shuffles to the nearest place it does, or stays as it was. */
export function turnItem(island: Island, room: Room, uid: number, ground: Ground): boolean {
  const placed = roomList(island, room).find((entry) => entry.uid === uid);
  const item = placed && furnitureById(placed.item);
  if (!placed || !item) return false;
  const turn = (placed.turn + 1) % 4;
  const spot = nearestFit(roomList(island, room), item, placed.x, placed.z, turn, ground, uid, 2);
  if (!spot) return false;
  placed.turn = turn;
  placed.x = spot.x;
  placed.z = spot.z;
  return true;
}

export function moveItem(island: Island, room: Room, uid: number, x: number, z: number, ground: Ground): boolean {
  const placed = roomList(island, room).find((entry) => entry.uid === uid);
  const item = placed && furnitureById(placed.item);
  if (!placed || !item) return false;
  const spot = nearestFit(roomList(island, room), item, x, z, placed.turn, ground, uid);
  if (!spot) return false;
  placed.x = spot.x;
  placed.z = spot.z;
  return true;
}

/** Back into the cupboard, never lost. */
export function putAway(island: Island, room: Room, uid: number): boolean {
  const list = roomList(island, room);
  const at = list.findIndex((entry) => entry.uid === uid);
  const placed = list[at];
  if (!placed) return false;
  list.splice(at, 1);
  island.stock[placed.item] = (island.stock[placed.item] ?? 0) + 1;
  return true;
}

/** Tiles outdoor things stand on, for walking round them. Rugs and other flat things don't count. */
export function solidTiles(placed: readonly PlacedItem[]): [number, number][] {
  return placed.filter((entry) => !furnitureById(entry.item)?.flat).flatMap(tilesOf);
}
