import { slCount, type SlForms } from '@playroom/kit';
import type { Text } from './en.ts';

/** "Sedem kock!" A block is feminine, and the count stands on its own, so the forms are nominative. */
const BLOCK: SlForms = { one: 'kocka', two: 'kocki', few: 'kocke', many: 'kock' };

const UNITS = ['', 'ena', 'dve', 'tri', 'štiri', 'pet', 'šest', 'sedem', 'osem', 'devet'];
const TEENS = ['deset', 'enajst', 'dvanajst', 'trinajst', 'štirinajst', 'petnajst', 'šestnajst', 'sedemnajst', 'osemnajst', 'devetnajst'];
const TENS = ['', '', 'dvajset', 'trideset', 'štirideset'];

/**
 * Counting out loud with no noun uses the feminine forms, ena, dve, tri, and on past twenty, where the units come
 * first: enaindvajset, dvaindvajset. In a compound two is always "dva".
 */
export function slCountWord(n: number): string {
  if (n < 10) return UNITS[n];
  if (n < 20) return TEENS[n - 10];
  const unit = n % 10;
  const tens = TENS[Math.floor(n / 10)];
  if (unit === 0) return tens;
  return `${unit === 2 ? 'dva' : UNITS[unit]}in${tens}`;
}

const capital = (word: string): string => word.charAt(0).toUpperCase() + word.slice(1);

export const sl: Text = {
  title: 'Preštej kocke',
  description:
    'Lutkovno gledališče s kupčki kock. Koliko kock je na odru, skupaj s tistimi, ki se ne vidijo? Kocke nikoli ne lebdijo, zato so pod vsako kocko na vrhu še druge. Od vrstice treh kock do globokih kupov, škatel za polnjenje in zemljevidov od zgoraj, ob katerih razmišljajo tudi odrasli. Uganke za štetje in prostorsko predstavo za otroke od 4 do 12 let.',
  home: 'Nazaj na igre',
  sayAgain: 'Povej še enkrat',
  showLevels: 'Izberi predstavo',
  restart: 'Nove kocke',
  pickLevel: 'Izberi predstavo!',
  worlds: {
    see: 'Vse kocke se vidijo',
    hide: 'Skrite spodaj',
    steps: 'Stopnice in kotički',
    fill: 'Napolni škatlo',
    expert: 'Kupi za odrasle',
  },
  ideas: {
    see: 'Preštej kocke!',
    hide: 'Kocke nikoli ne lebdijo. Nekatere se skrivajo spodaj!',
    steps: 'Zdaj se oder ne obrača. Poišči kocke, ki držijo druge!',
    fill: 'Koliko kock še manjka v škatli?',
    expert: 'Kupi za odrasle! Preštej vse kocke, tudi tiste globoko notri.',
  },
  asks: {
    count: 'Koliko je kock?',
    fill: 'Koliko kock še manjka?',
    map: 'Kateri zemljevid od zgoraj se ujema? Količek kaže sprednji kot.',
  },
  lesson: 'Kocke nikoli ne lebdijo. Spodaj je vedno kocka!',
  number: (n) => slCountWord(n),
  cheerCount: (n) => `${capital(slCountWord(n))} ${slCount(n, BLOCK)}!`,
  cheerFill: (n) => `Še ${slCountWord(n)} ${slCount(n, BLOCK)}!`,
  cheerMap: 'Ta zemljevid se ujema!',
  hiding: 'Poglej, nekatere so se skrivale!',
  nextOne: 'Naslednji kupček!',
  oops: ['Hopla, hopla! Ne čisto.', 'Bum! Poskusi še enkrat.', 'Ups! Poglej še enkrat.'],
  failed: 'Preveč poskusov! Vidiš, kaj se je skrivalo? Tukaj so nove kocke.',
  hint: 'Pokukaj! Nekaj kock se skriva notri.',
  canSkip: 'To predstavo lahko preskočiš.',
  allDone: 'Bravo! Vsi kupčki so prešteti!',
  stars1: 'Uspelo ti je!',
  stars2: 'Odlično štetje!',
  stars3: 'Popolno! Brez napake!',
  next: 'Naprej',
  levels: 'Predstave',
  again: 'Še enkrat',
  skip: 'Preskoči',
  level: (n) => `Predstava ${n}`,
  locked: (n) => `Predstava ${n} je zaklenjena`,
  misses: (n) => (n === 0 ? 'Brez napake.' : `Napake: ${n}.`),
  retry: 'Nove kocke',
  less: 'Ena manj',
  more: 'Ena več',
  ok: 'Toliko',
  turn: 'Zavrti oder',
  map: (n) => `Zemljevid ${n}`,
  no3d: 'Ta naprava žal ne zmore 3D odra. Poskusi na drugi tablici ali računalniku.',
};

/** The most blocks any count, tap or box can reach. */
export const MOST_SPOKEN = 30;
const upTo = (most: number, from = 1): number[] => Array.from({ length: most - from + 1 }, (_, at) => from + at);

/** Every line the game can say in Slovenian, including every number and count. */
export function spokenLines(): string[] {
  return [
    ...new Set([
      sl.pickLevel,
      ...Object.values(sl.ideas),
      ...Object.values(sl.asks),
      sl.lesson,
      ...upTo(MOST_SPOKEN).map(sl.number),
      ...upTo(MOST_SPOKEN, 2).map(sl.cheerCount),
      ...upTo(20).map(sl.cheerFill),
      sl.cheerMap,
      sl.hiding,
      sl.nextOne,
      ...sl.oops,
      sl.failed,
      sl.hint,
      sl.canSkip,
      sl.allDone,
      sl.stars1,
      sl.stars2,
      sl.stars3,
    ]),
  ];
}
