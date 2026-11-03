// Working a board out. The hint, the tests and the skilled bot all use this search, so the game never hints at
// a move the bot can't play.
import { allItems, boardKey, difference, isolated, MYSTERIES, tapItem, type Board, type Mystery, type Values } from './board.ts';
import type { Level } from './levels.ts';

const MOST_STEPS = 10;

/** Some seesaw shows this mystery alone against plain weights. */
export function readable(board: Board, mystery: Mystery): boolean {
  return board.seesaws.some((seesaw) => isolated(seesaw, mystery) !== null);
}

/** What the mystery weighs, read straight off the board, once it stands alone. */
export function readOff(board: Board, mystery: Mystery): number | null {
  for (const seesaw of board.seesaws) {
    const alone = isolated(seesaw, mystery);
    if (alone && alone.total % alone.count === 0) return alone.total / alone.count;
  }
  return null;
}

/**
 * The fewest taps that leave the mystery standing alone, so it can be read off. Empty when it already does,
 * and null when nothing the player can tap gets there.
 */
export function stepsTo(board: Board, mystery: Mystery): string[] | null {
  if (readable(board, mystery)) return [];
  const seen = new Set([boardKey(board)]);
  let layer: { board: Board; taps: string[] }[] = [{ board, taps: [] }];
  for (let depth = 0; depth < MOST_STEPS && layer.length; depth += 1) {
    const next: typeof layer = [];
    for (const { board: from, taps } of layer) {
      for (const item of allItems(from)) {
        const { board: after, effect } = tapItem(from, item.id, { fixedGiven: false });
        if (effect.type === 'stuck') continue;
        const key = boardKey(after);
        if (seen.has(key)) continue;
        seen.add(key);
        const path = [...taps, item.id];
        if (readable(after, mystery)) return path;
        next.push({ board: after, taps: path });
      }
    }
    layer = next;
  }
  return null;
}

/** Every whole-number answer from 0 to the limit that balances all the seesaws at once. */
export function solutions(level: Level, limit = 60): Values[] {
  const used = MYSTERIES.filter((mystery) => level.seesaws.some((plan) => [...plan.left, ...plan.right].includes(mystery)));
  const found: Values[] = [];
  const tryAll = (at: number, values: Values): void => {
    if (at === used.length) {
      const balanced = level.seesaws.every((plan) => {
        const total = (tokens: (string | number)[]) =>
          tokens.reduce<number>((sum, token) => sum + (typeof token === 'number' ? token : (values[token as Mystery] ?? 0)), 0);
        return total(plan.left) === total(plan.right);
      });
      if (balanced) found.push({ ...values });
      return;
    }
    for (let n = 0; n <= limit; n += 1) tryAll(at + 1, { ...values, [used[at]]: n });
  };
  tryAll(0, {});
  return found;
}

/** Every seesaw is level with these values. */
export const balanced = (board: Board, values: Values): boolean => board.seesaws.every((seesaw) => difference(seesaw, values) === 0);
