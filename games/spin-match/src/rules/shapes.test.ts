import { describe, expect, it } from 'vitest';
import {
  bare,
  connected,
  difference,
  FACE,
  fromRows,
  glance,
  isMirrorOf,
  isTurnOf,
  keyOf,
  mirror,
  movedVersions,
  noSymmetry,
  relation,
  repainted,
  SPOT,
  turn,
  turnBetween,
  type Tile,
} from './shapes.ts';

const L = fromRows(['#.', '#.', '##']);
/** L with a face on its top tile, looking up. */
const critter: Tile[] = L.map((tile) => (tile.x === 0 && tile.y === 0 ? { ...tile, paint: FACE, look: 0 } : tile));

describe('turning and mirroring', () => {
  it('turns clockwise on screen, a quarter at a time, and four turns come back', () => {
    // The L's foot points right; a quarter turn clockwise makes the long side lie across with the foot down-left.
    expect(keyOf(turn(L, 1))).toBe(keyOf(fromRows(['###', '#..'])));
    expect(keyOf(turn(L, 4))).toBe(keyOf(L));
    expect(keyOf(turn(turn(L, 1), 3))).toBe(keyOf(L));
  });

  it('turns the face with the shape', () => {
    const face = (shape: Tile[]) => shape.find((tile) => tile.paint === FACE)?.look;
    expect([0, 1, 2, 3].map((quarters) => face(turn(critter, quarters)))).toEqual([0, 1, 2, 3]);
    // In a mirror, a face looking right looks left, and one looking up still looks up.
    expect(face(mirror(turn(critter, 1)))).toBe(3);
    expect(face(mirror(critter))).toBe(0);
  });

  it('tells a turn from a mirror image', () => {
    expect(isTurnOf(L, turn(L, 3))).toBe(true);
    expect(turnBetween(L, turn(L, 3))).toBe(3);
    expect(isTurnOf(L, mirror(L))).toBe(false);
    expect(isMirrorOf(L, turn(mirror(L), 2))).toBe(true);
    expect(relation(critter, turn(critter, 2))).toBe('turned');
    expect(relation(critter, turn(mirror(critter), 1))).toBe('mirror');
    expect(relation(critter, fromRows(['##', '##']))).toBe('other');
  });

  it('finds shapes with no symmetry: an L has none, a T, an S and a square do', () => {
    expect(noSymmetry(L)).toBe(true);
    expect(noSymmetry(fromRows(['###', '.#.']))).toBe(false);
    expect(noSymmetry(fromRows(['.##', '##.']))).toBe(false);
    expect(noSymmetry(fromRows(['##', '##']))).toBe(false);
    // A face on the end of a T's arm breaks its mirror symmetry.
    const T = fromRows(['###', '.#.']).map((tile) => (tile.x === 0 ? { ...tile, paint: FACE, look: 3 } : tile));
    expect(noSymmetry(T)).toBe(true);
  });
});

describe('near misses', () => {
  it('moves one tile at a time and keeps the shape in one piece, the face where it is', () => {
    const moved = movedVersions(critter);
    expect(moved.length).toBeGreaterThan(3);
    for (const shape of moved) {
      expect(shape).toHaveLength(critter.length);
      expect(connected(shape)).toBe(true);
      expect(isTurnOf(critter, shape) && keyOf(shape) === keyOf(critter)).toBe(false);
      expect(shape.filter((tile) => tile.paint === FACE)).toHaveLength(1);
    }
  });

  it('moves an accent colour onto a plain tile', () => {
    const spotted = L.map((tile, at) => (at === 3 ? { ...tile, paint: SPOT } : tile));
    for (const shape of repainted(spotted)) {
      expect(keyOf(bare(shape))).toBe(keyOf(L));
      expect(shape.filter((tile) => tile.paint === SPOT)).toHaveLength(1);
      expect(keyOf(shape)).not.toBe(keyOf(spotted));
    }
  });

  it('finds the one tile that moved, even when the option is turned', () => {
    // The foot moves from the right of the bottom tile to the left of it.
    const moved = fromRows(['.#', '.#', '##']);
    const { wrong, missing } = difference(L, turn(moved, 1));
    expect(wrong).toHaveLength(1);
    expect(missing).toHaveLength(1);
    expect(difference(L, turn(L, 2))).toEqual({ wrong: [], missing: [] });
  });

  it('glances without turning: the same shape as it lies looks most alike, a turned one less', () => {
    expect(glance(L, L)).toBe(8);
    expect(glance(L, turn(L, 1))).toBeLessThan(glance(L, L));
    expect(glance(L, mirror(L))).toBeGreaterThan(glance(L, turn(L, 1)));
  });
});
