import { suitsAge } from './filter.ts';
import type { Game } from './games.ts';

/** One child on this device. Nothing personal: just an animal to tap and an age. */
export interface Profile {
  id: string;
  avatar: string;
  age: number;
}

/** The choice that shows every game. */
export const EVERYONE = 'everyone';

export const AVATARS = ['🦊', '🐻', '🐼', '🐰', '🐯', '🦁', '🐸', '🐵', '🐨', '🦄', '🐧', '🐢'] as const;
export const MIN_AGE = 3;
export const MAX_AGE = 12;
export const MAX_PROFILES = 6;

export const DEFAULT_PROFILES: readonly Profile[] = [
  { id: 'p1', avatar: '🦊', age: 4 },
  { id: 'p2', avatar: '🐻', age: 6 },
];

function isProfile(value: unknown): value is Profile {
  if (typeof value !== 'object' || value === null) return false;
  const { id, avatar, age } = value as Record<string, unknown>;
  return (
    typeof id === 'string' &&
    id !== '' &&
    id !== EVERYONE &&
    (AVATARS as readonly unknown[]).includes(avatar) &&
    Number.isInteger(age) &&
    (age as number) >= MIN_AGE &&
    (age as number) <= MAX_AGE
  );
}

/**
 * Saved profiles can be missing, old or hand-edited. A list keeps only the entries
 * that make sense, once each, and anything that isn't a list gives the defaults.
 */
export function restoreProfiles(saved: unknown): Profile[] {
  if (!Array.isArray(saved)) return DEFAULT_PROFILES.map((profile) => ({ ...profile }));
  const kept: Profile[] = [];
  for (const entry of saved) {
    if (isProfile(entry) && !kept.some((profile) => profile.id === entry.id)) {
      kept.push({ id: entry.id, avatar: entry.avatar, age: entry.age });
    }
  }
  return kept.slice(0, MAX_PROFILES);
}

/** The remembered choice, or everyone once that profile is gone. */
export function restoreChosen(saved: unknown, profiles: readonly Profile[]): string {
  return profiles.find((profile) => profile.id === saved)?.id ?? EVERYONE;
}

/** A new profile with an animal nobody has yet, and an id never used on this list. */
export function addProfile(profiles: readonly Profile[]): Profile[] {
  if (profiles.length >= MAX_PROFILES) return [...profiles];
  const taken = new Set(profiles.map((profile) => profile.avatar));
  const avatar = AVATARS.find((animal) => !taken.has(animal)) ?? AVATARS[0];
  const highest = Math.max(0, ...profiles.map((profile) => Number(/^p(\d+)$/.exec(profile.id)?.[1] ?? 0)));
  return [...profiles, { id: `p${highest + 1}`, avatar, age: 5 }];
}

/** Changes one profile's animal or age, keeping both within what the portal offers. */
export function editProfile(
  profiles: readonly Profile[],
  id: string,
  change: Partial<Pick<Profile, 'avatar' | 'age'>>,
): Profile[] {
  return profiles.map((profile) => {
    if (profile.id !== id) return profile;
    const avatar = change.avatar && (AVATARS as readonly string[]).includes(change.avatar) ? change.avatar : profile.avatar;
    const age = Math.min(MAX_AGE, Math.max(MIN_AGE, Math.round(change.age ?? profile.age)));
    return { ...profile, avatar, age };
  });
}

export function removeProfile(profiles: readonly Profile[], id: string): Profile[] {
  return profiles.filter((profile) => profile.id !== id);
}

/** The games for whoever is playing. Everyone sees them all. */
export function gamesFor(games: readonly Game[], profile: Profile | undefined): Game[] {
  return profile ? games.filter((game) => suitsAge(game, profile.age)) : [...games];
}
