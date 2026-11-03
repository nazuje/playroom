import type { Game } from './games.ts';

/** How many games each player's "played lately" shelf remembers. */
export const RECENT_LIMIT = 8;

/** Slugs played lately, newest first, for each profile id (or everyone). */
export type RecentPlays = Record<string, string[]>;

/** Puts a game at the front of the list, once, and forgets the oldest past the limit. */
export function recordPlay(list: readonly string[], slug: string, limit = RECENT_LIMIT): string[] {
  return [slug, ...list.filter((played) => played !== slug)].slice(0, limit);
}

/** Saved plays can be missing or odd, so only lists of names survive, deduped and capped. */
export function restoreRecent(saved: unknown): RecentPlays {
  const restored: RecentPlays = {};
  if (typeof saved !== 'object' || saved === null || Array.isArray(saved)) return restored;
  for (const [who, list] of Object.entries(saved)) {
    if (!Array.isArray(list)) continue;
    const slugs = list.filter((slug): slug is string => typeof slug === 'string');
    restored[who] = [...new Set(slugs)].slice(0, RECENT_LIMIT);
  }
  return restored;
}

/** The games behind the slugs, in the same order, skipping any that are gone or not shown. */
export function recentGames(slugs: readonly string[], games: readonly Game[]): Game[] {
  return slugs.flatMap((slug) => games.find((game) => game.slug === slug) ?? []);
}
