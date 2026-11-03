import type { Text } from './en.ts';

// Counting out loud with no noun uses the feminine forms: ena, dve, tri.
const NUMBERS = [
  'nič',
  'ena',
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
  'šestnajst',
  'sedemnajst',
  'osemnajst',
  'devetnajst',
  'dvajset',
];

/** Every number the game speaks: a weight is never more than 20, and neither is an answer. */
export const MOST_SPOKEN = NUMBERS.length - 1;

const word = (n: number): string => NUMBERS[n] ?? String(n);
const capitalized = (words: string): string => words[0].toUpperCase() + words.slice(1);

export const sl: Text = {
  title: 'Skrivnostna gugalnica',
  description:
    'Uganka s tehtnico na cirkuški gugalnici. Obe strani naj bosta enako težki, ti pa ugotovi, kaj se skriva v škatli: od prvih seštevanj do pravih enačb. Za otroke od 5 do 12 let, same ali skupaj z odraslim.',
  home: 'Nazaj na igre',
  sayAgain: 'Povej še enkrat',
  showLevels: 'Izberi stopnjo',
  restart: 'Začni stopnjo znova',
  pickLevel: 'Izberi stopnjo!',
  worlds: {
    box: 'Škatla',
    level: 'Poravnaj',
    boxes: 'Več škatel',
    both: 'Obe strani',
    two: 'Škatla in klobuk',
  },
  ideas: {
    box: 'Obe strani sta enako težki. Koliko je v škatli?',
    level: 'Dodaj uteži, da bo gugalnica ravna!',
    boxes: 'Vse škatle so enake. Koliko je v eni škatli?',
    both: 'Škatle so na obeh straneh! Z obeh strani vzemi enako.',
    two: 'Škatla in klobuk! Pomagaj si z obema gugalnicama.',
  },
  ask: {
    box: 'Koliko je v škatli?',
    hat: 'Koliko je pod klobukom?',
  },
  tooHeavy: 'Preveč!',
  tooLight: 'Premalo!',
  stillLevel: 'Še vedno ravno!',
  findTwin: 'Poišči enako na drugi strani!',
  swapped: 'Zamenjano! Tehta enako.',
  levelWin: 'Ravno! Obe strani sta enako težki.',
  tumble: 'Ups! Vse je popadalo. Poskusi novo uganko!',
  hint: 'Poglej sem!',
  canSkip: 'To stopnjo lahko preskočiš.',
  allDone: 'Vse stopnje so končane!',
  finaleCheer: 'Hura! Vse skrivnosti so odkrite!',
  stars1: 'Uspelo ti je!',
  stars2: 'Dobro premišljeno!',
  stars3: 'Popolno! Brez napake!',
  number: (n) => capitalized(word(n)),
  cheer: (n) => `Tako je, ${word(n)}!`,
  next: 'Naslednja stopnja',
  levels: 'Stopnje',
  again: 'Še enkrat',
  skip: 'Preskoči',
  tryAgain: 'Nova uganka',
  less: 'Ena manj',
  more: 'Ena več',
  open: 'Odpri!',
  openFor: (mystery, n) => (mystery === 'box' ? `Odpri škatlo: ${n}` : `Dvigni klobuk: ${n}`),
  close: 'Zapri',
  level: (n) => `Stopnja ${n}`,
  locked: (n) => `Stopnja ${n} je zaklenjena`,
  weight: (n) => `Utež ${n}`,
  mystery: { box: 'Skrivnostna škatla', hat: 'Skrivnostni klobuk' },
  opened: (mystery, n) => (mystery === 'box' ? `Škatla, ${n}` : `Klobuk, ${n}`),
  putOn: (n) => `Dodaj ${n}`,
  answer: (mystery) => (mystery === 'box' ? 'Izberi število v škatli' : 'Izberi število pod klobukom'),
  misses: (n) => (n === 0 ? 'Brez napake.' : `Napake: ${n}.`),
};

const numbers = Array.from({ length: MOST_SPOKEN + 1 }, (_, n) => n);

/** Every line the game can say in Slovenian. */
export function spokenLines(): string[] {
  return [
    sl.pickLevel,
    ...Object.values(sl.ideas),
    ...Object.values(sl.ask),
    sl.tooHeavy,
    sl.tooLight,
    sl.stillLevel,
    sl.findTwin,
    sl.swapped,
    sl.levelWin,
    sl.tumble,
    sl.hint,
    sl.canSkip,
    sl.allDone,
    sl.finaleCheer,
    sl.stars1,
    sl.stars2,
    sl.stars3,
    ...numbers.map(sl.number),
    ...numbers.map(sl.cheer),
  ];
}
