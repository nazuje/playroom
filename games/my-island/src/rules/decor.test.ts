import { describe, expect, it } from 'vitest';
import { furnitureById } from '../data/furniture.ts';
import { buy, DOOR, fits, footprint, indoorGround, moveItem, nearestFit, placeItem, putAway, solidTiles, turnItem } from './decor.ts';
import { newIsland } from './state.ts';

describe('decorating', () => {
  it('buys with shells only, and only what the level has opened', () => {
    const island = newIsland(0);
    expect(buy(island, 'chair')).toBe('shells');
    island.shells = 10;
    expect(buy(island, 'piano')).toBe('later');
    expect(buy(island, 'chair')).toBe('bought');
    expect(island.shells).toBe(7);
    expect(island.stock.chair).toBe(1);
  });

  it('places from the cupboard, nudging a near miss into place', () => {
    const island = newIsland(0);
    const bed = placeItem(island, 'home', 'bed', 8, 0, 0, indoorGround);
    expect(bed).not.toBeNull();
    expect(bed!.x + footprint(furnitureById('bed')!, 0)[0]).toBeLessThanOrEqual(9);
    expect(island.stock.bed).toBeUndefined();
    expect(placeItem(island, 'home', 'bed', 0, 0, 0, indoorGround)).toBeNull();
  });

  it('keeps solid things apart but lets a rug go under them', () => {
    const island = newIsland(0);
    island.stock = { table: 2, rug: 1 };
    const table = placeItem(island, 'home', 'table', 2, 2, 0, indoorGround)!;
    expect(fits(island.home, furnitureById('table')!, table.x, table.z, 0, indoorGround)).toBe(false);
    expect(fits(island.home, furnitureById('rug')!, table.x, table.z, 0, indoorGround)).toBe(true);
  });

  it('never blocks the door', () => {
    expect(indoorGround(DOOR.x, DOOR.z)).toBe(false);
    expect(nearestFit([], furnitureById('castleBed')!, DOOR.x, DOOR.z, 0, indoorGround)).not.toBeNull();
  });

  it('turns, moves and puts away without losing anything', () => {
    const island = newIsland(0);
    island.stock = { sofa: 1 };
    const sofa = placeItem(island, 'home', 'sofa', 0, 0, 0, indoorGround)!;
    expect(turnItem(island, 'home', sofa.uid, indoorGround)).toBe(true);
    expect(island.home[0]?.turn).toBe(1);
    expect(moveItem(island, 'home', sofa.uid, 6, 2, indoorGround)).toBe(true);
    expect(putAway(island, 'home', sofa.uid)).toBe(true);
    expect(island.home).toHaveLength(0);
    expect(island.stock.sofa).toBe(1);
  });

  it('counts only solid things as in the way outdoors', () => {
    const island = newIsland(0);
    island.outdoor = [
      { uid: 1, item: 'fountain', x: 10, z: 10, turn: 0 },
      { uid: 2, item: 'flowerpot', x: 20, z: 20, turn: 0 },
    ];
    expect(solidTiles(island.outdoor)).toHaveLength(10);
  });
});
