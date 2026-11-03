import { playNote, playSound } from '@playroom/kit';
import type { Fruit } from './rules/equation.ts';

const pending = new Set<number>();
/** Each fruit has its own note, so tapping around the board plays a little tune. */
const FRUIT_NOTE: Record<Fruit, number> = {
  apple: 392,
  banana: 440,
  strawberry: 494,
  pear: 523,
  orange: 587,
  lemon: 659,
  pineapple: 698,
  watermelon: 784,
};

function later(ms: number, sound: () => void): void {
  const timer = window.setTimeout(() => {
    pending.delete(timer);
    sound();
  }, ms);
  pending.add(timer);
}

const notes = (list: readonly (readonly [number, number])[], wave: OscillatorType, seconds: number, gain: number): void => {
  for (const [ms, hz] of list) later(ms, () => playNote(hz, { wave, seconds, gain }));
};

export function stopSounds(): void {
  for (const timer of pending) window.clearTimeout(timer);
  pending.clear();
}

export const pickSound = (): void => playSound('pop');
export const fruitSound = (fruit: Fruit): void => playNote(FRUIT_NOTE[fruit], { wave: 'triangle', seconds: 0.14, gain: 0.24 });
export const rowSound = (): void => notes([[0, 523], [70, 659]], 'sine', 0.1, 0.16);
/** The stepper climbs a scale as the number grows. */
export const stepSound = (value: number): void => playNote(262 * 2 ** (value / 12), { wave: 'sine', seconds: 0.08, gain: 0.2 });
export const hintSound = (): void => notes([[0, 659], [110, 988]], 'sine', 0.16, 0.26);

/** One sticker slapping on: a thwack that climbs a little with each copy. */
export function slapSound(at: number): void {
  playSound('dig');
  playNote(700 + at * 90, { wave: 'square', seconds: 0.05, gain: 0.08 });
}

/** Three wrong-number reactions, matching what the fruit does on screen. */
export function oopsSound(kind: number): void {
  if (kind === 0) {
    // A raspberry: a buzzy, wobbling low note.
    notes([[0, 140], [60, 120], [120, 150], [180, 110], [240, 130]], 'sawtooth', 0.08, 0.12);
  } else if (kind === 1) {
    playSound('boing');
    later(160, () => playSound('bonk'));
  } else {
    notes([[0, 494], [120, 587], [240, 494], [360, 392]], 'triangle', 0.12, 0.16);
  }
}

export function rightSound(): void {
  playSound('ding');
  later(150, () => playSound('tada'));
}

export function winSound(): void {
  playSound('whoosh');
  later(200, () => playSound('tada'));
}
