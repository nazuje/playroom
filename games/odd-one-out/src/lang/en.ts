import type { WorldId } from '../rules/levels.ts';
import type { Group } from '../rules/pics.ts';

export const en = {
  title: 'Odd One Out',
  description:
    "Which one doesn't belong? Friends sit on lily pads on a pond at sunrise, and one of them breaks the rule the others share. Tap it and it gets bounced into the water. Picture puzzles for ages 4 to 12, from three animals and a car to hidden rules that challenge a grown-up.",
  home: 'Back to the games',
  sayAgain: 'Say it again',
  showLevels: 'Pick a puzzle',
  restart: 'New puzzles',
  pickLevel: 'Pick a puzzle!',
  worlds: {
    kinds: 'Kinds of things',
    looks: 'Colours and shapes',
    count: 'Count the dots',
    pairs: 'Look twice',
    tricky: 'Grown-up puzzles',
  } satisfies Record<WorldId, string>,
  /** Said at the start of each world. */
  ideas: {
    kinds: "Three are alike. Find the one that's different!",
    looks: 'Look at the colour, the shape and the size!',
    count: 'Count the dots!',
    pairs: 'Look closely. Two things go together!',
    tricky: 'Grown-up puzzles! Find the secret rule.',
  } satisfies Record<WorldId, string>,
  ask: "Which one doesn't belong?",
  cheers: ["Splash! That's the one!", 'Bravo!', 'Wheee, into the pond!'] as [string, string, string],
  /** A thing that does belong protests when it is tapped. */
  oops: ['Hey! I belong here!', 'Not me! Look again.', 'Nope! I fit right in.'] as [string, string, string],
  /** Said on the first world once the odd one is gone, about the ones left. */
  groups: {
    animals: "They're all animals!",
    vehicles: "They're all vehicles!",
    food: "They're all food! Yum!",
    toys: "They're all toys!",
    clothes: "They're all clothes!",
    plants: "They're all plants!",
  } satisfies Record<Group, string>,
  /** Too many wrong taps: the try is over, and the next one brings fresh puzzles. */
  failed: 'Splash! Everyone fell in the pond! Here come new friends.',
  hint: 'Look!',
  canSkip: 'You can skip this one.',
  allDone: 'You found every odd one out!',
  stars1: 'You did it!',
  stars2: 'Clever!',
  stars3: 'Perfect! No mistakes!',
  next: 'Next',
  levels: 'Puzzles',
  again: 'Play again',
  skip: 'Skip',
  level: (n: number) => `Puzzle ${n}`,
  locked: (n: number) => `Puzzle ${n} is locked`,
  misses: (n: number) => (n === 0 ? 'No mistakes.' : n === 1 ? '1 mistake.' : `${n} mistakes.`),
  retry: 'Try new puzzles',
  thing: (n: number) => `Thing ${n}`,
  life: 'Pond friends',
  newFriend: 'A new pond friend',
};

export type Text = typeof en;
