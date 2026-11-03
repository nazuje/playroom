import { slCount, type SlForms } from '@playroom/kit';
import { mostStarsFor, ROUND_SIZE } from '../game/score.ts';
import { SL_COUNTRIES } from './countries.ts';
import type { AnimalWords, PlaceWords, Text } from './en.ts';
import { SL_PLACES } from './places/index.ts';

const STAR: SlForms = { one: 'zvezdica', two: 'zvezdici', few: 'zvezdice', many: 'zvezdic' };
/** "Imate ..." takes the accusative: eno zvezdico. */
const STAR_ACC: SlForms = { ...STAR, one: 'zvezdico' };
/** A round's stars as words, so the voice says them the way the line needs. Index 0 is one star. */
const STARS_SAID = [
  'eno',
  'dve',
  'tri',
  'štiri',
  'pet',
  'šest',
  'sedem',
  'osem',
  'devet',
  'deset',
  'enajst',
  'dvanajst',
  'trinajst',
  'štirinajst',
  'petnajst',
];

/** Spoken after a reveal, by the stars it earned. No past tense, which would give the players a gender. */
const OUTCOMES = [
  'Zdaj pa veste!',
  'Bravo! Ena zvezdica!',
  'Bravo! Po drugem namigu! Dve zvezdici!',
  'Vau! Že po prvem namigu! Tri zvezdice!',
] as const;

const cheer = (total: number) =>
  total === 0
    ? 'Juhu! Zdaj poznate pet novih živali!'
    : `Juhu! Imate ${STARS_SAID[total - 1] ?? total} ${slCount(total, STAR_ACC)}! Zdaj poznate pet novih živali.`;

const placeSpoken = (place: PlaceWords) => `${place.name}. ${place.description}`;
const factSpoken = (animal: AnimalWords) => `${animal.name}! ${animal.funFact}`;

export const sl: Text = {
  title: 'Safari po svetu',
  description:
    'Zavrti pravo 3D Zemljo, se je dotakni kjer koli in ugani, katere divje živali živijo tam. Nežna igra o svetu za družine z otroki od 3 do 9 let.',
  homeLabel: 'Nazaj na seznam iger',
  globeLabel: 'Vrteča se 3D Zemlja. Dotakni se je kjer koli in spoznaj živali, ki živijo tam.',
  loading: 'Pripravljam Zemljo …',
  hint: 'Zavrti Zemljo in se je dotakni kjer koli, da spoznaš živali!',
  loadError: 'Ojoj! Zemljevid se ni naložil. Preveri internet in poskusi znova.',
  travelLabel: 'Potovanje',
  surprise: 'Presenečenje! 🎲',
  backToSpace: 'Nazaj v vesolje 🚀',
  stars: (count) => `${count} ${slCount(count, STAR)}`,

  whoLivesHere: '❓ Kdo živi tukaj?',
  meetThemAll: '🃏 Spoznaj vse',
  howToPlay: 'Kako se igramo',
  close: 'Zapri',
  inCountry: (country) => `📍 ${country}`,
  atSea: '🌊 Sredi morja',
  readPlace: 'Povej mi o tem kraju',
  photoCredit: 'Fotografije: Wikipedija',

  whoAmI: 'Kdo sem?',
  progress: (number, total) => `Skrivnostna žival ${number} od ${total}`,
  readClue: (number) => `Preberi namig ${number}`,
  readFact: 'Preberi zanimivost',
  nextClue: 'Še en namig 🔍',
  noMoreClues: 'Ni več namigov!',
  reveal: 'Pokaži ✨',
  // "Vemo" rather than "Uganili smo", whose past tense would give the players a gender.
  gotIt: 'Vemo!',
  gotItLabel: (stars) => `Vemo! ${stars} ${slCount(stars, STAR)}`,
  outcome: (stars) => OUTCOMES[stars] ?? OUTCOMES[0],
  nextAnimal: 'Naslednja žival ➡️',
  toFinish: 'Naše zvezdice! 🏆',
  finishTitle: 'Juhu! 🎉',
  finishStars: (total, most) => `${total} od ${most} zvezdic`,
  cheer,
  playAgain: 'Še enkrat 🔁',

  tapMe: 'Dotakni se me!',
  animalCard: (number) => `Kartica z živaljo ${number}`,
  readAbout: (name) => `Povej mi o živali: ${name}`,

  // Falling back to English keeps the game drawing if a place were ever missing; the test makes sure none is.
  place: (region) => SL_PLACES[region.id] ?? region,
  animal: (region, animal) => SL_PLACES[region.id]?.animals[animal.id] ?? animal,
  country: (englishName) => SL_COUNTRIES[englishName] ?? englishName,
  placeSpoken,
  factSpoken,
};

/**
 * Every line the game can say in Slovenian: the start instruction, "Kdo sem?",
 * each way a reveal and a round can end, each place, and each animal's clues and fun fact.
 */
export function spokenLines(): string[] {
  const game = [
    sl.hint,
    sl.whoAmI,
    ...OUTCOMES,
    ...Array.from({ length: mostStarsFor(ROUND_SIZE) + 1 }, (_, total) => cheer(total)),
  ];
  const lines = Object.values(SL_PLACES).flatMap((place) => [
    placeSpoken(place),
    ...Object.values(place.animals).flatMap((animal) => [...animal.clues, factSpoken(animal)]),
  ]);
  // Some animals live in two places with the same clues, so a line can appear twice.
  return [...new Set([...game, ...lines])];
}
