import { describe, expect, it } from 'vitest';
import { IslandSaver, SAVE_VERSION, clearSlot, migrate, readSlot, storageWorks, type SaveStorage } from './save.ts';
import { healIsland, newIsland } from './state.ts';

/** Acts like the kit's store over localStorage: bad JSON and blocked storage both quietly give the fallback. */
function fakeStorage(start: Record<string, string> = {}): SaveStorage & { raw: Record<string, string>; blocked: boolean; fullWrites: boolean } {
  const raw = { ...start };
  return {
    raw,
    blocked: false,
    fullWrites: false,
    get<T>(key: string, fallback: T): T {
      if (this.blocked) return fallback;
      try {
        const saved = raw[key];
        return saved === undefined ? fallback : (JSON.parse(saved) as T);
      } catch {
        return fallback;
      }
    },
    set(key: string, value: unknown) {
      if (this.blocked || this.fullWrites) return;
      raw[key] = JSON.stringify(value);
    },
    has(key: string) {
      if (this.blocked) throw new Error('blocked');
      return key in raw;
    },
  };
}

const saveOne = (storage: SaveStorage, slot: number, shells: number): void => {
  const saver = new IslandSaver(storage, slot, readSlot(storage, slot), true);
  const island = newIsland(0);
  island.shells = shells;
  saver.save(island);
};

describe('saving and loading', () => {
  it('reads back what it saved, and keeps slots apart', () => {
    const storage = fakeStorage();
    saveOne(storage, 0, 5);
    saveOne(storage, 2, 9);
    const first = readSlot(storage, 0);
    const third = readSlot(storage, 2);
    expect(first.status === 'ok' && first.island.shells).toBe(5);
    expect(third.status === 'ok' && third.island.shells).toBe(9);
    expect(readSlot(storage, 1).status).toBe('empty');
  });

  it('uses the newest copy, going on from where it left off', () => {
    const storage = fakeStorage();
    const saver = new IslandSaver(storage, 0, readSlot(storage, 0), true);
    const island = newIsland(0);
    for (let shells = 1; shells <= 7; shells += 1) {
      island.shells = shells;
      saver.save(island);
    }
    const again = readSlot(storage, 0);
    expect(again.status === 'ok' && again.island.shells).toBe(7);
    const next = new IslandSaver(storage, 0, again, true);
    island.shells = 8;
    next.save(island);
    const last = readSlot(storage, 0);
    expect(last.status === 'ok' && last.revision).toBe(8);
    expect(last.status === 'ok' && last.island.shells).toBe(8);
  });
});

describe('a save survives trouble', () => {
  it('falls back to the other copy when the newest one is garbled', () => {
    const storage = fakeStorage();
    const saver = new IslandSaver(storage, 0, readSlot(storage, 0), true);
    const island = newIsland(0);
    island.shells = 4;
    saver.save(island);
    island.shells = 5;
    saver.save(island);
    storage.raw['my-island:slot-0:a'] = '{"version":1,"rev'; // revision 2 lands in copy a
    const read = readSlot(storage, 0);
    expect(read.status === 'ok' && read.island.shells).toBe(4);
  });

  it('marks a slot unreadable when both copies are garbled, and refuses to write over it', () => {
    const storage = fakeStorage({ 'my-island:slot-1:a': '{broken', 'my-island:slot-1:b': 'also broken' });
    const read = readSlot(storage, 1);
    expect(read.status).toBe('unreadable');
    const saver = new IslandSaver(storage, 1, read, true);
    expect(saver.save(newIsland(0))).toBe(false);
    expect(storage.raw['my-island:slot-1:a']).toBe('{broken');
    expect(storage.raw['my-island:slot-1:b']).toBe('also broken');
  });

  it('treats blocked storage as trouble, not as an empty slot, and does not write', () => {
    const storage = fakeStorage();
    saveOne(storage, 0, 12);
    const before = { ...storage.raw };
    storage.blocked = true;
    expect(storageWorks(storage)).toBe(false);
    const read = readSlot(storage, 0);
    expect(read.status).toBe('unreadable');
    new IslandSaver(storage, 0, read, false).save(newIsland(0));
    storage.blocked = false;
    expect(storage.raw).toEqual(before);
    const back = readSlot(storage, 0);
    expect(back.status === 'ok' && back.island.shells).toBe(12);
  });

  it('never writes when the device will not keep anything', () => {
    const storage = fakeStorage();
    const saver = new IslandSaver(storage, 0, { status: 'empty' }, false);
    expect(saver.save(newIsland(0))).toBe(false);
    expect(storage.raw).toEqual({});
  });

  it('keeps the last good copy when a full disk swallows a write', () => {
    const storage = fakeStorage();
    saveOne(storage, 0, 3);
    storage.fullWrites = true;
    saveOne(storage, 0, 99);
    const read = readSlot(storage, 0);
    expect(read.status === 'ok' && read.island.shells).toBe(3);
  });

  it('keeps a save from a newer version of the game untouched', () => {
    const future = JSON.stringify({ version: SAVE_VERSION + 1, revision: 3, island: { shells: 40 } });
    const storage = fakeStorage({ 'my-island:slot-0:a': future });
    expect(readSlot(storage, 0).status).toBe('unreadable');
    expect(storage.raw['my-island:slot-0:a']).toBe(future);
  });

  it('only a reset empties a slot', () => {
    const storage = fakeStorage();
    saveOne(storage, 3, 1);
    clearSlot(storage, 3);
    expect(readSlot(storage, 3).status).toBe('empty');
  });
});

describe('migration', () => {
  it('walks an old save up every step in order', () => {
    const old = { version: 1, revision: 6, island: { coins: 8 } };
    const steps = {
      1: (save: Record<string, unknown>) => {
        const { coins } = save.island as { coins: number };
        return { ...save, island: { shells: coins } };
      },
      2: (save: Record<string, unknown>) => {
        const { shells } = save.island as { shells: number };
        return { ...save, island: { shells: shells + 1 } };
      },
    };
    const file = migrate(old, steps, 3);
    expect(file?.version).toBe(3);
    expect(file?.revision).toBe(6);
    expect(file?.island.shells).toBe(9);
  });

  it('gives up safely when a step is missing or throws', () => {
    expect(migrate({ version: 1, island: {} }, {}, 2)).toBeNull();
    const broken = {
      1: () => {
        throw new Error('nope');
      },
    };
    expect(migrate({ version: 1, island: {} }, broken, 2)).toBeNull();
  });

  it('rejects things that are not saves', () => {
    expect(migrate('hello')).toBeNull();
    expect(migrate([1, 2])).toBeNull();
    expect(migrate({ version: 'one', island: {} })).toBeNull();
    expect(migrate({ version: SAVE_VERSION })).toBeNull();
  });
});

describe('healing', () => {
  it('keeps what it can from a damaged island', () => {
    const healed = healIsland({
      shells: 'lots',
      clock: 90,
      plots: [{ crop: 'carrot', growth: 0.5, watered: true }, 'bad'],
      pets: [{ kind: 'kitten', hearts: 3, following: true }, null],
      look: { skin: 99, hat: 2 },
      quests: { done: 4, stage: 'nonsense' },
    });
    expect(healed.shells).toBe(0);
    expect(healed.clock).toBe(90);
    expect(healed.plots).toHaveLength(6);
    expect(healed.plots[0]?.crop).toBe('carrot');
    expect(healed.pets).toHaveLength(1);
    expect(healed.look.hat).toBe(2);
    expect(healed.look.skin).toBeLessThan(6);
    expect(healed.quests).toEqual({ done: 4, stage: 'offered', count: 0 });
  });
});

describe('a heavily decorated island', () => {
  it('saves and loads every piece, and stays small', () => {
    const island = newIsland(3);
    island.quests = { done: 30, stage: 'offered', count: 0 };
    island.shells = 9999;
    island.pets = ['kitten', 'puppy', 'bunny', 'duckling', 'piglet', 'chick', 'dino', 'pony'].map((kind, index) => ({ kind: kind as never, hearts: index * 40, following: index < 3 }));
    for (let at = 0; at < 400; at += 1) island.outdoor.push({ uid: at + 1, item: 'flowerpot', x: 10 + (at % 40), z: 30 + Math.floor(at / 40), turn: at % 4 });
    for (let at = 0; at < 60; at += 1) island.home.push({ uid: 1000 + at, item: at % 2 ? 'rug' : 'teddy', x: at % 9, z: Math.floor(at / 9) % 7, turn: 0 });
    for (let at = 0; at < 40; at += 1) island.book[`thing-${at}`] = at + 1;
    island.stock = { piano: 3, globe: 2 };
    island.nextUid = 2000;
    const storage = fakeStorage();
    const saver = new IslandSaver(storage, 0, readSlot(storage, 0), true);
    expect(saver.save(island)).toBe(true);
    const back = readSlot(storage, 0);
    expect(back.status).toBe('ok');
    if (back.status !== 'ok') return;
    expect(back.island.outdoor).toHaveLength(400);
    expect(back.island.home).toHaveLength(60);
    expect(back.island.pets).toHaveLength(8);
    expect(back.island).toEqual(healIsland(island));
    const bytes = Object.values(storage.raw).reduce((sum, value) => sum + value.length, 0);
    expect(bytes).toBeLessThan(80_000);
  });
});
