import type { Item, Train } from './pattern.ts';

/** One tick of the chant: light up a car, and say a word unless the car is a silent gap. */
export interface Beat {
  car: number;
  word: string | null;
  pitch: number;
  ms: number;
}

export const BEAT_MS = 640;
/** The small breath between repeats. This is what lets a child hear "apple banana, apple banana". */
export const REST_MS = 320;
const QUESTION_MS = 1500;
/** Speech that never reports back must not freeze the chant. */
export const MAX_WORD_MS = 2400;

/** Each different item keeps its own note, so the pattern sounds like a little tune. */
const PITCHES = [1.3, 0.95, 1.15];
const QUESTION_PITCH = 1.2;

/** The words the chant says, in the language being played. */
export interface ChantWords {
  itemName: (item: Item) => string;
  questions: Record<Train['question'], string>;
}

/** Plans the chant for a train whose cars at `filled` are loaded, including blanks already solved. */
export function planChant(train: Train, filled: ReadonlySet<number>, words: ChantWords): Beat[] {
  const open = train.blanks.map((blank) => blank.index).filter((index) => !filled.has(index));
  const notes = [...new Set(train.cars.map((car) => car.name))];
  const stepEnds = new Set(train.steps.map((step) => step.end - 1));

  let stop = train.cars.length;
  while (open.includes(stop - 1)) stop--;

  const beats: Beat[] = [];
  for (let car = 0; car < stop; car++) {
    const name = train.cars[car].name;
    beats.push({
      car,
      word: open.includes(car) ? null : words.itemName(train.cars[car]),
      pitch: PITCHES[notes.indexOf(name) % PITCHES.length],
      ms: BEAT_MS + (stepEnds.has(car) ? REST_MS : 0),
    });
  }
  if (open.length > 0) {
    beats.push({ car: open[0], word: words.questions[train.question], pitch: QUESTION_PITCH, ms: QUESTION_MS });
  }
  return beats;
}

export interface ChantHooks {
  /** Say a word and call done when it has finished. */
  say: (word: string, pitch: number, done: () => void) => void;
  onBeat: (beat: Beat) => void;
  onEnd: () => void;
}

/**
 * Plays beats on a steady clock. The next beat waits for both its time and the
 * word before it, so slow voices stretch the chant instead of clipping words.
 * Returns a function that stops it.
 */
export function playChant(beats: readonly Beat[], hooks: ChantHooks): () => void {
  let stopped = false;
  let timers: ReturnType<typeof setTimeout>[] = [];

  const play = (index: number): void => {
    if (index >= beats.length) {
      hooks.onEnd();
      return;
    }
    const beat = beats[index];
    let beatDone = false;
    let wordDone = beat.word === null;
    const advance = (): void => {
      if (stopped || !beatDone || !wordDone) return;
      beatDone = false;
      play(index + 1);
    };
    const finishWord = (): void => {
      wordDone = true;
      advance();
    };

    hooks.onBeat(beat);
    timers = [
      setTimeout(() => {
        beatDone = true;
        advance();
      }, beat.ms),
      setTimeout(finishWord, MAX_WORD_MS),
    ];
    if (beat.word !== null) hooks.say(beat.word, beat.pitch, finishWord);
  };

  play(0);
  return () => {
    stopped = true;
    timers.forEach(clearTimeout);
  };
}
