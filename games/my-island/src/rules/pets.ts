import { MOST_FOLLOWERS, PETS, TRICKS, petById, type CareAction, type Pet, type PetId, type Trick } from '../data/pets.ts';
import { islandLevel, recheckQuest, recordEvent } from './quests.ts';
import type { Island } from './state.ts';

export type PetLock = 'open' | 'home' | 'later';

/** Whether a pet can come home now, is already home, or arrives at a later Island Level. */
export function petLock(island: Island, pet: Pet): PetLock {
  if (island.pets.some(({ kind }) => kind === pet.id)) return 'home';
  return pet.level <= islandLevel(island) ? 'open' : 'later';
}

export const petsOpen = (island: Island): Pet[] => PETS.filter((pet) => petLock(island, pet) === 'open');

/** Brings a pet home. It joins the walking gang if there is room. Returns its index, or -1. */
export function adopt(island: Island, kind: PetId): number {
  if (petLock(island, petById(kind)) !== 'open') return -1;
  const followers = island.pets.filter(({ following }) => following).length;
  island.pets.push({ kind, hearts: 0, following: followers < MOST_FOLLOWERS });
  recheckQuest(island);
  return island.pets.length - 1;
}

/** Love only ever adds up, and every kind of care earns the same. Returns the funny thing the pet does back. */
export function care(island: Island, index: number, action: CareAction): Trick | null {
  const pet = island.pets[index];
  if (!pet) return null;
  pet.hearts += 1;
  recordEvent(island, { type: 'care', action });
  return TRICKS[pet.hearts % TRICKS.length] ?? 'hop';
}

/** Hearts to show, from 1 to 5. A new pet already has one. */
export const heartsShown = (hearts: number): number => Math.min(5, 1 + Math.floor(hearts / 2));

/** Asks a pet to come along or to play at home. A full gang sends its longest walker home to make room. */
export function setFollowing(island: Island, index: number, following: boolean): void {
  const pet = island.pets[index];
  if (!pet) return;
  if (following && !pet.following) {
    const walkers = island.pets.filter((other) => other.following);
    if (walkers.length >= MOST_FOLLOWERS && walkers[0]) walkers[0].following = false;
  }
  pet.following = following;
}
