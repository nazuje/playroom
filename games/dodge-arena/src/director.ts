import type { Danger, Kind, Spot } from './dangers.ts';
import { between, pick, roll, type Dice } from './random.ts';
import { ARENA_RADIUS, BEAM_SWEEP, GRACE_SECONDS, RING_GAP } from './tuning.ts';
import { difficultyAt, gapAt, waveAt, warnFor } from './waves.ts';
import type { Stage } from './stages.ts';

const FOCUS_CHANCE = 0.6;
const NAMED_FOCUS_CHANCE = 0.85;
const AIMED_METEOR_CHANCE = 0.75;
const AIM_SPREAD = 0.7;
const AIMED_BOULDER_CHANCE = 0.65;
const BOULDER_OFFSET = 2.2;
const WARN_OF: Record<Kind, number> = { meteor: 1, boulder: 1, beam: 1.3, ring: 1.4, bar: 1.2, slime: 1 };
const MOST_AT_ONCE: Record<Kind, number> = { meteor: 7, boulder: 3, beam: 2, ring: 2, bar: 2, slime: 3 };
/** The shortest wait before the same kind comes again, at first and at the hardest. */
const SAME_KIND_GAP: Record<Kind, readonly [number, number]> = {
  meteor: [0.5, 0.2],
  boulder: [1.4, 0.8],
  beam: [3.4, 2.2],
  ring: [4.2, RING_GAP],
  bar: [5, 3.2],
  slime: [3.4, 2.2],
};
const SAME_ORIGIN_RINGS = 0.8;
const BAR_CLEARANCE = 1.8;
/** Rings and beams are the dangers you may have to jump, so they take turns. Only the very end doubles them up. */
const JUMPERS: readonly Kind[] = ['ring', 'beam'];
const DOUBLE_JUMPERS_FROM = 0.95;

export interface Director extends Dice {
  nextId: number;
  /** Seconds until the next danger. */
  wait: number;
  /** Seconds until each kind may come again. */
  rest: Record<Kind, number>;
}

export interface Plan {
  kinds: readonly Kind[];
  focus: Kind | null;
  focusChance: number;
  difficulty: number;
  gap: number;
  twin: boolean;
}

export function newDirector(seed: number): Director {
  return { seed, nextId: 1, wait: GRACE_SECONDS, rest: { meteor: 0, boulder: 0, beam: 0, ring: 0, bar: 0, slime: 0 } };
}

export function planFor(clock: number, stage: Stage | null): Plan {
  if (stage) return { kinds: stage.kinds, focus: null, focusChance: 0, difficulty: stage.difficulty, gap: stage.gap, twin: false };
  const wave = waveAt(clock);
  return {
    kinds: wave.kinds,
    focus: wave.focus,
    focusChance: wave.name ? NAMED_FOCUS_CHANCE : FOCUS_CHANCE,
    difficulty: difficultyAt(clock),
    gap: gapAt(clock),
    twin: wave.twin,
  };
}

const lerp = (from: number, to: number, amount: number): number => from + (to - from) * amount;

function blank(director: Director, kind: Kind, difficulty: number): Danger {
  return {
    id: director.nextId++,
    kind,
    phase: 'warn',
    t: 0,
    warn: warnFor(difficulty) * WARN_OF[kind],
    live: 0,
    x: 0,
    z: 0,
    dx: 0,
    dz: 0,
    angle: 0,
    spin: 0,
    size: 0,
    speed: 0,
  };
}

function spotInArena(dice: Dice, reach: number): Spot {
  const angle = roll(dice) * Math.PI * 2;
  const distance = Math.sqrt(roll(dice)) * reach;
  return { x: Math.cos(angle) * distance, z: Math.sin(angle) * distance };
}

function clampToArena(spot: Spot, reach: number): Spot {
  const distance = Math.hypot(spot.x, spot.z);
  if (distance <= reach) return spot;
  return { x: (spot.x / distance) * reach, z: (spot.z / distance) * reach };
}

type Maker = (director: Director, difficulty: number, player: Spot, dangers: readonly Danger[]) => Danger;

function meteor(director: Director, difficulty: number, player: Spot): Danger {
  const made = blank(director, 'meteor', difficulty);
  made.size = lerp(1.6, 2.1, Math.min(difficulty, 1));
  const aimed = roll(director) < AIMED_METEOR_CHANCE;
  const landing = aimed
    ? clampToArena({ x: player.x + between(director, -AIM_SPREAD, AIM_SPREAD), z: player.z + between(director, -AIM_SPREAD, AIM_SPREAD) }, ARENA_RADIUS - 1)
    : spotInArena(director, ARENA_RADIUS - 1);
  made.x = landing.x;
  made.z = landing.z;
  return made;
}

function boulder(director: Director, difficulty: number, player: Spot): Danger {
  const made = blank(director, 'boulder', difficulty);
  made.size = 1.05;
  made.speed = lerp(8, 13, difficulty);
  const heading = roll(director) * Math.PI * 2;
  made.dx = Math.cos(heading);
  made.dz = Math.sin(heading);
  const sideX = -made.dz;
  const sideZ = made.dx;
  const aimed = roll(director) < AIMED_BOULDER_CHANCE;
  const offset = aimed
    ? player.x * sideX + player.z * sideZ + between(director, -BOULDER_OFFSET, BOULDER_OFFSET)
    : between(director, -ARENA_RADIUS * 0.8, ARENA_RADIUS * 0.8);
  const lane = Math.max(-ARENA_RADIUS * 0.85, Math.min(ARENA_RADIUS * 0.85, offset));
  const back = Math.sqrt(ARENA_RADIUS * ARENA_RADIUS - lane * lane) + made.size;
  made.x = sideX * lane - made.dx * back;
  made.z = sideZ * lane - made.dz * back;
  return made;
}

function beam(director: Director, difficulty: number): Danger {
  const made = blank(director, 'beam', difficulty);
  const around = roll(director) * Math.PI * 2;
  made.x = Math.cos(around) * ARENA_RADIUS;
  made.z = Math.sin(around) * ARENA_RADIUS;
  made.size = ARENA_RADIUS * 2;
  const way = roll(director) < 0.5 ? 1 : -1;
  made.spin = way * lerp(1, 1.8, difficulty);
  made.angle = around + Math.PI - (way * BEAM_SWEEP) / 2;
  made.live = BEAM_SWEEP / Math.abs(made.spin);
  return made;
}

function ring(director: Director, difficulty: number, _player: Spot, dangers: readonly Danger[]): Danger {
  const made = blank(director, 'ring', difficulty);
  made.speed = lerp(6.5, 10.5, difficulty);
  const sibling = dangers.find(({ kind }) => kind === 'ring');
  const origin = sibling ?? spotInArena(director, ARENA_RADIUS * SAME_ORIGIN_RINGS);
  made.x = origin.x;
  made.z = origin.z;
  return made;
}

function bar(director: Director, difficulty: number, player: Spot, dangers: readonly Danger[]): Danger {
  const made = blank(director, 'bar', difficulty);
  made.size = lerp(3.6, 5, difficulty);
  made.spin = (roll(director) < 0.5 ? 1 : -1) * lerp(1.3, 2.3, difficulty);
  made.angle = roll(director) * Math.PI;
  made.live = lerp(5, 7, difficulty);
  const others = dangers.filter(({ kind }) => kind === 'bar');
  const clear = (spot: Spot): boolean =>
    Math.hypot(spot.x - player.x, spot.z - player.z) > made.size + BAR_CLEARANCE &&
    others.every((other) => Math.hypot(spot.x - other.x, spot.z - other.z) > made.size + other.size);
  let spot = spotInArena(director, ARENA_RADIUS - 2);
  for (let tries = 0; tries < 12 && !clear(spot); tries += 1) spot = spotInArena(director, ARENA_RADIUS - 2);
  made.x = spot.x;
  made.z = spot.z;
  return made;
}

function slime(director: Director, difficulty: number, player: Spot): Danger {
  const made = blank(director, 'slime', difficulty);
  // Always comes from the far side, so it can never appear next to the player.
  const away = Math.atan2(-player.z, -player.x) + between(director, -1, 1);
  made.x = Math.cos(away) * (ARENA_RADIUS - 1);
  made.z = Math.sin(away) * (ARENA_RADIUS - 1);
  made.size = 0.7;
  made.speed = lerp(3, 4.8, difficulty);
  made.live = lerp(5, 6.5, difficulty);
  return made;
}

const MAKERS: Record<Kind, Maker> = { meteor, boulder, beam, ring, bar, slime };

function countOf(dangers: readonly Danger[], kind: Kind): number {
  let count = 0;
  for (const danger of dangers) if (danger.kind === kind) count += 1;
  return count;
}

function canCome(director: Director, kind: Kind, plan: Plan, dangers: readonly Danger[], twin = false): boolean {
  if ((director.rest[kind] > 0 && !twin) || countOf(dangers, kind) >= MOST_AT_ONCE[kind]) return false;
  if (!JUMPERS.includes(kind)) return true;
  const jumpers = countOf(dangers, 'ring') + countOf(dangers, 'beam');
  return jumpers < (plan.difficulty >= DOUBLE_JUMPERS_FROM ? 2 : 1);
}

function choose(director: Director, plan: Plan, dangers: readonly Danger[]): Kind | null {
  if (plan.focus && roll(director) < plan.focusChance && canCome(director, plan.focus, plan, dangers)) return plan.focus;
  const open = plan.kinds.filter((kind) => canCome(director, kind, plan, dangers));
  return open.length ? pick(director, open) : null;
}

function spawn(director: Director, kind: Kind, plan: Plan, player: Spot, dangers: Danger[]): void {
  dangers.push(MAKERS[kind](director, plan.difficulty, player, dangers));
  const [slow, fast] = SAME_KIND_GAP[kind];
  director.rest[kind] = lerp(slow, fast, Math.min(plan.difficulty, 1));
  if (JUMPERS.includes(kind)) {
    for (const other of JUMPERS) director.rest[other] = Math.max(director.rest[other], RING_GAP);
    director.rest[kind] = Math.max(director.rest[kind], RING_GAP);
  }
}

/** Brings on the next danger when it's time. Returns what it added, so the game can sound the warning. */
export function stepDirector(director: Director, plan: Plan, seconds: number, player: Spot, dangers: Danger[]): Danger[] {
  for (const kind of Object.keys(director.rest) as Kind[]) director.rest[kind] -= seconds;
  director.wait -= seconds;
  if (director.wait > 0) return [];
  const kind = choose(director, plan, dangers);
  if (!kind) {
    director.wait = 0.1;
    return [];
  }
  const before = dangers.length;
  spawn(director, kind, plan, player, dangers);
  if (plan.twin && kind === plan.focus && canCome(director, kind, plan, dangers, true)) spawn(director, kind, plan, player, dangers);
  director.wait = plan.gap;
  return dangers.slice(before);
}
