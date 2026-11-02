import {
  BoxGeometry,
  BufferGeometry,
  Color,
  ConeGeometry,
  CylinderGeometry,
  DodecahedronGeometry,
  Euler,
  Float32BufferAttribute,
  IcosahedronGeometry,
  Matrix4,
  MeshLambertMaterial,
  Quaternion,
  SphereGeometry,
  TorusGeometry,
  Vector3,
} from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

/** Unit shapes, centred on the origin. Every model is made of these. */
export const SHAPES = {
  box: new BoxGeometry(1, 1, 1),
  ball: new IcosahedronGeometry(0.5, 1),
  smooth: new SphereGeometry(0.5, 10, 8),
  dome: new SphereGeometry(0.5, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2),
  can: new CylinderGeometry(0.5, 0.5, 1, 10),
  post: new CylinderGeometry(0.5, 0.5, 1, 6),
  cone: new ConeGeometry(0.5, 1, 8),
  spike: new ConeGeometry(0.5, 1, 4),
  rock: new DodecahedronGeometry(0.5, 0),
  ring: new TorusGeometry(0.4, 0.1, 6, 16),
};

/** One shared look for everything solid: chunky, flat-shaded, coloured per vertex. */
export const toy = new MeshLambertMaterial({ vertexColors: true, flatShading: true });

export interface Pose {
  rx?: number;
  ry?: number;
  rz?: number;
  sx?: number;
  sy?: number;
  sz?: number;
}

const flatShapes = new WeakMap<BufferGeometry, BufferGeometry>();

/** The shape with its triangles unshared and no texture coordinates, ready to be merged with anything. */
function flatOf(shape: BufferGeometry): BufferGeometry {
  let flat = flatShapes.get(shape);
  if (!flat) {
    flat = shape.index ? shape.toNonIndexed() : shape.clone();
    flat.deleteAttribute('uv');
    flatShapes.set(shape, flat);
  }
  return flat;
}

const matrix = new Matrix4();
const rotation = new Quaternion();
const euler = new Euler();
const where = new Vector3();
const size = new Vector3();
const tint = new Color();

/**
 * Collects coloured shapes and merges them into one geometry, so a whole character or a whole
 * village is a single draw call.
 */
export class Builder {
  private parts: BufferGeometry[] = [];

  /** A shape scaled to `width`, `height`, `depth`, centred at x, y, z. */
  add(shape: BufferGeometry, color: number, x: number, y: number, z: number, width = 1, height = 1, depth = 1, pose: Pose = {}): this {
    const part = flatOf(shape).clone();
    euler.set(pose.rx ?? 0, pose.ry ?? 0, pose.rz ?? 0);
    rotation.setFromEuler(euler);
    size.set(width * (pose.sx ?? 1), height * (pose.sy ?? 1), depth * (pose.sz ?? 1));
    matrix.compose(where.set(x, y, z), rotation, size);
    part.applyMatrix4(matrix);
    tint.setHex(color);
    const count = part.getAttribute('position').count;
    const colors = new Float32Array(count * 3);
    for (let at = 0; at < count; at += 1) {
      colors[at * 3] = tint.r;
      colors[at * 3 + 1] = tint.g;
      colors[at * 3 + 2] = tint.b;
    }
    part.setAttribute('color', new Float32BufferAttribute(colors, 3));
    this.parts.push(part);
    return this;
  }

  /** Adds everything from another builder, moved and turned as a group. */
  addGroup(other: Builder, x: number, y: number, z: number, turn = 0, scale = 1): this {
    euler.set(0, turn, 0);
    rotation.setFromEuler(euler);
    matrix.compose(where.set(x, y, z), rotation, size.set(scale, scale, scale));
    for (const part of other.parts) this.parts.push(part.clone().applyMatrix4(matrix));
    return this;
  }

  get empty(): boolean {
    return this.parts.length === 0;
  }

  build(): BufferGeometry {
    const merged = this.parts.length ? mergeGeometries(this.parts) : new BufferGeometry();
    for (const part of this.parts) part.dispose();
    this.parts = [];
    merged.computeBoundingSphere();
    return merged;
  }
}

/** A colour a little lighter or darker, for toy-like variety. */
export function shade(color: number, amount: number): number {
  return tint.setHex(color).offsetHSL(0, 0, amount).getHex();
}
