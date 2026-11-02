import { BufferGeometry, Color, Float32BufferAttribute } from 'three';
import { BRIDGE, BUILDINGS, FARM, PLAZA, POND, type Building } from '../data/map.ts';
import { heightAt, type Tile, type World } from '../rules/world.ts';
import { Builder, SHAPES, shade } from './builder.ts';

const TILE_COLORS: Record<Tile, number> = {
  sea: 0x2fb8c8,
  pond: 0x3aa9d8,
  sand: 0xffe0a0,
  grass: 0x7fd45a,
  path: 0xe3b484,
  plaza: 0xe8ded2,
  soil: 0xb07d52,
  forest: 0x55b851,
  hill: 0xa4e36e,
  snow: 0xf3f8ff,
  bridge: 0xc98d55,
  dock: 0xb98049,
};

const hash = (x: number, z: number): number => {
  const n = Math.sin(x * 12.9898 + z * 78.233) * 43758.5453;
  return n - Math.floor(n);
};

/** The ground as one mesh: every tile a coloured quad, lifted by the corner heights. */
export function buildGround(world: World): BufferGeometry {
  const positions: number[] = [];
  const colors: number[] = [];
  const tint = new Color();
  const row = world.width + 1;
  const corner = (x: number, z: number): number => world.heights[z * row + x] ?? 0;
  for (let z = 0; z < world.depth; z += 1) {
    for (let x = 0; x < world.width; x += 1) {
      const tile = world.tiles[z * world.width + x] ?? 'sea';
      const a = corner(x, z);
      const b = corner(x + 1, z);
      const c = corner(x, z + 1);
      const d = corner(x + 1, z + 1);
      if (tile === 'bridge') continue;
      if (tile === 'sea' && Math.max(a, b, c, d) < -0.6) continue;
      let color = TILE_COLORS[tile];
      if (tile === 'plaza' && (x + z) % 2 === 0) color = 0xd9cbbb;
      if (tile === 'soil' && x % 3 === 1) color = 0xa06e46;
      tint.setHex(shade(color, (hash(x, z) - 0.5) * 0.05));
      positions.push(x, a, z, x, c, z + 1, x + 1, b, z, x + 1, b, z, x, c, z + 1, x + 1, d, z + 1);
      for (let at = 0; at < 6; at += 1) colors.push(tint.r, tint.g, tint.b);
    }
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new Float32BufferAttribute(positions, 3));
  geometry.setAttribute('color', new Float32BufferAttribute(colors, 3));
  geometry.computeVertexNormals();
  geometry.computeBoundingSphere();
  return geometry;
}

function roundTree(b: Builder, x: number, y: number, z: number, size: number, leaf: number): void {
  b.add(SHAPES.post, 0x9a6a3c, x, y + 0.6 * size, z, 0.3 * size, 1.2 * size, 0.3 * size);
  b.add(SHAPES.ball, leaf, x, y + 1.6 * size, z, 1.5 * size, 1.4 * size, 1.5 * size);
  b.add(SHAPES.ball, shade(leaf, 0.06), x + 0.3 * size, y + 2.1 * size, z + 0.2 * size, 0.9 * size, 0.8 * size, 0.9 * size);
}

function pine(b: Builder, x: number, y: number, z: number, size: number, leaf: number, snowy: boolean): void {
  b.add(SHAPES.post, 0x8a5a33, x, y + 0.4 * size, z, 0.26 * size, 0.8 * size, 0.26 * size);
  for (let tier = 0; tier < 3; tier += 1) {
    const width = (1.6 - tier * 0.4) * size;
    b.add(SHAPES.cone, leaf, x, y + (1.0 + tier * 0.6) * size, z, width, 1.0 * size, width);
    if (snowy) b.add(SHAPES.cone, 0xffffff, x, y + (1.25 + tier * 0.6) * size, z, width * 0.6, 0.5 * size, width * 0.6);
  }
}

function palm(b: Builder, x: number, y: number, z: number, size: number): void {
  for (let step = 0; step < 4; step += 1) b.add(SHAPES.post, 0xb88a52, x + step * 0.08 * size, y + (0.35 + step * 0.6) * size, z, 0.26 * size, 0.62 * size, 0.26 * size, { rz: -0.12 });
  const topX = x + 0.32 * size;
  const topY = y + 2.5 * size;
  for (let leaf = 0; leaf < 6; leaf += 1) {
    const angle = (leaf / 6) * Math.PI * 2;
    b.add(SHAPES.box, 0x3fbf5a, topX + Math.cos(angle) * 0.6 * size, topY - 0.1 * size, z + Math.sin(angle) * 0.6 * size, 1.4 * size, 0.08 * size, 0.42 * size, { ry: -angle, rz: -0.35 });
  }
  b.add(SHAPES.ball, 0x8a5a33, topX, topY - 0.25 * size, z + 0.15 * size, 0.24 * size, 0.24 * size, 0.24 * size);
}

function blossom(b: Builder, x: number, y: number, z: number, size: number, kind: number): void {
  const flowers = [0xff9ec4, 0xffe066, 0xc8a8ff][kind % 3] ?? 0xff9ec4;
  b.add(SHAPES.post, 0x9a6a3c, x, y + 0.5 * size, z, 0.26 * size, 1.0 * size, 0.26 * size);
  b.add(SHAPES.ball, 0x6cc95a, x, y + 1.4 * size, z, 1.4 * size, 1.2 * size, 1.4 * size);
  for (let at = 0; at < 5; at += 1) b.add(SHAPES.ball, flowers, x + Math.cos(at * 1.3) * 0.55 * size, y + (1.5 + (at % 2) * 0.3) * size, z + Math.sin(at * 1.3) * 0.55 * size, 0.3 * size, 0.3 * size, 0.3 * size);
}

const LEAVES = [0x3fae4a, 0x58c24a, 0x2f9e5c];

/** Trees, rocks and meadow flowers, all in one mesh. */
export function buildNature(world: World): BufferGeometry {
  const b = new Builder();
  for (const tree of world.trees) {
    const x = tree.x + 0.5;
    const z = tree.z + 0.5;
    const y = heightAt(world, x, z) - 0.05;
    const tile = world.tiles[tree.z * world.width + tree.x];
    const leaf = LEAVES[tree.kind % LEAVES.length] ?? 0x3fae4a;
    if (tile === 'sand') palm(b, x, y, z, tree.size);
    else if (tile === 'snow') pine(b, x, y, z, tree.size, 0x2f8f6a, true);
    else if (tile === 'hill') blossom(b, x, y, z, tree.size, tree.kind);
    else if (tile === 'forest' && tree.kind === 2) pine(b, x, y, z, tree.size, 0x2f9e5c, false);
    else roundTree(b, x, y, z, tree.size, leaf);
  }
  for (const rock of world.rocks) {
    const x = rock.x + 0.5;
    const z = rock.z + 0.5;
    const tile = world.tiles[rock.z * world.width + rock.x];
    const color = tile === 'snow' ? 0xdfe8f5 : 0xa9a3b8;
    b.add(SHAPES.rock, color, x, heightAt(world, x, z) + 0.25 * rock.size, z, 1.1 * rock.size, 0.7 * rock.size, 0.9 * rock.size, { ry: rock.kind });
    if (tile === 'snow') b.add(SHAPES.dome, 0xffffff, x, heightAt(world, x, z) + 0.5 * rock.size, z, 0.8 * rock.size, 0.3 * rock.size, 0.7 * rock.size);
  }
  const petals = [0xff70a6, 0xffd23f, 0x8b5cf6, 0xffffff, 0xff9f1c, 0x4cb8ff];
  for (let z = 0; z < world.depth; z += 1) {
    for (let x = 0; x < world.width; x += 1) {
      const at = z * world.width + x;
      const tile = world.tiles[at];
      if (world.blocked[at]) continue;
      const chance = tile === 'hill' ? 0.28 : tile === 'grass' ? 0.05 : tile === 'forest' ? 0.06 : 0;
      const roll = hash(x * 3.1, z * 1.7);
      if (roll >= chance) continue;
      const px = x + 0.2 + hash(x, z * 2) * 0.6;
      const pz = z + 0.2 + hash(x * 2, z) * 0.6;
      const y = heightAt(world, px, pz);
      const color = petals[Math.floor(hash(z, x) * petals.length)] ?? 0xffffff;
      b.add(SHAPES.post, 0x3a9a3a, px, y + 0.12, pz, 0.04, 0.24, 0.04);
      b.add(SHAPES.ball, color, px, y + 0.28, pz, 0.2, 0.14, 0.2);
    }
  }
  return b.build();
}

/** A box-shaped house with a pitched roof, a door on the south side and windows. */
function cottage(b: Builder, building: Building, y: number, wall: number, roof: number, door: number, glow: Builder): void {
  const cx = building.x + building.w / 2;
  const cz = building.z + building.d / 2;
  const w = building.w - 0.4;
  const d = building.d - 0.6;
  b.add(SHAPES.box, shade(wall, -0.2), cx, y + 0.1, cz, w + 0.4, 0.2, d + 0.4);
  b.add(SHAPES.box, wall, cx, y + 1.4, cz, w, 2.6, d);
  b.add(SHAPES.box, roof, cx, y + 3.3, cz - d * 0.25, w + 0.6, 0.25, d * 0.62, { rx: 0.62 });
  b.add(SHAPES.box, roof, cx, y + 3.3, cz + d * 0.25, w + 0.6, 0.25, d * 0.62, { rx: -0.62 });
  b.add(SHAPES.box, wall, cx, y + 3.15, cz, w - 0.1, 1.1, d * 0.4);
  b.add(SHAPES.box, door, cx, y + 0.95, cz + d / 2 + 0.03, 1.0, 1.7, 0.12);
  b.add(SHAPES.ball, 0xffd23f, cx + 0.3, y + 0.95, cz + d / 2 + 0.12, 0.12, 0.12, 0.08);
  for (const side of [-1, 1]) {
    glow.add(SHAPES.box, 0xffffff, cx + side * (w / 2 - 0.9), y + 1.6, cz + d / 2 + 0.03, 0.8, 0.8, 0.08);
    b.add(SHAPES.box, 0xffffff, cx + side * (w / 2 - 0.9), y + 1.6, cz + d / 2 + 0.06, 0.95, 0.1, 0.06);
  }
  b.add(SHAPES.box, 0xb5a9c9, cx + w * 0.3, y + 3.9, cz - 0.3, 0.5, 1.0, 0.5);
}

function bakery(b: Builder, building: Building, y: number, glow: Builder): void {
  cottage(b, building, y, 0xfff1d6, 0xff7a59, 0x8a5a33, glow);
  const cx = building.x + building.w / 2;
  const front = building.z + building.d - 0.25;
  for (let stripe = 0; stripe < 7; stripe += 1) {
    const color = stripe % 2 ? 0xffffff : 0x3a86ff;
    b.add(SHAPES.box, color, cx - 2.4 + stripe * 0.8, y + 2.7, front + 0.4, 0.8, 0.08, 1.0, { rx: 0.4 });
  }
  b.add(SHAPES.can, 0xd99a5c, cx, y + 4.5, building.z + building.d / 2, 1.4, 0.7, 1.4);
  b.add(SHAPES.smooth, 0xff9ec4, cx, y + 5.0, building.z + building.d / 2, 1.7, 0.9, 1.7);
  b.add(SHAPES.ball, 0xe63946, cx, y + 5.55, building.z + building.d / 2, 0.4, 0.4, 0.4);
}

function petCorner(b: Builder, building: Building, y: number): void {
  const cx = building.x + building.w / 2;
  const cz = building.z + building.d / 2;
  b.add(SHAPES.box, 0xe85d4a, cx, y + 1.3, cz - 0.4, building.w - 1, 2.4, building.d - 2);
  b.add(SHAPES.box, 0xffffff, cx, y + 3.0, cz - 0.4, building.w - 0.4, 0.3, building.d - 1.4);
  b.add(SHAPES.spike, 0x8a3b2e, cx, y + 3.7, cz - 0.4, building.w + 0.6, 1.4, building.d - 0.8, { ry: Math.PI / 4 });
  b.add(SHAPES.box, 0x8a3b2e, cx, y + 1.0, cz + (building.d - 2) / 2 - 0.35, 1.4, 1.8, 0.1);
  b.add(SHAPES.box, 0xffffff, cx, y + 1.0, cz + (building.d - 2) / 2 - 0.33, 1.2, 0.1, 0.06, { rz: 0.8 });
  b.add(SHAPES.box, 0xffffff, cx, y + 1.0, cz + (building.d - 2) / 2 - 0.33, 1.2, 0.1, 0.06, { rz: -0.8 });
  // A paw sign over the door.
  b.add(SHAPES.can, 0xffd23f, cx, y + 2.2, cz + (building.d - 2) / 2 - 0.3, 0.9, 0.1, 0.9, { rx: Math.PI / 2 });
  b.add(SHAPES.ball, 0x8a3b2e, cx, y + 2.1, cz + (building.d - 2) / 2 - 0.22, 0.34, 0.28, 0.1);
  for (const dx of [-0.25, 0, 0.25]) b.add(SHAPES.ball, 0x8a3b2e, cx + dx, y + 2.42, cz + (building.d - 2) / 2 - 0.22, 0.14, 0.14, 0.08);
  for (const [dx, dz] of [[-1.6, 2.6], [1.6, 2.6]] as const) b.add(SHAPES.can, 0x3a86ff, cx + dx, y + 0.15, cz + dz, 0.7, 0.2, 0.7);
}

function wardrobe(b: Builder, building: Building, y: number): void {
  const cx = building.x + building.w / 2;
  const cz = building.z + building.d / 2;
  b.add(SHAPES.box, 0x8b5cf6, cx, y + 1.3, cz, 1.6, 2.6, 1.2);
  b.add(SHAPES.box, 0x6a3fd0, cx, y + 2.7, cz, 1.8, 0.2, 1.4);
  b.add(SHAPES.box, 0xb999ff, cx - 0.4, y + 1.3, cz + 0.62, 0.72, 2.3, 0.06);
  b.add(SHAPES.box, 0xb999ff, cx + 0.4, y + 1.3, cz + 0.62, 0.72, 2.3, 0.06);
  b.add(SHAPES.ball, 0xffd23f, cx - 0.1, y + 1.3, cz + 0.68, 0.1, 0.1, 0.08);
  b.add(SHAPES.ball, 0xffd23f, cx + 0.1, y + 1.3, cz + 0.68, 0.1, 0.1, 0.08);
  // A hat on top, so it reads as "clothes" from far away.
  b.add(SHAPES.can, 0xff5a5f, cx, y + 2.85, cz, 1.0, 0.08, 1.0);
  b.add(SHAPES.can, 0xff5a5f, cx, y + 3.1, cz, 0.6, 0.5, 0.6);
}

function fence(b: Builder, world: World, x0: number, z0: number, x1: number, z1: number, skip: (x: number, z: number) => boolean): void {
  const steps = Math.max(Math.abs(x1 - x0), Math.abs(z1 - z0));
  for (let step = 0; step <= steps; step += 1) {
    const x = x0 + ((x1 - x0) * step) / steps;
    const z = z0 + ((z1 - z0) * step) / steps;
    if (skip(x, z)) continue;
    const y = heightAt(world, x, z);
    b.add(SHAPES.box, 0xffffff, x, y + 0.35, z, 0.14, 0.7, 0.14);
    if (step < steps && !skip(x0 + ((x1 - x0) * (step + 1)) / steps, z0 + ((z1 - z0) * (step + 1)) / steps)) {
      const mx = x0 + ((x1 - x0) * (step + 0.5)) / steps;
      const mz = z0 + ((z1 - z0) * (step + 0.5)) / steps;
      b.add(SHAPES.box, 0xffffff, mx, y + 0.45, mz, x1 !== x0 ? 1.0 : 0.08, 0.1, z1 !== z0 ? 1.0 : 0.08);
    }
  }
}

export interface Town {
  solid: BufferGeometry;
  /** Windows and lamps, which glow in the evening. */
  glow: BufferGeometry;
}

/** Buildings, fences, docks, the jetty and lamps. */
export function buildTown(world: World): Town {
  const b = new Builder();
  const glow = new Builder();
  for (const building of BUILDINGS) {
    const y = heightAt(world, building.x + building.w / 2, building.z + building.d / 2);
    if (building.id === 'bakery') bakery(b, building, y, glow);
    else if (building.id === 'house') cottage(b, building, y, 0x9fdcff, 0x3a6fd8, 0xff9f1c, glow);
    else if (building.id === 'pets') petCorner(b, building, y);
    else if (building.id === 'wardrobe') wardrobe(b, building, y);
  }
  const isPath = (x: number, z: number): boolean => {
    const tile = world.tiles[Math.floor(z) * world.width + Math.floor(x)];
    return tile === 'path' || tile === 'plaza';
  };
  fence(b, world, FARM.x0, FARM.z0, FARM.x1 + 1, FARM.z0, isPath);
  fence(b, world, FARM.x0, FARM.z1 + 1, FARM.x1 + 1, FARM.z1 + 1, isPath);
  fence(b, world, FARM.x0, FARM.z0, FARM.x0, FARM.z1 + 1, isPath);
  fence(b, world, FARM.x1 + 1, FARM.z0, FARM.x1 + 1, FARM.z1 + 1, (x, z) => isPath(x, z) || isPath(x - 1, z) || (z > 44 && z < 51));
  // Lamp posts round the village square.
  for (let at = 0; at < 8; at += 1) {
    const angle = (at / 8) * Math.PI * 2 + 0.4;
    const x = PLAZA.x + 0.5 + Math.cos(angle) * (PLAZA.r + 0.6);
    const z = PLAZA.z + 0.5 + Math.sin(angle) * (PLAZA.r + 0.6);
    if (isPath(x, z) || world.blocked[Math.floor(z) * world.width + Math.floor(x)]) continue;
    const y = heightAt(world, x, z);
    b.add(SHAPES.post, 0x34405e, x, y + 1.1, z, 0.14, 2.2, 0.14);
    b.add(SHAPES.cone, 0x34405e, x, y + 2.55, z, 0.5, 0.3, 0.5);
    glow.add(SHAPES.ball, 0xffffff, x, y + 2.3, z, 0.36, 0.36, 0.36);
  }
  // A star set into the square.
  for (let point = 0; point < 5; point += 1) {
    const angle = (point / 5) * Math.PI * 2;
    b.add(SHAPES.spike, 0xffb02e, PLAZA.x + 0.5 + Math.sin(angle) * 0.9, heightAt(world, PLAZA.x + 0.5, PLAZA.z + 0.5) + 0.02, PLAZA.z + 0.5 - Math.cos(angle) * 0.9, 0.9, 0.04, 1.8, { ry: -angle });
  }
  // Dock posts and the pond jetty.
  world.tiles.forEach((tile, at) => {
    if (tile !== 'dock') return;
    const x = at % world.width;
    const z = (at - x) / world.width;
    if ((x + z) % 2 === 0) b.add(SHAPES.post, 0x8a5a33, x + 0.5, -0.3, z + 0.5, 0.2, 1.6, 0.2);
  });
  const jettyY = 0.3;
  b.add(SHAPES.box, 0xc98d55, POND.x + 0.5, jettyY, POND.z - POND.rz + 1.2, 1.6, 0.14, 2.6);
  for (const dx of [-0.7, 0.7]) b.add(SHAPES.post, 0x8a5a33, POND.x + 0.5 + dx, jettyY - 0.5, POND.z - POND.rz + 2.2, 0.16, 1.2, 0.16);
  b.add(SHAPES.can, 0x3a86ff, POND.x + 1.5, jettyY + 0.25, POND.z - POND.rz, 0.5, 0.5, 0.5);
  b.add(SHAPES.post, 0xc98d55, POND.x - 0.4, jettyY + 0.9, POND.z - POND.rz + 1.6, 0.06, 2.2, 0.06, { rx: 0.6 });
  // Bridge posts, which stand from the start: the planks come later.
  for (const x of [BRIDGE.x0, BRIDGE.x1 + 1]) {
    for (const z of [BRIDGE.z - 1, BRIDGE.z + 2]) b.add(SHAPES.post, 0x8a5a33, x, 0.1, z, 0.3, 1.8, 0.3);
  }
  return { solid: b.build(), glow: glow.build() };
}

/** The planks across to Flower Hill, once they're built. */
export function buildBridge(): BufferGeometry {
  const b = new Builder();
  const y = 0.3;
  for (let x = BRIDGE.x0; x <= BRIDGE.x1; x += 1) {
    const lift = Math.sin(((x - BRIDGE.x0 + 0.5) / (BRIDGE.x1 - BRIDGE.x0 + 1)) * Math.PI) * 0.35;
    b.add(SHAPES.box, x % 2 ? 0xc98d55 : 0xb57a45, x + 0.5, y + lift, BRIDGE.z + 0.5, 0.96, 0.16, 3.2);
    for (const z of [BRIDGE.z - 1.05, BRIDGE.z + 2.05]) {
      b.add(SHAPES.post, 0xff7a59, x + 0.5, y + lift + 0.4, z, 0.1, 0.8, 0.1);
      b.add(SHAPES.box, 0xff7a59, x + 0.5, y + lift + 0.8, z, 1.0, 0.1, 0.1);
    }
  }
  return b.build();
}

/** A pile of planks and a little sign, where the bridge will be. */
export function buildBridgeSoon(): BufferGeometry {
  const b = new Builder();
  for (let at = 0; at < 4; at += 1) b.add(SHAPES.box, 0xc98d55, BRIDGE.x0 - 1.6, 0.45 + at * 0.14, BRIDGE.z + 0.5 + (at % 2) * 0.2, 0.5, 0.12, 2.4, { ry: at * 0.2 });
  b.add(SHAPES.post, 0x8a5a33, BRIDGE.x0 - 0.6, 0.9, BRIDGE.z - 0.6, 0.1, 1.4, 0.1);
  b.add(SHAPES.box, 0xffd23f, BRIDGE.x0 - 0.6, 1.5, BRIDGE.z - 0.55, 0.9, 0.6, 0.08);
  b.add(SHAPES.box, 0x2b2140, BRIDGE.x0 - 0.6, 1.5, BRIDGE.z - 0.5, 0.5, 0.1, 0.04, { rz: 0.6 });
  return b.build();
}

/** The little sailing boat. */
export function buildBoat(): BufferGeometry {
  const b = new Builder();
  b.add(SHAPES.box, 0xff5a5f, 0, 0.3, 0, 1.6, 0.5, 3.2);
  b.add(SHAPES.spike, 0xff5a5f, 0, 0.3, 1.9, 1.15, 0.5, 1.15, { rx: Math.PI / 2, ry: Math.PI / 4 });
  b.add(SHAPES.box, 0xffffff, 0, 0.58, 0, 1.7, 0.08, 3.3);
  b.add(SHAPES.post, 0x8a5a33, 0, 2.0, 0, 0.12, 3.0, 0.12);
  b.add(SHAPES.spike, 0xffffff, 0, 2.0, -0.5, 0.1, 2.4, 1.6, { rx: 0.05 });
  b.add(SHAPES.box, 0xffd23f, 0, 3.55, 0.25, 0.04, 0.3, 0.5);
  return b.build();
}
