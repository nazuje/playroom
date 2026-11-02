import { healIsland, type Island } from './state.ts';

/** Bump this and add a step to MIGRATIONS whenever the shape of a saved island changes. */
export const SAVE_VERSION = 1;
export const SLOTS = 4;

/** Each step takes a save from version n to n + 1. Only ever add to this list: old tablets still hold old saves. */
export type Migration = (old: Record<string, unknown>) => Record<string, unknown>;
export const MIGRATIONS: Readonly<Record<number, Migration>> = {};

/** What `store` from the kit offers, plus a way to tell "nothing there" from "there, but unreadable". */
export interface SaveStorage {
  get<T>(key: string, fallback: T): T;
  set(key: string, value: unknown): void;
  /** Does anything sit at this key, readable or not? Throws if storage can't be reached. */
  has(key: string): boolean;
}

export interface SaveFile {
  version: number;
  /** Goes up with each write, so the newer of the two copies is easy to tell. */
  revision: number;
  island: Island;
}

export type SlotRead =
  | { status: 'empty' }
  | { status: 'ok'; island: Island; revision: number }
  /** Something is stored here that can't be read today. It is left exactly as it is. */
  | { status: 'unreadable' };

const COPIES = ['a', 'b'] as const;
const copyKey = (slot: number, copy: string): string => `my-island:slot-${slot}:${copy}`;
const PROBE_KEY = 'my-island:probe';
const NOT_THERE = Symbol('not there');

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/** Walks a save up through every step to the current version. Returns null if it can't be done safely. */
export function migrate(
  raw: unknown,
  migrations: Readonly<Record<number, Migration>> = MIGRATIONS,
  current: number = SAVE_VERSION,
): SaveFile | null {
  if (!isRecord(raw) || typeof raw.version !== 'number' || !Number.isInteger(raw.version)) return null;
  // A save from a newer game is kept safe, not squeezed into an older shape.
  if (raw.version > current || raw.version < 0) return null;
  let working: Record<string, unknown> = raw;
  try {
    for (let version = raw.version; version < current; version += 1) {
      const step = migrations[version];
      if (!step) return null;
      working = { ...step(working), version: version + 1 };
    }
  } catch {
    return null;
  }
  if (!isRecord(working.island)) return null;
  const revision = typeof working.revision === 'number' ? working.revision : 0;
  return { version: current, revision, island: healIsland(working.island) };
}

type CopyRead = { state: 'empty' } | { state: 'bad' } | { state: 'good'; file: SaveFile };

function readCopy(storage: SaveStorage, key: string): CopyRead {
  let raw: unknown;
  try {
    raw = storage.get<unknown>(key, NOT_THERE);
    // A failed read and an empty key look the same through `get`, so ask whether anything is there.
    if (raw === NOT_THERE) return storage.has(key) ? { state: 'bad' } : { state: 'empty' };
  } catch {
    return { state: 'bad' };
  }
  // A reset writes null, because the kit's store has no way to delete.
  if (raw === null) return { state: 'empty' };
  const file = migrate(raw);
  return file ? { state: 'good', file } : { state: 'bad' };
}

/** Writes and reads back a scrap, to find out whether this device will keep anything at all. */
export function storageWorks(storage: SaveStorage): boolean {
  try {
    const mark = Date.now() % 1000000;
    storage.set(PROBE_KEY, mark);
    return storage.get<number>(PROBE_KEY, -1) === mark;
  } catch {
    return false;
  }
}

/** Reads one island, from whichever of its two copies is newest and sound. */
export function readSlot(storage: SaveStorage, slot: number): SlotRead {
  const reads = COPIES.map((copy) => readCopy(storage, copyKey(slot, copy)));
  let best: SaveFile | null = null;
  for (const read of reads) {
    if (read.state === 'good' && (!best || read.file.revision > best.revision)) best = read.file;
  }
  if (best) return { status: 'ok', island: best.island, revision: best.revision };
  return reads.some((read) => read.state === 'bad') ? { status: 'unreadable' } : { status: 'empty' };
}

/**
 * Keeps one island saved. Writes alternate between two keys, so a write that dies half way
 * leaves the copy before it untouched. A slot that couldn't be read is never written over.
 */
export class IslandSaver {
  private revision: number;
  private readonly storage: SaveStorage;
  private readonly slot: number;
  private readonly writable: boolean;

  constructor(storage: SaveStorage, slot: number, read: SlotRead, works: boolean) {
    this.storage = storage;
    this.slot = slot;
    this.writable = works && read.status !== 'unreadable';
    this.revision = read.status === 'ok' ? read.revision : 0;
  }

  save(island: Island): boolean {
    if (!this.writable) return false;
    this.revision += 1;
    const copy = COPIES[this.revision % COPIES.length] ?? 'a';
    const file: SaveFile = { version: SAVE_VERSION, revision: this.revision, island };
    this.storage.set(copyKey(this.slot, copy), file);
    return true;
  }
}

/** Empties a slot. Only the grown-ups' twice-pressed reset calls this. */
export function clearSlot(storage: SaveStorage, slot: number): void {
  for (const copy of COPIES) storage.set(copyKey(slot, copy), null);
}
