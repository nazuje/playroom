import {
  AdditiveBlending,
  BufferGeometry,
  CircleGeometry,
  Color,
  DirectionalLight,
  DoubleSide,
  Float32BufferAttribute,
  Fog,
  HemisphereLight,
  InstancedMesh,
  type Material,
  Mesh,
  MeshBasicMaterial,
  MeshLambertMaterial,
  Object3D,
  PlaneGeometry,
  Points,
  PointsMaterial,
  Raycaster,
  Vector2,
  Vector3,
} from 'three';
import type { Stage } from '@playroom/stage3d';
import { collectibleById } from '../data/collection.ts';
import { cropById } from '../data/crops.ts';
import { FRIENDS, type FriendId } from '../data/friends.ts';
import { furnitureById, ROOM, type Room } from '../data/furniture.ts';
import type { Look } from '../data/looks.ts';
import { PLACES, PLOT_SPOTS, PLAZA } from '../data/map.ts';
import { petById, type PetId } from '../data/pets.ts';
import { lightAt } from '../rules/daylight.ts';
import { DOOR, footprint } from '../rules/decor.ts';
import { plotStage } from '../rules/garden.ts';
import type { ScreenSpot } from '../rules/picking.ts';
import { onSnowIsle, type Play } from '../rules/play.ts';
import { bridgeOpen, islandLevel } from '../rules/quests.ts';
import type { PlacedItem } from '../rules/state.ts';
import { targetId, type Target } from '../rules/target.ts';
import { heightAt, type World } from '../rules/world.ts';
import { Builder, SHAPES, shade, toy } from './builder.ts';
import { addPlaced } from './furniture.ts';
import { buildBoat, buildBridge, buildBridgeSoon, buildGround, buildNature, buildTown } from './island.ts';
import { buildFriend, buildPet, buildPlayer } from './people.ts';

/** The house's inside and the dressing-up corner sit far out at sea, past the fog, so they need no scene of their own. */
const ROOM_AT = { x: -400, z: 300 };
const STUDIO = { x: -400, z: -300 };
const CAMERA_LIFT = 14;
const CAMERA_BACK = 12.5;
const MOST_SHADOWS = 32;
const RAIN_DROPS = 260;
const SPARKS = 48;

export type CameraMode = 'backdrop' | 'follow' | 'house' | 'studio';

export interface Spot extends ScreenSpot {
  target: Target | null;
  /** False when it is off the edge of the screen. */
  on: boolean;
  /** Its tile, for walking towards it while it's out of sight. */
  tileX: number;
  tileZ: number;
  /** A placed decoration, when the spot is one. */
  uid?: number;
}

export interface View {
  /** Starts drawing this island, or the empty island behind the menus when null. */
  show(play: Play | null): void;
  setCamera(mode: CameraMode): void;
  /** The look on the dressing-up stand. */
  dressStand(look: Look): void;
  update(seconds: number): void;
  /** Everything tappable, in screen pixels, with `on` false for whatever is off screen. */
  spots(): Spot[];
  /** Placed decorations on screen, for picking one to move. */
  decorSpots(room: Room): Spot[];
  /** Where on the ground a screen point lands, in tiles: rounding down gives the tile. */
  groundAt(x: number, y: number): { x: number; z: number } | null;
  /** Which floor tile of the house a screen point lands on. */
  floorAt(x: number, y: number): { x: number; z: number } | null;
  /** Where a tile-space point is on screen, for confetti and the marker arrow. */
  screenOf(x: number, z: number, lift?: number): { x: number; y: number; on: boolean };
  playerOnScreen(): { x: number; y: number };
  setMarker(target: Target | null): void;
  tapRing(x: number, z: number): void;
  /** Highlights one placed decoration. */
  select(room: Room, uid: number | null): void;
  /** Forces the next frame to rebuild garden, finds and decorations. */
  refresh(): void;
  drawCalls(): number;
}

interface Anchor {
  x: number;
  y: number;
  z: number;
  radius: number;
}

const tint = new Color();
const scratch = new Vector3();
const scratch2 = new Vector3();
const dummy = new Object3D();
const raycaster = new Raycaster();
const pointer = new Vector2();

function crop(b: Builder, id: string, stage: string, x: number, y: number, z: number): void {
  const info = cropById(id as never);
  const leaf = info.leaf;
  if (stage === 'seed') {
    b.add(SHAPES.dome, 0x7a4f2e, x, y, z, 0.5, 0.3, 0.5);
    b.add(SHAPES.ball, leaf, x, y + 0.16, z, 0.12, 0.12, 0.12);
    return;
  }
  const big = stage === 'ripe' ? 1.25 : stage === 'leafy' ? 1 : 0.55;
  for (let at = 0; at < (stage === 'sprout' ? 2 : 5); at += 1) {
    const angle = (at / 5) * Math.PI * 2 + 0.3;
    b.add(SHAPES.smooth, leaf, x + Math.cos(angle) * 0.18 * big, y + 0.3 * big, z + Math.sin(angle) * 0.18 * big, 0.22 * big, 0.55 * big, 0.12 * big, { rx: Math.sin(angle) * 0.5, rz: -Math.cos(angle) * 0.5 });
  }
  if (stage !== 'ripe') return;
  const fruit = info.fruit;
  switch (id) {
    case 'carrot':
      b.add(SHAPES.cone, fruit, x, y + 0.05, z, 0.42, 0.5, 0.42, { rx: Math.PI });
      break;
    case 'strawberry':
    case 'tomato':
      for (let at = 0; at < 4; at += 1) b.add(SHAPES.ball, fruit, x + Math.cos(at * 1.6) * 0.32, y + 0.22 + (at % 2) * 0.16, z + Math.sin(at * 1.6) * 0.32, 0.26, 0.28, 0.26);
      break;
    case 'corn':
      for (const dx of [-0.2, 0.2]) {
        b.add(SHAPES.can, fruit, x + dx, y + 0.75, z, 0.22, 0.7, 0.22);
        b.add(SHAPES.cone, leaf, x + dx, y + 0.65, z + 0.1, 0.24, 0.8, 0.12);
      }
      break;
    case 'pumpkin':
      b.add(SHAPES.smooth, fruit, x, y + 0.32, z + 0.1, 0.9, 0.62, 0.8);
      b.add(SHAPES.post, 0x5a8a2a, x, y + 0.7, z + 0.1, 0.08, 0.2, 0.08);
      break;
    default:
      b.add(SHAPES.smooth, fruit, x, y + 0.3, z + 0.1, 0.95, 0.6, 0.7);
      for (const dx of [-0.2, 0.2]) b.add(SHAPES.box, shade(fruit, -0.15), x + dx, y + 0.32, z + 0.1, 0.06, 0.55, 0.72);
  }
}

function find(b: Builder, id: string, x: number, y: number, z: number): void {
  const item = collectibleById(id);
  if (!item) return;
  const color = item.color;
  if (item.category === 'shell') {
    if (id === 'shell-star') {
      for (let point = 0; point < 5; point += 1) b.add(SHAPES.spike, color, x + Math.sin((point / 5) * Math.PI * 2) * 0.16, y + 0.06, z - Math.cos((point / 5) * Math.PI * 2) * 0.16, 0.16, 0.06, 0.34, { ry: (-point / 5) * Math.PI * 2 });
    } else if (id === 'shell-crab') {
      b.add(SHAPES.smooth, color, x, y + 0.14, z, 0.5, 0.26, 0.4);
      for (const side of [-1, 1]) b.add(SHAPES.ball, color, x + side * 0.32, y + 0.2, z + 0.16, 0.18, 0.16, 0.16);
      b.add(SHAPES.ball, 0x2b2140, x - 0.08, y + 0.3, z + 0.14, 0.06, 0.08, 0.06);
      b.add(SHAPES.ball, 0x2b2140, x + 0.08, y + 0.3, z + 0.14, 0.06, 0.08, 0.06);
    } else {
      b.add(SHAPES.cone, color, x, y + 0.16, z, 0.5, 0.42, 0.34, { rx: -1.1 });
      b.add(SHAPES.ball, shade(color, 0.12), x, y + 0.1, z + 0.12, 0.3, 0.14, 0.12);
    }
    return;
  }
  if (item.category === 'flower') {
    b.add(SHAPES.post, 0x3a9a3a, x, y + 0.25, z, 0.06, 0.5, 0.06);
    for (let petal = 0; petal < 5; petal += 1) {
      const angle = (petal / 5) * Math.PI * 2;
      b.add(SHAPES.ball, color, x + Math.cos(angle) * 0.17, y + 0.55, z + Math.sin(angle) * 0.17, 0.22, 0.12, 0.22);
    }
    b.add(SHAPES.ball, 0xffd23f, x, y + 0.57, z, 0.16, 0.12, 0.16);
    return;
  }
  const lift = y + 0.45;
  if (id.includes('fly') || id === 'bug-golden') {
    const wing = id === 'bug-golden' ? 1.5 : 1;
    b.add(SHAPES.can, 0x2b2140, x, lift, z, 0.08, 0.36, 0.08, { rx: Math.PI / 2 });
    for (const side of [-1, 1]) {
      b.add(SHAPES.smooth, color, x + side * 0.22 * wing, lift + 0.06, z - 0.05, 0.38 * wing, 0.05, 0.3 * wing, { rz: side * 0.4 });
      b.add(SHAPES.smooth, shade(color, -0.1), x + side * 0.16 * wing, lift + 0.02, z + 0.14, 0.26 * wing, 0.05, 0.2 * wing, { rz: side * 0.4 });
    }
    return;
  }
  b.add(SHAPES.smooth, color, x, y + 0.14, z, 0.4, 0.26, 0.48);
  b.add(SHAPES.ball, 0x2b2140, x, y + 0.16, z + 0.24, 0.2, 0.18, 0.16);
  if (id === 'bug-ladybird' || id === 'bug-beetle') for (const [dx, dz] of [[-0.1, 0], [0.1, -0.08], [0.06, 0.1]] as const) b.add(SHAPES.ball, 0x2b2140, x + dx, y + 0.26, z + dz, 0.08, 0.05, 0.08);
  if (id === 'bug-bee') for (const dz of [-0.06, 0.08]) b.add(SHAPES.box, 0x2b2140, x, y + 0.15, z + dz, 0.42, 0.28, 0.05);
  if (id === 'bug-snail') b.add(SHAPES.smooth, 0xf0b27a, x, y + 0.32, z - 0.06, 0.34, 0.36, 0.3);
}

function roomShell(): BufferGeometry {
  const b = new Builder();
  for (let z = 0; z < ROOM.depth; z += 1) {
    for (let x = 0; x < ROOM.width; x += 1) b.add(SHAPES.box, (x + z) % 2 ? 0xffe3b8 : 0xf8d29c, x + 0.5, -0.05, z + 0.5, 1, 0.1, 1);
  }
  b.add(SHAPES.box, 0x9fdcff, ROOM.width / 2, 1.2, -0.15, ROOM.width + 0.6, 2.6, 0.3);
  b.add(SHAPES.box, 0x8fd0f5, -0.15, 0.7, ROOM.depth / 2, 0.3, 1.6, ROOM.depth);
  b.add(SHAPES.box, 0x8fd0f5, ROOM.width + 0.15, 0.7, ROOM.depth / 2, 0.3, 1.6, ROOM.depth);
  for (const x of [2, ROOM.width - 2]) {
    b.add(SHAPES.box, 0xffffff, x, 1.5, 0.02, 1.4, 1.1, 0.06);
    b.add(SHAPES.box, 0xbfe9ff, x, 1.5, 0.06, 1.2, 0.9, 0.04);
  }
  b.add(SHAPES.box, 0xff9f1c, DOOR.x + 0.5, 0.02, ROOM.depth + 0.1, 1.4, 0.06, 0.6);
  b.add(SHAPES.box, 0x2b2140, ROOM.width / 2, -0.4, ROOM.depth / 2, ROOM.width + 3, 0.6, ROOM.depth + 3);
  return b.build();
}

function studioStand(): BufferGeometry {
  const b = new Builder();
  b.add(SHAPES.can, 0xffffff, 0, -0.1, 0, 2.6, 0.2, 2.6);
  b.add(SHAPES.can, 0x8b5cf6, 0, -0.25, 0, 2.9, 0.2, 2.9);
  for (let at = 0; at < 10; at += 1) {
    const angle = (at / 10) * Math.PI * 2;
    b.add(SHAPES.ball, [0xffd23f, 0xff70a6, 0x3ecf8e, 0x4cb8ff][at % 4] ?? 0xffffff, Math.cos(angle) * 1.45, 0.02, Math.sin(angle) * 1.45, 0.2, 0.2, 0.2);
  }
  return b.build();
}

function questStar(): BufferGeometry {
  const b = new Builder();
  b.add(SHAPES.smooth, 0xffd23f, 0, 0, 0, 0.7, 0.7, 0.3);
  for (let point = 0; point < 5; point += 1) {
    const angle = (point / 5) * Math.PI * 2;
    b.add(SHAPES.cone, 0xffc21a, Math.sin(angle) * 0.5, Math.cos(angle) * 0.5, 0, 0.42, 0.6, 0.3, { rz: -angle });
  }
  b.add(SHAPES.cone, 0xff7a59, 0, -1.0, 0, 0.6, 0.6, 0.6, { rx: Math.PI });
  return b.build();
}

function rainbowArc(): BufferGeometry {
  const b = new Builder();
  [0xff5a5f, 0xff9f1c, 0xffd23f, 0x3ecf8e, 0x4cb8ff, 0x8b5cf6].forEach((color, band) => {
    const radius = 9 - band * 0.55;
    for (let step = 0; step < 24; step += 1) {
      const angle = ((step + 0.5) / 24) * Math.PI;
      b.add(SHAPES.box, color, Math.cos(angle) * radius, Math.sin(angle) * radius, 0, 0.55, 1.25, 0.1, { rz: angle });
    }
  });
  return b.build();
}

function paradeFloats(): BufferGeometry {
  const b = new Builder();
  const colors = [0xff5a5f, 0x3a86ff, 0xffd23f, 0x3ecf8e, 0x8b5cf6, 0xff9f1c];
  colors.forEach((color, at) => {
    const z = -at * 1.6;
    b.add(SHAPES.box, color, 0, 0.35, z, 0.9, 0.5, 1.2);
    for (const side of [-1, 1]) for (const dz of [-0.4, 0.4]) b.add(SHAPES.can, 0x2b2140, side * 0.48, 0.15, z + dz, 0.3, 0.1, 0.3, { rz: Math.PI / 2 });
    b.add(SHAPES.post, 0xffffff, 0, 1.0, z, 0.04, 1.0, 0.04);
    b.add(SHAPES.smooth, colors[(at + 2) % colors.length] ?? 0xffffff, 0, 1.7, z, 0.55, 0.65, 0.55);
    if (at % 2) b.add(SHAPES.spike, 0xffd23f, 0, 0.9, z, 0.5, 0.6, 0.5);
    else b.add(SHAPES.ball, 0xffffff, 0, 0.75, z, 0.4, 0.4, 0.4);
  });
  return b.build();
}

function whale(): BufferGeometry {
  const b = new Builder();
  b.add(SHAPES.smooth, 0x4a6fd8, 0, 0, 0, 2.6, 1.4, 4.4);
  b.add(SHAPES.smooth, 0xd9e8ff, 0, -0.3, 0.6, 2.0, 0.8, 3.0);
  b.add(SHAPES.box, 0x4a6fd8, 0, 0.2, -2.6, 2.2, 0.2, 0.8, { rx: 0.3 });
  b.add(SHAPES.ball, 0x2b2140, -0.9, 0.2, 1.4, 0.2, 0.24, 0.2);
  b.add(SHAPES.ball, 0x2b2140, 0.9, 0.2, 1.4, 0.2, 0.24, 0.2);
  for (const [dx, dy] of [[0, 1.4], [-0.3, 1.9], [0.3, 1.9], [0, 2.3]] as const) b.add(SHAPES.ball, 0xe8f8ff, dx, dy, 0.8, 0.4, 0.4, 0.4);
  return b.build();
}

function clouds(): BufferGeometry {
  const b = new Builder();
  for (let at = 0; at < 9; at += 1) {
    const x = (at * 37) % 110;
    const z = (at * 23) % 80;
    for (let puff = 0; puff < 4; puff += 1) b.add(SHAPES.ball, 0xffffff, x + puff * 1.3, 0.2 * (puff % 2), z + (puff % 2) * 0.6, 2.2 - (puff % 3) * 0.4, 1.2, 1.8);
  }
  return b.build();
}

export function createView(stage: Stage, world: World, calm: () => boolean): View {
  const { scene, camera, renderer } = stage;
  const hemi = new HemisphereLight(0xffffff, 0x88aa66, 1.7);
  const sun = new DirectionalLight(0xffffff, 2);
  scene.add(hemi, sun, sun.target);
  scene.fog = new Fog(0xbfeeff, 40, 105);
  scene.background = new Color(0x8fdcff);

  const add = (geometry: BufferGeometry, material: Material = toy): Mesh => {
    const mesh = new Mesh(geometry, material);
    mesh.matrixAutoUpdate = true;
    scene.add(mesh);
    return mesh;
  };

  const seaMaterial = new MeshLambertMaterial({ color: 0x22c7d8 });
  const sea = add(new PlaneGeometry(1400, 1400).rotateX(-Math.PI / 2), seaMaterial);
  sea.position.set(56, -0.06, 42);
  add(buildGround(world));
  add(buildNature(world));
  const town = buildTown(world);
  add(town.solid);
  const glowMaterial = new MeshBasicMaterial({ vertexColors: true, color: 0x9fd8ff });
  add(town.glow, glowMaterial);
  const bridge = add(buildBridge());
  const bridgeSoon = add(buildBridgeSoon());
  const boat = add(buildBoat());
  const cloudMaterial = new MeshLambertMaterial({ vertexColors: true, flatShading: true, transparent: true, opacity: 0.85 });
  const sky = add(clouds(), cloudMaterial);
  sky.position.y = 9;

  const garden = add(new BufferGeometry());
  const finds = add(new BufferGeometry());
  const outdoor = add(new BufferGeometry());

  const sparkMaterial = new MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.9 });
  const sparks = new InstancedMesh(SHAPES.spike, sparkMaterial, SPARKS);
  sparks.count = 0;
  scene.add(sparks);

  const shadowMaterial = new MeshBasicMaterial({ color: 0x1b2a3a, transparent: true, opacity: 0.2, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 });
  const shadows = new InstancedMesh(new CircleGeometry(0.5, 16).rotateX(-Math.PI / 2), shadowMaterial, MOST_SHADOWS);
  shadows.count = 0;
  shadows.renderOrder = 1;
  scene.add(shadows);

  const friendMeshes = new Map<FriendId, Mesh>();
  for (const friend of FRIENDS) {
    const mesh = add(buildFriend(friend.id));
    mesh.position.set(friend.x + 0.5, heightAt(world, friend.x + 0.5, friend.z + 0.5), friend.z + 0.5);
    mesh.rotation.y = friend.facing;
    mesh.scale.setScalar(1.15);
    friendMeshes.set(friend.id, mesh);
  }

  const player = add(new BufferGeometry());
  const petGeometry = new Map<PetId, BufferGeometry>();
  const petMeshes: Mesh[] = [];

  const markerMaterial = new MeshBasicMaterial({ vertexColors: true, fog: false });
  const marker = add(questStar(), markerMaterial);
  marker.visible = false;
  const ringMaterial = new MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.8, side: DoubleSide, depthWrite: false });
  const ring = add(new CircleGeometry(0.6, 24, 0, Math.PI * 2).rotateX(-Math.PI / 2), ringMaterial);
  ring.visible = false;
  const markRingMaterial = new MeshBasicMaterial({ color: 0xffd23f, transparent: true, opacity: 0.55, depthWrite: false });
  const markRing = add(new CircleGeometry(1, 28).rotateX(-Math.PI / 2), markRingMaterial);
  markRing.visible = false;

  const rainMaterial = new MeshBasicMaterial({ color: 0xdff4ff, transparent: true, opacity: 0.7 });
  const rain = new InstancedMesh(SHAPES.box, rainMaterial, RAIN_DROPS);
  rain.visible = false;
  scene.add(rain);
  const drops = Array.from({ length: RAIN_DROPS }, (_, at) => ({ x: ((at * 7.31) % 30) - 15, y: (at * 3.7) % 14, z: ((at * 5.17) % 30) - 15 }));
  const arcMaterial = new MeshBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.6, depthWrite: false, fog: false });
  const arc = add(rainbowArc(), arcMaterial);
  arc.visible = false;
  const starMaterial = new MeshBasicMaterial({ color: 0xfff6c0, transparent: true, opacity: 1, blending: AdditiveBlending, depthWrite: false, fog: false });
  const shootingStar = add(new Builder().add(SHAPES.ball, 0xffffff, 0, 0, 0, 0.6, 0.6, 0.6).add(SHAPES.cone, 0xffffff, -1.6, 0, 0, 0.3, 3, 0.3, { rz: Math.PI / 2 }).build(), starMaterial);
  shootingStar.visible = false;
  const parade = add(paradeFloats());
  parade.visible = false;
  const whaleMesh = add(whale());
  whaleMesh.visible = false;
  let whaleSpot: { x: number; z: number } | null = null;

  const fireflyGeometry = new BufferGeometry();
  const fireflySpots = Array.from({ length: 60 }, (_, at) => [((at * 13.7) % 34) - 17, 1 + ((at * 2.3) % 6), ((at * 9.1) % 26) - 16]).flat();
  fireflyGeometry.setAttribute('position', new Float32BufferAttribute(fireflySpots, 3));
  const fireflyMaterial = new PointsMaterial({ color: 0xfff3a0, size: 0.35, transparent: true, opacity: 0, depthWrite: false, blending: AdditiveBlending });
  const fireflies = new Points(fireflyGeometry, fireflyMaterial);
  scene.add(fireflies);

  const roomShellMesh = add(roomShell());
  roomShellMesh.position.set(ROOM_AT.x, 0, ROOM_AT.z);
  const homeItems = add(new BufferGeometry());
  const pickedMaterial = new MeshBasicMaterial({ color: 0x3ecf8e, transparent: true, opacity: 0.45, depthWrite: false });
  const picked = add(new PlaneGeometry(1, 1).rotateX(-Math.PI / 2), pickedMaterial);
  picked.visible = false;
  const studio = add(studioStand());
  studio.position.set(STUDIO.x, 0, STUDIO.z);
  const standPlayer = add(new BufferGeometry());
  standPlayer.position.set(STUDIO.x, 0, STUDIO.z);

  let play: Play | null = null;
  let mode: CameraMode = 'backdrop';
  let time = 0;
  let marked: Target | null = null;
  let ringLeft = 0;
  let lookKey = '';
  let standKey = '';
  let gardenKey = '';
  let findsKey = '';
  let outdoorKey = '';
  let homeKey = '';
  let selected: { room: Room; uid: number } | null = null;
  const cameraAt = new Vector3(56, 50, 90);
  const lookAt = new Vector3(48, 0, 46);
  let snapCamera = true;
  let turnFacing = 0;

  const ground = (x: number, z: number): number => heightAt(world, x, z);

  function placeShadow(at: number, x: number, y: number, z: number, size: number): number {
    if (at >= MOST_SHADOWS) return at;
    dummy.position.set(x, y + 0.03, z);
    dummy.rotation.set(0, 0, 0);
    dummy.scale.set(size, 1, size);
    dummy.updateMatrix();
    shadows.setMatrixAt(at, dummy.matrix);
    return at + 1;
  }

  function rebuild(mesh: Mesh, builder: Builder): void {
    mesh.geometry.dispose();
    mesh.geometry = builder.build();
  }

  function refreshGarden(current: Play): void {
    const key = current.island.plots.map((plot) => `${plot.crop}:${plotStage(plot)}:${plot.watered}`).join('|');
    if (key === gardenKey) return;
    gardenKey = key;
    const b = new Builder();
    current.island.plots.forEach((plot, index) => {
      const [px = 0, pz = 0] = PLOT_SPOTS[index] ?? [];
      const x = px + 0.5;
      const z = pz + 0.4;
      const y = ground(x, z);
      b.add(SHAPES.box, plot.watered && plot.crop ? 0x6e4528 : 0x95623a, x, y + 0.1, z, 2.2, 0.26, 1.4);
      b.add(SHAPES.box, 0xc98d55, x, y + 0.12, z + 0.74, 2.3, 0.2, 0.1);
      b.add(SHAPES.box, 0xc98d55, x, y + 0.12, z - 0.74, 2.3, 0.2, 0.1);
      if (plot.crop) {
        const stage = plotStage(plot);
        for (const dx of [-0.55, 0.55]) crop(b, plot.crop, stage, x + dx, y + 0.22, z);
      }
    });
    rebuild(garden, b);
  }

  function refreshFinds(current: Play): void {
    const key = current.finds.list.map((item) => item.uid).join(',');
    if (key === findsKey) return;
    findsKey = key;
    const b = new Builder();
    for (const item of current.finds.list) find(b, item.item, item.x + 0.5, ground(item.x + 0.5, item.z + 0.5), item.z + 0.5);
    rebuild(finds, b);
  }

  function placedKey(list: readonly PlacedItem[]): string {
    return list.map((item) => `${item.uid}:${item.item}:${item.x}:${item.z}:${item.turn}`).join('|');
  }

  function refreshDecor(current: Play): void {
    const outKey = placedKey(current.island.outdoor);
    if (outKey !== outdoorKey) {
      outdoorKey = outKey;
      const b = new Builder();
      addPlaced(b, current.island.outdoor, ground);
      rebuild(outdoor, b);
    }
    const inKey = placedKey(current.island.home);
    if (inKey !== homeKey) {
      homeKey = inKey;
      const b = new Builder();
      addPlaced(b, current.island.home, () => 0, ROOM_AT.x, ROOM_AT.z);
      rebuild(homeItems, b);
    }
  }

  function setLook(mesh: Mesh, look: Look, key: string): string {
    const next = JSON.stringify(look);
    if (next === key) return key;
    mesh.geometry.dispose();
    mesh.geometry = buildPlayer(look);
    return next;
  }

  function petMesh(index: number, kind: PetId): Mesh {
    let mesh = petMeshes[index];
    if (!mesh) {
      mesh = add(new BufferGeometry());
      petMeshes[index] = mesh;
    }
    let geometry = petGeometry.get(kind);
    if (!geometry) {
      geometry = buildPet(petById(kind));
      petGeometry.set(kind, geometry);
    }
    if (mesh.geometry !== geometry) mesh.geometry = geometry;
    return mesh;
  }

  function playerSpot(current: Play): Vector3 {
    if (current.mode === 'inside') return scratch.set(ROOM_AT.x + DOOR.x + 0.5, 0, ROOM_AT.z + DOOR.z + 0.3);
    const x = current.walker.x + 0.5;
    const z = current.walker.z + 0.5;
    return scratch.set(x, ground(x, z), z);
  }

  function trickPose(mesh: Mesh, trick: string | null, left: number): void {
    const t = trick ? 1 - left / 1.4 : 0;
    mesh.scale.setScalar(1);
    if (!trick || calm()) return;
    switch (trick) {
      case 'spin':
        mesh.rotation.y += t * Math.PI * 2;
        break;
      case 'hop':
        mesh.position.y += Math.sin(t * Math.PI) * 0.7;
        break;
      case 'wiggle':
        mesh.rotation.z = Math.sin(t * 30) * 0.3;
        break;
      case 'roll':
        mesh.rotation.z = t * Math.PI * 2;
        break;
      case 'sneeze':
        mesh.scale.setScalar(1 + Math.sin(t * Math.PI) * 0.3);
        break;
      default:
        mesh.position.x += Math.cos(t * Math.PI * 2) * 0.8 - 0.8;
        mesh.position.z += Math.sin(t * Math.PI * 2) * 0.8;
        mesh.rotation.y = -t * Math.PI * 2;
    }
  }

  function updateCharacters(current: Play, seconds: number): void {
    const { island, walker } = current;
    lookKey = setLook(player, island.look, lookKey);
    const spot = playerSpot(current);
    const moving = current.mode === 'walk' && walker.route.length > 0;
    let bob = 0;
    if (moving && !calm()) bob = Math.abs(Math.sin(time * 11)) * 0.14;
    player.position.set(spot.x, spot.y + bob, spot.z);
    const facing = current.mode === 'inside' ? Math.PI : walker.facing;
    let gap = facing - turnFacing;
    gap = Math.atan2(Math.sin(gap), Math.cos(gap));
    turnFacing += gap * Math.min(1, seconds * 12);
    player.rotation.set(0, turnFacing, moving && !calm() ? Math.sin(time * 11) * 0.06 : 0);
    let shadow = placeShadow(0, spot.x, spot.y, spot.z, 1.1);
    const level = islandLevel(island);
    for (const friend of FRIENDS) {
      const mesh = friendMeshes.get(friend.id);
      if (!mesh) continue;
      mesh.visible = friend.level <= level;
      if (!mesh.visible) continue;
      const base = ground(friend.x + 0.5, friend.z + 0.5);
      mesh.position.y = base + (calm() ? 0 : Math.abs(Math.sin(time * 2 + friend.x)) * 0.06);
      const away = Math.hypot(walker.x - friend.x, walker.z - friend.z);
      const wanted = away < 5 && current.mode === 'walk' ? Math.atan2(walker.x - friend.x, walker.z - friend.z) : friend.facing;
      let turn = wanted - mesh.rotation.y;
      turn = Math.atan2(Math.sin(turn), Math.cos(turn));
      mesh.rotation.y += turn * Math.min(1, seconds * 4);
      shadow = placeShadow(shadow, mesh.position.x, base, mesh.position.z, 1.5);
    }
    island.pets.forEach((pet, index) => {
      const mesh = petMesh(index, pet.kind);
      const body = current.bodies[index];
      mesh.visible = Boolean(body) && (current.mode !== 'inside' || !pet.following);
      if (!body || !mesh.visible) return;
      const x = body.x + 0.5;
      const z = body.z + 0.5;
      const y = ground(x, z);
      mesh.position.set(x, y + (body.moving && !calm() ? Math.abs(Math.sin(time * 14 + index)) * 0.12 : 0), z);
      mesh.rotation.set(0, body.facing, 0);
      trickPose(mesh, body.trick, body.trickLeft);
      shadow = placeShadow(shadow, x, y, z, 0.8);
    });
    for (let index = island.pets.length; index < petMeshes.length; index += 1) {
      const mesh = petMeshes[index];
      if (mesh) mesh.visible = false;
    }
    shadows.count = shadow;
    shadows.instanceMatrix.needsUpdate = true;
  }

  function updateSparks(current: Play): void {
    let count = 0;
    const put = (x: number, y: number, z: number, size: number, spin: number): void => {
      if (count >= SPARKS) return;
      const pulse = calm() ? 1 : 0.75 + Math.sin(time * 4 + spin) * 0.25;
      dummy.position.set(x, y + (calm() ? 0 : Math.sin(time * 2.5 + spin) * 0.1), z);
      dummy.rotation.set(0, calm() ? 0 : time * 2 + spin, 0);
      dummy.scale.set(0.22 * size * pulse, 0.42 * size * pulse, 0.22 * size * pulse);
      dummy.updateMatrix();
      sparks.setMatrixAt(count, dummy.matrix);
      count += 1;
    };
    for (const item of current.finds.list) {
      const golden = item.item === 'bug-golden';
      put(item.x + 0.5, ground(item.x + 0.5, item.z + 0.5) + (golden ? 1.3 : 1.0), item.z + 0.5, golden ? 1.6 : 1, item.uid);
    }
    current.island.plots.forEach((plot, index) => {
      if (plotStage(plot) !== 'ripe') return;
      const [x = 0, z = 0] = PLOT_SPOTS[index] ?? [];
      put(x + 0.5, ground(x + 0.5, z + 0.5) + 1.7, z + 0.4, 1.3, index);
    });
    sparks.count = count;
    sparks.instanceMatrix.needsUpdate = true;
  }

  function anchorOf(current: Play, target: Target): Anchor | null {
    switch (target.kind) {
      case 'friend': {
        const friend = FRIENDS.find((each) => each.id === target.id);
        return friend ? { x: friend.x + 0.5, y: ground(friend.x + 0.5, friend.z + 0.5) + 1.0, z: friend.z + 0.5, radius: 1.2 } : null;
      }
      case 'place': {
        const place = PLACES.find((each) => each.id === target.id);
        if (!place) return null;
        const big = target.id === 'bakery' || target.id === 'house' || target.id === 'pets';
        return { x: place.x, y: ground(place.x, place.z) + (big ? 1.4 : 0.9), z: place.z, radius: big ? 1.7 : 1.3 };
      }
      case 'plot': {
        const [x = 0, z = 0] = PLOT_SPOTS[target.index] ?? [];
        return { x: x + 0.5, y: ground(x + 0.5, z + 0.5) + 0.45, z: z + 0.4, radius: 1.2 };
      }
      case 'find': {
        const item = current.finds.list.find(({ uid }) => uid === target.uid);
        return item ? { x: item.x + 0.5, y: ground(item.x + 0.5, item.z + 0.5) + 0.35, z: item.z + 0.5, radius: 0.9 } : null;
      }
      case 'pet': {
        const body = current.bodies[target.index];
        return body ? { x: body.x + 0.5, y: ground(body.x + 0.5, body.z + 0.5) + 0.4, z: body.z + 0.5, radius: 0.85 } : null;
      }
      default:
        return null;
    }
  }

  function project(x: number, y: number, z: number, radius: number): { x: number; y: number; on: boolean; reach: number; depth: number } {
    const box = renderer.domElement.getBoundingClientRect();
    scratch2.set(x, y, z).project(camera);
    const sx = box.left + ((scratch2.x + 1) / 2) * box.width;
    const sy = box.top + ((1 - scratch2.y) / 2) * box.height;
    const on = scratch2.z < 1 && scratch2.x > -1.05 && scratch2.x < 1.05 && scratch2.y > -1.05 && scratch2.y < 1.05;
    const depth = camera.position.distanceTo(scratch.set(x, y, z));
    const pixelsPerUnit = box.height / (2 * Math.tan((camera.fov * Math.PI) / 360) * Math.max(depth, 0.1));
    return { x: sx, y: sy, on, reach: Math.max(34, radius * pixelsPerUnit), depth };
  }

  function visibleTargets(current: Play): Target[] {
    const level = islandLevel(current.island);
    const snow = onSnowIsle(current);
    return [
      ...FRIENDS.filter((friend) => friend.level <= level).map((friend): Target => ({ kind: 'friend', id: friend.id })),
      ...PLACES.filter((place) => (place.id === 'boat' ? !snow : place.id === 'boatBack' ? snow : true)).map((place): Target => ({ kind: 'place', id: place.id })),
      ...current.island.plots.map((_, index): Target => ({ kind: 'plot', index })),
      ...current.finds.list.map((item): Target => ({ kind: 'find', uid: item.uid })),
      ...current.bodies.slice(0, current.island.pets.length).map((_, index): Target => ({ kind: 'pet', index })),
    ];
  }

  function updateBoat(current: Play | null): void {
    const snow = current ? onSnowIsle(current) : false;
    const place = PLACES.find((each) => each.id === (snow ? 'boatBack' : 'boat'));
    if (!place) return;
    boat.position.set(place.x + 0.5, -0.15 + (calm() ? 0 : Math.sin(time * 1.6) * 0.06), place.z);
    boat.rotation.set(0, snow ? 0 : Math.PI, calm() ? 0 : Math.sin(time * 1.2) * 0.04);
  }

  function findWhaleSpot(near: { x: number; z: number }): { x: number; z: number } | null {
    let best: { x: number; z: number } | null = null;
    let bestScore = Infinity;
    for (let dz = -8; dz <= 3; dz += 1) {
      for (let dx = -16; dx <= 16; dx += 1) {
        const x = Math.round(near.x + dx);
        const z = Math.round(near.z + dz);
        if (x < 2 || z < 2 || x >= world.width - 2 || z >= world.depth - 2) continue;
        if (ground(x, z) > -0.9 || ground(x + 2, z) > -0.9 || ground(x - 2, z) > -0.9) continue;
        const score = Math.abs(Math.hypot(dx, dz) - 9);
        if (score < bestScore) {
          best = { x, z };
          bestScore = score;
        }
      }
    }
    return best;
  }

  function updateSky(current: Play | null, focus: Vector3, seconds: number): void {
    const clock = current?.island.clock ?? 120;
    const light = lightAt(clock);
    const state = current?.sky;
    const raining = state && state.rain >= 0 ? Math.sin(Math.min(1, state.rain * 6, (1 - state.rain) * 6) * (Math.PI / 2)) : 0;
    const inside = mode === 'house' || mode === 'studio';
    const sky = tint.setHex(light.sky).lerp(new Color(0x9aa8c0), raining * 0.45);
    (scene.background as Color).copy(sky);
    (scene.fog as Fog).color.setHex(light.fog).lerp(new Color(0xa8b4c8), raining * 0.45);
    hemi.color.setHex(inside ? 0xfff6e8 : light.hemiSky);
    hemi.groundColor.setHex(inside ? 0xd9c8a8 : light.hemiGround);
    hemi.intensity = inside ? 1.9 : light.hemiStrength * (1 - raining * 0.2);
    sun.color.setHex(inside ? 0xffffff : light.sun);
    sun.intensity = inside ? 1.4 : light.sunStrength * (1 - raining * 0.4);
    sun.position.set(focus.x + Math.sin(light.sunAngle) * 30, focus.y + 40, focus.z + 18 + Math.cos(light.sunAngle) * 8);
    sun.target.position.copy(focus);
    seaMaterial.color.setHex(light.sea);
    glowMaterial.color.setHex(0x9fd8ff).lerp(new Color(0xffe08a), light.night);
    fireflyMaterial.opacity = inside ? 0 : light.night * 0.9;
    fireflies.position.set(focus.x, focus.y, focus.z);
    if (!calm()) fireflies.rotation.y = Math.sin(time * 0.1) * 0.3;
    if (!calm()) skyDrift(seconds);
    rain.visible = !inside && raining > 0.02;
    if (rain.visible) {
      rainMaterial.opacity = 0.7 * raining;
      drops.forEach((drop, at) => {
        if (!calm()) drop.y -= seconds * 16;
        if (drop.y < 0) drop.y += 14;
        dummy.position.set(focus.x + drop.x, focus.y + drop.y, focus.z + drop.z);
        dummy.rotation.set(0, 0, 0);
        dummy.scale.set(0.04, 0.6, 0.04);
        dummy.updateMatrix();
        rain.setMatrixAt(at, dummy.matrix);
      });
      rain.instanceMatrix.needsUpdate = true;
    }
    const bow = state?.rainbow ?? -1;
    arc.visible = !inside && bow >= 0;
    if (arc.visible) {
      arcMaterial.opacity = 0.62 * Math.min(1, bow * 5, (1 - bow) * 5);
      arc.position.set(focus.x, focus.y - 1, focus.z - 7);
    }
    const star = state?.star ?? -1;
    shootingStar.visible = !inside && star >= 0;
    if (shootingStar.visible) {
      shootingStar.position.set(focus.x - 14 + star * 28, focus.y + 7 - star * 2, focus.z - 6);
      shootingStar.rotation.z = -0.07;
      starMaterial.opacity = Math.min(1, (1 - star) * 3);
    }
    const march = state?.parade ?? -1;
    parade.visible = !inside && march >= 0;
    if (parade.visible) {
      const angle = march * Math.PI * 4;
      const radius = PLAZA.r - 1.5;
      parade.position.set(PLAZA.x + 0.5 + Math.cos(angle) * radius, ground(PLAZA.x, PLAZA.z) + (calm() ? 0 : Math.abs(Math.sin(time * 6)) * 0.1), PLAZA.z + 0.5 + Math.sin(angle) * radius);
      parade.rotation.y = -angle;
      parade.scale.setScalar(0.8);
    }
    const swim = state?.whale ?? -1;
    if (swim < 0) whaleSpot = null;
    else if (!whaleSpot && current) whaleSpot = findWhaleSpot({ x: current.walker.x, z: current.walker.z });
    whaleMesh.visible = !inside && swim >= 0 && whaleSpot !== null;
    if (whaleMesh.visible && whaleSpot) {
      const rise = Math.sin(swim * Math.PI);
      whaleMesh.position.set(whaleSpot.x + (swim - 0.5) * 6, -1.4 + rise * 1.5, whaleSpot.z);
      whaleMesh.rotation.y = Math.PI / 2;
    }
  }

  function skyDrift(seconds: number): void {
    sky.position.x = (sky.position.x + seconds * 0.6) % 60;
  }

  function updateCamera(current: Play | null, seconds: number): Vector3 {
    const wanted = new Vector3();
    const focus = new Vector3();
    const tall = camera.aspect < 0.8;
    const wide = camera.aspect > 1.3;
    if (mode === 'studio') {
      // The dressing-up controls cover the bottom half of a tall screen and the right half of a wide one.
      const side = wide ? 1.9 : 0;
      focus.set(STUDIO.x + side, tall ? -0.55 : 0.75, STUDIO.z);
      wanted.set(STUDIO.x + side, tall ? 2.1 : 1.7, STUDIO.z + (tall ? 5.6 : 5.8));
    } else if (mode === 'house') {
      // On a tall screen the room is framed by its width, and the furniture tray covers the bottom.
      focus.set(ROOM_AT.x + ROOM.width / 2, tall ? -1.2 : 0, ROOM_AT.z + ROOM.depth / 2 + (tall ? 1.4 : 0.3));
      const back = tall ? 1.15 : 1;
      wanted.set(focus.x, 10.5 * back, focus.z + 8.5 * back);
    } else if (mode === 'follow' && current) {
      const spot = playerSpot(current);
      focus.copy(spot);
      const back = tall ? 0.78 : 1;
      wanted.set(spot.x, spot.y + CAMERA_LIFT * back, spot.z + CAMERA_BACK * back);
    } else {
      const angle = calm() ? 0.4 : time * 0.04;
      focus.set(50, 0, 44);
      wanted.set(50 + Math.sin(angle) * 40, 46, 44 + Math.cos(angle) * 40);
    }
    if (snapCamera) {
      cameraAt.copy(wanted);
      lookAt.copy(focus);
      snapCamera = false;
    } else {
      const ease = 1 - Math.exp(-seconds * (mode === 'backdrop' ? 1.5 : 5));
      cameraAt.lerp(wanted, ease);
      lookAt.lerp(focus, ease);
    }
    camera.position.copy(cameraAt);
    camera.lookAt(lookAt);
    return lookAt.clone();
  }

  function updateMarker(current: Play | null): void {
    const anchor = current && marked && mode === 'follow' ? anchorOf(current, marked) : null;
    marker.visible = Boolean(anchor);
    markRing.visible = Boolean(anchor) && marked?.kind !== 'pet';
    if (!anchor || !marked) return;
    const bounce = calm() ? 0 : Math.abs(Math.sin(time * 3)) * 0.5;
    marker.position.set(anchor.x, anchor.y + 1.9 + anchor.radius * 0.5 + bounce, anchor.z);
    marker.rotation.y = calm() ? 0 : Math.sin(time * 1.5) * 0.6;
    marker.scale.setScalar(1.1);
    markRing.position.set(anchor.x, ground(anchor.x, anchor.z) + 0.06, anchor.z);
    markRing.scale.setScalar(anchor.radius * (calm() ? 1 : 1 + Math.sin(time * 4) * 0.08));
  }

  function updatePicked(current: Play | null): void {
    picked.visible = false;
    if (!current || !selected) return;
    const list = selected.room === 'home' ? current.island.home : current.island.outdoor;
    const item = list.find((each) => each.uid === selected?.uid);
    if (!item) return;
    const baseX = selected.room === 'home' ? ROOM_AT.x : 0;
    const baseZ = selected.room === 'home' ? ROOM_AT.z : 0;
    const info = furnitureById(item.item);
    if (!info) return;
    const [wide, deep] = footprint(info, item.turn);
    const x = item.x + wide / 2;
    const z = item.z + deep / 2;
    picked.visible = true;
    picked.scale.set(wide + 0.3, 1, deep + 0.3);
    picked.position.set(baseX + x, (selected.room === 'home' ? 0 : ground(x, z)) + 0.07, baseZ + z);
  }

  return {
    show(next) {
      play = next;
      gardenKey = '';
      findsKey = '';
      outdoorKey = '';
      homeKey = '';
      lookKey = '';
      snapCamera = true;
      for (const mesh of [garden, finds, outdoor, homeItems, player]) mesh.visible = Boolean(next);
      for (const mesh of petMeshes) mesh.visible = false;
      if (!next) {
        sparks.count = 0;
        shadows.count = 0;
        marked = null;
      } else {
        turnFacing = next.walker.facing;
      }
    },
    setCamera(next) {
      if (next !== mode) snapCamera = mode === 'studio' || next === 'studio' || mode === 'house' || next === 'house';
      mode = next;
    },
    dressStand(look) {
      standKey = setLook(standPlayer, look, standKey);
    },
    update(seconds) {
      time += seconds;
      if (play) {
        refreshGarden(play);
        refreshFinds(play);
        refreshDecor(play);
        updateCharacters(play, seconds);
        updateSparks(play);
        const open = bridgeOpen(play.island);
        bridge.visible = open;
        bridgeSoon.visible = !open;
      } else {
        bridge.visible = false;
        bridgeSoon.visible = true;
        for (const mesh of friendMeshes.values()) mesh.visible = true;
      }
      standPlayer.rotation.y = calm() ? 0.3 : Math.sin(time * 0.8) * 0.5;
    sky.visible = mode === 'backdrop';
      updateBoat(play);
      const focus = updateCamera(play, seconds);
      updateSky(play, focus, seconds);
      updateMarker(play);
      updatePicked(play);
      if (ringLeft > 0) {
        ringLeft -= seconds;
        const t = 1 - ringLeft / 0.5;
        ring.scale.setScalar(0.6 + t * 1.2);
        ringMaterial.opacity = 0.8 * (1 - t);
        ring.visible = ringLeft > 0;
      }
    },
    spots() {
      if (!play || mode !== 'follow') return [];
      const current = play;
      const out: Spot[] = [];
      for (const target of visibleTargets(current)) {
        const anchor = anchorOf(current, target);
        if (!anchor) continue;
        const seen = project(anchor.x, anchor.y, anchor.z, anchor.radius);
        out.push({ id: targetId(target), target, on: seen.on, tileX: Math.floor(anchor.x), tileZ: Math.floor(anchor.z), x: seen.x, y: seen.y, reach: seen.reach, depth: seen.depth });
      }
      return out;
    },
    decorSpots(room) {
      if (!play) return [];
      const list = room === 'home' ? play.island.home : play.island.outdoor;
      const out: Spot[] = [];
      for (const item of list) {
        const x = (room === 'home' ? ROOM_AT.x : 0) + item.x + 0.5;
        const z = (room === 'home' ? ROOM_AT.z : 0) + item.z + 0.5;
        const y = room === 'home' ? 0.4 : ground(x, z) + 0.4;
        const seen = project(x, y, z, 0.8);
        if (!seen.on) continue;
        out.push({ id: `placed:${item.uid}`, target: null, uid: item.uid, on: true, tileX: item.x, tileZ: item.z, x: seen.x, y: seen.y, reach: seen.reach, depth: seen.depth });
      }
      return out;
    },
    groundAt(x, y) {
      const box = renderer.domElement.getBoundingClientRect();
      pointer.set(((x - box.left) / box.width) * 2 - 1, -((y - box.top) / box.height) * 2 + 1);
      raycaster.setFromCamera(pointer, camera);
      const { origin, direction } = raycaster.ray;
      let last = origin.clone();
      for (let step = 1; step <= 600; step += 1) {
        const at = origin.clone().addScaledVector(direction, step * 0.35);
        const floor = Math.max(ground(at.x, at.z), -0.06);
        if (at.y <= floor) {
          let low = last;
          let high = at;
          for (let half = 0; half < 8; half += 1) {
            const middle = low.clone().lerp(high, 0.5);
            if (middle.y <= Math.max(ground(middle.x, middle.z), -0.06)) high = middle;
            else low = middle;
          }
          return { x: high.x, z: high.z };
        }
        last = at;
      }
      return null;
    },
    floorAt(x, y) {
      const box = renderer.domElement.getBoundingClientRect();
      pointer.set(((x - box.left) / box.width) * 2 - 1, -((y - box.top) / box.height) * 2 + 1);
      raycaster.setFromCamera(pointer, camera);
      const { origin, direction } = raycaster.ray;
      if (direction.y >= 0) return null;
      const t = -origin.y / direction.y;
      const tx = Math.floor(origin.x + direction.x * t - ROOM_AT.x);
      const tz = Math.floor(origin.z + direction.z * t - ROOM_AT.z);
      if (tx < -1 || tz < -1 || tx > ROOM.width || tz > ROOM.depth) return null;
      return { x: Math.max(0, Math.min(ROOM.width - 1, tx)), z: Math.max(0, Math.min(ROOM.depth - 1, tz)) };
    },
    screenOf(x, z, lift = 1) {
      const seen = project(x + 0.5, ground(x + 0.5, z + 0.5) + lift, z + 0.5, 1);
      return { x: seen.x, y: seen.y, on: seen.on };
    },
    playerOnScreen() {
      const seen = project(player.position.x, player.position.y + 1.2, player.position.z, 1);
      return { x: seen.x, y: seen.y };
    },
    setMarker(target) {
      marked = target;
    },
    tapRing(x, z) {
      ring.position.set(x + 0.5, Math.max(ground(x + 0.5, z + 0.5), -0.05) + 0.08, z + 0.5);
      ring.visible = true;
      ringLeft = 0.5;
    },
    select(room, uid) {
      selected = uid === null ? null : { room, uid };
    },
    refresh() {
      gardenKey = '';
      findsKey = '';
      outdoorKey = '';
      homeKey = '';
    },
    drawCalls: () => renderer.info.render.calls,
  };
}
