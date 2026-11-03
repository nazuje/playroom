import { playNote, playSound } from '@playroom/kit';
import { SCALE } from './rules/tune.ts';

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

export function stopSounds(): void {
  for (const timer of pending) window.clearTimeout(timer);
  pending.clear();
}

export const pickSound = (): void => playSound('pop');

/** One patch's note of the quilt's tune, like a music box. */
export const patchNote = (step: number): void => playNote(SCALE[step] ?? SCALE[0], { wave: 'triangle', seconds: 0.28, gain: 0.32 });

/** A piece swooshes up out of the basket. */
export const liftSound = (): void => playNote(523, { wave: 'sine', seconds: 0.08, gain: 0.16 });

/** A piece lands in the gap. */
export const landSound = (): void => playSound('pop');

/** A wrong piece: a boing, then a wobbly slide back down to the basket. */
export function missSound(kind: number): void {
  playSound('boing');
  if (kind === 1) later(180, () => notes([[0, 330], [90, 262]], 'square', 0.08, 0.08));
  else if (kind === 2) later(160, () => notes([[0, 392], [70, 349], [140, 392], [210, 330]], 'triangle', 0.07, 0.16));
}

/** A try runs out and the quilt tangles: a slide whistle down and a flap of cloth. */
export function tangleSound(): void {
  notes([[0, 660], [120, 560], [240, 470], [360, 392], [480, 330]], 'sine', 0.14, 0.2);
  later(560, () => playSound('whoosh'));
}

export const hintSound = (): void => notes([[0, 659], [110, 988]], 'sine', 0.16, 0.26);

/** The last note of the tune. */
export const doneSound = (): void => playSound('ding');

export function winSound(): void {
  playSound('whoosh');
  later(200, () => playSound('tada'));
}
