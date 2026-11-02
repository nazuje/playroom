import { describe, expect, it } from 'vitest';
import { findPath, nearestReachable, straighten, type Grid } from './path.ts';
import { makeWalker, stepWalker } from './walker.ts';

function gridOf(rows: readonly string[]): Grid {
  return {
    width: rows[0]?.length ?? 0,
    depth: rows.length,
    walkable: (x, z) => rows[z]?.[x] === '.' || rows[z]?.[x] === 's',
    cost: (x, z) => (rows[z]?.[x] === 's' ? 5 : 0),
  };
}

describe('finding the way', () => {
  it('walks straight across open ground', () => {
    const route = findPath(gridOf(['.....', '.....', '.....']), { x: 0, z: 1 }, { x: 4, z: 1 });
    expect(route).toHaveLength(5);
  });

  it('goes round a wall', () => {
    const grid = gridOf(['.....', '.###.', '.....']);
    const route = findPath(grid, { x: 2, z: 0 }, { x: 2, z: 2 });
    expect(route?.at(-1)).toEqual({ x: 2, z: 2 });
    expect(route?.every(({ x, z }) => grid.walkable(x, z))).toBe(true);
  });

  it('never cuts a corner', () => {
    const grid = gridOf(['.#', '..']);
    const route = findPath(grid, { x: 0, z: 0 }, { x: 1, z: 1 });
    expect(route).toEqual([{ x: 0, z: 0 }, { x: 0, z: 1 }, { x: 1, z: 1 }]);
  });

  it('reports no way when there is none', () => {
    expect(findPath(gridOf(['.#.', '.#.']), { x: 0, z: 0 }, { x: 2, z: 0 })).toBeNull();
    expect(findPath(gridOf(['.#.']), { x: 0, z: 0 }, { x: 1, z: 0 })).toBeNull();
  });

  it('prefers walking round a decoration, but can walk through when it must', () => {
    const around = findPath(gridOf(['.....', '..s..', '.....']), { x: 0, z: 1 }, { x: 4, z: 1 });
    expect(around?.some(({ x, z }) => x === 2 && z === 1)).toBe(false);
    const through = findPath(gridOf(['#####', '..s..', '#####']), { x: 0, z: 1 }, { x: 4, z: 1 });
    expect(through).toHaveLength(5);
  });

  it('turns a tap in the sea into the nearest shore', () => {
    const grid = gridOf(['....#', '....#', '....#']);
    expect(nearestReachable(grid, { x: 0, z: 0 }, { x: 6, z: 1 })).toEqual({ x: 3, z: 1 });
  });

  it('finds no shore for a sealed-off spot', () => {
    const grid = gridOf(['.#.', '###']);
    expect(nearestReachable(grid, { x: 0, z: 0 }, { x: 2, z: 0 }, 0)).toBeNull();
  });

  it('straightens a staircase without crossing a wall', () => {
    const grid = gridOf(['.......', '.......', '...#...', '.......']);
    const route = findPath(grid, { x: 0, z: 0 }, { x: 6, z: 3 }) ?? [];
    const short = straighten(grid, route);
    expect(short.length).toBeLessThan(route.length);
    expect(short.at(0)).toEqual({ x: 0, z: 0 });
    expect(short.at(-1)).toEqual({ x: 6, z: 3 });
  });
});

describe('walking', () => {
  it('follows the route at its speed and says when it arrives', () => {
    const walker = makeWalker(0, 0, 2);
    walker.route = [{ x: 2, z: 0 }, { x: 2, z: 2 }];
    expect(stepWalker(walker, 0.5)).toBe(false);
    expect(walker.x).toBeCloseTo(1);
    expect(stepWalker(walker, 0.5)).toBe(false);
    expect(stepWalker(walker, 1)).toBe(true);
    expect(walker).toMatchObject({ x: 2, z: 2 });
  });

  it('handles a big step across several corners', () => {
    const walker = makeWalker(0, 0, 10);
    walker.route = [{ x: 1, z: 0 }, { x: 1, z: 1 }, { x: 2, z: 1 }];
    expect(stepWalker(walker, 1)).toBe(true);
    expect(walker).toMatchObject({ x: 2, z: 1 });
  });

  it('turns to face where it goes', () => {
    const walker = makeWalker(0, 0, 1);
    walker.route = [{ x: 5, z: 0 }];
    stepWalker(walker, 0.1);
    expect(walker.facing).toBeCloseTo(Math.PI / 2);
  });

  it('does nothing without a route', () => {
    const walker = makeWalker(3, 3, 1);
    expect(stepWalker(walker, 1)).toBe(false);
    expect(walker).toMatchObject({ x: 3, z: 3 });
  });
});
