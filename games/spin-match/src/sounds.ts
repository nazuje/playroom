import { playNote, playSound } from '@playroom/kit';

const pending = new Set<number>();

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

/** A run of notes sliding from one pitch to another over some time, like a top spinning up or winding down. */
function slide(from: number, to: number, ms: number, steps: number, wave: OscillatorType, gain: number): void {
  const list: [number, number][] = [];
  for (let step = 0; step < steps; step += 1) list.push([(step * ms) / steps, from * (to / from) ** (step / (steps - 1))]);
  notes(list, wave, (ms / steps / 1000) * 1.6, gain);
}

export function stopSounds(): void {
  for (const timer of pending) window.clearTimeout(timer);
  pending.clear();
}

export const pickSound = (): void => playSound('pop');

/** The right critter spins through the water: a whirr that rises the whole way. */
export const whirrSound = (ms: number): void => slide(220, 990, ms, 12, 'triangle', 0.14);

/** ↻ turns the target a quarter: a short little whirr. */
export const turnSound = (): void => slide(330, 660, 220, 5, 'sine', 0.18);

/** Two critters click together. */
export function snapSound(): void {
  playSound('pop');
  playNote(1760, { wave: 'square', seconds: 0.04, gain: 0.1 });
  later(70, () => playNote(2349, { wave: 'sine', seconds: 0.16, gain: 0.22 }));
}

/** A backwards critter flips over: up and back down, like a pancake. */
export function flipSound(): void {
  notes([[0, 392], [120, 587], [420, 587], [540, 392]], 'triangle', 0.1, 0.18);
}

/** A critter with one tile out of place: a bonk, then "uh-oh". */
export function oddSound(): void {
  playSound('bonk');
  later(200, () => notes([[0, 440], [170, 349]], 'triangle', 0.14, 0.2));
}

/** A clearly different shape bounces away. */
export const shapeSound = (): void => playSound('boing');

/** A try runs out: everything winds down dizzily. */
export function dizzySound(): void {
  slide(880, 196, 900, 12, 'sine', 0.16);
  later(950, () => playSound('whoosh'));
}

export const hintSound = (): void => notes([[0, 659], [110, 988]], 'sine', 0.16, 0.26);

/** A bubble pops as the hand taps something. */
export const bubbleSound = (): void => playNote(1180, { wave: 'sine', seconds: 0.07, gain: 0.12 });

export function winSound(): void {
  playSound('whoosh');
  later(200, () => playSound('tada'));
}
