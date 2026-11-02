import { describe, expect, it } from 'vitest';
import { collectibleById } from '../data/collection.ts';
import { FIND_TARGETS, fillFinds, findSpots, newFinds, takeFind } from './finds.ts';
import { theWorld } from './island.ts';
import { newIsland } from './state.ts';
import { tileAt, walkable } from './world.ts';

const world = theWorld();
const free = (x: number, z: number) => walkable(world, x, z, { bridge: true });

describe('finds', () => {
  it('has room for finds in every habitat, on the right ground', () => {
    const spots = findSpots(world, free);
    expect(spots.beach.length).toBeGreaterThan(30);
    expect(spots.forest.length).toBeGreaterThan(30);
    expect(spots.hill.length).toBeGreaterThan(30);
    expect(spots.snow.length).toBeGreaterThan(20);
    expect(spots.beach.every(([x, z]) => tileAt(world, x, z) === 'sand')).toBe(true);
  });

  it('fills each habitat with things that belong there', () => {
    const finds = newFinds(3);
    fillFinds(finds, findSpots(world, free), 0, free, true);
    for (const [habitat, count] of Object.entries(FIND_TARGETS)) {
      const here = finds.list.filter((find) => find.habitat === habitat);
      expect(here, habitat).toHaveLength(count);
      expect(here.every((find) => collectibleById(find.item)?.habitat === habitat)).toBe(true);
    }
  });

  it('puts a picked shell in the book and the purse, and replaces it a little later', () => {
    const island = newIsland(0);
    const finds = newFinds(9);
    const spots = findSpots(world, free);
    fillFinds(finds, spots, 0, free, true);
    const shell = finds.list.find((find) => find.habitat === 'beach')!;
    const taken = takeFind(island, finds, shell.uid, 10);
    expect(taken?.first).toBe(true);
    expect(island.book[shell.item]).toBe(1);
    expect(island.shells).toBe(1);
    expect(takeFind(island, finds, shell.uid, 10)).toBeNull();
    expect(fillFinds(finds, spots, 11, free)).toBe(false);
    expect(fillFinds(finds, spots, 20, free)).toBe(true);
    expect(finds.list.filter((find) => find.habitat === 'beach')).toHaveLength(FIND_TARGETS.beach);
  });

  it('turns up a golden butterfly now and then, as a surprise', () => {
    let seen = 0;
    for (let seed = 0; seed < 400 && !seen; seed += 1) {
      const finds = newFinds(seed);
      fillFinds(finds, findSpots(world, free), 0, free, true);
      seen += finds.list.filter((find) => find.item === 'bug-golden').length;
    }
    expect(seen).toBeGreaterThan(0);
  });
});
