import type { AnimalWords, PlaceWords } from '../en.ts';

/** One wild place in another language, with its animals keyed by the animal's id in that place. */
export interface TranslatedPlace extends PlaceWords {
  animals: Record<string, AnimalWords>;
}

export function animal(name: string, clues: AnimalWords['clues'], funFact: string): AnimalWords {
  return { name, clues, funFact };
}
