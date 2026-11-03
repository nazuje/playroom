import type { Item, Train } from './pattern.ts';

/** C, E and G: whatever order a pattern lands in, its notes sound good together. */
const TRAIN_NOTES = [523.25, 659.25, 783.99];
/** An item that isn't on this train still sings, just lower, so a wrong tap sounds off the tune. */
const STRANGER_NOTE = 392;

/** The note an item sings on this train. Each different item on the train keeps its own note. */
export function itemNote(train: Train, item: Item): number {
  const order = [...new Set(train.cars.map((car) => car.name))];
  const at = order.indexOf(item.name);
  return at < 0 ? STRANGER_NOTE : TRAIN_NOTES[at % TRAIN_NOTES.length];
}

/** The whole train sung car by car, which is the pattern played as a tune. */
export function melody(train: Train): number[] {
  return train.cars.map((car) => itemNote(train, car));
}
