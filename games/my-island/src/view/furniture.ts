import { furnitureById } from '../data/furniture.ts';
import { footprint } from '../rules/decor.ts';
import type { PlacedItem } from '../rules/state.ts';
import { Builder, SHAPES } from './builder.ts';

const WOOD = 0xc98d55;
const DARK_WOOD = 0x8a5a33;
const INK = 0x2b2140;

function truck(b: Builder, scale: number, body: number, bed: number): void {
  const s = scale;
  b.add(SHAPES.box, body, 0.45 * s, 0.4 * s, 0, 0.5 * s, 0.5 * s, 0.6 * s);
  b.add(SHAPES.box, 0xbfe9ff, 0.62 * s, 0.5 * s, 0, 0.1 * s, 0.24 * s, 0.5 * s);
  b.add(SHAPES.box, bed, -0.2 * s, 0.38 * s, 0, 0.8 * s, 0.36 * s, 0.6 * s);
  for (const x of [-0.45, 0.45]) for (const z of [-0.3, 0.3]) b.add(SHAPES.can, INK, x * s, 0.14 * s, z * s, 0.28 * s, 0.12 * s, 0.28 * s, { rx: Math.PI / 2 });
}

function dino(b: Builder, scale: number, color: number): void {
  const s = scale;
  b.add(SHAPES.smooth, color, 0, 0.5 * s, 0, 0.7 * s, 0.6 * s, 1.0 * s);
  b.add(SHAPES.can, color, 0, 0.9 * s, 0.4 * s, 0.26 * s, 0.6 * s, 0.26 * s, { rx: 0.4 });
  b.add(SHAPES.smooth, color, 0, 1.2 * s, 0.6 * s, 0.4 * s, 0.34 * s, 0.5 * s);
  b.add(SHAPES.ball, INK, -0.12 * s, 1.28 * s, 0.76 * s, 0.07 * s, 0.07 * s, 0.07 * s);
  b.add(SHAPES.ball, INK, 0.12 * s, 1.28 * s, 0.76 * s, 0.07 * s, 0.07 * s, 0.07 * s);
  b.add(SHAPES.cone, color, 0, 0.45 * s, -0.75 * s, 0.24 * s, 0.7 * s, 0.24 * s, { rx: -1.8 });
  for (const z of [0.2, -0.05, -0.3]) b.add(SHAPES.spike, 0xffb02e, 0, 0.85 * s, z * s, 0.18 * s, 0.24 * s, 0.18 * s);
  for (const [x, z] of [[-0.2, 0.25], [0.2, 0.25], [-0.2, -0.25], [0.2, -0.25]] as const) b.add(SHAPES.can, color, x * s, 0.15 * s, z * s, 0.18 * s, 0.3 * s, 0.18 * s);
}

/** The pieces of one item, centred on the origin, before it is turned. */
function model(b: Builder, id: string): void {
  switch (id) {
    case 'bed':
      b.add(SHAPES.box, WOOD, 0, 0.2, 0, 1.8, 0.3, 2.8);
      b.add(SHAPES.box, 0xffffff, 0, 0.42, 0.05, 1.7, 0.16, 2.6);
      b.add(SHAPES.box, 0x3a86ff, 0, 0.48, 0.45, 1.74, 0.12, 1.8);
      b.add(SHAPES.smooth, 0xfff1d6, 0, 0.56, -1.0, 1.1, 0.24, 0.5);
      b.add(SHAPES.box, WOOD, 0, 0.6, -1.35, 1.8, 0.9, 0.12);
      break;
    case 'table':
      b.add(SHAPES.can, WOOD, 0, 0.7, 0, 1.7, 0.1, 1.7);
      b.add(SHAPES.can, DARK_WOOD, 0, 0.35, 0, 0.2, 0.7, 0.2);
      b.add(SHAPES.can, 0xffffff, 0.3, 0.78, 0.2, 0.5, 0.04, 0.5);
      b.add(SHAPES.ball, 0xff6b6b, 0.3, 0.86, 0.2, 0.2, 0.16, 0.2);
      b.add(SHAPES.can, 0xffd23f, -0.35, 0.86, -0.25, 0.2, 0.2, 0.2);
      break;
    case 'rug':
      b.add(SHAPES.can, 0xb388ff, 0, 0.03, 0, 2.8, 0.04, 1.8);
      b.add(SHAPES.can, 0xffd23f, 0, 0.05, 0, 1.8, 0.04, 1.0);
      break;
    case 'chair':
      b.add(SHAPES.box, 0xff9f1c, 0, 0.42, 0, 0.7, 0.1, 0.7);
      b.add(SHAPES.box, 0xff9f1c, 0, 0.8, -0.3, 0.7, 0.7, 0.1);
      for (const [x, z] of [[-0.28, -0.28], [0.28, -0.28], [-0.28, 0.28], [0.28, 0.28]] as const) b.add(SHAPES.box, DARK_WOOD, x, 0.2, z, 0.08, 0.4, 0.08);
      break;
    case 'lamp':
      b.add(SHAPES.can, INK, 0, 0.05, 0, 0.4, 0.1, 0.4);
      b.add(SHAPES.can, 0xdddddd, 0, 0.6, 0, 0.06, 1.1, 0.06);
      b.add(SHAPES.cone, 0xffe066, 0, 1.2, 0, 0.6, 0.4, 0.6);
      break;
    case 'teddy':
      b.add(SHAPES.smooth, 0xc68958, 0, 0.3, 0, 0.5, 0.5, 0.4);
      b.add(SHAPES.smooth, 0xc68958, 0, 0.68, 0, 0.4, 0.38, 0.38);
      for (const side of [-1, 1]) {
        b.add(SHAPES.ball, 0xc68958, side * 0.16, 0.86, 0, 0.14, 0.14, 0.1);
        b.add(SHAPES.ball, 0xc68958, side * 0.26, 0.34, 0.08, 0.16, 0.16, 0.16);
      }
      b.add(SHAPES.ball, 0xff6b6b, 0, 0.5, 0.2, 0.16, 0.1, 0.08);
      break;
    case 'truckToy':
      truck(b, 1.1, 0xff5a5f, 0xffd23f);
      break;
    case 'dinoToy':
      dino(b, 0.55, 0x3ecf8e);
      break;
    case 'sofa':
      b.add(SHAPES.box, 0x18b7c9, 0, 0.3, 0.05, 2.8, 0.4, 0.8);
      b.add(SHAPES.box, 0x18b7c9, 0, 0.7, -0.3, 2.8, 0.6, 0.2);
      for (const side of [-1, 1]) b.add(SHAPES.box, 0x139aa9, side * 1.3, 0.5, 0.05, 0.2, 0.5, 0.8);
      for (const x of [-0.7, 0, 0.7]) b.add(SHAPES.box, 0x6fe0ea, x, 0.54, 0.05, 0.62, 0.1, 0.62);
      break;
    case 'shelf':
      b.add(SHAPES.box, WOOD, 0, 0.9, -0.2, 1.8, 1.8, 0.5);
      for (const y of [0.5, 1.2]) {
        [0xff5a5f, 0x3a86ff, 0x3ecf8e, 0xffd23f, 0x8b5cf6].forEach((color, at) => b.add(SHAPES.box, color, -0.6 + at * 0.28, y, 0.05, 0.2, 0.42, 0.3));
      }
      break;
    case 'plant':
      b.add(SHAPES.can, 0xe07a4d, 0, 0.2, 0, 0.5, 0.4, 0.5);
      for (let at = 0; at < 5; at += 1) b.add(SHAPES.ball, 0x37b34a, Math.cos(at) * 0.18, 0.6 + (at % 2) * 0.2, Math.sin(at) * 0.18, 0.36, 0.42, 0.36);
      break;
    case 'fishbowl':
      b.add(SHAPES.can, WOOD, 0, 0.3, 0, 0.5, 0.6, 0.5);
      b.add(SHAPES.smooth, 0x9fe3ff, 0, 0.85, 0, 0.6, 0.55, 0.6);
      b.add(SHAPES.ball, 0xff9f1c, 0.08, 0.85, 0.1, 0.18, 0.12, 0.1);
      break;
    case 'piano':
      b.add(SHAPES.box, INK, 0, 0.6, -0.15, 1.8, 1.0, 0.6);
      b.add(SHAPES.box, 0xffffff, 0, 0.72, 0.22, 1.7, 0.08, 0.22);
      for (let at = 0; at < 8; at += 1) b.add(SHAPES.box, INK, -0.7 + at * 0.2, 0.78, 0.18, 0.06, 0.05, 0.12);
      break;
    case 'rocketLamp':
      b.add(SHAPES.can, 0xf0f4ff, 0, 0.6, 0, 0.4, 0.9, 0.4);
      b.add(SHAPES.cone, 0xff5a5f, 0, 1.25, 0, 0.4, 0.4, 0.4);
      b.add(SHAPES.ball, 0x6fd3ff, 0, 0.75, 0.2, 0.18, 0.18, 0.06);
      for (const angle of [0, 2.1, 4.2]) b.add(SHAPES.box, 0xff5a5f, Math.sin(angle) * 0.24, 0.25, Math.cos(angle) * 0.24, 0.06, 0.4, 0.26, { ry: angle });
      break;
    case 'castleBed':
      b.add(SHAPES.box, 0xb388ff, 0, 0.25, 0, 2.6, 0.4, 2.6);
      b.add(SHAPES.box, 0xffffff, 0, 0.5, 0.1, 2.4, 0.16, 2.2);
      b.add(SHAPES.box, 0xff70a6, 0, 0.56, 0.5, 2.44, 0.12, 1.4);
      for (const [x, z] of [[-1.2, -1.2], [1.2, -1.2], [-1.2, 1.2], [1.2, 1.2]] as const) {
        b.add(SHAPES.can, 0xd9c8ff, x, 0.8, z, 0.4, 1.6, 0.4);
        b.add(SHAPES.cone, 0x6a4cd6, x, 1.85, z, 0.52, 0.5, 0.52);
      }
      break;
    case 'globe':
      b.add(SHAPES.can, WOOD, 0, 0.25, 0, 0.3, 0.5, 0.3);
      b.add(SHAPES.smooth, 0x3a86ff, 0, 0.8, 0, 0.6, 0.6, 0.6);
      b.add(SHAPES.ball, 0x3ecf8e, 0.12, 0.92, 0.18, 0.24, 0.2, 0.12);
      b.add(SHAPES.ball, 0x3ecf8e, -0.18, 0.7, 0.16, 0.2, 0.16, 0.1);
      break;
    case 'bench':
      b.add(SHAPES.box, WOOD, 0, 0.45, 0, 1.8, 0.1, 0.6);
      b.add(SHAPES.box, WOOD, 0, 0.8, -0.26, 1.8, 0.4, 0.08);
      for (const side of [-1, 1]) b.add(SHAPES.box, DARK_WOOD, side * 0.75, 0.22, 0, 0.1, 0.44, 0.5);
      break;
    case 'flowerpot':
      b.add(SHAPES.can, 0xe07a4d, 0, 0.2, 0, 0.5, 0.4, 0.5);
      [0xff70a6, 0xffd23f, 0x8b5cf6].forEach((color, at) => {
        b.add(SHAPES.post, 0x37b34a, -0.12 + at * 0.12, 0.55, 0, 0.04, 0.4, 0.04);
        b.add(SHAPES.ball, color, -0.12 + at * 0.12, 0.8, 0, 0.2, 0.18, 0.2);
      });
      break;
    case 'lantern':
      b.add(SHAPES.post, INK, 0, 0.7, 0, 0.1, 1.4, 0.1);
      b.add(SHAPES.box, 0xffe066, 0, 1.45, 0, 0.32, 0.36, 0.32);
      b.add(SHAPES.cone, 0xff5a5f, 0, 1.72, 0, 0.44, 0.2, 0.44);
      break;
    case 'fence':
      for (const x of [-0.8, 0, 0.8]) b.add(SHAPES.box, 0xffffff, x, 0.4, 0, 0.14, 0.8, 0.14);
      for (const y of [0.3, 0.6]) b.add(SHAPES.box, 0xffffff, 0, y, 0, 1.8, 0.1, 0.08);
      break;
    case 'swing':
      for (const side of [-1, 1]) {
        b.add(SHAPES.post, 0xff5a5f, side * 0.85, 0.8, -0.2, 0.1, 1.7, 0.1, { rx: 0.2 });
        b.add(SHAPES.post, 0xff5a5f, side * 0.85, 0.8, 0.2, 0.1, 1.7, 0.1, { rx: -0.2 });
        b.add(SHAPES.post, 0xdddddd, side * 0.25, 1.0, 0, 0.03, 1.1, 0.03);
      }
      b.add(SHAPES.post, 0xff5a5f, 0, 1.62, 0, 0.1, 1.8, 0.1, { rz: Math.PI / 2 });
      b.add(SHAPES.box, 0xffd23f, 0, 0.45, 0, 0.6, 0.06, 0.3);
      break;
    case 'picnic':
      b.add(SHAPES.box, 0xff5a5f, 0, 0.03, 0, 1.8, 0.04, 1.8);
      for (let at = 0; at < 3; at += 1) b.add(SHAPES.box, 0xffffff, -0.6 + at * 0.6, 0.05, 0, 0.3, 0.04, 1.8);
      b.add(SHAPES.box, WOOD, 0.3, 0.25, 0.2, 0.6, 0.4, 0.4);
      b.add(SHAPES.ball, 0xff6b6b, -0.4, 0.15, -0.3, 0.24, 0.24, 0.24);
      break;
    case 'truckStatue':
      truck(b, 1.6, 0x3a86ff, 0xff9f1c);
      break;
    case 'windmill':
      b.add(SHAPES.cone, 0xfff1d6, 0, 1.1, 0, 1.2, 2.2, 1.2);
      b.add(SHAPES.cone, 0xff5a5f, 0, 2.4, 0, 0.8, 0.5, 0.8);
      for (let at = 0; at < 4; at += 1) b.add(SHAPES.box, 0x8b5cf6, 0, 1.9, 0.5, 0.2, 1.6, 0.05, { rz: (at * Math.PI) / 2 + 0.4 });
      break;
    case 'dinoStatue':
      dino(b, 1.5, 0x54c762);
      break;
    case 'snowman':
      b.add(SHAPES.smooth, 0xffffff, 0, 0.32, 0, 0.7, 0.64, 0.7);
      b.add(SHAPES.smooth, 0xffffff, 0, 0.84, 0, 0.5, 0.48, 0.5);
      b.add(SHAPES.cone, 0xff9f1c, 0, 0.86, 0.3, 0.08, 0.24, 0.08, { rx: Math.PI / 2 });
      b.add(SHAPES.can, 0xff5a5f, 0, 0.66, 0, 0.52, 0.08, 0.52);
      b.add(SHAPES.ball, INK, -0.08, 0.92, 0.22, 0.06, 0.06, 0.04);
      b.add(SHAPES.ball, INK, 0.08, 0.92, 0.22, 0.06, 0.06, 0.04);
      break;
    case 'fountain':
      b.add(SHAPES.can, 0xd9d4e8, 0, 0.25, 0, 2.8, 0.5, 2.8);
      b.add(SHAPES.can, 0x4cc9f0, 0, 0.46, 0, 2.4, 0.06, 2.4);
      b.add(SHAPES.can, 0xd9d4e8, 0, 0.8, 0, 0.4, 1.2, 0.4);
      b.add(SHAPES.can, 0xd9d4e8, 0, 1.4, 0, 1.0, 0.16, 1.0);
      b.add(SHAPES.cone, 0x9fe3ff, 0, 1.75, 0, 0.5, 0.6, 0.5);
      break;
    case 'rainbowArch':
      [0xff5a5f, 0xff9f1c, 0xffd23f, 0x3ecf8e, 0x3a86ff, 0x8b5cf6].forEach((color, at) => {
        const radius = 1.4 - at * 0.12;
        for (let step = 0; step <= 8; step += 1) {
          const angle = (step / 8) * Math.PI;
          b.add(SHAPES.box, color, Math.cos(angle) * radius, Math.sin(angle) * radius * 1.1, 0, 0.32, 0.14, 0.3, { rz: angle + Math.PI / 2 });
        }
      });
      break;
    default:
      b.add(SHAPES.box, 0xdddddd, 0, 0.3, 0, 0.6, 0.6, 0.6);
  }
}

const cache = new Map<string, Builder>();

function modelOf(id: string): Builder {
  let made = cache.get(id);
  if (!made) {
    made = new Builder();
    model(made, id);
    cache.set(id, made);
  }
  return made;
}

/** Adds placed items to a builder. `height` gives the ground height under a point, and `origin` moves the whole room. */
export function addPlaced(b: Builder, placed: readonly PlacedItem[], height: (x: number, z: number) => number, originX = 0, originZ = 0): void {
  for (const entry of placed) {
    const item = furnitureById(entry.item);
    if (!item) continue;
    const [wide, deep] = footprint(item, entry.turn);
    const x = originX + entry.x + wide / 2;
    const z = originZ + entry.z + deep / 2;
    b.addGroup(modelOf(entry.item), x, height(x, z), z, -entry.turn * (Math.PI / 2));
  }
}
