// What the camera sees. The camera's eye sits at a fixed spot for each puzzle, in front, to the right and above the
// stack, and every screen only zooms, so what is visible never depends on the device. A block is seen when enough
// of it shows, hidden when none of it does, and a puzzle with a sliver in between is never made, so counting what
// you see is always clear-cut.
import { cubeKey, type Cube } from './stack.ts';

export interface Point {
  x: number;
  y: number;
  z: number;
}

/** The camera looks from 32 degrees right of the front and 34 degrees above the floor. */
const AZIMUTH = (32 * Math.PI) / 180;
const ELEVATION = (34 * Math.PI) / 180;
export const VIEW_DIRECTION: Point = {
  x: Math.sin(AZIMUTH) * Math.cos(ELEVATION),
  y: Math.sin(ELEVATION),
  z: Math.cos(AZIMUTH) * Math.cos(ELEVATION),
};

/** Where the camera looks: the middle of the footprint, a little under half way up. */
export const targetFor = (width: number, depth: number, tall: number): Point => ({ x: width / 2, y: tall * 0.42, z: depth / 2 });

/** The eye, far enough back that the whole stack fits without a fish-eye look. */
export function eyeFor(width: number, depth: number, tall: number): Point {
  const span = Math.max(width, depth, tall, 2);
  const distance = 3.2 * span + 2;
  const target = targetFor(width, depth, tall);
  return {
    x: target.x + VIEW_DIRECTION.x * distance,
    y: target.y + VIEW_DIRECTION.y * distance,
    z: target.z + VIEW_DIRECTION.z * distance,
  };
}

export type Face = 'px' | 'nx' | 'py' | 'ny' | 'pz' | 'nz';
const FACES: readonly { face: Face; axis: 0 | 1 | 2; sign: 1 | -1 }[] = [
  { face: 'px', axis: 0, sign: 1 },
  { face: 'nx', axis: 0, sign: -1 },
  { face: 'py', axis: 1, sign: 1 },
  { face: 'ny', axis: 1, sign: -1 },
  { face: 'pz', axis: 2, sign: 1 },
  { face: 'nz', axis: 2, sign: -1 },
];

/** Points tested on each face, in a 4 by 4 grid. */
const SAMPLES = 4;
const SAMPLE_AT = Array.from({ length: SAMPLES }, (_, at) => (at + 0.5) / SAMPLES);
export const SAMPLES_PER_FACE = SAMPLES * SAMPLES;
/**
 * How much of a block must show to count as seen: its visible share of each face, weighted by how squarely the
 * face looks at the camera, added up. A whole top face is about 0.56 and a whole right side about 0.44.
 */
export const SEEN_SHARE = 0.2;

export interface FaceSight {
  face: Face;
  /** Sample points on the face with a clear line to the eye. */
  clear: number;
}

export interface CubeSight {
  cube: Cube;
  faces: FaceSight[];
  /** How much of the block shows, as described for SEEN_SHARE. */
  share: number;
}

export type Verdict = 'seen' | 'hidden' | 'sliver';

export const verdictOf = (sight: CubeSight): Verdict =>
  sight.share >= SEEN_SHARE ? 'seen' : sight.faces.every((face) => face.clear === 0) ? 'hidden' : 'sliver';

/** True when the segment from the point to the eye passes through the block. */
function blocks(cube: Cube, from: Point, to: Point): boolean {
  let enter = 1e-6;
  let leave = 1 - 1e-6;
  const start = [from.x, from.y, from.z];
  const step = [to.x - from.x, to.y - from.y, to.z - from.z];
  for (let axis = 0; axis < 3; axis += 1) {
    const low = cube[axis];
    const high = low + 1;
    if (Math.abs(step[axis]) < 1e-12) {
      if (start[axis] <= low || start[axis] >= high) return false;
      continue;
    }
    let near = (low - start[axis]) / step[axis];
    let far = (high - start[axis]) / step[axis];
    if (near > far) [near, far] = [far, near];
    enter = Math.max(enter, near);
    leave = Math.min(leave, far);
    if (enter >= leave) return false;
  }
  return true;
}

/** How much of one block the eye can see, among these blocks. */
function sightFor(cube: Cube, cubes: readonly Cube[], filled: ReadonlySet<string>, eye: Point): CubeSight {
  const faces: FaceSight[] = [];
  let share = 0;
  for (const { face, axis, sign } of FACES) {
    const plane = cube[axis] + (sign > 0 ? 1 : 0);
    const middle = [cube[0] + 0.5, cube[1] + 0.5, cube[2] + 0.5];
    middle[axis] = plane;
    const toEye = [eye.x - middle[0], eye.y - middle[1], eye.z - middle[2]];
    const facing = (toEye[axis] * sign) / Math.hypot(...toEye);
    const neighbour: [number, number, number] = [cube[0], cube[1], cube[2]];
    neighbour[axis] += sign;
    // A face turned away, or pressed against another block, shows nothing.
    if (facing <= 0 || filled.has(cubeKey(neighbour))) {
      faces.push({ face, clear: 0 });
      continue;
    }
    const [u, v] = [0, 1, 2].filter((other) => other !== axis);
    let clear = 0;
    for (const a of SAMPLE_AT) {
      for (const b of SAMPLE_AT) {
        const spot = [0, 0, 0];
        spot[axis] = plane + sign * 1e-4;
        spot[u] = cube[u] + a;
        spot[v] = cube[v] + b;
        const from = { x: spot[0], y: spot[1], z: spot[2] };
        if (!cubes.some((other) => other !== cube && blocks(other, from, eye))) clear += 1;
      }
    }
    faces.push({ face, clear });
    share += (clear / SAMPLES_PER_FACE) * facing;
  }
  return { cube, faces, share };
}

/** How much of each block of a stack the eye can see. */
export function sightOf(cubes: readonly Cube[], eye: Point): CubeSight[] {
  const filled = new Set(cubes.map(cubeKey));
  return cubes.map((cube) => sightFor(cube, cubes, filled, eye));
}

/** How much a block would show if it were added to the stack. */
export function sightIfAdded(cubes: readonly Cube[], added: Cube, eye: Point): CubeSight {
  const all = [...cubes, added];
  return sightFor(all[all.length - 1], all, new Set(all.map(cubeKey)), eye);
}

/**
 * Everything the camera shows of a stack, as text: each face that shows and how much of it. Two stacks with a
 * different picture look different from the camera.
 */
export const pictureOf = (sights: readonly CubeSight[]): string =>
  sights
    .flatMap(({ cube, faces }) => faces.filter((face) => face.clear > 0).map((face) => `${cubeKey(cube)}${face.face}${face.clear}`))
    .sort()
    .join(' ');
