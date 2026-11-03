import { slNumber, type SlGender } from '@playroom/kit';
import { MAX_LEVEL, type Item } from '../pattern.ts';
import type { Text } from './en.ts';

/** An item's Slovenian name, plus the gender that "en", "ena" or "eno" agrees with. */
interface SlItem {
  name: string;
  gender: SlGender;
}

function item(name: string, gender: SlGender): SlItem {
  return { name, gender };
}

// Keyed by emoji, the one part of an item that belongs to no language. Short words keep the chant on the beat.
export const SL_ITEMS: Record<string, SlItem> = {
  '🍎': item('jabolko', 'n'),
  '🍌': item('banana', 'f'),
  '🍇': item('grozdje', 'n'),
  '🍊': item('pomaranča', 'f'),
  '🍋': item('limona', 'f'),
  '🍐': item('hruška', 'f'),
  '🍒': item('češnja', 'f'),
  '🍉': item('lubenica', 'f'),

  '🐱': item('muca', 'f'),
  '🐶': item('kuža', 'm'),
  '🐸': item('žaba', 'f'),
  '🐷': item('pujsek', 'm'),
  '🦊': item('lisica', 'f'),
  '🐻': item('medved', 'm'),
  '🦁': item('lev', 'm'),
  '🐮': item('krava', 'f'),

  '⭐': item('zvezda', 'f'),
  '❤️': item('srce', 'n'),
  '🌙': item('luna', 'f'),
  '🔵': item('krog', 'm'),
  '🟩': item('kvadrat', 'm'),
  '🔺': item('trikotnik', 'm'),
  '🔶': item('romb', 'm'),

  '🚗': item('avto', 'm'),
  '🚌': item('avtobus', 'm'),
  '🚲': item('kolo', 'n'),
  '⛵': item('jadrnica', 'f'),
  '✈️': item('letalo', 'n'),
  '🚀': item('raketa', 'f'),
  '🚜': item('traktor', 'm'),
};

/** "Tretja stopnja" sounds like a person talking. "Stopnja tri" sounds like a menu. */
const ORDINALS = ['prva', 'druga', 'tretja', 'četrta', 'peta', 'šesta'];

const slItem = ({ emoji }: Item): SlItem => SL_ITEMS[emoji];

function capitalized(words: string): string {
  return words[0].toUpperCase() + words.slice(1);
}

export const sl: Text = {
  title: 'Vlakec vzorcev',
  description:
    'Pripelje vlakec z vzorcem, ki se ponavlja, in otrok ugotovi, kaj pride naslednje. Šest prijaznih stopenj, vse povedano na glas, za otroke od 4 do 9 let.',
  homeLabel: 'Nazaj na seznam iger',

  level: (level) => `Stopnja ${level}`,
  journey: (level, train, trains) => `Stopnja ${level}, vlakec ${train} od ${trains}`,
  sayIt: '🔊 Poslušaj!',
  hintLabel: 'Namig za odrasle',
  answersLabel: 'Odgovori',
  engine: 'lokomotiva',
  emptyCar: 'prazen vagon',
  itemName: (one) => slItem(one).name,
  hintRepeats: 'Ta del se ponavlja.',
  hintGrowing: (one) => {
    const { name, gender } = slItem(one);
    return `Vsakič ${slNumber(1, gender)} ${name} več!`;
  },

  questions: {
    next: 'Kaj pride naslednje?',
    missing: 'Kaj manjka?',
  },
  tryAgain: 'Poskusi še enkrat!',
  cheers: ['Hura!', 'Čiha čiha!', 'Juhu!'],

  allAboard: 'Vsi na vlak!',
  aboardLevel: (level) => `Vsi na vlak! Stopnja ${level}`,
  pickerNote: 'Za odrasle: izberite stopnjo, na kateri začnete.',
  backToTrain: 'Nazaj na vlak',
  pickLevel: 'Izberi stopnjo',

  levelDone: (level) => `Stopnja ${level} je končana!`,
  levelDoneSpoken: (level) => `Bravo! ${capitalized(ORDINALS[level - 1])} stopnja je končana!`,
  // No past tense here: "si prevozil" or "si prevozila" would give the child a gender.
  lineDone: 'Konec proge! Bravo!',
  lineDoneSpoken: 'Juhu! Konec proge! Bravo!',
  nextLevel: 'Naslednja stopnja ▶',
  rideAgain: 'Še enkrat ▶',
  starsLabel: (stars) => `Zvezdice: ${stars} od 3`,
};

/** Every line the game can say in Slovenian. The last level ends with the end-of-the-line cheer instead. */
export function spokenLines(): string[] {
  const finishedLevels = Array.from({ length: MAX_LEVEL - 1 }, (_, i) => i + 1);
  return [
    ...Object.values(SL_ITEMS).map((one) => one.name),
    sl.questions.next,
    sl.questions.missing,
    sl.tryAgain,
    ...sl.cheers,
    sl.allAboard,
    ...finishedLevels.map(sl.levelDoneSpoken),
    sl.lineDoneSpoken,
  ];
}
