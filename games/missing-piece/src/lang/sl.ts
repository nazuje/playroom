import type { Text } from './en.ts';

export const sl: Text = {
  title: 'Manjkajoči košček',
  description:
    'Odeja iz krpic, v kateri manjka ena krpica. Poišči pravilo v vrsticah in stolpcih ter izberi košček, ki spada vanjo: oblike, barve, števila, obrati in krpice, ki se seštejejo ali izničijo. Slikovne uganke za otroke od 4 do 12 let, od preprostega ujemanja do mrež, ob katerih razmišljajo tudi odrasli.',
  home: 'Nazaj na igre',
  sayAgain: 'Povej še enkrat',
  showLevels: 'Izberi uganko',
  restart: 'Nova uganka',
  pickLevel: 'Izberi uganko!',
  worlds: {
    match: 'Ujemanje',
    pair: 'Dve hkrati',
    grow: 'Korak za korakom',
    once: 'Vsak enkrat',
    tricky: 'Uganke za odrasle',
  },
  ideas: {
    match: 'Poišči košček, ki se ujema!',
    pair: 'Poglej obliko in barvo!',
    grow: 'Vsakič se malo spremeni!',
    once: 'Vsak samo enkrat v vsaki vrsti!',
    tricky: 'Zvite uganke! Dobro poglej.',
  },
  ask: 'Kateri košček spada sem?',
  cheers: ['Ja! Spada!', 'Odlično se prilega!', 'Hura, odeja je gotova!'],
  oops: ['Bum! Ta ne spada.', 'Ups! Ne ta košček.', 'Hopla! Poskusi drugega.'],
  failed: 'Ojoj, odeja se je vsa zapletla! Tukaj je nova.',
  hint: 'Poglej!',
  canSkip: 'To uganko lahko preskočiš.',
  allDone: 'Vse odeje so gotove! Bravo!',
  stars1: 'Uspelo ti je!',
  stars2: 'Pametno!',
  stars3: 'Popolno! Brez napake!',
  next: 'Naprej',
  levels: 'Uganke',
  again: 'Še enkrat',
  skip: 'Preskoči',
  level: (n) => `Uganka ${n}`,
  locked: (n) => `Uganka ${n} je zaklenjena`,
  misses: (n) => (n === 0 ? 'Brez napake.' : `Napake: ${n}.`),
  retry: 'Poskusi novo odejo',
  gap: 'Manjkajoči košček',
  patch: 'Krpica',
  piece: (n) => `Košček ${n}`,
};

/** Every line the game can say in Slovenian. Speech here is short, because the puzzles are pictures. */
export function spokenLines(): string[] {
  return [
    ...new Set([
      sl.pickLevel,
      ...Object.values(sl.ideas),
      sl.ask,
      ...sl.cheers,
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
