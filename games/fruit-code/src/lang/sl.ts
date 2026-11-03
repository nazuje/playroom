import { slCounted, type SlNoun } from '@playroom/kit';
import { fruitsIn, type Fruit, type Row, type Term } from '../rules/equation.ts';
import { EVERY_PUZZLE, MOST } from '../rules/levels.ts';
import type { Text } from './en.ts';

// Rows are read in the nominative: "tri banane so devet". A bunch is never more than 4, so dual and few both show.
const NOUNS: Record<Fruit, SlNoun> = {
  apple: { gender: 'n', one: 'jabolko', two: 'jabolki', few: 'jabolka', many: 'jabolk' },
  banana: { gender: 'f', one: 'banana', two: 'banani', few: 'banane', many: 'banan' },
  strawberry: { gender: 'f', one: 'jagoda', two: 'jagodi', few: 'jagode', many: 'jagod' },
  pear: { gender: 'f', one: 'hruška', two: 'hruški', few: 'hruške', many: 'hrušk' },
  orange: { gender: 'f', one: 'pomaranča', two: 'pomaranči', few: 'pomaranče', many: 'pomaranč' },
  lemon: { gender: 'f', one: 'limona', two: 'limoni', few: 'limone', many: 'limon' },
  pineapple: { gender: 'm', one: 'ananas', two: 'ananasa', few: 'ananasi', many: 'ananasov' },
  watermelon: { gender: 'f', one: 'lubenica', two: 'lubenici', few: 'lubenice', many: 'lubenic' },
};

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
const TIMES = ['', 'enkrat', 'dvakrat', 'trikrat', 'štirikrat'];

const word = (n: number): string => NUMBERS[n] ?? String(n);
const capitalized = (words: string): string => words[0].toUpperCase() + words.slice(1);

function termWords(term: Term): string {
  const noun = NOUNS[term.fruit];
  if (term.shape === 'bunch') return slCounted(term.count, noun);
  if (term.shape === 'times') return `${TIMES[term.count] ?? `${term.count}-krat`} ${noun.one}`;
  return noun.one;
}

const expression = (terms: readonly Term[]): string =>
  terms.map((term, at) => (at === 0 ? '' : term.sign > 0 ? ' plus ' : ' minus ') + termWords(term)).join('');

/** A sum is one thing: "jabolko plus jabolko je štiri". A single bunch agrees with its count: "dve banani sta", "tri banane so". */
function verb(terms: readonly Term[]): string {
  const [only] = terms;
  if (terms.length !== 1 || only.shape !== 'bunch') return 'je';
  return only.count === 2 ? 'sta' : 'so';
}

export const sl: Text = {
  title: 'Sadna šifra',
  description:
    'Slikovne uganke, v katerih vsak sadež skriva število. Ko razvozlaš en sadež, se njegovo število prilepi na vse enake sadeže in naslednja vrstica je lažja: od prvih seštevanj do pravih sistemov enačb, ob katerih razmišljajo tudi odrasli. Za otroke od 5 do 12 let.',
  home: 'Nazaj na igre',
  sayAgain: 'Povej še enkrat',
  showLevels: 'Izberi stopnjo',
  restart: 'Začni stopnjo znova',
  pickLevel: 'Izberi stopnjo!',
  worlds: {
    one: 'En sadež',
    two: 'Dva sadeža',
    chain: 'Sadna veriga',
    count: 'Preštej in odštej',
    system: 'Razbijalci šifer',
  },
  ideas: {
    one: 'Vsak sadež skriva število. Enak sadež je vedno enako število!',
    two: 'Najprej poišči eno število, potem še drugo!',
    chain: 'Trije sadeži! Razvozlaj jih enega za drugim.',
    count: 'Preštej vsak sadež! In pazi na minus.',
    system: 'Zvito! Združi dve vrstici in razvozlaj šifro.',
  },
  row: (row) => `${capitalized(expression(row.terms))} ${verb(row.terms)} ${word(row.total)}.`,
  ask: (terms) => `Koliko je ${expression(terms)}?`,
  // The sticker shows which fruit it was, so the line needs only the number: one clip per number, not per fruit.
  found: (_fruit, n) => `Tako je, ${word(n)}!`,
  cheer: (n) => `Tako je, ${word(n)}!`,
  oops: ['Joj, to se ne izide!', 'Ups! Poskusi drugo število.', 'Ojej, ne to!'],
  failed: 'Ojoj, sadeži so se čisto premešali! Poskusi novo šifro.',
  hint: 'Poglej to vrstico!',
  canSkip: 'To stopnjo lahko preskočiš.',
  allDone: 'Vse šifre so razvozlane!',
  stars1: 'Uspelo ti je!',
  stars2: 'Dobro premišljeno!',
  stars3: 'Popolno! Brez napake!',
  next: 'Naslednja stopnja',
  levels: 'Stopnje',
  again: 'Še enkrat',
  skip: 'Preskoči',
  close: 'Zapri',
  level: (n) => `Stopnja ${n}`,
  locked: (n) => `Stopnja ${n} je zaklenjena`,
  misses: (n) => (n === 0 ? 'Brez napake.' : `Napake: ${n}.`),
  termLabel: (term, value) => (value === undefined ? termWords(term) : `${termWords(term)}, ${term.count * value}`),
  sayRow: 'Povej to vrstico',
  retry: 'Poskusi novo šifro',
  less: 'Eno manj',
  more: 'Eno več',
  ok: 'To število',
  pickFor: (terms) => `Izberi število: ${expression(terms)}`,
};

const one = (fruit: Fruit): Term => ({ fruit, shape: 'one', count: 1, sign: 1 });

/** Every line the game can say in Slovenian: every row and question of every puzzle, and every number. */
export function spokenLines(): string[] {
  const lines = [
    sl.pickLevel,
    ...Object.values(sl.ideas),
    ...sl.oops,
    sl.failed,
    sl.hint,
    sl.canSkip,
    sl.allDone,
    sl.stars1,
    sl.stars2,
    sl.stars3,
    ...Array.from({ length: MOST + 1 }, (_, n) => sl.cheer(n)),
  ];
  for (const level of EVERY_PUZZLE) {
    const { clues, question } = level.puzzle;
    lines.push(...clues.map(sl.row), sl.ask(question));
    for (const fruit of new Set(clues.flatMap((row: Row) => fruitsIn(row.terms)))) lines.push(sl.ask([one(fruit)]));
  }
  return [...new Set(lines)];
}
