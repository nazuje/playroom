import { slCount, slCounted, type SlForms, type SlNoun } from '@playroom/kit';
import { capitalize, COLORS, PAINTS } from '../mix.ts';
import type { ColorId, Parts } from '../mix.ts';
import { PICTURES } from '../pictures.ts';
import { QUESTIONS, questionAnswer, recipePaints, TARGETS } from '../rounds.ts';
import type { Question } from '../rounds.ts';
import type { Text } from './en.ts';

/**
 * A color as an adjective agreeing with "barva", which is feminine: nominative
 * for "To je rdeča", accusative for "Potrebujem rdečo barvo". Some colors, like
 * roza and lila, never change.
 */
interface SlColor {
  nom: string;
  acc: string;
}

function color(nom: string, acc = nom): SlColor {
  return { nom, acc };
}

export const SL_COLORS: Record<ColorId, SlColor> = {
  red: color('rdeča', 'rdečo'),
  yellow: color('rumena', 'rumeno'),
  blue: color('modra', 'modro'),
  white: color('bela', 'belo'),
  black: color('črna', 'črno'),

  orange: color('oranžna', 'oranžno'),
  green: color('zelena', 'zeleno'),
  purple: color('vijolična', 'vijolično'),
  brown: color('rjava', 'rjavo'),

  redOrange: color('rdečeoranžna', 'rdečeoranžno'),
  golden: color('zlatorumena', 'zlatorumeno'),
  lime: color('rumenozelena', 'rumenozeleno'),
  teal: color('turkizna', 'turkizno'),
  magenta: color('rdečevijolična', 'rdečevijolično'),
  indigo: color('modrovijolična', 'modrovijolično'),

  pink: color('roza'),
  paleYellow: color('svetlorumena', 'svetlorumeno'),
  lightBlue: color('svetlomodra', 'svetlomodro'),
  peach: color('breskova', 'breskovo'),
  mint: color('mentolnozelena', 'mentolnozeleno'),
  lilac: color('lila'),
  tan: color('svetlorjava', 'svetlorjavo'),

  maroon: color('temnordeča', 'temnordečo'),
  olive: color('olivnozelena', 'olivnozeleno'),
  navy: color('temnomodra', 'temnomodro'),
  darkGreen: color('temnozelena', 'temnozeleno'),
  darkPurple: color('temnovijolična', 'temnovijolično'),
  darkBrown: color('temnorjava', 'temnorjavo'),

  dustyRose: color('sivorožnata', 'sivorožnato'),
  khaki: color('kaki'),
  slateBlue: color('sivomodra', 'sivomodro'),
  sage: color('sivozelena', 'sivozeleno'),
  mauve: color('sivovijolična', 'sivovijolično'),
  taupe: color('sivorjava', 'sivorjavo'),

  grey: color('siva', 'sivo'),
  lightGrey: color('svetlosiva', 'svetlosivo'),
  darkGrey: color('temnosiva', 'temnosivo'),
};

const nom = (id: ColorId): string => SL_COLORS[id].nom;
const acc = (id: ColorId): string => SL_COLORS[id].acc;

/** "Imaš ..." takes the accusative: eno zvezdico, dve zvezdici, tri zvezdice, pet zvezdic. */
const STAR_ACC: SlNoun = { gender: 'f', one: 'zvezdico', two: 'zvezdici', few: 'zvezdice', many: 'zvezdic' };
const STAR: SlForms = { one: 'zvezdica', two: 'zvezdici', few: 'zvezdice', many: 'zvezdic' };

function listWords(words: string[]): string {
  const last = words.at(-1) ?? '';
  return words.length < 2 ? last : `${words.slice(0, -1).join(', ')} in ${last}`;
}

/** "Rdeča in rumena dasta oranžno!" Two paints make it, so the verb is dual. */
function questionSentence({ a, b }: Question): string {
  return `${capitalize(nom(a))} in ${nom(b)} dasta ${acc(questionAnswer({ a, b }))}!`;
}

/** "Vzemi rdečo, modro in belo." */
function hintLine(recipe: Parts): string {
  return `Vzemi ${listWords(recipePaints(recipe).map(acc))}.`;
}

/** For grown-ups: "2 × rdeča + 1 × bela", which sidesteps counting every color name. */
function recipe(parts: Parts): string {
  return PAINTS.filter((paint) => (parts[paint] ?? 0) > 0)
    .map((paint) => `${parts[paint]} × ${nom(paint)}`)
    .join(' + ');
}

const KIND_WORDS = 'Kako lepo mešaš!';

export const sl: Text = {
  title: 'Barvni laboratorij',
  description:
    'Barvni laboratorij za majhne otroke: ugani, kaj nastane iz dveh barv, zmešaj barvo po naročilu in pobarvaj sliko.',
  homeLabel: 'Nazaj na seznam iger',
  backLabel: 'Nazaj v laboratorij',
  repeatLabel: 'Povej še enkrat',
  starsLabel: (count) => `${count} ${slCount(count, STAR)}`,

  modes: { guess: 'Ugani barvo', make: 'Naredi to barvo', free: 'Prosto slikanje' },
  listen: '🔊 Kaj lahko delam?',
  welcome:
    'Živjo, to je barvni laboratorij! Ugani barvo. Naredi to barvo. Ali pa prosto slikaj. Pritisni sliko in začni!',
  heroLabel: 'Vijolična barva brbota v čaši',

  levels: { 0: 'Lahko', 1: 'Srednje', 2: 'Težko' },
  next: 'Naprej ➡️',
  finish: 'Konec 🎉',
  roundLine: (won) => (won > 0 ? `Imaš ${slCounted(won, STAR_ACC, 'acc')}! ${KIND_WORDS}` : KIND_WORDS),
  again: '🔁 Še enkrat',
  harder: '🌳 Težje',
  backToLab: '🧪 Nazaj v laboratorij',

  colorLabel: (id) => capitalize(nom(id)),
  colorSpoken: (id) => capitalize(nom(id)),
  paintLabel: (id) => `${capitalize(nom(id))} barva`,
  emptyBeaker: 'Prazna čaša',
  beakerOf: (id) => `${capitalize(nom(id))} barva v čaši`,
  recipe,

  guessSum: ({ a, b }) => `${capitalize(nom(a))} + ${nom(b)} = ?`,
  guessAsk: ({ a, b }) => `${capitalize(nom(a))} in ${nom(b)}. Katera barva bo nastala?`,
  guessReveal: (question, right) => `${right ? 'Ja!' : 'Oho, presenečenje!'} ${questionSentence(question)}`,
  pour: 'Zlij! 💧',

  request: (id) => `Potrebujem ${acc(id)} barvo!`,
  quote: (line) => `»${line}«`,
  tapPaints: 'Dodaj barve!',
  beakerFull: 'Čaša je polna! Zdaj pa pomešaj.',
  empty: '🫙 Izprazni',
  mix: 'Mešaj! 🌀',
  hint: '💡 Namig',
  hintLine,
  hintSpoken: (parts) => `Začnimo znova. ${hintLine(parts)}`,
  madeIt: (id) => `Juhu, to je ${nom(id)}! Hvala!`,
  madeOther: (id) => `Oho, to je ${nom(id)}! Poskusi še enkrat!`,

  tapAPaint: 'Izberi barvo!',
  clear: 'Drži, da pobrišeš sliko',
  undo: 'Vrni sliko',
  freeIntro: 'Zmešaj barvo, ki ti je všeč, in pobarvaj sliko!',
  paintFirst: 'Najprej dodaj barvo!',
  clearAsk: 'Drži gobico, da pobrišeš sliko.',
  pictures: { butterfly: 'Metulj', house: 'Hiša' },
  pictureLabel: (picture) => `${picture} za barvanje`,
  regions: {
    sky: 'nebo',
    wingTopLeft: 'zgornje levo krilo',
    wingTopRight: 'zgornje desno krilo',
    wingLowLeft: 'spodnje levo krilo',
    wingLowRight: 'spodnje desno krilo',
    spotLeft: 'leva pika',
    spotRight: 'desna pika',
    body: 'telo',
    grass: 'trava',
    sun: 'sonce',
    chimney: 'dimnik',
    wall: 'stena',
    roof: 'streha',
    door: 'vrata',
    window: 'okno',
  },
};

/** Every line the game can say in Slovenian. A mix in Free paint or Make can land on any color. */
export function spokenLines(): string[] {
  const colors = Object.keys(COLORS) as ColorId[];
  // A question can show its pots either way round.
  const questions = Object.values(QUESTIONS)
    .flat()
    .flatMap(({ a, b }) => [
      { a, b },
      { a: b, b: a },
    ]);
  const targets = Object.values(TARGETS).flat();
  const lines = [
    sl.welcome,
    ...[0, 1, 2, 3, 4, 5].map(sl.roundLine),
    ...colors.map(sl.colorSpoken),
    ...colors.map(sl.madeOther),
    ...questions.map(sl.guessAsk),
    ...questions.flatMap((question) => [sl.guessReveal(question, true), sl.guessReveal(question, false)]),
    ...targets.flatMap((target) => [sl.request(target.color), sl.madeIt(target.color), sl.hintSpoken(target.recipe)]),
    sl.beakerFull,
    sl.freeIntro,
    sl.paintFirst,
    sl.clearAsk,
    ...PICTURES.map((picture) => sl.pictures[picture.id]),
  ];
  return [...new Set(lines)];
}
