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

export function stopSounds(): void {
  for (const timer of pending) window.clearTimeout(timer);
  pending.clear();
}

export const pickSound = (): void => playSound('pop');
/** A token, a card or a pair tapped: a little wooden tock. */
export const tockSound = (): void => playNote(660, { wave: 'triangle', seconds: 0.07, gain: 0.22 });
/** The stepper climbs a scale as the number grows. */
export const stepSound = (value: number): void => playNote(262 * 2 ** (value / 12), { wave: 'sine', seconds: 0.08, gain: 0.2 });
export const hintSound = (): void => notes([[0, 659], [110, 988]], 'sine', 0.16, 0.26);

/** A token drops into the hopper and the lid clanks shut. */
export function clankSound(): void {
  playSound('pop');
  later(90, () => playSound('bonk'));
  later(120, () => playNote(1480, { wave: 'square', seconds: 0.04, gain: 0.06 }));
}

/** Gears whirring up, then the steam puffs. Lasts about as long as the machine shakes. */
export function whirSound(ms: number): void {
  const count = Math.max(4, Math.round(ms / 70));
  for (let at = 0; at < count; at += 1) later(at * 70, () => playNote(220 + at * 28, { wave: 'sawtooth', seconds: 0.06, gain: 0.05 }));
  later(Math.round(ms * 0.55), () => playSound('whoosh'));
}

/** The new token rolls out of the chute. */
export function rollSound(): void {
  notes([[0, 784], [60, 988], [120, 1175]], 'triangle', 0.07, 0.18);
  later(180, () => playSound('pop'));
}

/** A ✓ on an example as the machine checks it, climbing with each one. */
export const checkSound = (at: number): void => playNote(659 + at * 120, { wave: 'sine', seconds: 0.12, gain: 0.2 });

/** A wrong answer: three silly sputters, in turn. */
export function sputterSound(kind: number): void {
  if (kind === 0) {
    notes([[0, 140], [70, 110], [140, 150], [210, 90], [300, 70]], 'square', 0.06, 0.1);
  } else if (kind === 1) {
    playSound('bonk');
    later(150, () => playSound('boing'));
  } else {
    playSound('toot');
    later(260, () => notes([[0, 300], [80, 240]], 'sawtooth', 0.06, 0.08));
  }
}

/** A try runs out: the machine wobbles down like a sad trombone. */
export const wobbleSound = (): void => notes([[0, 392], [240, 370], [480, 349], [720, 262]], 'triangle', 0.22, 0.2);

export function rightSound(): void {
  playSound('ding');
  later(150, () => playSound('tada'));
}

export function winSound(): void {
  playSound('whoosh');
  later(200, () => playSound('tada'));
}
