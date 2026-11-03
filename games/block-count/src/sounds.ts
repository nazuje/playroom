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

/** A major pentatonic scale over three octaves, so a long count keeps climbing and always sounds friendly. */
const SCALE = [262, 294, 330, 392, 440, 523, 587, 659, 784, 880, 1047, 1175, 1319, 1568, 1760];
const climb = (step: number): number => SCALE[Math.min(SCALE.length - 1, step)] * (step >= SCALE.length ? 1.12 : 1);

export function stopSounds(): void {
  for (const timer of pending) window.clearTimeout(timer);
  pending.clear();
}

export const pickSound = (): void => playSound('pop');
/** A block tapped: a wooden knock, higher as more are lit. */
export const knockSound = (lit: number): void => playNote(climb(Math.min(lit, 14)) * 1.5, { wave: 'triangle', seconds: 0.09, gain: 0.25 });
/** A tap on the stage itself. */
export const thumpSound = (): void => playNote(180, { wave: 'sine', seconds: 0.12, gain: 0.3 });
/** The stepper climbs a scale as the number grows. */
export const stepSound = (value: number): void => playNote(262 * 2 ** (value / 14), { wave: 'sine', seconds: 0.08, gain: 0.2 });
export const hintSound = (): void => notes([[0, 659], [110, 988]], 'sine', 0.16, 0.26);
/** The turntable turns, with a creak of the old stage. */
export function turnSound(): void {
  playSound('whoosh');
  notes([[60, 220], [160, 247]], 'triangle', 0.08, 0.12);
}

/** The stack drops onto the turntable. */
export function landSound(): void {
  later(430, () => playSound('bonk'));
  later(470, () => playNote(150, { wave: 'sine', seconds: 0.15, gain: 0.3 }));
}

/** One bow in the curtain call: each block a step higher. Hidden blocks ring a little brighter. */
export function bowSound(step: number, hidden: boolean): void {
  playNote(climb(step), { wave: hidden ? 'sine' : 'triangle', seconds: 0.18, gain: 0.28 });
  if (hidden) later(60, () => playNote(climb(step) * 2, { wave: 'sine', seconds: 0.1, gain: 0.1 }));
}

/** The stack shows its inside: a glassy shimmer. */
export const openSound = (): void => notes([[0, 1319], [70, 1568], [140, 1760], [210, 2093]], 'sine', 0.12, 0.09);

/** A wrong answer: three silly jellies, in turn. */
export function wobbleSound(kind: number): void {
  if (kind === 0) {
    notes([[0, 330], [90, 262], [180, 330], [270, 247]], 'triangle', 0.1, 0.2);
  } else if (kind === 1) {
    playSound('boing');
    later(200, () => playSound('boing'));
  } else {
    playSound('toot');
    later(220, () => notes([[0, 300], [90, 220]], 'square', 0.07, 0.07));
  }
}

/** A try runs out: a sad slide down, like a curtain falling. */
export const failSound = (): void => notes([[0, 392], [220, 349], [440, 311], [700, 262]], 'triangle', 0.24, 0.2);

export function rightSound(): void {
  playSound('ding');
  later(140, () => playSound('pop'));
}

/** The count is done: a fanfare. */
export function bravoSound(): void {
  notes([[0, 523], [120, 659], [240, 784], [400, 1047]], 'triangle', 0.18, 0.22);
  later(420, () => playSound('tada'));
}

export function winSound(): void {
  playSound('whoosh');
  later(200, () => playSound('tada'));
}
