// The seesaws and the things on them, as plain data. Every move here keeps the truth: a move that takes the
// same weight off both sides leaves a level seesaw level, and nothing ever changes what a mystery weighs.

export type Mystery = 'box' | 'hat';
export const MYSTERIES: readonly Mystery[] = ['box', 'hat'];
export type SideName = 'left' | 'right';
export const SIDES: readonly SideName[] = ['left', 'right'];

export interface MysteryItem {
  id: string;
  kind: 'mystery';
  mystery: Mystery;
}

export interface WeightItem {
  id: string;
  kind: 'weight';
  value: number;
  /** Put on by the player from the tray, so a tap takes it back. */
  loose?: true;
  /** A mystery that was worked out, now showing its number. */
  opened?: Mystery;
}

export type Item = MysteryItem | WeightItem;

export interface Seesaw {
  left: Item[];
  right: Item[];
}

export interface Board {
  seesaws: Seesaw[];
  /** Weights waiting to be put on, in the order the tray shows them. */
  tray: WeightItem[];
  /** How many new items have been made, for their ids. */
  made: number;
}

export type Values = Partial<Record<Mystery, number>>;

export type Effect =
  | { type: 'pair'; seesaw: number; ids: [string, string] }
  | { type: 'take'; seesaw: number; amount: number; gone: string[]; changed: string[] }
  | { type: 'swap'; seesaw: number; from: number; id: string; added: string[]; changed: string[] }
  | { type: 'back'; seesaw: number; id: string }
  | { type: 'place'; seesaw: number; id: string }
  | { type: 'stuck'; id: string; why: 'alone' | 'fixed' | 'empty' };

export interface Move {
  board: Board;
  effect: Effect;
}

export const opposite = (side: SideName): SideName => (side === 'left' ? 'right' : 'left');

export function weightOf(item: Item, values: Values): number {
  return item.kind === 'weight' ? item.value : (values[item.mystery] ?? 0);
}

export const sideTotal = (items: readonly Item[], values: Values): number =>
  items.reduce((sum, item) => sum + weightOf(item, values), 0);

/** Positive when the right side is heavier, which tips the right end down. */
export const difference = (seesaw: Seesaw, values: Values): number =>
  sideTotal(seesaw.right, values) - sideTotal(seesaw.left, values);

const plainTotal = (items: readonly Item[]): number =>
  items.reduce((sum, item) => sum + (item.kind === 'weight' ? item.value : 0), 0);

export interface Spot {
  seesaw: number;
  side: SideName;
  index: number;
  item: Item;
}

export function findItem(board: Board, id: string): Spot | null {
  for (let seesaw = 0; seesaw < board.seesaws.length; seesaw += 1) {
    for (const side of SIDES) {
      const index = board.seesaws[seesaw][side].findIndex((item) => item.id === id);
      if (index >= 0) return { seesaw, side, index, item: board.seesaws[seesaw][side][index] };
    }
  }
  return null;
}

const copySeesaw = (seesaw: Seesaw): Seesaw => ({ left: [...seesaw.left], right: [...seesaw.right] });

function withSeesaw(board: Board, index: number, seesaw: Seesaw, extra: Partial<Board> = {}): Board {
  return { ...board, ...extra, seesaws: board.seesaws.map((one, at) => (at === index ? seesaw : one)) };
}

const isPlain = (item: Item): boolean => item.kind === 'weight' && !item.loose && !item.opened;
const isMystery = (item: Item, mystery: Mystery): boolean => item.kind === 'mystery' && item.mystery === mystery;
const hasMystery = (items: readonly Item[]): boolean => items.some((item) => item.kind === 'mystery');

export interface Isolated {
  side: SideName;
  /** How many of the mystery sit alone on that side. */
  count: number;
  /** What the other side weighs: only plain weights are there. */
  total: number;
}

/** A side holding nothing but this mystery, against a side of plain weights: the mystery can be read off. */
export function isolated(seesaw: Seesaw, mystery: Mystery): Isolated | null {
  for (const side of SIDES) {
    const own = seesaw[side];
    const other = seesaw[opposite(side)];
    if (own.length > 0 && own.every((item) => isMystery(item, mystery)) && !hasMystery(other)) {
      return { side, count: own.length, total: plainTotal(other) };
    }
  }
  return null;
}

/** One mystery alone on a side, so it can be swapped for what the other side holds. */
function swapSource(seesaw: Seesaw, mystery: Mystery): Item[] | null {
  for (const side of SIDES) {
    const own = seesaw[side];
    const other = seesaw[opposite(side)];
    if (own.length === 1 && isMystery(own[0], mystery) && !other.some((item) => isMystery(item, mystery)) && other.length > 0) {
      return other;
    }
  }
  return null;
}

/** Takes an amount off a side's plain weights, biggest first. Returns the ids that went and those that shrank. */
function takeOff(items: Item[], amount: number): { items: Item[]; gone: string[]; changed: string[] } {
  const gone: string[] = [];
  const changed: string[] = [];
  let left = amount;
  const order = items
    .map((item, index) => ({ item, index }))
    .filter(({ item }) => item.kind === 'weight')
    .sort((a, b) => (b.item as WeightItem).value - (a.item as WeightItem).value || a.index - b.index);
  const next = [...items];
  for (const { item, index } of order) {
    if (left === 0) break;
    const weight = item as WeightItem;
    const taken = Math.min(weight.value, left);
    left -= taken;
    if (taken === weight.value) gone.push(weight.id);
    else {
      next[index] = { ...weight, value: weight.value - taken };
      changed.push(weight.id);
    }
  }
  return { items: next.filter((item) => !gone.includes(item.id)), gone, changed };
}

function tapMystery(board: Board, spot: Spot, mystery: Mystery): Move {
  const seesaw = board.seesaws[spot.seesaw];
  const otherSide = opposite(spot.side);
  const twin = seesaw[otherSide].find((item) => isMystery(item, mystery));
  if (twin) {
    const next = copySeesaw(seesaw);
    next[spot.side] = next[spot.side].filter((item) => item.id !== spot.item.id);
    next[otherSide] = next[otherSide].filter((item) => item.id !== twin.id);
    return { board: withSeesaw(board, spot.seesaw, next), effect: { type: 'pair', seesaw: spot.seesaw, ids: [spot.item.id, twin.id] } };
  }
  for (let from = 0; from < board.seesaws.length; from += 1) {
    if (from === spot.seesaw) continue;
    const source = swapSource(board.seesaws[from], mystery);
    if (!source) continue;
    let made = board.made;
    let side = [...seesaw[spot.side].slice(0, spot.index), ...seesaw[spot.side].slice(spot.index + 1)];
    const added: Item[] = [];
    const changed: string[] = [];
    for (const item of source) {
      // A plain weight joins one already on that side, so a stack never grows past what the screen holds.
      const plain = item.kind === 'weight' ? side.findIndex(isPlain) : -1;
      if (item.kind === 'weight' && plain >= 0) {
        const into = side[plain] as WeightItem;
        side = side.map((one, at) => (at === plain ? { ...into, value: into.value + item.value } : one));
        changed.push(into.id);
        continue;
      }
      made += 1;
      added.push({ ...item, id: `n${made}` });
    }
    const at = Math.min(spot.index, side.length);
    side = [...side.slice(0, at), ...added, ...side.slice(at)];
    const next = copySeesaw(seesaw);
    next[spot.side] = side;
    return {
      board: withSeesaw(board, spot.seesaw, next, { made }),
      effect: { type: 'swap', seesaw: spot.seesaw, from, id: spot.item.id, added: added.map((item) => item.id), changed },
    };
  }
  return { board, effect: { type: 'stuck', id: spot.item.id, why: 'alone' } };
}

function tapWeight(board: Board, spot: Spot, weight: WeightItem, fixedGiven: boolean): Move {
  const seesaw = board.seesaws[spot.seesaw];
  if (weight.loose) {
    const next = copySeesaw(seesaw);
    next[spot.side] = next[spot.side].filter((item) => item.id !== weight.id);
    const tray = [...board.tray, { id: weight.id, kind: 'weight', value: weight.value } as WeightItem].sort(byTrayOrder);
    return { board: withSeesaw(board, spot.seesaw, next, { tray }), effect: { type: 'back', seesaw: spot.seesaw, id: weight.id } };
  }
  if (fixedGiven) return { board, effect: { type: 'stuck', id: weight.id, why: 'fixed' } };
  const otherSide = opposite(spot.side);
  const amount = Math.min(weight.value, plainTotal(seesaw[otherSide]));
  if (amount === 0) return { board, effect: { type: 'stuck', id: weight.id, why: 'empty' } };
  const next = copySeesaw(seesaw);
  // The tapped weight gives up the whole amount itself, so the move is the one the player chose.
  const used = amount === weight.value;
  next[spot.side] = used
    ? next[spot.side].filter((item) => item.id !== weight.id)
    : next[spot.side].map((item) => (item.id === weight.id ? { ...weight, value: weight.value - amount } : item));
  const other = takeOff(next[otherSide], amount);
  next[otherSide] = other.items;
  const own = used ? { gone: [weight.id], changed: [] } : { gone: [], changed: [weight.id] };
  return {
    board: withSeesaw(board, spot.seesaw, next),
    effect: { type: 'take', seesaw: spot.seesaw, amount, gone: [...own.gone, ...other.gone], changed: [...own.changed, ...other.changed] },
  };
}

const trayIndex = (id: string): number => Number(id.slice(1));
const byTrayOrder = (a: WeightItem, b: WeightItem): number => trayIndex(a.id) - trayIndex(b.id);

export interface TapRules {
  /** On "make it level" boards the given weights stay put. */
  fixedGiven: boolean;
}

/**
 * A tap on something on a seesaw. A mystery with a twin on the other side leaves with it. A weight takes the
 * same amount off both sides. A mystery alone on another seesaw's side swaps for what that side holds. A
 * weight the player put on goes back to the tray. Anything else stays and wiggles.
 */
export function tapItem(board: Board, id: string, rules: TapRules): Move {
  const spot = findItem(board, id);
  if (!spot) return { board, effect: { type: 'stuck', id, why: 'fixed' } };
  const { item } = spot;
  return item.kind === 'mystery' ? tapMystery(board, spot, item.mystery) : tapWeight(board, spot, item, rules.fixedGiven);
}

/** A tray weight goes onto a side. */
export function placeFromTray(board: Board, trayId: string, seesaw: number, side: SideName): Move | null {
  const weight = board.tray.find((item) => item.id === trayId);
  if (!weight || !board.seesaws[seesaw]) return null;
  const next = copySeesaw(board.seesaws[seesaw]);
  next[side] = [...next[side], { ...weight, loose: true }];
  return {
    board: withSeesaw(board, seesaw, next, { tray: board.tray.filter((item) => item.id !== trayId) }),
    effect: { type: 'place', seesaw, id: trayId },
  };
}

/** A worked-out mystery opens everywhere and shows its number from then on. */
export function openMystery(board: Board, mystery: Mystery, value: number): Board {
  const open = (items: Item[]): Item[] =>
    items.map((item) => (isMystery(item, mystery) ? { id: item.id, kind: 'weight', value, opened: mystery } : item));
  return { ...board, seesaws: board.seesaws.map((seesaw) => ({ left: open(seesaw.left), right: open(seesaw.right) })) };
}

export const allItems = (board: Board): Item[] => board.seesaws.flatMap((seesaw) => [...seesaw.left, ...seesaw.right]);

const token = (item: Item): string => (item.kind === 'mystery' ? item.mystery : String(item.value));

/** The same board however its items are ordered or named. */
export function boardKey(board: Board): string {
  return board.seesaws
    .map((seesaw) => SIDES.map((side) => seesaw[side].map(token).sort().join(',')).join('='))
    .join('|');
}

/** A readable picture of one seesaw, for tests and the bots: "box+box+3=7". */
export function describe(seesaw: Seesaw): string {
  return SIDES.map((side) => seesaw[side].map(token).join('+') || '0').join('=');
}
