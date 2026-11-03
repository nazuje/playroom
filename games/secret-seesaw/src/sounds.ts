import { playNote, playSound } from '@playroom/kit';

const pending = new Set<number>();
/** A little circus scale, low for light weights and high for heavy ones. */
const SCALE = [262, 294, 330, 349, 392, 440, 494, 523, 587, 659, 698, 784, 880, 988, 1047, 1175, 1319, 1397, 1568, 1760, 1976];

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
export const weightSound = (value: number): void =>
  playNote(SCALE[Math.max(0, Math.min(SCALE.length - 1, value))], { wave: 'triangle', seconds: 0.12, gain: 0.22 });
/** Two notes that meet: the same thing left both sides. */
export const pairSound = (): void => notes([[0, 523], [0, 784], [120, 1047]], 'sine', 0.16, 0.22);
export const swapSound = (): void => notes([[0, 659], [80, 880], [160, 659], [240, 988]], 'triangle', 0.1, 0.2);
export const stuckSound = (): void => playSound('bonk');
export const placeSound = (): void => playSound('dig');
export const hintSound = (): void => notes([[0, 659], [110, 988]], 'sine', 0.16, 0.26);

/** A slide whistle down and a honk: the wrong number tips the seesaw. */
export function wrongSound(): void {
  playSound('boing');
  notes([[180, 698], [280, 587], [380, 494], [480, 392]], 'sawtooth', 0.09, 0.07);
  later(600, () => playSound('toot'));
}

export function rightSound(): void {
  playSound('ding');
  later(150, () => playSound('tada'));
}

export function levelSound(): void {
  notes([[0, 784], [120, 988], [240, 1175], [360, 1568]], 'sine', 0.18, 0.26);
}

export function winSound(): void {
  playSound('whoosh');
  later(200, () => playSound('tada'));
}

/** Everything slides off: a long whistle down, a clatter and a honk. */
export function tumbleSound(): void {
  notes([[0, 880], [90, 740], [180, 622], [270, 523], [360, 440], [450, 349], [540, 262]], 'sawtooth', 0.09, 0.07);
  for (const ms of [620, 700, 790, 900]) later(ms, () => playSound('dig'));
  later(1000, () => playSound('toot'));
}
