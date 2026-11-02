import type { BufferGeometry } from 'three';
import type { FriendId } from '../data/friends.ts';
import { HAIRS, HAIR_COLORS, HATS, OUTFITS, OUTFIT_COLORS, SKINS, type Look } from '../data/looks.ts';
import type { Pet } from '../data/pets.ts';
import { Builder, SHAPES, shade } from './builder.ts';

const INK = 0x2b2140;
const CHEEK = 0xff8fa3;
const WHITE = 0xffffff;

function face(b: Builder, y: number, z: number, spread = 0.13, eye = 0.09): void {
  b.add(SHAPES.ball, INK, -spread, y, z, eye, eye * 1.3, eye);
  b.add(SHAPES.ball, INK, spread, y, z, eye, eye * 1.3, eye);
  b.add(SHAPES.ball, CHEEK, -spread - 0.06, y - 0.1, z - 0.03, 0.09, 0.06, 0.05);
  b.add(SHAPES.ball, CHEEK, spread + 0.06, y - 0.1, z - 0.03, 0.09, 0.06, 0.05);
  b.add(SHAPES.box, INK, 0, y - 0.13, z + 0.01, 0.1, 0.03, 0.03);
}

function hair(b: Builder, kind: string, color: number): void {
  const top = 1.38;
  switch (kind) {
    case 'short':
      b.add(SHAPES.dome, color, 0, top - 0.06, -0.03, 0.78, 0.6, 0.78);
      break;
    case 'long':
      b.add(SHAPES.dome, color, 0, top - 0.06, -0.03, 0.8, 0.62, 0.8);
      b.add(SHAPES.box, color, 0, top - 0.3, -0.22, 0.74, 0.62, 0.3);
      break;
    case 'curly':
      for (let at = 0; at < 9; at += 1) {
        const angle = (at / 9) * Math.PI * 2;
        b.add(SHAPES.ball, color, Math.cos(angle) * 0.3, top + 0.08 + (at % 2) * 0.05, Math.sin(angle) * 0.28 - 0.06, 0.3, 0.3, 0.3);
      }
      b.add(SHAPES.dome, color, 0, top + 0.02, -0.03, 0.74, 0.5, 0.74);
      break;
    case 'bun':
      b.add(SHAPES.dome, color, 0, top - 0.06, -0.03, 0.78, 0.58, 0.78);
      b.add(SHAPES.ball, color, 0, top + 0.32, -0.14, 0.32, 0.32, 0.32);
      break;
    case 'spiky':
      b.add(SHAPES.dome, color, 0, top - 0.06, -0.03, 0.76, 0.5, 0.76);
      for (let at = 0; at < 6; at += 1) {
        const angle = (at / 6) * Math.PI * 2;
        b.add(SHAPES.spike, color, Math.cos(angle) * 0.2, top + 0.22, Math.sin(angle) * 0.2 - 0.04, 0.18, 0.32, 0.18, { rx: Math.sin(angle) * 0.5, rz: -Math.cos(angle) * 0.5 });
      }
      break;
    case 'braids':
      b.add(SHAPES.dome, color, 0, top - 0.06, -0.03, 0.78, 0.6, 0.78);
      for (const side of [-1, 1]) {
        b.add(SHAPES.can, color, side * 0.38, top - 0.42, -0.02, 0.13, 0.5, 0.13);
        b.add(SHAPES.ball, 0xff6b6b, side * 0.38, top - 0.7, -0.02, 0.12, 0.12, 0.12);
      }
      break;
    default:
  }
}

function hat(b: Builder, kind: string, accent: number): void {
  const top = 1.5;
  switch (kind) {
    case 'cap':
      b.add(SHAPES.dome, accent, 0, top - 0.12, -0.02, 0.8, 0.56, 0.8);
      b.add(SHAPES.box, accent, 0, top - 0.12, 0.38, 0.5, 0.05, 0.36);
      break;
    case 'crown':
      b.add(SHAPES.can, 0xffc93c, 0, top + 0.02, -0.02, 0.56, 0.2, 0.56);
      for (let at = 0; at < 5; at += 1) {
        const angle = (at / 5) * Math.PI * 2;
        b.add(SHAPES.spike, 0xffc93c, Math.cos(angle) * 0.24, top + 0.18, Math.sin(angle) * 0.24 - 0.02, 0.14, 0.18, 0.14);
      }
      b.add(SHAPES.ball, 0xff4d6d, 0, top + 0.05, 0.27, 0.1, 0.1, 0.06);
      break;
    case 'straw':
      b.add(SHAPES.can, 0xf2d27a, 0, top - 0.1, -0.02, 1.1, 0.05, 1.1);
      b.add(SHAPES.can, 0xf2d27a, 0, top + 0.02, -0.02, 0.58, 0.24, 0.58);
      b.add(SHAPES.can, 0xff6b6b, 0, top - 0.02, -0.02, 0.6, 0.07, 0.6);
      break;
    case 'hardhat':
      b.add(SHAPES.dome, 0xffc21a, 0, top - 0.1, -0.02, 0.82, 0.6, 0.82);
      b.add(SHAPES.can, 0xffc21a, 0, top - 0.1, 0.02, 0.9, 0.04, 0.95);
      break;
    case 'wizard':
      b.add(SHAPES.can, 0x6a4cd6, 0, top - 0.1, -0.02, 1.0, 0.05, 1.0);
      b.add(SHAPES.cone, 0x6a4cd6, 0, top + 0.32, -0.02, 0.58, 0.85, 0.58, { rz: 0.15 });
      b.add(SHAPES.ball, 0xffd23f, 0.1, top + 0.3, 0.2, 0.12, 0.12, 0.05);
      break;
    case 'beanie':
      b.add(SHAPES.dome, accent, 0, top - 0.1, -0.02, 0.8, 0.62, 0.8);
      b.add(SHAPES.ball, WHITE, 0, top + 0.22, -0.02, 0.2, 0.2, 0.2);
      break;
    case 'flowers':
      for (let at = 0; at < 8; at += 1) {
        const angle = (at / 8) * Math.PI * 2;
        const petal = [0xff70a6, 0xffd23f, 0x8b5cf6, 0x3ecf8e][at % 4] ?? WHITE;
        b.add(SHAPES.ball, petal, Math.cos(angle) * 0.36, top - 0.04, Math.sin(angle) * 0.36 - 0.02, 0.16, 0.12, 0.16);
      }
      break;
    case 'pirate':
      b.add(SHAPES.box, 0x2b2140, 0, top - 0.02, -0.02, 0.95, 0.22, 0.42);
      b.add(SHAPES.dome, 0x2b2140, 0, top, -0.02, 0.62, 0.42, 0.5);
      b.add(SHAPES.ball, WHITE, 0, top + 0.05, 0.2, 0.12, 0.12, 0.05);
      break;
    default:
  }
}

/** The player, from their look. About 1.6 tiles tall. */
export function buildPlayer(look: Look): BufferGeometry {
  const b = new Builder();
  const skin = SKINS[look.skin] ?? SKINS[0] ?? 0xf7c9a0;
  const color = OUTFIT_COLORS[look.outfitColor] ?? 0x3a86ff;
  const outfit = OUTFITS[look.outfit] ?? 'tee';
  const pants = outfit === 'overalls' ? 0x3a6fd8 : outfit === 'space' ? 0xf0f4ff : outfit === 'dino' ? 0x47b85a : shade(color, -0.22);
  const shirt = outfit === 'space' ? 0xf0f4ff : outfit === 'dino' ? 0x47b85a : outfit === 'chef' ? 0xffffff : outfit === 'overalls' ? 0xfff3d6 : color;

  for (const side of [-1, 1]) {
    b.add(SHAPES.box, outfit === 'dress' ? skin : pants, side * 0.13, 0.22, 0, 0.18, 0.4, 0.2);
    b.add(SHAPES.box, 0x4a3a5a, side * 0.13, 0.04, 0.04, 0.22, 0.1, 0.3);
  }
  if (outfit === 'dress') b.add(SHAPES.cone, color, 0, 0.55, 0, 0.8, 0.6, 0.8);
  b.add(SHAPES.can, shirt, 0, 0.66, 0, 0.5, 0.5, 0.4);
  if (outfit === 'overalls') {
    b.add(SHAPES.box, 0x3a6fd8, 0, 0.62, 0.17, 0.4, 0.34, 0.08);
    b.add(SHAPES.ball, color, -0.12, 0.76, 0.22, 0.07, 0.07, 0.05);
    b.add(SHAPES.ball, color, 0.12, 0.76, 0.22, 0.07, 0.07, 0.05);
  }
  if (outfit === 'stripes') {
    for (const y of [0.52, 0.66, 0.8]) b.add(SHAPES.can, 0xffffff, 0, y, 0, 0.52, 0.05, 0.42);
  }
  if (outfit === 'dino') {
    for (const y of [0.55, 0.75, 0.95, 1.15]) b.add(SHAPES.spike, 0xffb02e, 0, y, -0.24, 0.14, 0.2, 0.14, { rx: -1.4 });
    b.add(SHAPES.cone, 0x47b85a, 0, 0.36, -0.36, 0.22, 0.5, 0.22, { rx: -1.9 });
  }
  if (outfit === 'space') {
    b.add(SHAPES.box, color, 0, 0.7, -0.26, 0.36, 0.42, 0.16);
    b.add(SHAPES.box, color, 0, 0.66, 0.2, 0.3, 0.08, 0.04);
  }
  if (outfit === 'raincoat') {
    b.add(SHAPES.cone, color, 0, 0.55, 0, 0.66, 0.5, 0.62);
    b.add(SHAPES.ball, 0xffffff, 0, 0.72, 0.21, 0.06, 0.06, 0.04);
  }
  if (outfit === 'chef') {
    b.add(SHAPES.box, color, 0, 0.52, 0.18, 0.34, 0.32, 0.06);
    for (const y of [0.66, 0.78]) b.add(SHAPES.ball, color, 0.08, y, 0.21, 0.06, 0.06, 0.04);
  }
  for (const side of [-1, 1]) {
    b.add(SHAPES.box, shirt, side * 0.33, 0.68, 0, 0.14, 0.38, 0.16, { rz: side * 0.25 });
    b.add(SHAPES.ball, skin, side * 0.39, 0.46, 0, 0.14, 0.14, 0.14);
  }
  b.add(SHAPES.smooth, skin, 0, 1.18, 0, 0.72, 0.68, 0.68);
  b.add(SHAPES.ball, skin, -0.36, 1.18, 0, 0.12, 0.16, 0.1);
  b.add(SHAPES.ball, skin, 0.36, 1.18, 0, 0.12, 0.16, 0.1);
  face(b, 1.2, 0.32);
  const hairKind = HAIRS[look.hair] ?? 'short';
  const hatKind = HATS[look.hat] ?? 'none';
  if (hatKind === 'none' || hatKind === 'flowers' || hatKind === 'crown') hair(b, hairKind, HAIR_COLORS[look.hairColor] ?? 0x6b3f22);
  else if (hairKind === 'long' || hairKind === 'braids') hair(b, hairKind, HAIR_COLORS[look.hairColor] ?? 0x6b3f22);
  hat(b, hatKind, shade(color, 0.05));
  return b.build();
}

/** The island friends: animal and silly characters, each one a single mesh. */
export function buildFriend(id: FriendId): BufferGeometry {
  const b = new Builder();
  switch (id) {
    case 'tobi':
      b.add(SHAPES.dome, 0x3f9b5a, 0, 0.32, -0.08, 1.1, 0.9, 1.1);
      for (const [x, z] of [[-0.3, -0.25], [0.3, -0.25], [0, 0.1]] as const) b.add(SHAPES.ball, 0x6cc070, x, 0.62, z - 0.08, 0.3, 0.12, 0.3);
      for (const [x, z] of [[-0.38, 0.28], [0.38, 0.28], [-0.38, -0.42], [0.38, -0.42]] as const) b.add(SHAPES.can, 0x8fd48a, x, 0.16, z, 0.2, 0.32, 0.2);
      b.add(SHAPES.box, 0x8fd48a, 0, 0.62, 0.42, 0.24, 0.5, 0.24, { rx: 0.4 });
      b.add(SHAPES.smooth, 0x8fd48a, 0, 1.0, 0.56, 0.62, 0.56, 0.56);
      face(b, 1.04, 0.82, 0.12, 0.08);
      b.add(SHAPES.can, 0xff9f1c, 0, 1.2, 0.56, 0.68, 0.08, 0.6);
      break;
    case 'moko':
      b.add(SHAPES.smooth, 0xe9a35a, 0, 0.55, 0, 1.0, 1.0, 0.9);
      b.add(SHAPES.smooth, 0xfff0d9, 0, 0.48, 0.28, 0.66, 0.7, 0.4);
      b.add(SHAPES.smooth, 0xe9a35a, 0, 1.15, 0.05, 0.8, 0.7, 0.72);
      b.add(SHAPES.ball, 0xe9a35a, -0.3, 1.5, 0, 0.24, 0.24, 0.12);
      b.add(SHAPES.ball, 0xe9a35a, 0.3, 1.5, 0, 0.24, 0.24, 0.12);
      b.add(SHAPES.ball, 0xff8fa3, 0, 1.08, 0.42, 0.1, 0.08, 0.08);
      face(b, 1.2, 0.36, 0.15, 0.08);
      b.add(SHAPES.can, 0xf2d27a, 0, 1.52, 0.05, 1.0, 0.05, 1.0);
      b.add(SHAPES.can, 0xf2d27a, 0, 1.62, 0.05, 0.5, 0.22, 0.5);
      for (const side of [-1, 1]) b.add(SHAPES.ball, 0xe9a35a, side * 0.18, 0.08, 0.2, 0.2, 0.14, 0.26);
      break;
    case 'kiki':
      b.add(SHAPES.smooth, 0xe63946, 0, 0.75, 0, 0.7, 1.0, 0.66);
      for (const side of [-1, 1]) b.add(SHAPES.smooth, 0x2fb36b, side * 0.36, 0.72, -0.05, 0.2, 0.7, 0.5, { rz: side * 0.2 });
      b.add(SHAPES.box, 0x3a86ff, 0, 0.3, -0.35, 0.3, 0.5, 0.1, { rx: -0.6 });
      b.add(SHAPES.smooth, 0xe63946, 0, 1.35, 0.05, 0.62, 0.6, 0.6);
      b.add(SHAPES.cone, 0xffc93c, 0, 1.28, 0.4, 0.2, 0.3, 0.2, { rx: 1.9 });
      face(b, 1.42, 0.3, 0.16, 0.08);
      for (const angle of [-0.4, 0, 0.4]) b.add(SHAPES.box, 0xffc93c, Math.sin(angle) * 0.12, 1.72, 0, 0.06, 0.28, 0.06, { rz: angle });
      for (const side of [-1, 1]) b.add(SHAPES.box, 0xffa94d, side * 0.14, 0.12, 0.08, 0.08, 0.26, 0.2);
      break;
    case 'gogo':
      b.add(SHAPES.smooth, 0xf6f1ea, 0, 0.62, 0, 0.9, 0.9, 0.8);
      b.add(SHAPES.box, 0xff9ec4, 0, 0.6, 0.32, 0.56, 0.5, 0.06);
      for (const side of [-1, 1]) b.add(SHAPES.can, 0xd9cfc2, side * 0.22, 0.14, 0, 0.18, 0.3, 0.18);
      b.add(SHAPES.smooth, 0xf6f1ea, 0, 1.18, 0.12, 0.62, 0.7, 0.62);
      b.add(SHAPES.cone, 0xd9cfc2, 0, 0.86, 0.32, 0.14, 0.24, 0.12, { rx: Math.PI });
      for (const side of [-1, 1]) {
        b.add(SHAPES.cone, 0xc9a26b, side * 0.18, 1.56, 0, 0.12, 0.34, 0.12, { rz: -side * 0.5 });
        b.add(SHAPES.smooth, 0xf6f1ea, side * 0.38, 1.24, 0.08, 0.32, 0.12, 0.16, { rz: side * 0.3 });
      }
      face(b, 1.22, 0.4, 0.14, 0.08);
      b.add(SHAPES.can, 0xffffff, 0, 1.56, 0.08, 0.6, 0.3, 0.6);
      b.add(SHAPES.smooth, 0xffffff, 0, 1.78, 0.08, 0.8, 0.4, 0.8);
      break;
    case 'nino':
      b.add(SHAPES.smooth, 0x58c25a, 0, 0.42, 0, 1.1, 0.8, 0.95);
      b.add(SHAPES.smooth, 0xc5f07c, 0, 0.36, 0.3, 0.7, 0.5, 0.36);
      for (const side of [-1, 1]) {
        b.add(SHAPES.smooth, 0x58c25a, side * 0.28, 0.86, 0.1, 0.36, 0.36, 0.36);
        b.add(SHAPES.ball, 0xffffff, side * 0.28, 0.9, 0.24, 0.24, 0.24, 0.12);
        b.add(SHAPES.ball, 0x2b2140, side * 0.28, 0.9, 0.3, 0.12, 0.14, 0.06);
        b.add(SHAPES.smooth, 0x58c25a, side * 0.42, 0.08, 0.32, 0.36, 0.1, 0.3);
      }
      b.add(SHAPES.box, 0x2b2140, 0, 0.56, 0.47, 0.42, 0.04, 0.04);
      b.add(SHAPES.ball, 0xff8fa3, -0.34, 0.6, 0.42, 0.12, 0.08, 0.05);
      b.add(SHAPES.ball, 0xff8fa3, 0.34, 0.6, 0.42, 0.12, 0.08, 0.05);
      b.add(SHAPES.can, 0x18b7c9, 0, 0.98, 0.1, 0.5, 0.06, 0.5);
      break;
    case 'bibo':
      b.add(SHAPES.can, 0xfff1d6, 0, 0.5, 0, 0.6, 1.0, 0.6);
      face(b, 0.66, 0.31, 0.12, 0.08);
      b.add(SHAPES.dome, 0xe63946, 0, 0.98, 0, 1.5, 1.0, 1.5);
      for (let at = 0; at < 7; at += 1) {
        const angle = (at / 7) * Math.PI * 2;
        b.add(SHAPES.ball, 0xffffff, Math.cos(angle) * 0.46, 1.18, Math.sin(angle) * 0.46, 0.2, 0.1, 0.2);
      }
      b.add(SHAPES.ball, 0xffffff, 0, 1.46, 0, 0.26, 0.12, 0.26);
      for (const side of [-1, 1]) b.add(SHAPES.ball, 0xfff1d6, side * 0.36, 0.48, 0.05, 0.16, 0.16, 0.16);
      break;
    case 'zuzu':
      b.add(SHAPES.smooth, 0xffd23f, 0, 0.75, 0, 0.95, 0.95, 0.95);
      for (const y of [0.6, 0.85]) b.add(SHAPES.can, 0x2b2140, 0, y, 0, 0.92, 0.1, 0.92);
      b.add(SHAPES.smooth, 0xffd23f, 0, 1.32, 0.1, 0.62, 0.6, 0.6);
      face(b, 1.36, 0.4, 0.13, 0.08);
      for (const side of [-1, 1]) {
        b.add(SHAPES.smooth, 0xeaf7ff, side * 0.5, 1.02, -0.2, 0.46, 0.7, 0.12, { rz: side * 0.6 });
        b.add(SHAPES.box, 0x2b2140, side * 0.12, 1.75, 0.1, 0.04, 0.3, 0.04, { rz: -side * 0.3 });
        b.add(SHAPES.ball, 0x2b2140, side * 0.18, 1.9, 0.1, 0.1, 0.1, 0.1);
      }
      b.add(SHAPES.cone, 0x2b2140, 0, 0.7, -0.5, 0.14, 0.2, 0.14, { rx: -1.6 });
      break;
    default:
      b.add(SHAPES.smooth, 0x34405e, 0, 0.66, 0, 0.92, 1.18, 0.86);
      b.add(SHAPES.smooth, 0xffffff, 0, 0.6, 0.18, 0.66, 0.92, 0.56);
      b.add(SHAPES.smooth, 0x34405e, 0, 1.32, 0, 0.66, 0.6, 0.62);
      b.add(SHAPES.smooth, 0xffffff, 0, 1.3, 0.14, 0.46, 0.4, 0.4);
      face(b, 1.36, 0.32, 0.12, 0.08);
      b.add(SHAPES.cone, 0xffa928, 0, 1.24, 0.42, 0.16, 0.22, 0.14, { rx: 1.7 });
      b.add(SHAPES.can, 0xe63946, 0, 1.06, 0, 0.74, 0.12, 0.7);
      b.add(SHAPES.box, 0xe63946, 0.2, 0.86, 0.3, 0.14, 0.34, 0.06);
      for (const side of [-1, 1]) {
        b.add(SHAPES.smooth, 0x34405e, side * 0.46, 0.7, 0, 0.14, 0.62, 0.32, { rz: side * 0.25 });
        b.add(SHAPES.smooth, 0xffa928, side * 0.16, 0.06, 0.16, 0.24, 0.08, 0.32);
      }
  }
  return b.build();
}

/** A small pet, about half a tile tall. */
export function buildPet(pet: Pet): BufferGeometry {
  const b = new Builder();
  const { body, belly, snout } = pet;
  const bird = pet.id === 'duckling' || pet.id === 'chick';
  if (bird) {
    b.add(SHAPES.smooth, body, 0, 0.3, 0, 0.5, 0.5, 0.56);
    b.add(SHAPES.smooth, belly, 0, 0.28, 0.12, 0.36, 0.38, 0.3);
    b.add(SHAPES.smooth, body, 0, 0.64, 0.06, 0.38, 0.36, 0.36);
    b.add(SHAPES.cone, snout, 0, 0.6, 0.28, 0.12, 0.18, 0.1, { rx: 1.7 });
    for (const side of [-1, 1]) {
      b.add(SHAPES.smooth, body, side * 0.26, 0.34, -0.02, 0.1, 0.3, 0.3, { rz: side * 0.3 });
      b.add(SHAPES.smooth, snout, side * 0.1, 0.04, 0.08, 0.14, 0.05, 0.2);
    }
    face(b, 0.68, 0.2, 0.08, 0.05);
    return b.build();
  }
  b.add(SHAPES.smooth, body, 0, 0.3, -0.04, 0.46, 0.4, 0.66);
  b.add(SHAPES.smooth, belly, 0, 0.26, 0.04, 0.32, 0.26, 0.5);
  for (const [x, z] of [[-0.14, 0.18], [0.14, 0.18], [-0.14, -0.24], [0.14, -0.24]] as const) b.add(SHAPES.can, body, x, 0.1, z, 0.12, 0.2, 0.12);
  b.add(SHAPES.smooth, body, 0, 0.58, 0.28, 0.46, 0.42, 0.42);
  b.add(SHAPES.smooth, belly, 0, 0.52, 0.46, 0.24, 0.18, 0.12);
  b.add(SHAPES.ball, snout, 0, 0.56, 0.52, 0.09, 0.07, 0.06);
  face(b, 0.62, 0.46, 0.1, 0.06);
  switch (pet.ears) {
    case 'cat':
      for (const side of [-1, 1]) b.add(SHAPES.spike, body, side * 0.14, 0.82, 0.26, 0.16, 0.18, 0.1);
      b.add(SHAPES.can, body, 0, 0.5, -0.4, 0.07, 0.4, 0.07, { rx: 0.5 });
      break;
    case 'dog':
      for (const side of [-1, 1]) b.add(SHAPES.smooth, shadeEar(body), side * 0.24, 0.58, 0.26, 0.1, 0.28, 0.16, { rz: side * 0.3 });
      b.add(SHAPES.can, body, 0, 0.44, -0.38, 0.08, 0.26, 0.08, { rx: -0.6 });
      break;
    case 'bunny':
      for (const side of [-1, 1]) b.add(SHAPES.smooth, body, side * 0.09, 0.94, 0.24, 0.1, 0.42, 0.08, { rz: side * 0.12 });
      b.add(SHAPES.ball, 0xffffff, 0, 0.34, -0.38, 0.16, 0.16, 0.16);
      break;
    case 'pig':
      for (const side of [-1, 1]) b.add(SHAPES.spike, body, side * 0.16, 0.8, 0.26, 0.14, 0.12, 0.08, { rx: 0.4 });
      b.add(SHAPES.can, snout, 0, 0.54, 0.5, 0.16, 0.08, 0.16, { rx: Math.PI / 2 });
      break;
    case 'horse':
      for (const side of [-1, 1]) b.add(SHAPES.spike, body, side * 0.12, 0.84, 0.22, 0.1, 0.16, 0.08);
      b.add(SHAPES.cone, 0xffd23f, 0, 0.9, 0.36, 0.08, 0.26, 0.08, { rx: 0.5 });
      for (const [y, color] of [[0.78, 0xff70a6], [0.66, 0x8b5cf6], [0.54, 0x3a86ff]] as const) b.add(SHAPES.box, color, 0, y, 0.12, 0.08, 0.14, 0.18);
      b.add(SHAPES.box, 0xff70a6, 0, 0.4, -0.42, 0.08, 0.3, 0.08, { rx: 0.4 });
      break;
    default:
      if (pet.id === 'dino') {
        for (const z of [0.14, -0.06, -0.26]) b.add(SHAPES.spike, 0xffb02e, 0, 0.56, z, 0.12, 0.16, 0.12);
        b.add(SHAPES.cone, body, 0, 0.3, -0.48, 0.16, 0.4, 0.16, { rx: -1.7 });
      }
  }
  return b.build();
}

function shadeEar(color: number): number {
  return shade(color, -0.12);
}
