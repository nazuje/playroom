// A critter is a polyomino: square tiles on a grid. Some tiles are painted, with an accent colour or with the
// face, which also looks one way, so the way a critter is turned can always be seen. Everything here is pure, so
// the generator, the solver, the tests and the bots all share it.
//
// Screen coordinates: x grows to the right and y grows down. A quarter turn is clockwise on screen, the same way
// CSS rotate(90deg) turns, so the view can spin a drawing to match a turned shape.

/** What is painted on a tile. */
export const BODY = 0;
export const SPOT = 1;
export const STRIPE = 2;
export const GEM = 3;
export const FACE = 4;
export const ACCENTS = [SPOT, STRIPE, GEM] as const;

export interface Tile {
  x: number;
  y: number;
  paint: number;
  /** Which way the face looks: 0 up, 1 right, 2 down, 3 left. Always 0 on a tile with no face. */
  look: number;
}

export type Shape = readonly Tile[];

const tileOrder = (a: Tile, b: Tile): number => a.y - b.y || a.x - b.x;

/** Moves a shape so its top-left corner is at 0, 0, with its tiles in reading order. */
export function normalise(shape: Shape): Tile[] {
  const minX = Math.min(...shape.map((tile) => tile.x));
  const minY = Math.min(...shape.map((tile) => tile.y));
  return shape.map((tile) => ({ ...tile, x: tile.x - minX, y: tile.y - minY })).sort(tileOrder);
}

/** One quarter turn clockwise. */
const quarter = (shape: Shape): Tile[] =>
  shape.map((tile) => ({ x: -tile.y, y: tile.x, paint: tile.paint, look: tile.paint === FACE ? (tile.look + 1) % 4 : 0 }));

/** A shape turned clockwise by some quarter turns. */
export function turn(shape: Shape, quarters: number): Tile[] {
  let turned: Tile[] = [...shape];
  for (let step = 0; step < ((quarters % 4) + 4) % 4; step += 1) turned = quarter(turned);
  return normalise(turned);
}

const MIRROR_LOOK = [0, 3, 2, 1];

/** The shape as seen in a mirror standing beside it: left and right swap. */
export const mirror = (shape: Shape): Tile[] =>
  normalise(shape.map((tile) => ({ x: -tile.x, y: tile.y, paint: tile.paint, look: tile.paint === FACE ? MIRROR_LOOK[tile.look] : 0 })));

/** A shape written as text, so two shapes in the same place compare equal. */
export const keyOf = (shape: Shape): string =>
  normalise(shape)
    .map((tile) => `${tile.x},${tile.y},${tile.paint},${tile.look}`)
    .join(';');

/** The shape with nothing painted on it. */
export const bare = (shape: Shape): Tile[] => normalise(shape.map((tile) => ({ x: tile.x, y: tile.y, paint: BODY, look: 0 })));

export const turns = (shape: Shape): Tile[][] => [0, 1, 2, 3].map((quarters) => turn(shape, quarters));

/** All eight ways a shape can lie: its four turns, then the four turns of its mirror image. */
export const images = (shape: Shape): Tile[][] => [...turns(shape), ...turns(mirror(shape))];

/**
 * True when every one of the eight ways it can lie looks different. Such a shape has no turn that looks like
 * itself and no mirror image that a turn could make, so "turned" and "backwards" can always be told apart.
 */
export const noSymmetry = (shape: Shape): boolean => new Set(images(shape).map(keyOf)).size === 8;

/** How many clockwise quarter turns take one shape to the other, or -1 when no turn does. */
export function turnBetween(from: Shape, to: Shape): number {
  const wanted = keyOf(to);
  return turns(from).findIndex((turned) => keyOf(turned) === wanted);
}

/** One shape is the other turned, by any quarter turns including none. */
export const isTurnOf = (a: Shape, b: Shape): boolean => turnBetween(a, b) >= 0;

/** One shape is the other's mirror image, turned any way. */
export const isMirrorOf = (a: Shape, b: Shape): boolean => turnBetween(mirror(a), b) >= 0;

export type Relation = 'turned' | 'mirror' | 'other';

/** How a shape relates to another: the same just turned, backwards, or different. */
export const relation = (a: Shape, b: Shape): Relation => (isTurnOf(a, b) ? 'turned' : isMirrorOf(a, b) ? 'mirror' : 'other');

/** A key that is the same for a shape, its turns and its mirror images, with nothing painted. */
export const freeKey = (shape: Shape): string =>
  images(bare(shape))
    .map(keyOf)
    .sort()
    .at(0) as string;

export const width = (shape: Shape): number => Math.max(...shape.map((tile) => tile.x)) + 1;
export const height = (shape: Shape): number => Math.max(...shape.map((tile) => tile.y)) + 1;
/** The longer side of a shape's box, in tiles. */
export const sideOf = (shape: Shape): number => Math.max(width(shape), height(shape));

const at = (x: number, y: number): string => `${x},${y}`;
const STEPS = [
  [0, -1],
  [1, 0],
  [0, 1],
  [-1, 0],
] as const;

/** Every tile can be reached from every other by steps between neighbours. */
export function connected(shape: Shape): boolean {
  if (shape.length === 0) return false;
  const left = new Set(shape.map((tile) => at(tile.x, tile.y)));
  const queue = [shape[0]];
  left.delete(at(shape[0].x, shape[0].y));
  while (queue.length) {
    const tile = queue.pop() as Tile;
    for (const [dx, dy] of STEPS) {
      const key = at(tile.x + dx, tile.y + dy);
      if (!left.has(key)) continue;
      left.delete(key);
      queue.push(shape.find((one) => at(one.x, one.y) === key) as Tile);
    }
  }
  return left.size === 0;
}

/** A tile's neighbours in the shape. */
export const neighbours = (shape: Shape, tile: Tile): Tile[] =>
  shape.filter((other) => Math.abs(other.x - tile.x) + Math.abs(other.y - tile.y) === 1);

/** Empty places that touch the shape. */
function edges(shape: Shape): [number, number][] {
  const taken = new Set(shape.map((tile) => at(tile.x, tile.y)));
  const found = new Map<string, [number, number]>();
  for (const tile of shape) {
    for (const [dx, dy] of STEPS) {
      const key = at(tile.x + dx, tile.y + dy);
      if (!taken.has(key)) found.set(key, [tile.x + dx, tile.y + dy]);
    }
  }
  return [...found.values()];
}

/** A shape written as rows of text: "#" for a tile, anything else for empty. */
export const fromRows = (rows: readonly string[]): Tile[] =>
  normalise(rows.flatMap((row, y) => [...row].flatMap((mark, x) => (mark === '#' ? [{ x, y, paint: BODY, look: 0 }] : []))));

type Random = () => number;

/** A random connected shape of some tiles that fits a square box of some side. */
export function grow(random: Random, count: number, side: number): Tile[] {
  for (;;) {
    let shape: Tile[] = [{ x: 0, y: 0, paint: BODY, look: 0 }];
    for (let tries = 0; shape.length < count && tries < 200; tries += 1) {
      const options = edges(shape);
      const [x, y] = options[Math.floor(random() * options.length)];
      const next = normalise([...shape, { x, y, paint: BODY, look: 0 }]);
      if (sideOf(next) <= side) shape = next;
    }
    if (shape.length === count) return normalise(shape);
  }
}

/**
 * Every shape made by moving one tile, paint and all, to another empty place touching the rest, so the shape stays
 * in one piece. The face stays where it is, since a critter's face never moves. The tile may not go back where it
 * came from.
 */
export function movedVersions(shape: Shape): Tile[][] {
  const made: Tile[][] = [];
  for (const moving of shape) {
    if (moving.paint === FACE) continue;
    const rest = shape.filter((tile) => tile !== moving);
    if (!connected(rest)) continue;
    for (const [x, y] of edges(rest)) {
      if (x === moving.x && y === moving.y) continue;
      made.push(normalise([...rest, { ...moving, x, y }]));
    }
  }
  return made;
}

/** Every shape made by moving one accent colour onto a plain tile, so the colour sits on the wrong tile. */
export function repainted(shape: Shape): Tile[][] {
  const made: Tile[][] = [];
  for (const accent of shape) {
    if (accent.paint === BODY || accent.paint === FACE) continue;
    for (const plain of shape) {
      if (plain.paint !== BODY) continue;
      made.push(normalise(shape.map((tile) => (tile === accent ? { ...tile, paint: BODY } : tile === plain ? { ...tile, paint: accent.paint } : tile))));
    }
  }
  return made;
}

export interface Difference {
  /** Tiles of the second shape that are not where they should be, or painted wrong, in its own coordinates. */
  wrong: Tile[];
  /** Where the first shape, turned to fit best, has a tile the second one lacks, in the second shape's coordinates. */
  missing: Tile[];
}

const sameTile = (a: Tile, b: Tile): boolean => a.paint === b.paint && a.look === b.look;

/**
 * How a shape differs from another, after turning the first the way that matches the second best. A shape with one
 * tile moved shows that tile as wrong and the place it belongs as missing.
 */
export function difference(from: Shape, to: Shape): Difference {
  const other = normalise(to);
  const where = new Map(other.map((tile) => [at(tile.x, tile.y), tile]));
  let best: Difference | null = null;
  for (const turned of turns(from)) {
    for (let dx = -width(turned); dx <= width(other); dx += 1) {
      for (let dy = -height(turned); dy <= height(other); dy += 1) {
        const placed = turned.map((tile) => ({ ...tile, x: tile.x + dx, y: tile.y + dy }));
        const matched = new Set<string>();
        const missing: Tile[] = [];
        for (const tile of placed) {
          const there = where.get(at(tile.x, tile.y));
          if (there && sameTile(there, tile)) matched.add(at(tile.x, tile.y));
          else missing.push(tile);
        }
        const wrong = other.filter((tile) => !matched.has(at(tile.x, tile.y)));
        if (!best || wrong.length + missing.length < best.wrong.length + best.missing.length) best = { wrong, missing };
      }
    }
  }
  return best as Difference;
}

/**
 * How alike two shapes look at a glance, without turning either: slide one over the other to where they overlap
 * most. A tile on a tile counts 2 when its paint matches too and 1 when it doesn't, and every tile left uncovered
 * costs 1. This is how a child in a hurry compares, and why a mirror image or a shape with one tile moved can look
 * more alike than the real answer, which is turned.
 */
export function glance(a: Shape, b: Shape): number {
  const first = normalise(a);
  const second = normalise(b);
  const where = new Map(first.map((tile) => [at(tile.x, tile.y), tile]));
  let best = -Infinity;
  for (let dx = -width(second); dx <= width(first); dx += 1) {
    for (let dy = -height(second); dy <= height(first); dy += 1) {
      let score = 0;
      let overlap = 0;
      for (const tile of second) {
        const there = where.get(at(tile.x + dx, tile.y + dy));
        if (!there) continue;
        overlap += 1;
        score += sameTile(there, tile) ? 2 : 1;
      }
      best = Math.max(best, score - (first.length + second.length - 2 * overlap));
    }
  }
  return best;
}
