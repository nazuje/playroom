/**
 * Rare surprises, as pure functions of the play clock. Nothing is stored, so a surprise survives a
 * reload exactly as it was, and none of them ever waits on real-world time.
 */

export const RAIN_FIRST = 200;
export const RAIN_EVERY = 330;
export const RAIN_SECONDS = 22;
export const RAINBOW_SECONDS = 28;
export const PARADE_FIRST = 380;
export const PARADE_EVERY = 560;
export const PARADE_SECONDS = 40;
const STAR_WINDOW = 9;
const STAR_SECONDS = 1.8;
const WHALE_WINDOW = 45;
const WHALE_SECONDS = 14;

export type SkyEvent = 'rain' | 'rainbow' | 'star' | 'parade' | 'whale';

/** For each surprise, how far through it is from 0 to 1, or -1 when it isn't happening. */
export type Sky = Record<SkyEvent, number>;

/** A fixed, even scatter of numbers from 0 to 1. */
export function hash(n: number): number {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}

function inCycle(clock: number, first: number, every: number): { cycle: number; t: number } | null {
  if (clock < first) return null;
  const cycle = Math.floor((clock - first) / every);
  return { cycle, t: clock - first - cycle * every };
}

const part = (t: number, from: number, length: number): number => (t >= from && t < from + length ? (t - from) / length : -1);

/** What the sky is doing at this moment of play. `night` is from daylight; stars only fall in the dark. */
export function skyAt(clock: number, night: number): Sky {
  const sky: Sky = { rain: -1, rainbow: -1, star: -1, parade: -1, whale: -1 };
  const rain = inCycle(clock, RAIN_FIRST, RAIN_EVERY);
  if (rain) {
    sky.rain = part(rain.t, 0, RAIN_SECONDS);
    if (rain.cycle === 0 || hash(rain.cycle) < 0.65) sky.rainbow = part(rain.t, RAIN_SECONDS - 3, RAINBOW_SECONDS);
  }
  const parade = inCycle(clock, PARADE_FIRST, PARADE_EVERY);
  if (parade) sky.parade = part(parade.t, 0, PARADE_SECONDS);
  if (night >= 0.8) {
    const window = Math.floor(clock / STAR_WINDOW);
    if (hash(window * 7 + 3) < 0.45) sky.star = part(clock - window * STAR_WINDOW, 3, STAR_SECONDS);
  }
  const whaleWindow = Math.floor(clock / WHALE_WINDOW);
  if (hash(whaleWindow * 13 + 5) < 0.3) sky.whale = part(clock - whaleWindow * WHALE_WINDOW, 6, WHALE_SECONDS);
  return sky;
}

/** Surprises that have just begun since the last look. */
export const begun = (before: Sky, now: Sky): SkyEvent[] =>
  (Object.keys(now) as SkyEvent[]).filter((event) => now[event] >= 0 && before[event] < 0);
