/** Every animal has exactly three clues. */
export const CLUE_COUNT = 3;
/** Animals in one round, so a round stays a couple of minutes long. */
export const ROUND_SIZE = 5;
/** The most stars one animal can earn. */
export const MOST_STARS = 3;

/**
 * Stars for one mystery animal, decided by how much help the family needed:
 * a right guess after the first clue earns 3, after the second 2, after the
 * third 1. "Show me" without a guess earns none.
 */
export function starsFor(cluesShown: number, guessed: boolean): number {
  if (!guessed) return 0;
  const clues = Math.min(Math.max(Math.round(cluesShown), 1), CLUE_COUNT);
  return MOST_STARS + 1 - clues;
}

/** The most stars a round of this many animals can earn. */
export function mostStarsFor(animals: number): number {
  return animals * MOST_STARS;
}

/**
 * The animals for the next round in a place: ones not met yet come first, in a
 * random order, then the rest, so playing again brings new faces before repeats.
 */
export function pickRound<T extends { id: string }>(
  animals: readonly T[],
  seen: ReadonlySet<string>,
  random: () => number = Math.random,
  size = ROUND_SIZE,
): T[] {
  const shuffled = shuffle(animals, random);
  const fresh = shuffled.filter((animal) => !seen.has(animal.id));
  const again = shuffled.filter((animal) => seen.has(animal.id));
  return [...fresh, ...again].slice(0, Math.min(size, animals.length));
}

export function shuffle<T>(items: readonly T[], random: () => number = Math.random): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}
