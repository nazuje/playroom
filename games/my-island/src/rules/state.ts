import type { CropId } from '../data/crops.ts';
import type { FriendId } from '../data/friends.ts';
import { startingLook, validLook, type Look } from '../data/looks.ts';
import type { PetId } from '../data/pets.ts';

export const STARTING_PLOTS = 6;
export const MOST_PLOTS = 12;

export interface PlotState {
  crop: CropId | null;
  /** 0 is just planted, 1 is ripe. It only ever goes up. */
  growth: number;
  watered: boolean;
}

export interface PetState {
  kind: PetId;
  /** Love shown so far. It only ever goes up, so a pet left alone for a year is exactly as happy as before. */
  hearts: number;
  following: boolean;
}

export interface PlacedItem {
  uid: number;
  item: string;
  x: number;
  z: number;
  /** Quarter turns, 0 to 3. */
  turn: number;
}

export type QuestStage = 'offered' | 'active' | 'ready';

export interface QuestProgress {
  /** How many quests are finished, which is also the ladder position of the current one. */
  done: number;
  stage: QuestStage;
  count: number;
}

export interface Island {
  avatar: number;
  look: Look;
  shells: number;
  /** Seconds of actual play. Nothing in the game looks at a real clock. */
  clock: number;
  /** The seed for anything random that should carry on across a reload. */
  luck: number;
  x: number;
  z: number;
  plots: PlotState[];
  pets: PetState[];
  /** Harvests and treats, by id. */
  bag: Record<string, number>;
  /** Every collectible and surprise found, by id, with how many times. */
  book: Record<string, number>;
  quests: QuestProgress;
  /** Furniture bought and sitting in the cupboard, by id. */
  stock: Record<string, number>;
  home: PlacedItem[];
  outdoor: PlacedItem[];
  nextUid: number;
  /** Treats each friend has been given. */
  kindness: Partial<Record<FriendId, number>>;
}

const emptyPlot = (): PlotState => ({ crop: null, growth: 0, watered: false });

export const SPAWN = { x: 46, z: 56 };

/** A brand new island, with a bed and a table already at home so it never feels empty. */
export function newIsland(avatar: number, look?: Look, seed = 1): Island {
  return {
    avatar,
    look: look ?? startingLook(avatar),
    shells: 0,
    clock: 0,
    luck: seed,
    x: SPAWN.x,
    z: SPAWN.z,
    plots: Array.from({ length: STARTING_PLOTS }, emptyPlot),
    pets: [],
    bag: {},
    book: {},
    quests: { done: 0, stage: 'offered', count: 0 },
    stock: { bed: 1, table: 1 },
    home: [],
    outdoor: [],
    nextUid: 1,
    kindness: {},
  };
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);
const num = (value: unknown, fallback: number): number =>
  typeof value === 'number' && Number.isFinite(value) ? value : fallback;
const counts = (value: unknown): Record<string, number> => {
  const out: Record<string, number> = {};
  if (!isRecord(value)) return out;
  for (const [key, amount] of Object.entries(value)) if (typeof amount === 'number' && amount > 0) out[key] = amount;
  return out;
};
const list = <T>(value: unknown, keep: (entry: unknown) => entry is T): T[] =>
  Array.isArray(value) ? value.filter(keep) : [];

const isPlot = (entry: unknown): entry is PlotState =>
  isRecord(entry) && typeof entry.growth === 'number' && typeof entry.watered === 'boolean' && (entry.crop === null || typeof entry.crop === 'string');
const isPet = (entry: unknown): entry is PetState =>
  isRecord(entry) && typeof entry.kind === 'string' && typeof entry.hearts === 'number' && typeof entry.following === 'boolean';
const isPlaced = (entry: unknown): entry is PlacedItem =>
  isRecord(entry) &&
  typeof entry.uid === 'number' &&
  typeof entry.item === 'string' &&
  typeof entry.x === 'number' &&
  typeof entry.z === 'number' &&
  typeof entry.turn === 'number';

/**
 * Turns whatever a save held into a whole island. A missing or damaged field falls back to its
 * starting value and the rest survives, so one bad number can't cost a child their world.
 */
export function healIsland(raw: unknown): Island {
  const fresh = newIsland(0);
  if (!isRecord(raw)) return fresh;
  const quests = isRecord(raw.quests) ? raw.quests : {};
  const plots = list(raw.plots, isPlot).slice(0, MOST_PLOTS);
  while (plots.length < STARTING_PLOTS) plots.push(emptyPlot());
  const stage = quests.stage === 'active' || quests.stage === 'ready' ? quests.stage : 'offered';
  return {
    avatar: num(raw.avatar, fresh.avatar),
    look: validLook(isRecord(raw.look) ? (raw.look as Partial<Look>) : undefined, fresh.look),
    shells: Math.max(0, num(raw.shells, 0)),
    clock: Math.max(0, num(raw.clock, 0)),
    luck: num(raw.luck, fresh.luck),
    x: num(raw.x, fresh.x),
    z: num(raw.z, fresh.z),
    plots,
    pets: list(raw.pets, isPet),
    bag: counts(raw.bag),
    book: counts(raw.book),
    quests: { done: Math.max(0, num(quests.done, 0)), stage, count: Math.max(0, num(quests.count, 0)) },
    stock: isRecord(raw.stock) ? counts(raw.stock) : fresh.stock,
    home: list(raw.home, isPlaced),
    outdoor: list(raw.outdoor, isPlaced),
    nextUid: Math.max(1, num(raw.nextUid, 1)),
    kindness: counts(raw.kindness),
  };
}
