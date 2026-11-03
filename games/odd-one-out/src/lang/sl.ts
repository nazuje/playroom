import type { Text } from './en.ts';

export const sl: Text = {
  title: 'Kdo ne spada zraven?',
  description:
    'Kdo ne spada zraven? Na lokvanjevih listih v ribniku ob sončnem vzhodu sedijo prijatelji, eden pa krši pravilo, ki ga imajo drugi skupno. Tapni ga in odskoči v vodo. Slikovne uganke za otroke od 4 do 12 let, od treh živali in avtomobila do skritih pravil, ob katerih razmišljajo tudi odrasli.',
  home: 'Nazaj na igre',
  sayAgain: 'Povej še enkrat',
  showLevels: 'Izberi uganko',
  restart: 'Nove uganke',
  pickLevel: 'Izberi uganko!',
  worlds: {
    kinds: 'Vrste stvari',
    looks: 'Barve in oblike',
    count: 'Preštej pike',
    pairs: 'Poglej dvakrat',
    tricky: 'Uganke za odrasle',
  },
  ideas: {
    kinds: 'Trije so si podobni. Poišči tistega, ki je drugačen!',
    looks: 'Poglej barvo, obliko in velikost!',
    count: 'Preštej pike!',
    pairs: 'Dobro poglej. Dve stvari gresta skupaj!',
    tricky: 'Uganke za odrasle! Poišči skrivno pravilo.',
  },
  ask: 'Kdo ne spada zraven?',
  cheers: ['Pljusk! Točno ta!', 'Bravo!', 'Hopla, v vodo!'],
  oops: ['Ne, ne! Jaz spadam zraven!', 'Ne jaz! Poglej še enkrat.', 'Joj, jaz sodim sem!'],
  groups: {
    animals: 'Same živali!',
    vehicles: 'Sama vozila!',
    food: 'Sama hrana! Njam!',
    toys: 'Same igrače!',
    clothes: 'Sama oblačila!',
    plants: 'Same rastline!',
  },
  failed: 'Pljusk! Vsi so padli v ribnik! Prihajajo novi prijatelji.',
  hint: 'Poglej!',
  canSkip: 'To lahko preskočiš.',
  allDone: 'Uganke so rešene! Bravo!',
  stars1: 'Uspelo ti je!',
  stars2: 'Odlično!',
  stars3: 'Popolno! Brez napake!',
  next: 'Naprej',
  levels: 'Uganke',
  again: 'Še enkrat',
  skip: 'Preskoči',
  level: (n) => `Uganka ${n}`,
  locked: (n) => `Uganka ${n} je zaklenjena`,
  misses: (n) => (n === 0 ? 'Brez napake.' : `Napake: ${n}.`),
  retry: 'Poskusi nove uganke',
  thing: (n) => `Stvar ${n}`,
  life: 'Prijatelji v ribniku',
  newFriend: 'Nov prijatelj v ribniku',
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
      ...Object.values(sl.groups),
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
