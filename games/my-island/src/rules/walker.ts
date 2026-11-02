import type { Step } from './path.ts';

export interface Walker {
  x: number;
  z: number;
  /** Radians, where 0 faces south, towards the camera. */
  facing: number;
  route: Step[];
  speed: number;
}

export const makeWalker = (x: number, z: number, speed: number): Walker => ({ x, z, facing: 0, route: [], speed });

/** Moves along the route by this much time. Returns true on the frame the walker arrives. */
export function stepWalker(walker: Walker, seconds: number): boolean {
  if (!walker.route.length) return false;
  let left = walker.speed * seconds;
  while (left > 0) {
    const next = walker.route[0];
    if (!next) break;
    const dx = next.x - walker.x;
    const dz = next.z - walker.z;
    const gap = Math.hypot(dx, dz);
    if (gap > 0.001) walker.facing = Math.atan2(dx, dz);
    if (gap <= left) {
      walker.x = next.x;
      walker.z = next.z;
      walker.route.shift();
      left -= gap;
    } else {
      walker.x += (dx / gap) * left;
      walker.z += (dz / gap) * left;
      left = 0;
    }
  }
  return walker.route.length === 0;
}
