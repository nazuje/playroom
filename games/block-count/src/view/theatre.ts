// The toy theatre that never moves: dark wooden stage boards with a gold edge, footlights along the front,
// raspberry velvet curtains at the sides, a painted night backdrop with a moon and stars, and a warm spotlight
// on the turntable. Everything here is a handful of draw calls: merged, vertex-coloured, flat-shaded pieces.
import {
  AdditiveBlending,
  BoxGeometry,
  BufferGeometry,
  CircleGeometry,
  Color,
  ConeGeometry,
  CylinderGeometry,
  DirectionalLight,
  Float32BufferAttribute,
  Fog,
  Group,
  HemisphereLight,
  IcosahedronGeometry,
  InstancedMesh,
  Matrix4,
  Mesh,
  MeshBasicMaterial,
  MeshLambertMaterial,
  PlaneGeometry,
  Points,
  PointsMaterial,
  Scene,
  ShapeGeometry,
  Shape,
} from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { BOARDS, BOARDS_LIGHT, GOLD, GOLD_DARK, NIGHT, VELVET, VELVET_DARK } from './palette.ts';

/** The theatre is drawn for a stack about 3 blocks across, and grows with bigger ones. */
export const THEATRE_SPAN = 3;
/** The turntable's top, where the blocks stand. */
export const PLINTH_TOP = 0;
const STAGE_TOP = -0.16;

/** Paints a piece one colour, so many pieces can merge into a single draw call. */
function painted(geometry: BufferGeometry, color: number, at?: Matrix4): BufferGeometry {
  const flat = geometry.index ? geometry.toNonIndexed() : geometry;
  if (at) flat.applyMatrix4(at);
  const count = flat.getAttribute('position').count;
  const { r, g, b } = new Color(color);
  const colors = new Float32Array(count * 3);
  for (let i = 0; i < count; i += 1) colors.set([r, g, b], i * 3);
  flat.setAttribute('color', new Float32BufferAttribute(colors, 3));
  if (flat.getAttribute('uv')) flat.deleteAttribute('uv');
  return flat;
}

const at = (x: number, y: number, z: number): Matrix4 => new Matrix4().makeTranslation(x, y, z);

/** Stage boards running back from the footlights, in two shades, with a gold edge along the front. */
function boards(): BufferGeometry[] {
  const pieces: BufferGeometry[] = [];
  const width = 0.9;
  for (let plank = -9; plank <= 9; plank += 1) {
    const color = plank % 2 === 0 ? BOARDS : BOARDS_LIGHT;
    pieces.push(painted(new BoxGeometry(width - 0.04, 0.5, 11), color, at(plank * width, STAGE_TOP - 0.25, -1)));
  }
  pieces.push(painted(new BoxGeometry(17.4, 0.7, 0.5), GOLD, at(0, STAGE_TOP - 0.3, 4.6)));
  pieces.push(painted(new BoxGeometry(17.6, 1.6, 0.6), VELVET_DARK, at(0, STAGE_TOP - 1.4, 4.7)));
  return pieces;
}

/** A curtain hanging in deep folds, as a zigzag strip of tall panels. */
function curtain(side: 1 | -1): BufferGeometry {
  const folds = 7;
  const width = 4.2;
  const height = 12;
  const geometry = new PlaneGeometry(width, height, folds * 2, 1);
  const position = geometry.getAttribute('position');
  for (let index = 0; index < position.count; index += 1) {
    const x = position.getX(index);
    const column = Math.round(((x + width / 2) / width) * folds * 2);
    position.setZ(index, column % 2 === 0 ? 0 : 0.34);
  }
  geometry.computeVertexNormals();
  const placed = new Matrix4().makeTranslation(side * 7.4, height / 2 - 1.2, 3.2).multiply(new Matrix4().makeRotationY(-side * 0.5));
  return painted(geometry, VELVET, placed);
}

/** The scalloped top border, with a gold fringe. */
function valance(): BufferGeometry[] {
  const pieces: BufferGeometry[] = [painted(new BoxGeometry(19, 1.4, 0.4), VELVET_DARK, at(0, 9.4, 3.4))];
  for (let scallop = -8; scallop <= 8; scallop += 1) {
    const drop = new CylinderGeometry(0.62, 0.62, 0.36, 8, 1, false, 0, Math.PI).rotateX(Math.PI / 2).rotateZ(Math.PI);
    pieces.push(painted(drop, VELVET, at(scallop * 1.15, 8.7, 3.5)));
    pieces.push(painted(new BoxGeometry(0.12, 0.3, 0.1), GOLD, at(scallop * 1.15, 8.0, 3.72)));
  }
  return pieces;
}

/** The painted backdrop: a night sky with rolling hills and a big round moon. */
function backdrop(): BufferGeometry[] {
  const pieces: BufferGeometry[] = [painted(new PlaneGeometry(26, 14), NIGHT, at(0, 5, -6.5))];
  const hills = new Shape();
  hills.moveTo(-13, -1);
  for (let step = 0; step <= 26; step += 1) hills.lineTo(-13 + step, 1.6 + Math.sin(step * 0.7) * 0.8 + Math.sin(step * 0.23) * 0.9);
  hills.lineTo(13, -1);
  pieces.push(painted(new ShapeGeometry(hills), 0x3b1f57, at(0, 0, -6.4)));
  const far = new Shape();
  far.moveTo(-13, -1);
  for (let step = 0; step <= 26; step += 1) far.lineTo(-13 + step, 3 + Math.sin(step * 0.45 + 1) * 1.1);
  far.lineTo(13, -1);
  pieces.push(painted(new ShapeGeometry(far), 0x321a4b, at(0, 0, -6.45)));
  pieces.push(painted(new CircleGeometry(1.5, 20), 0xfff0c2, at(-5.5, 8.2, -6.35)));
  pieces.push(painted(new CircleGeometry(1.9, 20), 0x4a2d63, at(-5.5, 8.2, -6.4)));
  return pieces;
}

/** The turntable the blocks stand on: a gold drum with a cream top. */
function plinth(): BufferGeometry {
  const pieces = [
    painted(new CylinderGeometry(2.55, 2.7, 0.16, 28), GOLD_DARK, at(0, PLINTH_TOP - 0.08, 0)),
    painted(new CylinderGeometry(2.45, 2.45, 0.02, 28), 0xffe3a3, at(0, PLINTH_TOP - 0.005, 0)),
  ];
  return mergeGeometries(pieces) ?? new BufferGeometry();
}

function stars(): Points {
  const spots: number[] = [];
  let seed = 7;
  const next = (): number => {
    seed = (seed * 16807) % 2147483647;
    return seed / 2147483647;
  };
  for (let star = 0; star < 70; star += 1) spots.push(-12 + next() * 24, 4.2 + next() * 7.5, -6.3);
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new Float32BufferAttribute(spots, 3));
  return new Points(geometry, new PointsMaterial({ color: 0xffe9a8, size: 0.13, fog: false }));
}

export interface Theatre {
  /** The whole set, scaled for the stack's size. */
  set: Group;
  /** The turntable, which turns with the blocks on the first worlds. */
  plinth: Mesh;
  /** Grows the set to suit a stack this many blocks across, and moves it with the turntable's middle. */
  fitTo(span: number): void;
  /** The footlights flicker on a count, and glow steadily otherwise. */
  twinkle(seconds: number, excited: boolean): void;
}

export function buildTheatre(scene: Scene): Theatre {
  scene.background = new Color(0x1d0e30);
  scene.fog = new Fog(0x1d0e30, 30, 70);
  const hemisphere = new HemisphereLight(0xfff4e0, 0x6a4a83, 2.3);
  // From up front and to the left, so tops are brightest, fronts next and right sides darkest.
  const sun = new DirectionalLight(0xffe8c4, 2.4);
  sun.position.set(-3, 9, 5);
  scene.add(hemisphere, sun);

  const set = new Group();
  const flat = new MeshLambertMaterial({ vertexColors: true, flatShading: true });
  const fixed = new Mesh(mergeGeometries([...boards(), curtain(1), curtain(-1), ...valance(), ...backdrop()]) ?? new BufferGeometry(), flat);
  const drum = new Mesh(plinth(), flat);

  // A soft cone of light from above and a warm pool on the boards around the turntable.
  const beam = new Mesh(
    new ConeGeometry(3.4, 11, 24, 1, true).translate(0, 5.5, 0),
    new MeshBasicMaterial({ color: 0xffd98a, transparent: true, opacity: 0.07, depthWrite: false, blending: AdditiveBlending, fog: false }),
  );
  beam.position.set(0, 0, 0);
  const pool = new Mesh(
    new CircleGeometry(4.2, 32).rotateX(-Math.PI / 2),
    new MeshBasicMaterial({ color: 0xffc46b, transparent: true, opacity: 0.12, depthWrite: false, blending: AdditiveBlending }),
  );
  pool.position.y = STAGE_TOP + 0.01;

  const bulbs = 13;
  const footlights = new InstancedMesh(new IcosahedronGeometry(0.11, 1), new MeshBasicMaterial({ color: 0xfff2b0 }), bulbs);
  for (let bulb = 0; bulb < bulbs; bulb += 1) footlights.setMatrixAt(bulb, at((bulb - (bulbs - 1) / 2) * 1.3, STAGE_TOP + 0.05, 4.45));
  footlights.instanceMatrix.needsUpdate = true;
  const bulbColor = new Color();

  set.add(fixed, pool, beam, footlights, stars());
  scene.add(set, drum);
  let clock = 0;

  return {
    set,
    plinth: drum,
    fitTo(span) {
      const grow = Math.max(1, span / THEATRE_SPAN);
      set.scale.setScalar(grow);
      drum.scale.set(Math.max(1, span / THEATRE_SPAN), 1, Math.max(1, span / THEATRE_SPAN));
    },
    twinkle(seconds, excited) {
      clock += seconds;
      for (let bulb = 0; bulb < bulbs; bulb += 1) {
        const glow = excited ? 0.65 + 0.35 * Math.sin(clock * 9 + bulb * 1.7) : 0.92 + 0.08 * Math.sin(clock * 1.5 + bulb);
        footlights.setColorAt(bulb, bulbColor.setRGB(glow, glow * 0.95, glow * 0.7));
      }
      if (footlights.instanceColor) footlights.instanceColor.needsUpdate = true;
    },
  };
}
