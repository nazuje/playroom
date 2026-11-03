import { capitalize, COLORS, recipeText } from '../mix.ts';
import type { ColorId, Parts } from '../mix.ts';
import type { PictureId, RegionId } from '../pictures.ts';
import { questionAnswer, recipePaints } from '../rounds.ts';
import type { Level, Question } from '../rounds.ts';

const name = (color: ColorId): string => COLORS[color].name;

function listWords(words: string[]): string {
  const last = words.at(-1) ?? '';
  return words.length < 2 ? last : `${words.slice(0, -1).join(', ')} and ${last}`;
}

/** "Red and yellow make orange!" */
function questionSentence({ a, b }: Question): string {
  return `${capitalize(name(a))} and ${name(b)} make ${name(questionAnswer({ a, b }))}!`;
}

/** "Try red, blue and white." */
function hintLine(recipe: Parts): string {
  return `Try ${listWords(recipePaints(recipe))}.`;
}

export const en = {
  title: 'Color Lab',
  description:
    'A paint-mixing science lab for young children: guess what two colors make, mix paints to order, and paint a picture.',
  homeLabel: 'Back to Playroom',
  backLabel: 'Back to the lab',
  repeatLabel: 'Say it again',
  starsLabel: (count: number) => `${count} stars`,

  modes: { guess: 'Guess the color', make: 'Make this color', free: 'Free paint' },
  listen: '🔊 What can I do?',
  welcome: 'Welcome to the Color Lab! Guess the color. Make this color. Or free paint. Tap a picture to start!',
  heroLabel: 'A bubbling beaker of purple paint',

  levels: { 0: 'Easy', 1: 'Medium', 2: 'Hard' } satisfies Record<Level, string>,
  next: 'Next ➡️',
  finish: 'Finish 🎉',
  roundLine: (won: number) =>
    won > 0 ? `You got ${won} ${won === 1 ? 'star' : 'stars'}! Great science!` : 'Great science!',
  again: '🔁 Again',
  harder: '🌳 Harder',
  backToLab: '🧪 Back to the lab',

  /** A color's name on its own, as a label under a pot or a blob. */
  colorLabel: (color: ColorId) => capitalize(name(color)),
  /** What the game says when a color is tapped or appears. */
  colorSpoken: (color: ColorId) => name(color),
  paintLabel: (color: ColorId) => `${capitalize(name(color))} paint`,
  emptyBeaker: 'An empty beaker',
  beakerOf: (color: ColorId) => `A beaker of ${name(color)} paint`,
  recipe: (parts: Parts) => recipeText(parts),

  guessSum: ({ a, b }: Question) => `${capitalize(name(a))} + ${name(b)} = ?`,
  guessAsk: ({ a, b }: Question) => `${capitalize(name(a))} and ${name(b)}. What color will they make?`,
  guessReveal: (question: Question, right: boolean) =>
    `${right ? 'Yes!' : 'Ooh, surprise!'} ${questionSentence(question)}`,
  pour: 'Pour! 💧',

  request: (color: ColorId) => `I need ${name(color)} paint!`,
  quote: (line: string) => `“${line}”`,
  tapPaints: 'Tap the paints!',
  beakerFull: 'The beaker is full! Tap Mix.',
  empty: '🫙 Empty',
  mix: 'Mix! 🌀',
  hint: '💡 Hint',
  hintLine,
  hintSpoken: (recipe: Parts) => `Let's start fresh. ${hintLine(recipe)}`,
  madeIt: (color: ColorId) => `You made ${name(color)}! Thank you!`,
  madeOther: (color: ColorId) => `Ooh, that made ${name(color)}! Try again!`,

  tapAPaint: 'Tap a paint!',
  clear: 'Hold to wipe the picture',
  undo: 'Bring the picture back',
  freeIntro: 'Mix any paint you like, then tap the picture to paint it!',
  paintFirst: 'Add some paint to the beaker first!',
  clearAsk: 'Hold the sponge down to wipe your picture.',
  pictures: { butterfly: 'Butterfly', house: 'House' } satisfies Record<PictureId, string>,
  pictureLabel: (picture: string) => `${picture} to paint`,
  regions: {
    sky: 'sky',
    wingTopLeft: 'top left wing',
    wingTopRight: 'top right wing',
    wingLowLeft: 'bottom left wing',
    wingLowRight: 'bottom right wing',
    spotLeft: 'left spot',
    spotRight: 'right spot',
    body: 'body',
    grass: 'grass',
    sun: 'sun',
    chimney: 'chimney',
    wall: 'wall',
    roof: 'roof',
    door: 'door',
    window: 'window',
  } satisfies Record<RegionId, string>,
};

export type Text = typeof en;
