import type { Game, Skill } from './games.ts';

export type ShelfId = 'new' | 'recent' | 'brain' | 'fun' | 'action' | 'challenge' | 'explore';

/** How many of the newest games the ✨ shelf shows. */
export const NEW_COUNT = 6;

export const SHELF_EMOJI: Record<ShelfId, string> = {
  new: '✨',
  recent: '🔁',
  brain: '🧠',
  fun: '🎉',
  action: '⚡',
  challenge: '🔥',
  explore: '🌍',
};

/** The skill shelves, top to bottom. Every skill sits on at least one, so a new game always lands somewhere. */
export const SKILL_SHELVES: readonly { id: ShelfId; skills: readonly Skill[] }[] = [
  { id: 'brain', skills: ['logic', 'numbers', 'memory', 'reading', 'colors'] },
  { id: 'fun', skills: ['fun'] },
  { id: 'action', skills: ['action', '3d', 'moving'] },
  { id: 'challenge', skills: ['challenge'] },
  { id: 'explore', skills: ['world'] },
];

export interface Shelf {
  id: ShelfId;
  games: Game[];
}

/**
 * The shelves for these games, in order, leaving out any that would be empty.
 * The registry is in the order games were added, so the newest are at its end,
 * and the ✨ shelf shows them newest first. A game can sit on several shelves,
 * and games still coming soon wait at the end of each one.
 */
export function buildShelves(games: readonly Game[], recent: readonly Game[]): Shelf[] {
  const shelves: Shelf[] = [
    { id: 'new', games: games.slice(-NEW_COUNT).reverse() },
    { id: 'recent', games: [...recent] },
    ...SKILL_SHELVES.map(({ id, skills }) => ({
      id,
      games: games.filter((game) => game.skills.some((skill) => skills.includes(skill))),
    })),
  ];
  return shelves
    .filter((shelf) => shelf.games.length > 0)
    .map((shelf) => ({ ...shelf, games: readyFirst(shelf.games) }));
}

/** Playable games lead each shelf, so the first tile a child taps always opens something. */
function readyFirst(games: readonly Game[]): Game[] {
  return [...games.filter((game) => game.status === 'ready'), ...games.filter((game) => game.status !== 'ready')];
}
