import {
  BoxGeometry,
  CircleGeometry,
  Color,
  CylinderGeometry,
  DodecahedronGeometry,
  DoubleSide,
  IcosahedronGeometry,
  MeshBasicMaterial,
  MeshStandardMaterial,
  PlaneGeometry,
  RingGeometry,
  ShapeGeometry,
  Shape,
  SphereGeometry,
  type IUniform,
  type Scene,
} from 'three';
import type { Danger, Kind } from '../dangers.ts';
import { ARENA_RADIUS, BAR_WIDTH, BEAM_SWEEP, BEAM_WIDTH, METEOR_BLAST_SECONDS, RING_WIDTH, SLIME_BURST_RADIUS, SLIME_BURST_SECONDS, SLIME_FUSE_SECONDS } from '../tuning.ts';
import { decalMaterial } from './decal.ts';
import { Pool } from './pool.ts';

export const KIND_COLORS: Record<Kind, string> = {
  meteor: '#ff8a1f',
  boulder: '#b46bff',
  beam: '#ff2e88',
  ring: '#35e8ff',
  bar: '#ffe23d',
  slime: '#6dff3d',
};

const GOLD = new Color('#ffcf3d');
const WHITE = new Color('#ffffff');
const FALL_FROM = 26;
const CAPACITY = 16;

export interface Hazards {
  update(dangers: readonly Danger[], clock: number, golden: boolean): void;
}

function fanGeometry(): ShapeGeometry {
  const shape = new Shape();
  shape.moveTo(0, 0);
  shape.absarc(0, 0, 1, 0, BEAM_SWEEP, false);
  shape.lineTo(0, 0);
  return new ShapeGeometry(shape, 24).rotateX(Math.PI / 2);
}

const flatDisc = (): CircleGeometry => new CircleGeometry(1, 40).rotateX(-Math.PI / 2);

/** Every danger's shape, each kind in its own colour, instanced so a crowded arena costs no more to draw. */
export function createHazards(scene: Scene, clock: IUniform<number>): Hazards {
  const glowing = (emissive: string): MeshStandardMaterial => new MeshStandardMaterial({ color: '#ffffff', emissive, emissiveIntensity: 0.55, flatShading: true, roughness: 0.5 });
  const pools = {
    discMark: new Pool(scene, flatDisc(), decalMaterial('disc', clock), CAPACITY * 2),
    fillMark: new Pool(scene, flatDisc(), decalMaterial('plain', clock), CAPACITY * 2),
    lane: new Pool(scene, new PlaneGeometry(1, 1).rotateX(-Math.PI / 2), decalMaterial('lane', clock), 6),
    fan: new Pool(scene, fanGeometry(), decalMaterial('plain', clock), 4),
    band: new Pool(scene, new CircleGeometry(1, 96).rotateX(-Math.PI / 2), decalMaterial('band', clock), 4),
    edge: new Pool(scene, new RingGeometry(0.97, 1, 96).rotateX(-Math.PI / 2), decalMaterial('plain', clock), 4),
    streak: new Pool(scene, new PlaneGeometry(1, 1).translate(0.5, 0, 0).rotateX(-Math.PI / 2), decalMaterial('plain', clock), 4),
    wall: new Pool(scene, new CylinderGeometry(1, 1, 1, 72, 1, true), decalMaterial('plain', clock, DoubleSide), 4),
    rock: new Pool(scene, new IcosahedronGeometry(1, 0), glowing('#7a3100'), CAPACITY),
    boulder: new Pool(scene, new DodecahedronGeometry(1, 0), glowing('#3b1a70'), 6),
    beam: new Pool(scene, new BoxGeometry(1, 1, 1).translate(0.5, 0, 0), new MeshBasicMaterial({ color: '#ffffff' }), 4),
    pylon: new Pool(scene, new CylinderGeometry(0.3, 0.75, 1, 6), glowing('#5b1040'), 8),
    bar: new Pool(scene, new BoxGeometry(1, 1, 1), glowing('#6e5a00'), 4),
    orb: new Pool(scene, new SphereGeometry(1, 12, 8), new MeshBasicMaterial({ color: '#ffffff' }), 6),
    slime: new Pool(scene, new SphereGeometry(1, 10, 7), new MeshStandardMaterial({ color: '#ffffff', emissive: '#1e7a10', emissiveIntensity: 0.6, flatShading: true, roughness: 0.3 }), 6),
    eye: new Pool(scene, new SphereGeometry(1, 8, 6), new MeshBasicMaterial({ color: '#ffffff' }), 12),
  };
  const all = Object.values(pools);
  const paint: Record<Kind, Color> = {
    meteor: new Color(),
    boulder: new Color(),
    beam: new Color(),
    ring: new Color(),
    bar: new Color(),
    slime: new Color(),
  };
  const tint = new Color();
  const dark = new Color('#10202a');

  const glow = (kind: Kind, strength: number): Color => tint.copy(paint[kind]).multiplyScalar(strength);

  function meteor(d: Danger): void {
    if (d.phase === 'warn') {
      const part = d.t / d.warn;
      pools.discMark.add(d.x, 0.04, d.z, d.size, 1, d.size, 0, glow('meteor', 0.9));
      pools.fillMark.add(d.x, 0.05, d.z, d.size * part, 1, d.size * part, 0, glow('meteor', 0.28 + part * 0.25));
      const falling = 1 - part;
      pools.rock.add(d.x + falling * 7, 0.8 + FALL_FROM * falling * falling, d.z - falling * 7, 0.95, 0.95, 0.95, d.t * 4, paint.meteor, d.t * 3);
      return;
    }
    const part = d.t / METEOR_BLAST_SECONDS;
    pools.fillMark.add(d.x, 0.06, d.z, d.size * (0.7 + part * 0.5), 1, d.size * (0.7 + part * 0.5), 0, glow('meteor', 1.2 - part));
  }

  function boulder(d: Danger): void {
    const length = ARENA_RADIUS * 2.6;
    const yaw = Math.atan2(d.dx, d.dz);
    const startX = d.phase === 'warn' ? d.x : d.x - d.dx * d.speed * d.t;
    const startZ = d.phase === 'warn' ? d.z : d.z - d.dz * d.speed * d.t;
    const strength = d.phase === 'warn' ? 0.7 : 0.22;
    pools.lane.add(startX + (d.dx * length) / 2, 0.03, startZ + (d.dz * length) / 2, d.size * 2 + 0.3, 1, length, yaw, glow('boulder', strength));
    const roll = d.phase === 'warn' ? d.t * 2 : -d.t * d.speed;
    const shake = d.phase === 'warn' ? Math.sin(d.t * 40) * 0.08 : 0;
    pools.boulder.add(d.x + shake, d.size, d.z, d.size, d.size, d.size, yaw, paint.boulder, roll);
  }

  function beam(d: Danger): void {
    const yaw = -d.angle;
    pools.pylon.add(d.x, 0.7, d.z, 1, 1.4, 1, 0, paint.beam);
    if (d.phase === 'warn') {
      const part = d.t / d.warn;
      const opening = d.spin > 0 ? d.angle : d.angle + d.spin * (BEAM_SWEEP / Math.abs(d.spin));
      pools.fan.add(d.x, 0.03, d.z, d.size, 1, d.size, -opening, glow('beam', 0.14 + part * 0.2));
      pools.beam.add(d.x, 0.5, d.z, d.size, 0.05, 0.06 + part * 0.08, yaw, glow('beam', 0.35 + part * 0.5));
      return;
    }
    pools.beam.add(d.x, 0.45, d.z, d.size, 0.28, 0.3, yaw, paint.beam);
    pools.beam.add(d.x, 0.45, d.z, d.size, 0.12, 0.12, yaw, WHITE);
    // The beam floats, so a glowing streak on the floor under it shows exactly where it is.
    pools.streak.add(d.x, 0.03, d.z, d.size, 1, BEAM_WIDTH + 0.5, yaw, glow('beam', 0.75));
  }

  function ring(d: Danger): void {
    if (d.phase === 'warn') {
      const part = d.t / d.warn;
      const swell = 0.5 + part * 0.9;
      pools.orb.add(d.x, 0.9, d.z, swell, swell, swell, 0, paint.ring);
      const beat = 1 + (d.t * 3) % 1.6;
      pools.discMark.add(d.x, 0.04, d.z, beat, 1, beat, 0, glow('ring', 0.8));
      return;
    }
    const reach = Math.max(0.01, d.size) + RING_WIDTH * 2;
    pools.band.add(d.x, 0.06, d.z, reach, 1, reach, 0, glow('ring', 1));
    pools.fillMark.add(d.x, 0.05, d.z, Math.max(0.1, 1.2 - d.t * 2), 1, Math.max(0.1, 1.2 - d.t * 2), 0, glow('ring', 0.3));
    pools.wall.add(d.x, 0.35, d.z, Math.max(0.01, d.size), 0.7, Math.max(0.01, d.size), 0, glow('ring', 0.75));
    pools.edge.add(d.x, 0.72, d.z, Math.max(0.01, d.size), 1, Math.max(0.01, d.size), 0, WHITE);
  }

  function bar(d: Danger): void {
    const rise = d.phase === 'warn' ? d.t / d.warn : Math.min(1, (d.live - d.t) / 0.3);
    pools.discMark.add(d.x, 0.04, d.z, d.size + BAR_WIDTH, 1, d.size + BAR_WIDTH, 0, glow('bar', d.phase === 'warn' ? 0.7 : 0.35));
    pools.pylon.add(d.x, 0.65 * rise, d.z, 1.1, 1.5 * rise, 1.1, 0, paint.bar);
    pools.bar.add(d.x, 0.7 * rise, d.z, d.size * 2, 0.5, BAR_WIDTH, -d.angle, paint.bar);
  }

  function slime(d: Danger): void {
    if (d.phase === 'warn') {
      const part = d.t / d.warn;
      pools.discMark.add(d.x, 0.04, d.z, 1 + part * 0.3, 1, 1 + part * 0.3, 0, glow('slime', 0.9));
      const body = 0.7 * part;
      pools.slime.add(d.x, body * 0.55, d.z, body, body * 0.8, body, 0, paint.slime);
      return;
    }
    if (d.phase === 'burst') {
      const part = d.t / SLIME_BURST_SECONDS;
      const reach = SLIME_BURST_RADIUS * (0.6 + part * 0.4);
      pools.fillMark.add(d.x, 0.06, d.z, reach, 1, reach, 0, glow('slime', 1 - part * 0.6));
      return;
    }
    const fuse = d.phase === 'fuse' ? d.t / SLIME_FUSE_SECONDS : 0;
    const wobble = 1 + Math.sin(d.t * 9) * 0.08 + fuse * 0.4;
    const flash = d.phase === 'fuse' && Math.sin(d.t * 26) > 0;
    const body = 0.8 * wobble;
    if (d.phase === 'fuse') pools.discMark.add(d.x, 0.04, d.z, SLIME_BURST_RADIUS, 1, SLIME_BURST_RADIUS, 0, glow('slime', 0.8));
    pools.slime.add(d.x, body * 0.62, d.z, body, body * 0.8, body, 0, flash ? WHITE : paint.slime);
    const look = Math.atan2(d.dx, d.dz);
    for (const side of [-1, 1]) {
      const eyeX = d.x + Math.sin(look + side * 0.45) * body * 0.72;
      const eyeZ = d.z + Math.cos(look + side * 0.45) * body * 0.72;
      pools.eye.add(eyeX, body * 0.95, eyeZ, 0.2, 0.2, 0.2, 0, WHITE);
      pools.eye.add(eyeX + d.dx * 0.1, body * 0.98, eyeZ + d.dz * 0.1, 0.1, 0.1, 0.1, 0, dark);
    }
  }

  const draw: Record<Kind, (danger: Danger) => void> = { meteor, boulder, beam, ring, bar, slime };

  return {
    update(dangers, _clock, golden) {
      for (const kind of Object.keys(paint) as Kind[]) paint[kind].set(KIND_COLORS[kind]);
      if (golden) for (const kind of Object.keys(paint) as Kind[]) paint[kind].copy(GOLD);
      for (const pool of all) pool.begin();
      for (const danger of dangers) draw[danger.kind](danger);
      for (const pool of all) pool.end();
    },
  };
}
