import {
  ARENA_RADIUS,
  BAR_WIDTH,
  BEAM_SWEEP,
  BEAM_WIDTH,
  LOW_CLEARANCE,
  METEOR_BLAST_SECONDS,
  PLAYER_RADIUS,
  RING_WIDTH,
  SLIME_BODY_RADIUS,
  SLIME_BURST_RADIUS,
  SLIME_BURST_SECONDS,
  SLIME_FUSE_SECONDS,
} from './tuning.ts';

export const KINDS = ['meteor', 'boulder', 'beam', 'ring', 'bar', 'slime'] as const;
export type Kind = (typeof KINDS)[number];

/** warn shows what's coming and can't touch anyone. Slime alone goes on to fuse and burst. */
export type Phase = 'warn' | 'live' | 'fuse' | 'burst' | 'done';

export interface Danger {
  id: number;
  kind: Kind;
  phase: Phase;
  /** Seconds spent in this phase. */
  t: number;
  /** How long the warning lasts. */
  warn: number;
  /** How long it stays live, where that isn't set by leaving the arena. */
  live: number;
  /** Meteor landing spot, boulder or slime position, or the pivot of a beam, bar or ring. */
  x: number;
  z: number;
  /** Boulder direction. */
  dx: number;
  dz: number;
  /** Where a beam or bar points, in radians, and how fast it turns. */
  angle: number;
  spin: number;
  /** Meteor blast, boulder or ring radius, or the reach of a beam or bar. */
  size: number;
  speed: number;
}

export interface Spot {
  x: number;
  z: number;
}

function endPhase(danger: Danger): void {
  danger.phase = 'done';
  danger.t = 0;
}

function enter(danger: Danger, phase: Phase): void {
  danger.phase = phase;
  danger.t = 0;
}

function stepSlime(slime: Danger, seconds: number, target: Spot): void {
  if (slime.phase === 'live') {
    const towards = Math.hypot(target.x - slime.x, target.z - slime.z) || 1;
    slime.dx = (target.x - slime.x) / towards;
    slime.dz = (target.z - slime.z) / towards;
    slime.x += slime.dx * slime.speed * seconds;
    slime.z += slime.dz * slime.speed * seconds;
    if (slime.t >= slime.live) enter(slime, 'fuse');
  } else if (slime.phase === 'fuse') {
    if (slime.t >= SLIME_FUSE_SECONDS) enter(slime, 'burst');
  } else if (slime.t >= SLIME_BURST_SECONDS) {
    endPhase(slime);
  }
}

const LIVE_STEPS: Record<Kind, (danger: Danger, seconds: number, target: Spot) => void> = {
  meteor(meteor) {
    if (meteor.t >= METEOR_BLAST_SECONDS) endPhase(meteor);
  },
  boulder(boulder, seconds) {
    boulder.x += boulder.dx * boulder.speed * seconds;
    boulder.z += boulder.dz * boulder.speed * seconds;
    const headingOut = boulder.x * boulder.dx + boulder.z * boulder.dz > 0;
    if (headingOut && Math.hypot(boulder.x, boulder.z) > ARENA_RADIUS + boulder.size + 1) endPhase(boulder);
  },
  beam(beam, seconds) {
    beam.angle += beam.spin * seconds;
    if (beam.t >= beam.live) endPhase(beam);
  },
  ring(ring, seconds) {
    ring.size += ring.speed * seconds;
    if (ring.size > ARENA_RADIUS + Math.hypot(ring.x, ring.z) + 1) endPhase(ring);
  },
  bar(bar, seconds) {
    bar.angle += bar.spin * seconds;
    if (bar.t >= bar.live) endPhase(bar);
  },
  slime: stepSlime,
};

/** Moves a danger on. The target is who slime chases. */
export function stepDanger(danger: Danger, seconds: number, target: Spot): void {
  danger.t += seconds;
  if (danger.phase === 'warn') {
    if (danger.t >= danger.warn) enter(danger, 'live');
  } else if (danger.phase !== 'done') {
    LIVE_STEPS[danger.kind](danger, seconds, target);
  }
}

function distanceToSegment(px: number, pz: number, ax: number, az: number, bx: number, bz: number): number {
  const abx = bx - ax;
  const abz = bz - az;
  const along = ((px - ax) * abx + (pz - az) * abz) / (abx * abx + abz * abz || 1);
  const t = Math.min(1, Math.max(0, along));
  return Math.hypot(px - (ax + abx * t), pz - (az + abz * t));
}

const HIT_TESTS: Record<Kind, (danger: Danger, x: number, z: number, height: number, reach: number) => boolean> = {
  meteor: (d, x, z, _height, reach) => Math.hypot(x - d.x, z - d.z) < d.size + reach,
  boulder: (d, x, z, _height, reach) => Math.hypot(x - d.x, z - d.z) < d.size + reach,
  beam(d, x, z, height, reach) {
    if (height > LOW_CLEARANCE) return false;
    const tipX = d.x + Math.cos(d.angle) * d.size;
    const tipZ = d.z + Math.sin(d.angle) * d.size;
    return distanceToSegment(x, z, d.x, d.z, tipX, tipZ) < BEAM_WIDTH / 2 + reach;
  },
  ring(d, x, z, height, reach) {
    if (height > LOW_CLEARANCE) return false;
    return Math.abs(Math.hypot(x - d.x, z - d.z) - d.size) < RING_WIDTH / 2 + reach;
  },
  bar(d, x, z, _height, reach) {
    const armX = Math.cos(d.angle) * d.size;
    const armZ = Math.sin(d.angle) * d.size;
    return distanceToSegment(x, z, d.x - armX, d.z - armZ, d.x + armX, d.z + armZ) < BAR_WIDTH / 2 + reach;
  },
  slime(d, x, z, height, reach) {
    if (height > LOW_CLEARANCE) return false;
    const radius = d.phase === 'burst' ? SLIME_BURST_RADIUS : SLIME_BODY_RADIUS;
    return Math.hypot(x - d.x, z - d.z) < radius + reach;
  },
};

const TURN = Math.PI * 2;

function ringReach(ring: Danger, x: number, z: number): number | null {
  const edge = Math.hypot(x - ring.x, z - ring.z) - RING_WIDTH / 2 - PLAYER_RADIUS;
  if (ring.phase === 'warn') return ring.warn - ring.t + Math.max(0, edge) / ring.speed;
  if (ring.size - RING_WIDTH - PLAYER_RADIUS * 2 > edge) return null;
  return Math.max(0, edge - ring.size) / ring.speed;
}

function beamReach(beam: Danger, x: number, z: number): number | null {
  const distance = Math.hypot(x - beam.x, z - beam.z);
  if (distance > beam.size + PLAYER_RADIUS) return null;
  const way = Math.sign(beam.spin) || 1;
  const ahead = ((((Math.atan2(z - beam.z, x - beam.x) - beam.angle) * way) % TURN) + TURN) % TURN;
  const half = Math.atan2(BEAM_WIDTH / 2 + PLAYER_RADIUS, distance);
  const warning = beam.phase === 'warn' ? beam.warn - beam.t : 0;
  const sweepLeft = beam.phase === 'warn' ? BEAM_SWEEP : Math.abs(beam.spin) * (beam.live - beam.t);
  if (ahead > TURN - half) return beam.phase === 'warn' ? warning : 0;
  if (ahead - half > sweepLeft) return null;
  return warning + Math.max(0, ahead - half) / Math.abs(beam.spin);
}

/** Seconds until a ring or beam first reaches someone standing here, or null when it won't. Other dangers give null. */
export function secondsUntilReach(danger: Danger, x: number, z: number): number | null {
  if (danger.phase !== 'warn' && danger.phase !== 'live') return null;
  if (danger.kind === 'ring') return ringReach(danger, x, z);
  if (danger.kind === 'beam') return beamReach(danger, x, z);
  return null;
}

/** True when this danger touches someone here. Nothing in its warning can ever touch anyone. */
export function dangerHits(danger: Danger, x: number, z: number, height: number, reach = PLAYER_RADIUS): boolean {
  if (danger.phase === 'warn' || danger.phase === 'done') return false;
  return HIT_TESTS[danger.kind](danger, x, z, height, reach);
}
