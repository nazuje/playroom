import { describe, expect, it } from 'vitest';
import { FRIENDS } from '../data/friends.ts';
import { PLACES, PLOT_SPOTS, SNOW_ARRIVE } from '../data/map.ts';
import { theWorld } from './island.ts';
import { findPath, type Grid } from './path.ts';
import { SPAWN } from './state.ts';
import { areaAt, heightAt, tileAt, walkable } from './world.ts';

const world = theWorld();
const grid = (bridge: boolean): Grid => ({
  width: world.width,
  depth: world.depth,
  walkable: (x, z) => walkable(world, x, z, { bridge }),
});

describe('the island', () => {
  it('starts on open ground', () => {
    expect(walkable(world, SPAWN.x, SPAWN.z, { bridge: false })).toBe(true);
  });

  it('has a beach, a village, a farm, a forest and a pond', () => {
    const areas = new Set<string>();
    for (let z = 0; z < world.depth; z += 1) for (let x = 0; x < world.width; x += 1) if (tileAt(world, x, z) !== 'sea') areas.add(areaAt(world, x, z));
    for (const area of ['beach', 'village', 'farm', 'forest', 'pond', 'hill', 'snow']) expect(areas).toContain(area);
  });

  it('reaches every main-island place on foot from the start', () => {
    for (const { id, stand } of PLACES.filter(({ id }) => !['boatBack'].includes(id))) {
      const route = findPath(grid(false), SPAWN, { x: stand[0], z: stand[1] });
      expect(route, id).not.toBeNull();
    }
  });

  it('reaches every garden bed from the start', () => {
    for (const [x, z] of PLOT_SPOTS) expect(findPath(grid(false), SPAWN, { x, z })).not.toBeNull();
  });

  it('keeps Flower Hill behind the bridge until it opens', () => {
    const top = { x: 90, z: 42 };
    expect(findPath(grid(false), SPAWN, top)).toBeNull();
    expect(findPath(grid(true), SPAWN, top)).not.toBeNull();
  });

  it('can only reach Snowy Isle by boat', () => {
    expect(findPath(grid(true), SPAWN, SNOW_ARRIVE)).toBeNull();
    expect(findPath(grid(true), SNOW_ARRIVE, { x: 44, z: 12 })).not.toBeNull();
  });

  it('lets you walk right up to every friend', () => {
    for (const friend of FRIENDS) {
      const start = friend.level >= 7 ? SNOW_ARRIVE : SPAWN;
      const beside = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx = 0, dz = 0]) =>
        findPath(grid(true), start, { x: friend.x + dx, z: friend.z + dz }));
      expect(beside, friend.id).toBe(true);
    }
  });

  it('puts the ground above the sea wherever you can walk', () => {
    for (let z = 0; z < world.depth; z += 1) {
      for (let x = 0; x < world.width; x += 1) {
        const shore = tileAt(world, x, z) === 'sand' || tileAt(world, x, z) === 'snow';
        if (walkable(world, x, z, { bridge: true }) && !shore) expect(heightAt(world, x + 0.5, z + 0.5)).toBeGreaterThan(-0.12);
      }
    }
  });

  it('has a real forest', () => {
    expect(world.trees.filter(({ x, z }) => tileAt(world, x, z) === 'forest').length).toBeGreaterThan(25);
  });
});
