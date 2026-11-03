// The seesaws on screen. Each plank tips by the real difference between its sides, through a springy wobble,
// and the baskets on its ends stay upright so the stacks never slide. A bubble level sits in the middle of
// every plank and glows when the sides are equal.
import { describe, difference, findItem, isolated, opposite, SIDES, type Board, type Effect, type Item, type Mystery, type SideName, type Values } from '../rules/board.ts';
import type { Level } from '../rules/levels.ts';
import { calm, element, onPress } from '../ui.ts';
import { itemButton, peek, unpeek } from './items.ts';

const MOST_DEGREES = 15;
/** A difference of this much tips the plank about three quarters of the way. */
const TIP_SCALE = 4;
const SPRING = 95;
const DAMPING = 9;
const SETTLED = 0.05;
const GAP = 6;
const PLATE = 12;
const POST = 26;
const LARGEST_ITEM = 88;
const SMALLEST_ITEM = 52;
const GHOST_MS = 520;

interface Basket {
  anchor: HTMLElement;
  stack: HTMLElement;
}

interface Rig {
  root: HTMLElement;
  plank: HTMLElement;
  bubble: HTMLElement;
  drum: HTMLElement;
  baskets: Record<SideName, Basket>;
  angle: number;
  velocity: number;
  target: number;
  width: number;
  height: number;
  arm: number;
  pivotY: number;
}

export interface Scene {
  show(level: Level, board: Board): void;
  update(board: Board, effect?: Effect): void;
  /** What the mysteries weigh for the tilt: the truth, or a wrong guess for a moment. */
  weigh(values: Values): void;
  peekAll(mystery: Mystery, value: number): void;
  unpeekAll(): void;
  hint(ids: readonly string[]): void;
  hintIsolated(board: Board, mystery: Mystery): void;
  wiggle(id: string): void;
  itemRect(id: string): DOMRect | null;
  cheer(): void;
  layout(): void;
  /** Who hears taps on the items. */
  onTap(listener: (id: string) => void): void;
}

const tipFor = (lean: number): number => MOST_DEGREES * Math.tanh(lean / TIP_SCALE);
const radians = (degrees: number): number => (degrees * Math.PI) / 180;

function makeRig(index: number): Rig {
  const root = element('div', 'rig');
  root.dataset.seesaw = String(index);
  const ring = element('div', 'ring');
  const drum = element('div', 'drum');
  const plank = element('div', 'plank');
  const vial = element('span', 'vial');
  const bubble = element('span', 'bubble');
  vial.append(bubble);
  plank.append(vial);
  const basket = (side: SideName): Basket => {
    const anchor = element('div', `basket basket-${side}`);
    anchor.dataset.side = side;
    const stack = element('div', 'stack');
    anchor.append(element('span', 'post'), element('span', 'plate'), stack);
    return { anchor, stack };
  };
  const baskets = { left: basket('left'), right: basket('right') };
  root.append(ring, drum, plank, baskets.left.anchor, baskets.right.anchor);
  return { root, plank, bubble, drum, baskets, angle: 0, velocity: 0, target: 0, width: 0, height: 0, arm: 0, pivotY: 0 };
}

function placeRig(rig: Rig): void {
  const radiansNow = radians(rig.angle);
  const centre = rig.width / 2;
  rig.plank.style.transform = `rotate(${rig.angle.toFixed(2)}deg)`;
  rig.bubble.style.transform = `translateX(${(-rig.angle * 1.4).toFixed(1)}px)`;
  for (const side of SIDES) {
    const sign = side === 'left' ? -1 : 1;
    const x = centre + sign * rig.arm * Math.cos(radiansNow);
    const y = rig.pivotY + sign * rig.arm * Math.sin(radiansNow);
    rig.baskets[side].anchor.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px)`;
  }
  const level = rig.target === 0 && Math.abs(rig.angle) < 0.4;
  rig.root.classList.toggle('is-level', level);
}

export function createScene(host: HTMLElement): Scene {
  let onTap: (id: string) => void = () => {};
  let rigs: Rig[] = [];
  let board: Board | null = null;
  let level: Level | null = null;
  let values: Values = {};
  let capacity = 1;
  let frame = 0;
  let last = 0;

  function step(now: number): void {
    const seconds = Math.min(0.034, (now - last) / 1000 || 0.016);
    last = now;
    let moving = false;
    for (const rig of rigs) {
      if (calm()) {
        rig.angle = rig.target;
        rig.velocity = 0;
      } else {
        rig.velocity += (SPRING * (rig.target - rig.angle) - DAMPING * rig.velocity) * seconds;
        rig.angle += rig.velocity * seconds;
        if (Math.abs(rig.target - rig.angle) < SETTLED && Math.abs(rig.velocity) < SETTLED) {
          rig.angle = rig.target;
          rig.velocity = 0;
        } else moving = true;
      }
      placeRig(rig);
    }
    frame = moving ? requestAnimationFrame(step) : 0;
  }

  function kick(): void {
    if (frame) return;
    last = performance.now();
    frame = requestAnimationFrame(step);
  }

  function retarget(): void {
    if (!board) return;
    board.seesaws.forEach((seesaw, at) => {
      const rig = rigs[at];
      if (!rig) return;
      const lean = difference(seesaw, values);
      rig.target = tipFor(lean);
      rig.root.dataset.lean = String(Math.sign(lean));
      rig.root.dataset.picture = describe(seesaw);
    });
    kick();
  }

  function mostOnASide(next: Board): number {
    const counts = next.seesaws.flatMap((seesaw) => SIDES.map((side) => seesaw[side].length));
    return Math.max(1, ...counts);
  }

  function itemSize(rig: Rig, basketWidth: number): number {
    const rise = rig.arm * Math.sin(radians(MOST_DEGREES));
    const room = rig.pivotY - rise - POST - PLATE - 4;
    for (let size = LARGEST_ITEM; size > SMALLEST_ITEM; size -= 2) {
      const columns = Math.max(1, Math.floor((basketWidth + GAP) / (size + GAP)));
      const rows = Math.ceil(capacity / columns);
      if (rows * (size + GAP) <= room) return size;
    }
    return SMALLEST_ITEM;
  }

  function layout(): void {
    const width = host.clientWidth;
    const height = host.clientHeight;
    if (!width || !height || !rigs.length) return;
    const sideBySide = rigs.length > 1 && width > height * 1.15;
    const across = sideBySide ? rigs.length : 1;
    const down = sideBySide ? 1 : rigs.length;
    const cellWidth = width / across;
    const cellHeight = height / down;
    const rigWidth = Math.min(cellWidth, 760, cellHeight * 2.3);
    let size = LARGEST_ITEM;
    const geometry = rigs.map((rig) => {
      rig.width = rigWidth;
      rig.height = cellHeight;
      rig.arm = rigWidth * 0.26;
      const drumHeight = Math.max(28, Math.min(62, cellHeight * 0.12));
      rig.pivotY = cellHeight - drumHeight - 4;
      const basketWidth = rigWidth * 0.46;
      size = Math.min(size, itemSize(rig, basketWidth));
      return { drumHeight, basketWidth };
    });
    rigs.forEach((rig, at) => {
      const { drumHeight, basketWidth } = geometry[at];
      const column = sideBySide ? at : 0;
      const row = sideBySide ? 0 : at;
      Object.assign(rig.root.style, {
        left: `${column * cellWidth + (cellWidth - rigWidth) / 2}px`,
        top: `${row * cellHeight}px`,
        width: `${rigWidth}px`,
        height: `${cellHeight}px`,
      });
      rig.root.style.setProperty('--item', `${size}px`);
      rig.root.style.setProperty('--basket', `${basketWidth}px`);
      const plankLength = rigWidth * 0.7;
      Object.assign(rig.plank.style, { left: `${(rigWidth - plankLength) / 2}px`, top: `${rig.pivotY - 9}px`, width: `${plankLength}px` });
      const drumWidth = Math.max(64, Math.min(120, rigWidth * 0.2));
      Object.assign(rig.drum.style, { left: `${(rigWidth - drumWidth) / 2}px`, top: `${rig.pivotY}px`, width: `${drumWidth}px`, height: `${drumHeight}px` });
      placeRig(rig);
    });
  }

  function render(): void {
    if (!board) return;
    board.seesaws.forEach((seesaw, at) => {
      const rig = rigs[at];
      for (const side of SIDES) {
        rig.baskets[side].stack.replaceChildren(
          ...seesaw[side].map((item: Item) => {
            const made = itemButton(item);
            onPress(made, () => onTap(item.id));
            return made;
          }),
        );
      }
    });
    const openSide = level?.open;
    rigs.forEach((rig, at) => {
      for (const side of SIDES) rig.baskets[side].anchor.classList.toggle('open', at === 0 && side === openSide);
    });
  }

  const elementFor = (id: string): HTMLElement | null => host.querySelector<HTMLElement>(`[data-item="${id}"]`);

  function ghost(id: string, to: { x: number; y: number } | null, className: string): void {
    const from = elementFor(id);
    if (!from) return;
    const box = from.getBoundingClientRect();
    const copy = from.cloneNode(true) as HTMLElement;
    copy.removeAttribute('data-item');
    copy.classList.add('ghost', className);
    copy.setAttribute('aria-hidden', 'true');
    Object.assign(copy.style, { left: `${box.left}px`, top: `${box.top}px`, width: `${box.width}px`, height: `${box.height}px` });
    document.body.append(copy);
    const dx = to ? to.x - (box.left + box.width / 2) : 0;
    const dy = to ? to.y - (box.top + box.height / 2) : -60;
    const motion = calm()
      ? [{ opacity: 1 }, { opacity: 0 }]
      : [
          { transform: 'translate(0, 0) scale(1)', opacity: 1 },
          { transform: `translate(${dx * 0.6}px, ${dy * 0.6 - 30}px) scale(0.9)`, opacity: 1, offset: 0.6 },
          { transform: `translate(${dx}px, ${dy}px) scale(0.3)`, opacity: 0 },
        ];
    copy.animate(motion, { duration: GHOST_MS, easing: 'ease-in-out' }).finished.then(
      () => copy.remove(),
      () => copy.remove(),
    );
  }

  function pivotPoint(at: number): { x: number; y: number } {
    const rig = rigs[at];
    const box = rig.root.getBoundingClientRect();
    return { x: box.left + rig.width / 2, y: box.top + rig.pivotY - 70 };
  }

  function spark(at: number, label: string, className: string): void {
    const rig = rigs[at];
    if (!rig) return;
    const made = element('span', `spark ${className}`);
    made.textContent = label;
    made.style.left = `${rig.width / 2}px`;
    made.style.top = `${rig.pivotY - 70}px`;
    rig.root.append(made);
    window.setTimeout(() => made.remove(), 900);
  }

  /** A "−2" floating up from the top of a basket's stack. */
  function minus(at: number, side: SideName, amount: number): void {
    const basket = rigs[at]?.baskets[side];
    if (!basket) return;
    const made = element('span', 'spark spark-minus');
    made.textContent = `−${amount}`;
    made.style.left = '0px';
    made.style.top = `${-(POST + PLATE + basket.stack.offsetHeight + 26)}px`;
    basket.anchor.append(made);
    window.setTimeout(() => made.remove(), 900);
  }

  function flash(ids: readonly string[], className: string): void {
    for (const id of ids) {
      const made = elementFor(id);
      if (made) made.classList.add(className);
    }
  }

  function before(effect: Effect, previous: Board): void {
    if (effect.type === 'pair') {
      const meet = pivotPoint(effect.seesaw);
      for (const id of effect.ids) ghost(id, meet, 'ghost-pair');
      spark(effect.seesaw, '=', 'spark-equal');
    } else if (effect.type === 'take') {
      for (const id of effect.gone) ghost(id, null, 'ghost-take');
      const where = findItem(previous, effect.gone[0] ?? effect.changed[0] ?? '');
      const side = where?.side ?? 'left';
      minus(effect.seesaw, side, effect.amount);
      minus(effect.seesaw, opposite(side), effect.amount);
    } else if (effect.type === 'swap') {
      ghost(effect.id, pivotPoint(effect.from), 'ghost-swap');
    } else if (effect.type === 'back') {
      ghost(effect.id, null, 'ghost-take');
    }
  }

  function after(effect: Effect): void {
    if (effect.type === 'take') flash(effect.changed, 'shrunk');
    if (effect.type === 'swap') flash(effect.added, 'arrived');
    if (effect.type === 'place') flash([effect.id], 'arrived');
  }

  return {
    show(nextLevel, nextBoard) {
      level = nextLevel;
      board = nextBoard;
      values = nextLevel.values;
      // Room for what a side usually grows to: a few tray weights, or a swap on the last world.
      const extra = nextLevel.open ? Math.min(3, nextLevel.tray.length) : nextLevel.world === 'two' ? 2 : 0;
      capacity = mostOnASide(nextBoard) + extra;
      rigs = nextBoard.seesaws.map((_, at) => makeRig(at));
      host.replaceChildren(...rigs.map((rig) => rig.root));
      host.dataset.count = String(rigs.length);
      render();
      layout();
      retarget();
      for (const rig of rigs) {
        rig.angle = rig.target;
        placeRig(rig);
      }
    },
    update(nextBoard, effect) {
      const previous = board;
      if (effect && previous) before(effect, previous);
      board = nextBoard;
      const grown = mostOnASide(nextBoard);
      if (grown > capacity) {
        capacity = grown;
        layout();
      }
      render();
      if (effect) after(effect);
      retarget();
    },
    weigh(next) {
      values = next;
      retarget();
    },
    peekAll(mystery, value) {
      for (const made of host.querySelectorAll<HTMLElement>(`[data-mystery="${mystery}"]`)) peek(made, value);
    },
    unpeekAll() {
      for (const made of host.querySelectorAll<HTMLElement>('.peek')) unpeek(made);
    },
    hint(ids) {
      for (const made of host.querySelectorAll('.hint')) made.classList.remove('hint');
      flash(ids, 'hint');
    },
    hintIsolated(current, mystery) {
      current.seesaws.forEach((seesaw) => {
        const alone = isolated(seesaw, mystery);
        if (alone) flash(seesaw[opposite(alone.side)].map((item) => item.id), 'hint');
      });
    },
    wiggle(id) {
      const made = elementFor(id);
      if (!made) return;
      made.classList.remove('wiggle');
      void made.offsetWidth;
      made.classList.add('wiggle');
    },
    itemRect(id) {
      return elementFor(id)?.getBoundingClientRect() ?? null;
    },
    cheer() {
      for (const rig of rigs) rig.root.classList.add('cheering');
    },
    layout,
    onTap(listener) {
      onTap = listener;
    },
  };
}
