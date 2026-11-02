import { dangerHits, stepDanger, type Danger, type Kind } from './dangers.ts';
import { newDirector, planFor, stepDirector, type Director } from './director.ts';
import { between, pick, roll } from './random.ts';
import { starsFor, type Stage } from './stages.ts';
import {
  ARENA_RADIUS,
  BLINK_SECONDS,
  GOLDEN_SECONDS,
  HEARTS,
  LATE_LEAP_EASY,
  LATE_LEAP_UNTIL,
  LEAP_BOOST,
  LEAP_BUFFER,
  LEAP_HEIGHT,
  LEAP_RECHARGE,
  LEAP_SECONDS,
  PICKUP_RADIUS,
  PICKUP_SECONDS,
  PLAYER_GRIP,
  PLAYER_RADIUS,
  PLAYER_SPEED,
  SHIELD_SECONDS,
  SLOW_SCALE,
  SLOW_SECONDS,
  STEP,
  SURPRISE_FIRST,
  SURPRISE_MAX,
  SURPRISE_MIN,
  UFO_ARRIVES,
  UFO_LEAVES,
} from './tuning.ts';
import { waveIndexAt } from './waves.ts';

const STOPPED_BELOW = 0.2;
const FINGER_SLOWS_WITHIN = 1;
const TOUCH_PAUSE = 0.5;

export type Mode = 'endless' | 'stage' | 'demo';
export type PickupKind = 'heart' | 'slow';
export type Surprise = PickupKind | 'golden' | 'ufo';

export interface Input {
  /** Where to run, up to length 1. */
  moveX: number;
  moveZ: number;
}

export const STANDING: Input = { moveX: 0, moveZ: 0 };

export interface Pickup {
  kind: PickupKind;
  x: number;
  z: number;
  /** Seconds left before it fades. */
  left: number;
}

export interface Ufo {
  x: number;
  z: number;
  t: number;
  shielded: boolean;
}

export interface Player {
  x: number;
  z: number;
  vx: number;
  vz: number;
  /** Which way they look. Stays put when standing still. */
  faceX: number;
  faceZ: number;
  /** Seconds into a leap, or 0 on the ground. */
  air: number;
  leapX: number;
  leapZ: number;
  /** Seconds until the leap is ready. */
  recharge: number;
  /** A press waiting for the leap to be ready. */
  queued: number;
  /** Seconds of blink protection left. */
  blink: number;
  shield: number;
  hearts: number;
}

export type RunEvent =
  | { type: 'warn'; kind: Kind }
  | { type: 'bonk'; kind: Kind; x: number; z: number }
  | { type: 'shielded' | 'sparkle'; x: number; z: number }
  | { type: 'leap' | 'land' | 'lost' | 'won' }
  | { type: 'blast'; kind: Kind; x: number; z: number }
  | { type: 'wave'; index: number }
  | { type: 'pickup'; kind: PickupKind; x: number; z: number }
  | { type: 'surprise'; kind: Surprise };

/** A ring or beam that reached someone on the ground, waiting a moment to see if they leap. */
export interface Late {
  danger: Danger;
  left: number;
  leapt: boolean;
}

export interface Run {
  mode: Mode;
  stage: Stage | null;
  seed: number;
  phase: 'play' | 'won' | 'lost';
  /** Seconds survived. */
  clock: number;
  player: Player;
  dangers: Danger[];
  pickups: Pickup[];
  ufo: Ufo | null;
  golden: number;
  slow: number;
  hits: number;
  late: Late | null;
  director: Director;
  waveIndex: number;
  surpriseIn: number;
  events: RunEvent[];
  /** Time not yet played, shorter than one step. */
  spare: number;
}

export function newRun(mode: Mode, stage: Stage | null, seed: number): Run {
  return {
    mode,
    stage,
    seed,
    phase: 'play',
    clock: 0,
    player: { x: 0, z: 0, vx: 0, vz: 0, faceX: 0, faceZ: 1, air: 0, leapX: 0, leapZ: 0, recharge: 0, queued: 0, blink: 0, shield: 0, hearts: HEARTS },
    dangers: [],
    pickups: [],
    ufo: null,
    golden: 0,
    slow: 0,
    hits: 0,
    late: null,
    director: newDirector(seed),
    waveIndex: 0,
    surpriseIn: SURPRISE_FIRST,
    events: [],
    spare: 0,
  };
}

/** The steering a finger gives from where the player stands. Very close to the finger, they ease off and stop. */
export function moveToward(player: { x: number; z: number }, x: number, z: number): Input {
  const distance = Math.hypot(x - player.x, z - player.z);
  if (distance < STOPPED_BELOW) return STANDING;
  const pull = Math.min(1, distance / FINGER_SLOWS_WITHIN) / distance;
  return { moveX: (x - player.x) * pull, moveZ: (z - player.z) * pull };
}

export const leapHeight = (air: number): number => {
  const part = air / LEAP_SECONDS;
  return part > 0 && part < 1 ? 4 * LEAP_HEIGHT * part * (1 - part) : 0;
};

export const inAir = (player: Player): boolean => player.air > 0;

/** How charged the leap is, from 0 to 1. */
export const leapCharge = (player: Player): number => (inAir(player) ? 0 : 1 - Math.max(0, player.recharge) / LEAP_RECHARGE);

/** The button. A press that's slightly early is held for a moment rather than lost. */
export function pressLeap(run: Run): void {
  run.player.queued = LEAP_BUFFER;
}

function startLeap(run: Run, input: Input): void {
  const { player } = run;
  player.queued = 0;
  player.air = STEP;
  player.leapX = input.moveX;
  player.leapZ = input.moveZ;
  run.events.push({ type: 'leap' });
}

function keepInArena(player: Player): void {
  const distance = Math.hypot(player.x, player.z);
  const edge = ARENA_RADIUS - PLAYER_RADIUS;
  if (distance <= edge) return;
  player.x = (player.x / distance) * edge;
  player.z = (player.z / distance) * edge;
}

function stepAir(run: Run): void {
  const { player } = run;
  player.air += STEP;
  if (player.air < LEAP_SECONDS) return;
  player.air = 0;
  player.recharge = LEAP_RECHARGE;
  run.events.push({ type: 'land' });
}

function stepPlayer(run: Run, input: Input): void {
  const { player } = run;
  player.queued -= STEP;
  player.recharge -= STEP;
  player.blink -= STEP;
  player.shield -= STEP;
  if (player.queued > 0 && !inAir(player) && player.recharge <= 0) startLeap(run, input);
  if (inAir(player)) stepAir(run);
  const boost = inAir(player) ? LEAP_BOOST : 1;
  const moveX = inAir(player) ? player.leapX : input.moveX;
  const moveZ = inAir(player) ? player.leapZ : input.moveZ;
  const grip = 1 - Math.exp(-PLAYER_GRIP * STEP);
  player.vx += (moveX * PLAYER_SPEED * boost - player.vx) * grip;
  player.vz += (moveZ * PLAYER_SPEED * boost - player.vz) * grip;
  player.x += player.vx * STEP;
  player.z += player.vz * STEP;
  if (Math.hypot(moveX, moveZ) > 0.05) {
    player.faceX = moveX;
    player.faceZ = moveZ;
  }
  keepInArena(player);
}

function bonk(run: Run, danger: Danger): void {
  const { player } = run;
  if (run.mode === 'demo') return;
  run.hits += 1;
  player.hearts -= 1;
  player.blink = BLINK_SECONDS;
  run.events.push({ type: 'bonk', kind: danger.kind, x: player.x, z: player.z });
  if (player.hearts > 0) return;
  run.phase = 'lost';
  run.events.push({ type: 'lost' });
}

function touch(run: Run, danger: Danger): void {
  const { player } = run;
  // Slime that touches you pops, whatever else is going on. Anything else simply passes through.
  if (danger.kind === 'slime') {
    danger.phase = 'done';
    run.events.push({ type: 'blast', kind: 'slime', x: danger.x, z: danger.z });
  }
  if (run.golden > 0) run.events.push({ type: 'sparkle', x: player.x, z: player.z });
  else if (player.shield > 0) run.events.push({ type: 'shielded', x: player.x, z: player.z });
  else bonk(run, danger);
}

const JUMPABLE: readonly Kind[] = ['ring', 'beam'];

/** Seconds a ring or beam waits at the feet for a leap, at this difficulty. */
export function lateLeapAt(difficulty: number): number {
  return Math.max(0, LATE_LEAP_EASY * (1 - difficulty / LATE_LEAP_UNTIL));
}

function hit(run: Run, danger: Danger): void {
  touch(run, danger);
  // A shield or golden touch also takes a breath, so one long touch counts once.
  run.player.blink = Math.max(run.player.blink, TOUCH_PAUSE);
}

/** Settles a waiting ring or beam. True while it still holds every jumpable touch. */
function stepLate(run: Run): boolean {
  const { late, player } = run;
  if (!late) return false;
  late.left -= STEP;
  if (inAir(player)) late.leapt = true;
  if (late.left > 0) return true;
  run.late = null;
  if (!late.leapt && player.blink <= 0) hit(run, late.danger);
  return false;
}

function checkHits(run: Run, lateLeap: number): void {
  const { player } = run;
  const waiting = stepLate(run);
  if (player.blink > 0) return;
  const height = leapHeight(player.air);
  for (const danger of run.dangers) {
    if (!dangerHits(danger, player.x, player.z, height)) continue;
    if (JUMPABLE.includes(danger.kind) && (waiting || (lateLeap > 0 && !inAir(player)))) {
      run.late ??= { danger, left: lateLeap, leapt: false };
      continue;
    }
    hit(run, danger);
    return;
  }
}

function stepDangers(run: Run, seconds: number): void {
  const { player } = run;
  let removed = false;
  for (const danger of run.dangers) {
    const was = danger.phase;
    stepDanger(danger, seconds, player);
    if (danger.phase !== was && (danger.kind === 'meteor' || danger.kind === 'slime') && (danger.phase === 'live' ? danger.kind === 'meteor' : danger.phase === 'burst')) {
      run.events.push({ type: 'blast', kind: danger.kind, x: danger.x, z: danger.z });
    }
    if (danger.phase === 'done') removed = true;
  }
  if (removed) run.dangers = run.dangers.filter(({ phase }) => phase !== 'done');
}

function stepPickups(run: Run): void {
  const { player } = run;
  run.pickups = run.pickups.filter((pickup) => {
    pickup.left -= STEP;
    if (Math.hypot(pickup.x - player.x, pickup.z - player.z) < PICKUP_RADIUS) {
      if (pickup.kind === 'heart') player.hearts = Math.min(HEARTS, player.hearts + 1);
      else run.slow = SLOW_SECONDS;
      run.events.push({ type: 'pickup', kind: pickup.kind, x: pickup.x, z: pickup.z });
      return false;
    }
    return pickup.left > 0;
  });
}

function stepUfo(run: Run): void {
  const { ufo, player } = run;
  if (!ufo) return;
  ufo.t += STEP;
  const pull = 1 - Math.exp(-3 * STEP);
  ufo.x += (player.x - ufo.x) * pull;
  ufo.z += (player.z - ufo.z) * pull;
  if (!ufo.shielded && ufo.t >= UFO_ARRIVES) {
    ufo.shielded = true;
    player.shield = SHIELD_SECONDS;
  }
  if (ufo.t >= UFO_LEAVES) run.ufo = null;
}

function surprisesOpen(run: Run): Surprise[] {
  const open: Surprise[] = ['slow', 'ufo', 'golden'];
  if (run.player.hearts < HEARTS) open.push('heart', 'heart', 'heart');
  return open;
}

function bringSurprise(run: Run, kind: Surprise): void {
  const { director } = run;
  if (kind === 'golden') run.golden = GOLDEN_SECONDS;
  else if (kind === 'ufo') {
    const around = roll(director) * Math.PI * 2;
    run.ufo = { x: Math.cos(around) * ARENA_RADIUS * 1.6, z: Math.sin(around) * ARENA_RADIUS * 1.6, t: 0, shielded: false };
  } else {
    const around = roll(director) * Math.PI * 2;
    const distance = between(director, 3, ARENA_RADIUS - 2);
    run.pickups.push({ kind, x: Math.cos(around) * distance, z: Math.sin(around) * distance, left: PICKUP_SECONDS });
  }
  run.events.push({ type: 'surprise', kind });
}

function stepSurprises(run: Run): void {
  if (run.mode !== 'endless') return;
  run.surpriseIn -= STEP;
  if (run.surpriseIn > 0) return;
  run.surpriseIn = between(run.director, SURPRISE_MIN, SURPRISE_MAX);
  bringSurprise(run, pick(run.director, surprisesOpen(run)));
}

function stepWaves(run: Run): void {
  if (run.mode !== 'endless') return;
  const index = waveIndexAt(run.clock);
  if (index === run.waveIndex) return;
  run.waveIndex = index;
  run.events.push({ type: 'wave', index });
}

function stepClock(run: Run): void {
  run.clock += STEP;
  if (run.stage && run.clock >= run.stage.goal) {
    run.phase = 'won';
    run.events.push({ type: 'won' });
  }
}

function tick(run: Run, input: Input): void {
  const scale = run.slow > 0 ? SLOW_SCALE : 1;
  const seconds = STEP * scale;
  stepDangers(run, seconds);
  if (run.phase !== 'play') return;
  run.slow = Math.max(0, run.slow - STEP);
  run.golden = Math.max(0, run.golden - STEP);
  stepPlayer(run, input);
  const plan = planFor(run.clock, run.stage);
  for (const made of stepDirector(run.director, plan, seconds, run.player, run.dangers)) run.events.push({ type: 'warn', kind: made.kind });
  stepPickups(run);
  stepUfo(run);
  stepSurprises(run);
  checkHits(run, lateLeapAt(plan.difficulty));
  stepClock(run);
  stepWaves(run);
}

/** Moves the run on by any amount of time. Fixed steps inside, so the frame rate never changes the game. */
export function stepRun(run: Run, input: Input, seconds: number): void {
  run.spare += seconds;
  while (run.spare >= STEP) {
    run.spare -= STEP;
    tick(run, input);
  }
}

export const starsOf = (run: Run): number => (run.phase === 'won' ? starsFor(run.hits) : 0);
