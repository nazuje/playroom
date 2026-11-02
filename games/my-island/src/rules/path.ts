export interface Grid {
  width: number;
  depth: number;
  walkable(x: number, z: number): boolean;
  /** Extra cost for a tile, for walking round things where there's a way. */
  cost?(x: number, z: number): number;
}

export interface Step {
  x: number;
  z: number;
}

const SIDE = 1;
const DIAGONAL = Math.SQRT2;
const MOVES = [
  [1, 0, SIDE],
  [-1, 0, SIDE],
  [0, 1, SIDE],
  [0, -1, SIDE],
  [1, 1, DIAGONAL],
  [1, -1, DIAGONAL],
  [-1, 1, DIAGONAL],
  [-1, -1, DIAGONAL],
] as const;

/** A small binary heap of tile indexes, cheapest first. */
class Queue {
  private items: number[] = [];
  private readonly score: Float64Array;

  constructor(score: Float64Array) {
    this.score = score;
  }

  get size(): number {
    return this.items.length;
  }

  push(item: number): void {
    const { items, score } = this;
    let at = items.length;
    items.push(item);
    while (at > 0) {
      const parent = (at - 1) >> 1;
      if ((score[items[parent] ?? 0] ?? 0) <= (score[item] ?? 0)) break;
      items[at] = items[parent] ?? 0;
      at = parent;
    }
    items[at] = item;
  }

  pop(): number {
    const { items, score } = this;
    const top = items[0] ?? 0;
    const last = items.pop() ?? 0;
    const size = items.length;
    if (size === 0) return top;
    let at = 0;
    for (;;) {
      let child = at * 2 + 1;
      if (child >= size) break;
      if (child + 1 < size && (score[items[child + 1] ?? 0] ?? 0) < (score[items[child] ?? 0] ?? 0)) child += 1;
      if ((score[items[child] ?? 0] ?? 0) >= (score[last] ?? 0)) break;
      items[at] = items[child] ?? 0;
      at = child;
    }
    items[at] = last;
    return top;
  }
}

const distance = (ax: number, az: number, bx: number, bz: number): number => {
  const dx = Math.abs(ax - bx);
  const dz = Math.abs(az - bz);
  return Math.max(dx, dz) + (DIAGONAL - 1) * Math.min(dx, dz);
};

/** The shortest route between two walkable tiles, or null if none exists. Corners aren't cut, so nobody clips a wall. */
export function findPath(grid: Grid, from: Step, to: Step): Step[] | null {
  const { width, depth } = grid;
  if (!grid.walkable(to.x, to.z) || !grid.walkable(from.x, from.z)) return null;
  const size = width * depth;
  const spent = new Float64Array(size).fill(Infinity);
  const score = new Float64Array(size).fill(Infinity);
  const cameFrom = new Int32Array(size).fill(-1);
  const closed = new Uint8Array(size);
  const queue = new Queue(score);
  const start = from.z * width + from.x;
  const goal = to.z * width + to.x;
  spent[start] = 0;
  score[start] = distance(from.x, from.z, to.x, to.z);
  queue.push(start);
  while (queue.size) {
    const current = queue.pop();
    if (current === goal) break;
    if (closed[current]) continue;
    closed[current] = 1;
    const cx = current % width;
    const cz = (current - cx) / width;
    for (const [dx, dz, step] of MOVES) {
      const nx = cx + dx;
      const nz = cz + dz;
      if (!grid.walkable(nx, nz)) continue;
      if (dx !== 0 && dz !== 0 && (!grid.walkable(cx + dx, cz) || !grid.walkable(cx, cz + dz))) continue;
      const next = nz * width + nx;
      const cost = (spent[current] ?? 0) + step + (grid.cost?.(nx, nz) ?? 0);
      if (cost >= (spent[next] ?? Infinity)) continue;
      spent[next] = cost;
      cameFrom[next] = current;
      score[next] = cost + distance(nx, nz, to.x, to.z);
      queue.push(next);
    }
  }
  if (cameFrom[goal] === -1 && start !== goal) return null;
  const route: Step[] = [];
  for (let at = goal; at !== -1; at = cameFrom[at] ?? -1) {
    const x = at % width;
    route.push({ x, z: (at - x) / width });
    if (at === start) break;
  }
  return route.reverse();
}

/** The walkable tile nearest a spot that is also reachable from `from`, for a tap in the sea or on a wall. */
export function nearestReachable(grid: Grid, from: Step, spot: Step, reach = 14): Step | null {
  const wanted = (x: number, z: number): boolean => grid.walkable(x, z);
  const options: { step: Step; away: number }[] = [];
  for (let dz = -reach; dz <= reach; dz += 1) {
    for (let dx = -reach; dx <= reach; dx += 1) {
      const x = spot.x + dx;
      const z = spot.z + dz;
      if (wanted(x, z)) options.push({ step: { x, z }, away: Math.hypot(dx, dz) });
    }
  }
  options.sort((a, b) => a.away - b.away);
  for (const { step } of options.slice(0, 80)) {
    if (findPath(grid, from, step)) return step;
  }
  return null;
}

const clearLine = (grid: Grid, a: Step, b: Step): boolean => {
  const steps = Math.ceil(Math.hypot(b.x - a.x, b.z - a.z) * 3);
  for (let step = 0; step <= steps; step += 1) {
    const t = step / Math.max(steps, 1);
    const x = a.x + (b.x - a.x) * t;
    const z = a.z + (b.z - a.z) * t;
    // Look a little either side of the line, so straightening can't skim a corner.
    for (const [ox, oz] of [[0, 0], [0.3, 0.3], [-0.3, 0.3], [0.3, -0.3], [-0.3, -0.3]] as const) {
      if (!grid.walkable(Math.floor(x + 0.5 + ox), Math.floor(z + 0.5 + oz))) return false;
      if ((grid.cost?.(Math.floor(x + 0.5), Math.floor(z + 0.5)) ?? 0) > 0) return false;
    }
  }
  return true;
};

/** Pulls a staircase of tile steps into a few straight legs, so walking looks like walking. */
export function straighten(grid: Grid, route: readonly Step[]): Step[] {
  if (route.length < 3) return [...route];
  const first = route[0];
  if (!first) return [];
  const out: Step[] = [first];
  let anchor = 0;
  while (anchor < route.length - 1) {
    let next = anchor + 1;
    for (let probe = route.length - 1; probe > next; probe -= 1) {
      const a = route[anchor];
      const b = route[probe];
      if (a && b && clearLine(grid, a, b)) {
        next = probe;
        break;
      }
    }
    const step = route[next];
    if (step) out.push(step);
    anchor = next;
  }
  return out;
}
