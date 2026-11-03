import type { Animal, Region } from '../data/types.ts';

/** Spoken after a reveal, by the stars it earned: none, then one, two or three. */
const OUTCOMES = [
  'Now you know!',
  'You got it! One star!',
  'Great! Two clues! Two stars!',
  'Wow! Just one clue! Three stars!',
] as const;

const starWord = (count: number) => (count === 1 ? 'star' : 'stars');

/** The words about one animal, in one language. */
export interface AnimalWords {
  name: string;
  /** Exactly three clues, ordered from vaguest to most giveaway. */
  clues: readonly [string, string, string];
  funFact: string;
}

/** The words about one wild place, in one language. */
export interface PlaceWords {
  name: string;
  description: string;
}

export const en = {
  title: 'Globe Safari',
  description:
    'Spin a real 3D Earth, tap anywhere, and guess which wild animals live there. A gentle geography game for families with kids aged 3 to 9.',
  homeLabel: 'Back to Playroom',
  globeLabel: 'A spinning 3D Earth. Tap anywhere to meet the animals that live there.',
  loading: 'Getting the Earth ready…',
  hint: 'Spin the Earth and tap anywhere to meet the animals!',
  loadError: 'Oops! The map could not load. Check your internet and try again.',
  travelLabel: 'Travel',
  surprise: 'Surprise me! 🎲',
  backToSpace: 'Back to space 🚀',
  stars: (count: number) => `${count} ${starWord(count)}`,

  whoLivesHere: '❓ Who lives here?',
  meetThemAll: '🃏 Meet them all',
  howToPlay: 'How to play',
  close: 'Close',
  inCountry: (country: string) => `📍 ${country}`,
  atSea: '🌊 Out at sea',
  readPlace: 'Read about this place',
  photoCredit: 'Photos: Wikipedia',

  whoAmI: 'Who am I?',
  progress: (number: number, total: number) => `Mystery animal ${number} of ${total}`,
  readClue: (number: number) => `Read clue ${number}`,
  readFact: 'Read the fun fact',
  nextClue: 'Another clue 🔍',
  noMoreClues: 'No more clues!',
  reveal: 'Show me ✨',
  gotIt: 'We got it!',
  gotItLabel: (stars: number) => `We got it! ${stars} ${starWord(stars)}`,
  outcome: (stars: number): string => OUTCOMES[stars] ?? OUTCOMES[0],
  nextAnimal: 'Next animal ➡️',
  toFinish: 'Our stars! 🏆',
  finishTitle: 'Hooray! 🎉',
  finishStars: (total: number, most: number) => `${total} of ${most} stars`,
  cheer: (total: number) =>
    total === 0
      ? 'Hooray! Now you know five new animals!'
      : `Hooray! You got ${total} ${starWord(total)}! Now you know five new animals.`,
  playAgain: 'Play again 🔁',

  tapMe: 'Tap me!',
  animalCard: (number: number) => `Animal card ${number}`,
  readAbout: (name: string) => `Read about the ${name}`,

  place: (region: Region): PlaceWords => region,
  animal: (_region: Region, animal: Animal): AnimalWords => animal,
  country: (englishName: string) => englishName,
  placeSpoken: (place: PlaceWords) => `${place.name}. ${place.description}`,
  factSpoken: (animal: AnimalWords) => `${animal.name}! ${animal.funFact}`,
};

export type Text = typeof en;
