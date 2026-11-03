// The stage on screen: the toy theatre, the blocks on the turntable, the camera that glides to each puzzle's
// fixed view and zooms to fit any screen, taps that light up blocks, dragging or ↻ to turn the turntable on the
// first worlds, and the curtain call, where every block takes a bow with its number.
import { createStage, type Stage } from '@playroom/stage3d';
import { BoxGeometry, ConeGeometry, Group, InstancedMesh, Mesh, MeshBasicMaterial, MeshLambertMaterial, Object3D, Raycaster, SphereGeometry, Vector2, Vector3 } from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import type { Level } from '../rules/levels.ts';
import { eyeFor, targetFor, type Point } from '../rules/sight.ts';
import { cubesOf, heightsKey, tallestOf, type Heights } from '../rules/stack.ts';
import { button, calm, element, onPress } from '../ui.ts';
import { buildBlocks, SPREAD, type Block, type Blocks } from './blocks.ts';
import { GOLD, PEG } from './palette.ts';
import { buildTheatre, type Theatre } from './theatre.ts';

const QUARTER = Math.PI / 2;
const DRAG_PX = 8;
const DRAG_TURN = 0.011;

export type RevealKind = 'count' | 'fill' | 'map';

/** One bow in the curtain call: a block, a fresh block dropping into the box, or a whole column. */
export interface RevealStep {
  /** The block that bows, or the column's blocks. */
  blocks: number[];
  /** The number it shows: the count so far, or the column's height. */
  n: number;
  hidden: boolean;
}

export interface Tap {
  /** A block was tapped, and lit or unlit. */
  block: boolean;
  /** Blocks lit now. */
  lit: number;
}

export interface BoardView {
  readonly ok: boolean;
  /** A puzzle comes on: the stack drops onto the turntable and the camera glides to its view. */
  show(level: Level): void;
  /** The map's backdrop: a little stack turning slowly on the stage. */
  idle(): void;
  /** "Blocks never float": a block hovers, wobbles and drops onto the one below. Returns how long it takes. */
  lesson(): number;
  /** A quarter turn of the turntable, on levels that turn. */
  turn(): void;
  wobble(): void;
  /** The stack spreads apart and turns to glass so the hidden blocks show, or comes back together. */
  open(on: boolean): void;
  /** The order the blocks bow in. */
  revealPlan(kind: RevealKind): RevealStep[];
  /** One bow, now. */
  bow(step: RevealStep, kind: RevealKind): void;
  /** The total, big over the stage. Null hides it. */
  banner(text: string | null, tone?: 'right' | 'wrong'): void;
  /** Lights the frame of the box, the peg or every block for a moment, for demos and hints. */
  flash(what: 'box' | 'peg' | 'stack'): void;
  /** Lights a block as if tapped, for the first demo and the hint. It stays lit if it already was. */
  tapBlock(index: number): number;
  onTap(listener: (tap: Tap) => void): void;
  onTurn(listener: () => void): void;
  /** A point on screen over part of the stage, for the pointing hand. */
  spot(name: 'stack' | 'peg' | 'box' | 'turn' | 'block', index?: number): HTMLElement | null;
  layout(): void;
  /** Labels and the banner go, for leaving a puzzle. */
  clear(): void;
  /** Taps on the stage do nothing while the stack takes its bows. */
  lock(on: boolean): void;
}

interface Label {
  element: HTMLElement;
  blocks: number[];
}

function pegMesh(): Mesh {
  const ball = new SphereGeometry(0.2, 10, 8).translate(0, 0.62, 0);
  const stick = new ConeGeometry(0.09, 0.5, 8).translate(0, 0.25, 0);
  const merged = mergeGeometries([ball, stick]);
  return new Mesh(merged ?? ball, new MeshLambertMaterial({ color: PEG, flatShading: true }));
}

/** The rods of the box's frame, as instances of one thin bar. */
const EDGES = 12;

export function createBoard(host: HTMLElement): BoardView {
  const stage: Stage | null = createStage(host, { fov: 40, near: 0.3, far: 120 });
  const labels = element('div', 'labels');
  const spots = element('div', 'spots');
  const total = element('div', 'total');
  total.hidden = true;
  const turnButton = button('turn-btn');
  turnButton.textContent = '↻';
  turnButton.dataset.action = 'turn';
  turnButton.hidden = true;
  host.append(labels, spots, total, turnButton);
  const spotFor = new Map<string, HTMLElement>();
  for (const name of ['stack', 'peg', 'box', 'block']) {
    const made = element('span', 'spot');
    made.dataset.spot = name;
    spots.append(made);
    spotFor.set(name, made);
  }

  const tapListeners: ((tap: Tap) => void)[] = [];
  const turnListeners: (() => void)[] = [];
  let shownLevel: Level | null = null;
  let turnGoal = 0;
  let autoTurn = false;
  let labelList: Label[] = [];
  /** Blocks lit by taps, in the order they were tapped, each with its little number. */
  let tapped: { index: number; element: HTMLElement }[] = [];

  if (!stage) {
    host.dataset.three = 'none';
    return {
      ok: false,
      show(level) {
        shownLevel = level;
        host.dataset.stack = heightsKey(level.heights);
      },
      idle() {},
      lesson: () => 0,
      turn() {},
      wobble() {},
      open() {},
      revealPlan: () => [],
      bow() {},
      banner() {},
      flash() {},
      tapBlock: () => 0,
      onTap() {},
      onTurn() {},
      spot: () => null,
      layout() {},
      clear() {},
      lock() {},
    };
  }

  const { scene, camera, canvas } = stage;
  const theatre: Theatre = buildTheatre(scene);
  const pivot = new Group();
  scene.add(pivot);
  const blocks: Blocks = buildBlocks(pivot);
  const peg = pegMesh();
  peg.visible = false;
  const rods = new InstancedMesh(new BoxGeometry(1, 1, 1), new MeshBasicMaterial({ color: GOLD, transparent: true, opacity: 0.9 }), EDGES);
  rods.count = 0;
  rods.frustumCulled = false;
  pivot.add(peg, rods);

  // What the camera is doing: where it is, where it looks, how wide the stack is, and how far it zooms.
  const eyeNow = new Vector3(6, 7, 9);
  const eyeGoal = new Vector3(6, 7, 9);
  const lookNow = new Vector3();
  const lookGoal = new Vector3();
  let footprint = { width: 3, depth: 3, tall: 3, round: false };
  let zoomNow = 1;
  let glideFirst = true;
  const projected = new Vector3();
  const placed = new Vector3();
  const placer = new Object3D();
  let lastFit = '';
  let flashAt = -10;
  let flashWhat: 'box' | 'peg' | 'stack' | null = null;
  let bumpAt = -10;
  const clock = () => performance.now() / 1000;

  /** The rules' eye is in grid units from the back left corner; the scene is centred on the footprint. */
  function aim(eye: Point, target: Point, width: number, depth: number): void {
    eyeGoal.set(eye.x - width / 2, eye.y, eye.z - depth / 2);
    lookGoal.set(target.x - width / 2, target.y, target.z - depth / 2);
    if (glideFirst || calm()) {
      eyeNow.copy(eyeGoal);
      lookNow.copy(lookGoal);
      glideFirst = false;
    }
  }

  /** Points round the stack, spread allowed for, that must stay on screen. */
  function fitPoints(): Vector3[] {
    const { width, depth, tall, round } = footprint;
    const grow = 1 + SPREAD * 0.7;
    const top = tall * (1 + SPREAD * 0.9) + 0.4;
    const points: Vector3[] = [];
    if (round) {
      const radius = 0.5 * Math.hypot(width, depth) * grow;
      for (let step = 0; step < 12; step += 1) {
        const angle = (step / 12) * Math.PI * 2;
        for (const y of [0, top]) points.push(new Vector3(Math.cos(angle) * radius, y, Math.sin(angle) * radius));
      }
    } else {
      for (const x of [-width / 2, width / 2]) for (const z of [-depth / 2 - 0.5, depth / 2 + 0.5]) for (const y of [0, top]) points.push(new Vector3(x * grow, y, z * grow));
    }
    return points;
  }

  function fitCamera(seconds: number): void {
    const pull = calm() ? 1 : 1 - Math.exp(-seconds * 4);
    eyeNow.lerp(eyeGoal, pull);
    lookNow.lerp(lookGoal, pull);
    camera.position.copy(eyeNow);
    camera.lookAt(lookNow);
    camera.updateMatrixWorld();
    camera.zoom = 1;
    camera.updateProjectionMatrix();
    let wide = 0;
    let up = 0;
    let down = 0;
    for (const point of fitPoints()) {
      projected.copy(point).project(camera);
      wide = Math.max(wide, Math.abs(projected.x));
      up = Math.max(up, projected.y);
      down = Math.max(down, -projected.y);
    }
    // Room above for the numbers and the total, and a little below for the turntable's edge.
    const goal = Math.max(0.3, Math.min(4, 0.9 / Math.max(wide, 0.01), 0.7 / Math.max(up, 0.01), 0.88 / Math.max(down, 0.01)));
    zoomNow += (goal - zoomNow) * pull;
    camera.zoom = zoomNow;
    camera.updateProjectionMatrix();
  }

  function toScreen(point: Vector3): { x: number; y: number } {
    projected.copy(point).project(camera);
    return { x: ((projected.x + 1) / 2) * host.clientWidth, y: ((1 - projected.y) / 2) * host.clientHeight };
  }

  /** Where a block is in the scene, turntable and all. */
  function worldOf(index: number, lift = 0): Vector3 {
    blocks.placeOf(index, placed);
    placed.y += lift;
    return pivot.localToWorld(placed);
  }

  function place(target: HTMLElement, point: { x: number; y: number }): void {
    const x = Math.round(point.x);
    const y = Math.round(point.y);
    const key = `${x},${y}`;
    if (target.dataset.at === key) return;
    target.dataset.at = key;
    target.style.translate = `${x}px ${y}px`;
  }

  function moveSpots(): void {
    if (!blocks.list.length) return;
    const { width, depth, tall } = footprint;
    const middle = pivot.localToWorld(new Vector3(0, Math.max(0.5, tall * 0.45), 0));
    place(spotFor.get('stack') as HTMLElement, toScreen(middle));
    place(spotFor.get('peg') as HTMLElement, toScreen(peg.localToWorld(new Vector3(0, 0.6, 0))));
    place(spotFor.get('box') as HTMLElement, toScreen(pivot.localToWorld(new Vector3(width / 2, tall, depth / 2))));
    const block = spotFor.get('block') as HTMLElement;
    const index = Number(block.dataset.index ?? 0);
    if (blocks.list[index]) place(block, toScreen(worldOf(index)));
  }

  function moveLabels(): void {
    for (const { index, element: badge } of tapped) place(badge, toScreen(worldOf(index, 0.62)));
    for (const label of labelList) {
      const top = label.blocks.reduce((best, index) => (blocks.list[index].y > blocks.list[best].y ? index : best), label.blocks[0]);
      place(label.element, toScreen(worldOf(top, 0.62)));
    }
  }

  /** The stack's box on screen, for the screen check: it must sit inside the board. */
  function reportFit(): void {
    if (!blocks.list.length) return;
    let left = Infinity;
    let top = Infinity;
    let right = -Infinity;
    let bottom = -Infinity;
    for (const point of fitPoints()) {
      const at = toScreen(pivot.localToWorld(point.clone()));
      left = Math.min(left, at.x);
      right = Math.max(right, at.x);
      top = Math.min(top, at.y);
      bottom = Math.max(bottom, at.y);
    }
    const fit = [left, top, right, bottom].map(Math.round).join(',');
    if (fit !== lastFit) {
      lastFit = fit;
      host.dataset.fit = fit;
    }
  }

  function drawBox(level: Level | null): void {
    if (!level || !level.box) {
      rods.count = 0;
      return;
    }
    const { width: w, depth: d, box: h } = level;
    const thick = 0.05;
    const bars: [number, number, number, number, number, number][] = [];
    for (const y of [0, h]) {
      for (const z of [0, d]) bars.push([w / 2, y, z, w + thick, thick, thick]);
      for (const x of [0, w]) bars.push([x, y, d / 2, thick, thick, d + thick]);
    }
    for (const x of [0, w]) for (const z of [0, d]) bars.push([x, h / 2, z, thick, h, thick]);
    bars.forEach(([x, y, z, sx, sy, sz], at) => {
      placer.position.set(x - w / 2, y, z - d / 2);
      placer.scale.set(sx, sy, sz);
      placer.updateMatrix();
      rods.setMatrixAt(at, placer.matrix);
    });
    rods.count = bars.length;
    rods.instanceMatrix.needsUpdate = true;
  }

  function clearLabels(): void {
    labels.replaceChildren();
    labelList = [];
    tapped = [];
    total.hidden = true;
  }

  /** Each tapped block carries its number in the order it was tapped, so counting by tapping reads without sound. */
  function numberTaps(): void {
    tapped.forEach(({ element: badge }, at) => (badge.textContent = String(at + 1)));
  }

  function light(index: number, on: boolean): void {
    const block = blocks.list[index];
    block.lit = on;
    blocks.hop(index, clock());
    const found = tapped.findIndex((one) => one.index === index);
    if (on && found < 0) {
      const badge = element('span', 'label label-tap');
      labels.append(badge);
      tapped.push({ index, element: badge });
      place(badge, toScreen(worldOf(index, 0.62)));
    } else if (!on && found >= 0) {
      tapped[found].element.remove();
      tapped.splice(found, 1);
    }
    numberTaps();
  }

  /** The curtain call takes over from the tapped numbers. */
  function dropTaps(): void {
    for (const { element: badge } of tapped) badge.remove();
    tapped = [];
  }

  function loadStack(heights: Heights, fresh: [number, number, number][], hidden: readonly string[], now: number): void {
    const width = heights[0].length;
    const depth = heights.length;
    const shown: Omit<Block, 'landAt' | 'hopAt' | 'lit' | 'counted' | 'hoverUntil' | 'shown'>[] = cubesOf(heights).map(([x, y, z]) => ({
      x,
      y,
      z,
      hidden: hidden.includes(`${x},${y},${z}`),
      fresh: false,
    }));
    for (const [x, y, z] of fresh) shown.push({ x, y, z, hidden: false, fresh: true });
    blocks.load(shown, now, calm());
    // Fresh blocks wait out of sight until the curtain call drops them in.
    for (const block of blocks.list) if (block.fresh) block.landAt = Infinity;
    blocks.setFootprint(width, depth, heights);
  }

  function frame(seconds: number): void {
    const now = clock();
    if (autoTurn && !calm()) turnGoal += seconds * 0.25;
    const pull = calm() ? 1 : 1 - Math.exp(-seconds * 6);
    pivot.rotation.y += (turnGoal - pivot.rotation.y) * pull;
    theatre.plinth.rotation.y = pivot.rotation.y;
    const bump = (now - bumpAt) / 0.32;
    pivot.position.y = bump >= 0 && bump < 1 && !calm() ? Math.sin(bump * Math.PI) * 0.18 : 0;
    blocks.frame(now, seconds, calm());
    const glowing = now - flashAt < 1.6;
    const pulse = glowing ? 0.5 + 0.5 * Math.sin((now - flashAt) * 9) : 0;
    (rods.material as MeshBasicMaterial).opacity = flashWhat === 'box' && glowing ? 0.5 + 0.5 * pulse : 0.9;
    peg.scale.setScalar(flashWhat === 'peg' && glowing ? 1 + pulse * 0.5 : 1);
    theatre.twinkle(seconds, labelList.length > 0);
    fitCamera(seconds);
    moveSpots();
    moveLabels();
    reportFit();
  }

  stage.onFrame(frame);
  stage.start();

  // ---------- Taps and turning ----------

  const raycaster = new Raycaster();
  const pointer = new Vector2();
  let drag: { id: number; x: number; from: number; turning: boolean } | null = null;

  function hitBlock(event: PointerEvent): number {
    const box = canvas.getBoundingClientRect();
    pointer.set(((event.clientX - box.left) / box.width) * 2 - 1, -((event.clientY - box.top) / box.height) * 2 + 1);
    raycaster.setFromCamera(pointer, camera);
    blocks.solid.computeBoundingSphere();
    const [hit] = raycaster.intersectObject(blocks.solid, false);
    return hit?.instanceId === undefined ? -1 : blocks.blockAt(hit.instanceId);
  }

  const litCount = (): number => blocks.list.filter((block) => block.lit).length;

  function toggle(index: number): number {
    light(index, !blocks.list[index].lit);
    return litCount();
  }

  canvas.addEventListener('pointerdown', (event) => {
    if (!shownLevel || host.dataset.locked === 'true') return;
    const index = hitBlock(event);
    if (index >= 0) {
      const lit = toggle(index);
      for (const listener of tapListeners) listener({ block: true, lit });
      return;
    }
    bumpAt = clock();
    for (const listener of tapListeners) listener({ block: false, lit: litCount() });
    if (shownLevel.turn && !drag) drag = { id: event.pointerId, x: event.clientX, from: turnGoal, turning: false };
  });
  canvas.addEventListener('pointermove', (event) => {
    if (!drag || drag.id !== event.pointerId) return;
    const moved = event.clientX - drag.x;
    if (!drag.turning && Math.abs(moved) > DRAG_PX) {
      drag.turning = true;
      for (const listener of turnListeners) listener();
    }
    if (drag.turning) turnGoal = drag.from + moved * DRAG_TURN;
  });
  for (const name of ['pointerup', 'pointercancel'] as const) {
    canvas.addEventListener(name, (event) => {
      if (drag?.id === event.pointerId) drag = null;
    });
  }

  function turn(): void {
    if (!shownLevel?.turn) return;
    turnGoal = Math.round(turnGoal / QUARTER) * QUARTER + QUARTER;
    for (const listener of turnListeners) listener();
  }
  onPress(turnButton, turn);

  function addLabel(step: RevealStep, kind: RevealKind): void {
    const made = element('span', `label label-${kind}${step.hidden ? ' label-hidden' : ''}`);
    made.textContent = String(step.n);
    labels.append(made);
    const label = { element: made, blocks: step.blocks };
    labelList.push(label);
    place(made, toScreen(worldOf(step.blocks[0], 0.62)));
    // On a tall stack only the newest few numbers stay big, so they don't pile up.
    labelList.slice(0, -1).forEach((older) => older.element.classList.add('label-old'));
  }

  return {
    ok: true,
    show(level) {
      shownLevel = level;
      autoTurn = false;
      turnGoal = 0;
      pivot.rotation.y = 0;
      clearLabels();
      const fresh: [number, number, number][] = [];
      if (level.ask === 'fill') {
        for (let y = 0; y < level.box; y += 1) {
          level.heights.forEach((row, z) =>
            row.forEach((height, x) => {
              if (y >= height) fresh.push([x, y, z]);
            }),
          );
        }
      }
      loadStack(level.heights, fresh, level.hidden, clock());
      footprint = { width: level.width, depth: level.depth, tall: Math.max(tallestOf(level.heights), level.box, 1), round: level.turn };
      theatre.fitTo(Math.max(level.width, level.depth, footprint.tall));
      aim(level.eye, targetFor(level.width, level.depth, footprint.tall), level.width, level.depth);
      drawBox(level);
      peg.visible = level.ask === 'map';
      peg.position.set(-level.width / 2 - 0.35, 0, level.depth / 2 + 0.35);
      turnButton.hidden = !level.turn;
      host.dataset.stack = heightsKey(level.heights);
      host.dataset.box = String(level.box);
      host.dataset.turn = String(level.turn);
      delete host.dataset.locked;
      lastFit = '';
    },
    idle() {
      shownLevel = null;
      clearLabels();
      const heights = [
        [3, 2, 1],
        [2, 2, 1],
        [1, 1, 0],
      ];
      loadStack(heights, [], [], clock());
      footprint = { width: 3, depth: 3, tall: 3, round: true };
      theatre.fitTo(3);
      aim(eyeFor(3, 3, 3), targetFor(3, 3, 3), 3, 3);
      drawBox(null);
      peg.visible = false;
      turnButton.hidden = true;
      autoTurn = true;
      delete host.dataset.stack;
    },
    lesson() {
      clearLabels();
      loadStack([[2]], [], [], clock());
      const [, top] = blocks.list;
      top.hoverUntil = clock() + 1.5;
      footprint = { width: 1, depth: 1, tall: 3, round: false };
      aim(eyeFor(1, 1, 3), targetFor(1, 1, 3), 1, 1);
      drawBox(null);
      peg.visible = false;
      turnButton.hidden = true;
      host.dataset.locked = 'true';
      return 2300;
    },
    turn,
    wobble() {
      blocks.wobble(clock());
    },
    open(on) {
      blocks.spreadTo(on ? 1 : 0);
      blocks.setGlass(on);
    },
    revealPlan(kind) {
      const list = blocks.list;
      if (kind === 'fill') {
        let n = 0;
        return list.flatMap((block, index) => (block.fresh ? [{ blocks: [index], n: ++n, hidden: false }] : []));
      }
      if (kind === 'map') {
        const columns = new Map<string, number[]>();
        list.forEach((block, index) => {
          const key = `${block.z},${block.x}`;
          columns.set(key, [...(columns.get(key) ?? []), index]);
        });
        return [...columns.entries()]
          .sort(([a], [b]) => a.localeCompare(b, undefined, { numeric: true }))
          .map(([, column]) => ({ blocks: column, n: column.length, hidden: column.some((index) => list[index].hidden) }));
      }
      // The blocks that show count first, then the ones that were hiding.
      const order = [...list.keys()].sort((a, b) => Number(list[a].hidden) - Number(list[b].hidden));
      return order.map((index, at) => ({ blocks: [index], n: at + 1, hidden: list[index].hidden }));
    },
    bow(step, kind) {
      dropTaps();
      const now = clock();
      for (const index of step.blocks) {
        const block = blocks.list[index];
        if (block.fresh) block.landAt = now + 0.35;
        block.counted = true;
        blocks.hop(index, block.fresh ? now + 0.35 : now);
      }
      addLabel(step, kind);
    },
    banner(text, tone) {
      total.hidden = text === null;
      if (text === null) return;
      total.textContent = text;
      total.dataset.tone = tone ?? 'right';
      total.classList.remove('pop');
      void total.offsetWidth;
      total.classList.add('pop');
    },
    flash(what) {
      flashAt = clock();
      flashWhat = what;
      if (what === 'stack') bumpAt = clock();
    },
    tapBlock(index) {
      if (blocks.list[index]) light(index, true);
      return litCount();
    },
    onTap(listener) {
      tapListeners.push(listener);
    },
    onTurn(listener) {
      turnListeners.push(listener);
    },
    spot(name, index = 0) {
      if (name === 'turn') return turnButton.hidden ? null : turnButton;
      const found = spotFor.get(name) ?? null;
      if (found && name === 'block') {
        found.dataset.index = String(index);
        if (blocks.list[index]) place(found, toScreen(worldOf(index)));
      }
      return found;
    },
    layout() {
      lastFit = '';
    },
    clear() {
      clearLabels();
    },
    lock(on) {
      if (on) host.dataset.locked = 'true';
      else delete host.dataset.locked;
    },
  };
}
