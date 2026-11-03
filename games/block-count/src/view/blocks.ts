// The toy blocks on the turntable, drawn as instances of one chunky cube: solid, or see-through glass when the
// stack shows what hides inside. Each block remembers when it dropped in, was tapped or counted, and every frame
// works out where it is from that, so the whole stack is three draw calls however big it gets.
import {
  BoxGeometry,
  CanvasTexture,
  Color,
  DynamicDrawUsage,
  Group,
  InstancedMesh,
  MeshBasicMaterial,
  MeshLambertMaterial,
  Object3D,
  PlaneGeometry,
  SRGBColorSpace,
  Vector3,
  type Material,
} from 'three';
import { FILL_COLOUR, layerColour, VELVET } from './palette.ts';

export const MOST_BLOCKS = 96;
const MOST_COLUMNS = 16;
const DROP_S = 0.55;
const DROP_FROM = 5;
const POP_S = 0.42;
const WOBBLE_S = 1.1;
const TWIRL_S = 1.2;
const GOLDEN = 0xffc928;
/** How far the stack spreads apart when it shows its inside, as a share of each block's distance from the middle. */
export const SPREAD = 0.32;

export interface Block {
  x: number;
  y: number;
  z: number;
  hidden: boolean;
  /** A new block that fills the box, cream instead of its layer's colour. */
  fresh: boolean;
  /** When it lands, in seconds. It falls from above before that. */
  landAt: number;
  /** When it was counted, or tapped, for its hop. */
  hopAt: number;
  /** Tapped by the player: it glows a little brighter. */
  lit: boolean;
  /** Counted by the stack itself. */
  counted: boolean;
  /** Hovering in the air until this time, for the "blocks never float" lesson. */
  hoverUntil: number;
  /** Shown at all. Fresh blocks wait out of sight until they drop. */
  shown: boolean;
  /** The rare golden block, and when it twirls. */
  golden: boolean;
  twirlAt: number;
}

/** A rounded panel on every face, so each block reads as a block even beside one of the same colour. */
function faceTexture(): CanvasTexture {
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const paint = canvas.getContext('2d');
  if (paint) {
    paint.fillStyle = '#c4bfd0';
    paint.fillRect(0, 0, size, size);
    paint.fillStyle = '#ffffff';
    paint.beginPath();
    paint.roundRect(11, 11, size - 22, size - 22, 18);
    paint.fill();
    // A soft shine in one corner, like a glossy painted toy.
    const shine = paint.createLinearGradient(0, 0, size, size);
    shine.addColorStop(0, 'rgba(255,255,255,0.9)');
    shine.addColorStop(0.45, 'rgba(255,255,255,0)');
    paint.fillStyle = shine;
    paint.beginPath();
    paint.roundRect(11, 11, size - 22, size - 22, 18);
    paint.fill();
    paint.fillStyle = 'rgba(80,60,110,0.12)';
    paint.beginPath();
    paint.roundRect(22, 22, size - 44, size - 44, 12);
    paint.fill();
  }
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

/** A soft square shadow, darkest under the middle of a column. */
function shadowTexture(): CanvasTexture {
  const size = 64;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const paint = canvas.getContext('2d');
  if (paint) {
    const glow = paint.createRadialGradient(size / 2, size / 2, 6, size / 2, size / 2, size / 2);
    glow.addColorStop(0, 'rgba(20,6,30,0.75)');
    glow.addColorStop(0.6, 'rgba(20,6,30,0.45)');
    glow.addColorStop(1, 'rgba(20,6,30,0)');
    paint.fillStyle = glow;
    paint.fillRect(0, 0, size, size);
  }
  return new CanvasTexture(canvas);
}

function instanced(geometry: ConstructorParameters<typeof InstancedMesh>[0], material: Material, count: number): InstancedMesh {
  const mesh = new InstancedMesh(geometry, material, count);
  mesh.instanceMatrix.setUsage(DynamicDrawUsage);
  mesh.count = 0;
  mesh.frustumCulled = false;
  return mesh;
}

const ease = (u: number): number => 1 - (1 - u) ** 3;

/** A drop with one small bounce at the end. */
function fall(u: number): number {
  if (u >= 1) return 0;
  if (u < 0.75) return 1 - ease(u / 0.75);
  const bounce = (u - 0.75) / 0.25;
  return Math.sin(bounce * Math.PI) * 0.06;
}

export interface Blocks {
  /** The blocks in counting order. */
  list: Block[];
  /** Solid blocks, the ones a tap can hit. */
  solid: InstancedMesh;
  /** Puts these blocks on the turntable, all landing at the same moment. */
  load(blocks: Omit<Block, 'landAt' | 'hopAt' | 'lit' | 'counted' | 'hoverUntil' | 'shown' | 'golden' | 'twirlAt'>[], now: number, calm: boolean): void;
  /** Where a block is drawn now, inside the turntable's group. */
  placeOf(index: number, out: Vector3): Vector3;
  wobble(now: number): void;
  /** 0 is the stack as built, 1 spread apart. Eases toward the goal. */
  spreadTo(goal: number): void;
  /** Seen blocks turn to glass, so the hidden ones show. */
  setGlass(on: boolean): void;
  hop(index: number, now: number): void;
  /** Footprint for the mat and the shadows. */
  setFootprint(width: number, depth: number, heights: readonly (readonly number[])[]): void;
  frame(now: number, seconds: number, calm: boolean): void;
  /** Which block a solid instance shows, for a tap, or -1. */
  blockAt(slot: number): number;
  /** True while anything is still moving. */
  readonly moving: boolean;
}

export function buildBlocks(parent: Group): Blocks {
  const cube = new BoxGeometry(1, 1, 1);
  const map = faceTexture();
  const solid = instanced(cube, new MeshLambertMaterial({ map, flatShading: true }), MOST_BLOCKS);
  const glass = instanced(cube, new MeshLambertMaterial({ map, flatShading: true, transparent: true, opacity: 0.3, depthWrite: false }), MOST_BLOCKS);
  glass.renderOrder = 2;
  const tile = new PlaneGeometry(0.94, 0.94).rotateX(-Math.PI / 2);
  const mat = instanced(tile, new MeshLambertMaterial({ color: 0xffffff }), MOST_COLUMNS);
  const shadows = instanced(
    new PlaneGeometry(1.5, 1.5).rotateX(-Math.PI / 2),
    new MeshBasicMaterial({ map: shadowTexture(), transparent: true, depthWrite: false, opacity: 0.8 }),
    MOST_COLUMNS,
  );
  shadows.renderOrder = 1;
  parent.add(mat, shadows, solid, glass);

  const list: Block[] = [];
  const placer = new Object3D();
  const tint = new Color();
  const white = new Color(0xffffff);
  const glow = new Color(0xfff2b0);
  let width = 1;
  let depth = 1;
  let spread = 0;
  let spreadGoal = 0;
  let glassOn = false;
  let wobbleAt = -10;
  let columns: { x: number; z: number }[] = [];
  let moving = false;
  const solidIndex: number[] = [];

  /** The middle of the footprint: blocks spread away from it. */
  const middle = (): [number, number] => [width / 2, depth / 2];

  function placeOf(index: number, out: Vector3): Vector3 {
    const block = list[index];
    const [mx, mz] = middle();
    const grow = 1 + SPREAD * spread;
    out.set((block.x + 0.5 - mx) * grow, block.y * (1 + SPREAD * 1.4 * spread) + 0.5, (block.z + 0.5 - mz) * grow);
    return out;
  }

  function frame(now: number, seconds: number, calm: boolean): void {
    const pull = calm ? 1 : 1 - Math.exp(-seconds * 7);
    spread += (spreadGoal - spread) * pull;
    if (Math.abs(spreadGoal - spread) < 0.002) spread = spreadGoal;
    moving = spread !== spreadGoal;
    const shake = calm ? 0 : Math.max(0, 1 - (now - wobbleAt) / WOBBLE_S);
    if (shake > 0) moving = true;
    const spot = new Vector3();
    let solidCount = 0;
    let glassCount = 0;
    list.forEach((block, index) => {
      if (!block.shown && now >= block.landAt - DROP_S) block.shown = true;
      if (!block.shown) return;
      placeOf(index, spot);
      let lift = 0;
      let scale = 1;
      let squash = 1;
      if (now < block.hoverUntil) {
        lift += 1.6 + Math.sin(now * 5) * 0.12;
        moving = true;
      } else {
        const dropped = (now - Math.max(block.landAt - DROP_S, block.hoverUntil)) / DROP_S;
        if (dropped < 1) {
          lift += calm ? 0 : fall(dropped) * (block.hoverUntil > 0 ? 1.6 : DROP_FROM);
          moving = true;
        }
        // A little squash as it lands.
        if (!calm && dropped >= 0.72 && dropped < 1.1) squash = 1 - Math.sin(((dropped - 0.72) / 0.38) * Math.PI) * 0.12;
      }
      const hopped = (now - block.hopAt) / POP_S;
      if (hopped >= 0 && hopped < 1) {
        if (!calm) lift += Math.sin(hopped * Math.PI) * 0.45;
        scale = 1 + Math.sin(hopped * Math.PI) * (calm ? 0.08 : 0.22);
        moving = true;
      }
      // The golden block spins all the way round, high over the stack, and lands back in its place.
      let spin = 0;
      const twirled = (now - block.twirlAt) / TWIRL_S;
      if (block.golden && twirled >= 0 && twirled < 1) {
        if (!calm) {
          spin = ease(twirled) * Math.PI * 2;
          lift += Math.sin(twirled * Math.PI) * 1.1;
        }
        scale = Math.max(scale, 1 + Math.sin(twirled * Math.PI) * 0.3);
        moving = true;
      }
      let sway = 0;
      if (shake > 0) sway = Math.sin(now * 22 + block.y * 0.9) * shake * (block.y + 1) * 0.06;
      placer.position.set(spot.x + sway, spot.y + lift - (1 - squash) * 0.5, spot.z + sway * 0.4);
      placer.rotation.set(0, spin, -sway * 0.35);
      placer.scale.set(scale / Math.sqrt(squash), scale * squash, scale / Math.sqrt(squash));
      placer.updateMatrix();
      tint.setHex(block.fresh ? FILL_COLOUR : layerColour(block.y));
      // Lit and counted blocks glow warmer and brighter; hidden ones turn bubblegum pink as they come out.
      if (block.counted) tint.lerp(glow, 0.16).multiplyScalar(1.12);
      else if (block.lit) tint.multiplyScalar(1.3);
      if (block.hidden && block.counted) tint.setHex(VELVET).lerp(white, 0.12 + 0.12 * Math.sin(now * 6));
      if (block.golden) tint.setHex(GOLDEN).lerp(white, 0.15 + 0.15 * Math.sin(now * 8));
      if (shake > 0) tint.lerp(white, shake * 0.2);
      const target = glassOn && !block.hidden && !block.fresh ? glass : solid;
      const slot = target === glass ? glassCount++ : solidCount++;
      target.setMatrixAt(slot, placer.matrix);
      target.setColorAt(slot, tint);
      // A tap finds a block through its slot.
      if (target === solid) solidIndex[slot] = index;
    });
    solid.count = solidCount;
    glass.count = glassCount;
    for (const mesh of [solid, glass]) {
      mesh.instanceMatrix.needsUpdate = true;
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    }
    // The mat and the shadows follow the columns as the stack spreads.
    const [mx, mz] = middle();
    const grow = 1 + SPREAD * spread;
    columns.forEach(({ x, z }, at) => {
      placer.position.set((x + 0.5 - mx) * grow, 0.012, (z + 0.5 - mz) * grow);
      placer.rotation.set(0, 0, 0);
      placer.scale.set(1, 1, 1);
      placer.updateMatrix();
      shadows.setMatrixAt(at, placer.matrix);
    });
    shadows.instanceMatrix.needsUpdate = true;
  }

  return {
    list,
    solid,
    load(blocks, now, calm) {
      list.splice(
        0,
        list.length,
        ...blocks.slice(0, MOST_BLOCKS).map((block) => ({
          ...block,
          landAt: calm ? now : now + DROP_S,
          hopAt: -10,
          lit: false,
          counted: false,
          hoverUntil: 0,
          shown: !block.fresh,
          golden: false,
          twirlAt: -10,
        })),
      );
      spread = 0;
      spreadGoal = 0;
      glassOn = false;
      wobbleAt = -10;
      moving = true;
    },
    placeOf,
    wobble(now) {
      wobbleAt = now;
    },
    spreadTo(goal) {
      spreadGoal = goal;
    },
    setGlass(on) {
      glassOn = on;
    },
    hop(index, now) {
      const block = list[index];
      if (block) block.hopAt = now;
    },
    setFootprint(w, d, heights) {
      width = w;
      depth = d;
      columns = [];
      let tiles = 0;
      for (let z = 0; z < d; z += 1) {
        for (let x = 0; x < w; x += 1) {
          placer.position.set(x + 0.5 - w / 2, 0.006, z + 0.5 - d / 2);
          placer.rotation.set(0, 0, 0);
          placer.scale.set(1, 1, 1);
          placer.updateMatrix();
          mat.setMatrixAt(tiles, placer.matrix);
          mat.setColorAt(tiles, tint.setHex((x + z) % 2 === 0 ? 0xfff6e0 : 0xf4ddb0));
          tiles += 1;
          if ((heights[z]?.[x] ?? 0) > 0) columns.push({ x, z });
        }
      }
      mat.count = tiles;
      mat.instanceMatrix.needsUpdate = true;
      if (mat.instanceColor) mat.instanceColor.needsUpdate = true;
      shadows.count = columns.length;
    },
    frame,
    blockAt: (slot) => solidIndex[slot] ?? -1,
    get moving() {
      return moving;
    },
  };
}
