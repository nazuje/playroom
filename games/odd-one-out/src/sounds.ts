import { playNote, playSound } from '@playroom/kit';
import type { Exit, Surprise } from './rules/play.ts';

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

/** A pentatonic scale, so any run of notes sounds friendly. */
export const SCALE: readonly number[] = [392, 440, 523, 587, 659, 784, 880, 1047];

export const pickSound = (): void => playSound('pop');

/** The sound of each way the odd one leaves. */
export function exitSound(exit: Exit): void {
  if (exit === 'bounce') {
    // The lily pad springs, a slide whistle up, and a plop far away.
    playSound('boing');
    notes([[60, 523], [130, 659], [200, 784], [270, 988]], 'sine', 0.09, 0.14);
    later(600, () => notes([[0, 330], [70, 262], [140, 220]], 'triangle', 0.1, 0.12));
  } else if (exit === 'frog') {
    // A ribbit, a slurp and a big gulp.
    notes([[120, 196], [200, 247]], 'square', 0.07, 0.08);
    later(420, () => notes([[0, 880], [60, 660], [120, 440]], 'sine', 0.06, 0.12));
    later(700, () => playSound('burp'));
  } else if (exit === 'bird') {
    // Wings swooping in, a honk, and away.
    playSound('whoosh');
    later(520, () => playSound('toot'));
    later(760, () => playSound('whoosh'));
  } else {
    // A hop, a dive and a big splash.
    notes([[0, 523], [90, 784]], 'triangle', 0.08, 0.14);
    later(560, () => playSound('pop'));
    later(600, () => notes([[0, 262], [60, 196], [120, 147], [180, 131]], 'sine', 0.12, 0.2));
  }
}

/** A rare surprise: a twinkly rainbow arpeggio for the fish, a little quack quack quack for the ducklings. */
export function surpriseSound(kind: Surprise): void {
  if (kind === 'fish') notes([[0, 523], [110, 659], [220, 784], [330, 1047], [440, 1319]], 'sine', 0.18, 0.16);
  else notes([[0, 330], [300, 392], [520, 392], [740, 392]], 'square', 0.06, 0.07);
}

/** A new pond friend joins, on the win card. */
export const friendSound = (): void => notes([[0, 784], [120, 1047], [240, 1319]], 'triangle', 0.2, 0.2);

/** A thing that belongs protests: a bonk and a grumpy "hmph" of two low notes. */
export function protestSound(kind: number): void {
  playSound('bonk');
  if (kind === 0) later(150, () => notes([[0, 196], [130, 175]], 'square', 0.12, 0.08));
  else if (kind === 1) later(140, () => notes([[0, 262], [90, 233], [180, 262]], 'triangle', 0.08, 0.14));
  else later(140, () => playSound('toot'));
}

/** One dancer's note, climbing the scale. */
export const danceNote = (step: number): void => playNote(SCALE[step % SCALE.length], { wave: 'triangle', seconds: 0.22, gain: 0.26 });

/** A try runs out: everyone tumbles into the pond, plop plop plop. */
export function sinkSound(count: number): void {
  for (let at = 0; at < count; at += 1) later(at * 120, () => playNote(523 - at * 50, { wave: 'sine', seconds: 0.12, gain: 0.2 }));
  later(count * 120 + 80, () => playSound('whoosh'));
}

export const hintSound = (): void => notes([[0, 659], [110, 988]], 'sine', 0.16, 0.24);

export const doneSound = (): void => playSound('ding');

export function winSound(): void {
  playSound('whoosh');
  later(200, () => playSound('tada'));
}
