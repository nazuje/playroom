// The pictures for the first world: curated groups of emoji a 4-year-old can sort. Each picture is in exactly one
// group, and nothing here could sit in two of them, so no teddy bears (a toy or an animal?), no fish (an animal or
// food?), no corn or broccoli (food or a plant?) and no toy cars. Each picture also carries the other things a
// child might sort by: whether it flies, lives or goes on water, has wheels, is bigger than a grown-up, and its main
// colour. The solver checks those too, so "the only one that flies" can never point at a different picture.

export type Group = 'animals' | 'vehicles' | 'food' | 'toys' | 'clothes' | 'plants';
export const GROUPS: readonly Group[] = ['animals', 'vehicles', 'food', 'toys', 'clothes', 'plants'];

export type Hue = 'red' | 'orange' | 'yellow' | 'green' | 'blue' | 'purple' | 'pink' | 'brown' | 'white' | 'grey' | 'black' | 'mixed';

export interface Pic {
  glyph: string;
  group: Group;
  flies: boolean;
  water: boolean;
  wheels: boolean;
  big: boolean;
  hue: Hue;
}

type Tag = 'flies' | 'water' | 'wheels' | 'big';

const make = (group: Group, rows: readonly (readonly [string, Hue, ...Tag[]])[]): Pic[] =>
  rows.map(([glyph, hue, ...tags]) => ({
    glyph,
    group,
    hue,
    flies: tags.includes('flies'),
    water: tags.includes('water'),
    wheels: tags.includes('wheels'),
    big: tags.includes('big'),
  }));

export const PICS: readonly Pic[] = [
  ...make('animals', [
    ['🐶', 'brown'],
    ['🐱', 'orange'],
    ['🐮', 'white', 'big'],
    ['🐷', 'pink'],
    ['🐸', 'green', 'water'],
    ['🦁', 'orange', 'big'],
    ['🐘', 'grey', 'big'],
    ['🦒', 'yellow', 'big'],
    ['🐰', 'white'],
    ['🐵', 'brown'],
    ['🐧', 'black', 'water'],
    ['🦆', 'green', 'flies', 'water'],
    ['🐢', 'green', 'water'],
    ['🦋', 'blue', 'flies'],
    ['🐝', 'yellow', 'flies'],
    ['🦉', 'brown', 'flies'],
    ['🐴', 'brown', 'big'],
    ['🦓', 'white', 'big'],
    ['🐙', 'pink', 'water'],
    ['🐌', 'brown'],
    ['🦔', 'brown'],
    ['🦊', 'orange'],
    ['🐨', 'grey'],
    ['🐬', 'blue', 'water', 'big'],
  ]),
  ...make('vehicles', [
    ['🚗', 'red', 'wheels'],
    ['🚌', 'yellow', 'wheels', 'big'],
    ['🚂', 'black', 'wheels', 'big'],
    ['🚲', 'mixed', 'wheels'],
    ['🚜', 'green', 'wheels', 'big'],
    ['✈️', 'white', 'flies', 'big'],
    ['🚁', 'red', 'flies', 'big'],
    ['🚀', 'white', 'flies', 'big'],
    ['⛵', 'white', 'water', 'big'],
    ['🚤', 'white', 'water', 'big'],
    ['🚒', 'red', 'wheels', 'big'],
    ['🚑', 'white', 'wheels', 'big'],
    ['🚕', 'yellow', 'wheels'],
    ['🚛', 'blue', 'wheels', 'big'],
    ['🚓', 'blue', 'wheels'],
  ]),
  ...make('food', [
    ['🍎', 'red'],
    ['🍌', 'yellow'],
    ['🍇', 'purple'],
    ['🍓', 'red'],
    ['🍉', 'green'],
    ['🍐', 'green'],
    ['🍊', 'orange'],
    ['🥕', 'orange'],
    ['🍕', 'mixed'],
    ['🍔', 'brown'],
    ['🍞', 'brown'],
    ['🧀', 'yellow'],
    ['🍪', 'brown'],
    ['🍰', 'white'],
    ['🍦', 'white'],
    ['🥐', 'brown'],
    ['🍒', 'red'],
    ['🍋', 'yellow'],
    ['🍅', 'red'],
  ]),
  ...make('toys', [
    ['⚽', 'white'],
    ['🏀', 'orange'],
    ['🪀', 'red'],
    ['🪁', 'mixed', 'flies'],
    ['🧩', 'green'],
    ['🎲', 'white'],
    ['🤖', 'grey'],
    ['🪆', 'red'],
    ['🎳', 'white'],
    ['🛼', 'mixed', 'wheels'],
    ['🎈', 'red', 'flies'],
  ]),
  ...make('clothes', [
    ['👕', 'blue'],
    ['👖', 'blue'],
    ['👗', 'blue'],
    ['🧦', 'mixed'],
    ['🧢', 'blue'],
    ['👟', 'mixed'],
    ['🧤', 'green'],
    ['🧣', 'red'],
    ['👒', 'yellow'],
    ['🥾', 'brown'],
    ['🩳', 'blue'],
    ['🧥', 'brown'],
  ]),
  ...make('plants', [
    ['🌻', 'yellow'],
    ['🌷', 'pink'],
    ['🌵', 'green'],
    ['🌳', 'green', 'big'],
    ['🍀', 'green'],
    ['🌲', 'green', 'big'],
    ['🌴', 'green', 'big'],
    ['🌹', 'red'],
    ['🌼', 'yellow'],
    ['🌸', 'pink'],
    ['🪴', 'green'],
    ['🌱', 'green'],
  ]),
];

/** Pictures that could belong to two groups, kept out on purpose. The tests check none of them sneak in. */
export const NOT_SORTABLE: readonly string[] = ['🧸', '🐟', '🐠', '🦀', '🦐', '🐔', '🥚', '🌽', '🥦', '🍄', '🦄', '🎠', '🪅', '🏎️', '🛴', '🐻', '🐼', '🥥'];

export const picsIn = (group: Group): number[] => PICS.flatMap((pic, at) => (pic.group === group ? [at] : []));
