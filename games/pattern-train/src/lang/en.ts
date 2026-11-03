import type { Item, Train } from '../pattern.ts';

export const en = {
  title: 'Pattern Train',
  description:
    'A train pulls in with a repeating pattern, and your child works out what comes next. Six gentle levels, read aloud, for ages 4 to 9.',
  homeLabel: 'Back to Playroom',

  level: (level: number) => `Level ${level}`,
  journey: (level: number, train: number, trains: number) => `Level ${level}, train ${train} of ${trains}`,
  sayIt: '🔊 Say it!',
  hintLabel: 'Grown-up hint',
  answersLabel: 'Answers',
  engine: 'engine',
  emptyCar: 'empty car',
  /** The word the chant says for an item, and the word spoken when it lands. */
  itemName: (item: Item) => item.name,
  hintRepeats: 'This part repeats.',
  hintGrowing: (item: Item) => `One more ${item.name} each time!`,

  questions: {
    next: 'What comes next?',
    missing: "What's missing?",
  } satisfies Record<Train['question'], string>,
  tryAgain: 'Try again!',
  cheers: ['Toot toot!', 'Choo choo!', 'Hooray!'],

  allAboard: 'All aboard!',
  aboardLevel: (level: number) => `All aboard! Level ${level}`,
  pickerNote: 'Grown-ups: pick any level to start there.',
  backToTrain: 'Back to the train',
  pickLevel: 'Pick a level',

  levelDone: (level: number) => `Level ${level} done!`,
  levelDoneSpoken: (level: number) => `You did it! Level ${level} is done!`,
  lineDone: 'You rode the whole line!',
  lineDoneSpoken: 'Wow! You rode the whole line!',
  nextLevel: 'Next level ▶',
  rideAgain: 'Ride again ▶',
  starsLabel: (stars: number) => `${stars} of 3 stars`,
};

export type Text = typeof en;
