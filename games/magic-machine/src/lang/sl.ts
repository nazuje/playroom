import { slNumber } from '@playroom/kit';
import { EVERY_PUZZLE, KID_RULES, MOST } from '../rules/levels.ts';
import type { Rule } from '../rules/machine.ts';
import type { Text } from './en.ts';

// A number on its own, with no noun, is counted with the feminine forms: ena, dve, tri.
const HIGHER = ['enajst', 'dvanajst', 'trinajst', 'štirinajst', 'petnajst', 'šestnajst', 'sedemnajst', 'osemnajst', 'devetnajst', 'dvajset'];

function word(n: number): string {
  if (n === 0) return 'nič';
  if (n <= 10) return slNumber(n, 'f');
  return HIGHER[n - 11] ?? String(n);
}

const capitalized = (words: string): string => words[0].toUpperCase() + words.slice(1);

/** What a machine does: "plus dve", "podvoji", "razpolovi". */
function ruleName(rule: Rule): string {
  if (rule.op === 'add') return `plus ${word(rule.n)}`;
  if (rule.op === 'sub') return `minus ${word(rule.n)}`;
  if (rule.op === 'mul') return rule.n === 2 ? 'podvoji' : `krat ${word(rule.n)}`;
  return rule.n === 2 ? 'razpolovi' : `deljeno z ${word(rule.n)}`;
}

export const sl: Text = {
  title: 'Čarobni stroj',
  description:
    'Smešen stroj s skrivnim pravilom. Noter gre število, ven pride novo: ugani, kaj pride ven, poišči pravilo, poženi stroj nazaj in poveži dva stroja. Funkcije za otroke od 5 do 12 let, od plus ena do ugank, ob katerih razmišljajo tudi odrasli.',
  home: 'Nazaj na igre',
  sayAgain: 'Povej še enkrat',
  showLevels: 'Izberi stopnjo',
  restart: 'Začni stopnjo znova',
  pickLevel: 'Izberi stopnjo!',
  worlds: {
    add: 'Stroji za plus',
    take: 'Odštej in podvoji',
    mix: 'Skrivna pravila',
    back: 'Nazaj',
    chain: 'Dva stroja',
  },
  ideas: {
    add: 'Noter gre število, ven pride novo število!',
    take: 'Ta stroj zna odšteti ali podvojiti!',
    mix: 'Poglej vsa števila. Kaj je skrivnost?',
    back: 'Nazaj! Kaj je šlo noter?',
    chain: 'Dva stroja, eden za drugim!',
  },
  pair: (from, to) => `Noter gre ${word(from)}, ven pride ${word(to)}.`,
  askOut: (n) => `Noter gre ${word(n)}. Kaj pride ven?`,
  askIn: (n) => `Ven pride ${word(n)}. Kaj je šlo noter?`,
  asks: {
    rule: 'Kaj naredi stroj?',
    fix: 'Popravi stroj! Kateri del deluje za vsa števila?',
  },
  askSecond: 'Kaj naredi drugi stroj?',
  rules: (rules) => `${capitalized(rules.map(ruleName).join(', potem '))}!`,
  ruleLabel: (rule) => ruleName(rule),
  secret: 'Tiho, to je skrivnost!',
  cheer: (n) => `Tako je, ${word(n)}!`,
  cheerRule: 'Tako je! Deluje za vsa števila!',
  oops: ['Ups! Stroj se je zakašljal.', 'Klonk! Ne to.', 'Prsk, prsk! Poskusi še enkrat.'],
  failed: 'Ojoj, stroj se je ves zamajal! Tukaj je nov.',
  hint: 'Poglej to!',
  peek: 'Pokukaj noter!',
  checkAll: 'Preveri vsa števila!',
  canSkip: 'To stopnjo lahko preskočiš.',
  allDone: 'Vsi stroji delujejo!',
  stars1: 'Uspelo ti je!',
  stars2: 'Pametno!',
  stars3: 'Popolno! Brez napake!',
  next: 'Naslednja stopnja',
  levels: 'Stopnje',
  again: 'Še enkrat',
  skip: 'Preskoči',
  level: (n) => `Stopnja ${n}`,
  locked: (n) => `Stopnja ${n} je zaklenjena`,
  misses: (n) => (n === 0 ? 'Brez napake.' : `Napake: ${n}.`),
  retry: 'Poskusi nov stroj',
  less: 'Eno manj',
  more: 'Eno več',
  ok: 'Daj noter',
  plate: 'Stroj',
  number: (n) => String(n),
};

/** Every line the game can say in Slovenian: every example and rule of every puzzle, every rule card, and every number. */
export function spokenLines(): string[] {
  const numbers = Array.from({ length: MOST + 1 }, (_, n) => n);
  const lines = [
    sl.pickLevel,
    ...Object.values(sl.ideas),
    ...Object.values(sl.asks),
    sl.askSecond,
    sl.secret,
    sl.cheerRule,
    ...sl.oops,
    sl.failed,
    sl.hint,
    sl.peek,
    sl.checkAll,
    sl.canSkip,
    sl.allDone,
    sl.stars1,
    sl.stars2,
    sl.stars3,
    ...numbers.flatMap((n) => [sl.askOut(n), sl.askIn(n), sl.cheer(n)]),
    ...KID_RULES.map((rule) => sl.rules([rule])),
  ];
  for (const level of EVERY_PUZZLE) {
    lines.push(...level.puzzle.examples.map((pair) => sl.pair(pair.from, pair.to)), sl.rules(level.puzzle.machines));
  }
  return [...new Set(lines)];
}
