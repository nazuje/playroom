/** A full round of morning, day, evening and night, in seconds of play. */
export const DAY_SECONDS = 420;

export interface Light {
  sky: number;
  fog: number;
  hemiSky: number;
  hemiGround: number;
  hemiStrength: number;
  sun: number;
  sunStrength: number;
  /** Which way the sun comes from, as an angle round the sky. */
  sunAngle: number;
  /** 0 by day, 1 in the middle of the night: lamps, stars and window glow. */
  night: number;
  sea: number;
}

interface Stop extends Light {
  at: number;
}

const STOPS: readonly Stop[] = [
  { at: 0, sky: 0xffd9b0, fog: 0xffe2c0, hemiSky: 0xfff0d8, hemiGround: 0x88b46a, hemiStrength: 1.5, sun: 0xffd8a8, sunStrength: 1.6, sunAngle: -1, night: 0, sea: 0x35cfd0 },
  { at: 0.12, sky: 0x8fdcff, fog: 0xbfeeff, hemiSky: 0xffffff, hemiGround: 0x9acd7c, hemiStrength: 1.75, sun: 0xfff4dc, sunStrength: 2.1, sunAngle: -0.5, night: 0, sea: 0x22c7d8 },
  { at: 0.46, sky: 0x7fd4ff, fog: 0xb6e9ff, hemiSky: 0xffffff, hemiGround: 0x9acd7c, hemiStrength: 1.75, sun: 0xfff2d6, sunStrength: 2.1, sunAngle: 0.5, night: 0, sea: 0x1fc0d6 },
  { at: 0.6, sky: 0xffb37a, fog: 0xffc9a0, hemiSky: 0xffdcc0, hemiGround: 0x9a8f78, hemiStrength: 1.45, sun: 0xffa666, sunStrength: 1.8, sunAngle: 1, night: 0.15, sea: 0x4aa6c4 },
  { at: 0.68, sky: 0xc286c9, fog: 0xc99ad0, hemiSky: 0xe0c4f0, hemiGround: 0x76708c, hemiStrength: 1.4, sun: 0xff9d8c, sunStrength: 1.1, sunAngle: 1.25, night: 0.55, sea: 0x5a7fc0 },
  { at: 0.76, sky: 0x4a4f9c, fog: 0x5a5fa8, hemiSky: 0xb8c4ff, hemiGround: 0x4f5880, hemiStrength: 1.4, sun: 0xb9c6ff, sunStrength: 0.75, sunAngle: -0.3, night: 1, sea: 0x3a5aa8 },
  { at: 0.92, sky: 0x4a4f9c, fog: 0x5a5fa8, hemiSky: 0xb8c4ff, hemiGround: 0x4f5880, hemiStrength: 1.4, sun: 0xb9c6ff, sunStrength: 0.75, sunAngle: 0.3, night: 1, sea: 0x3a5aa8 },
  { at: 1, sky: 0xffd9b0, fog: 0xffe2c0, hemiSky: 0xfff0d8, hemiGround: 0x88b46a, hemiStrength: 1.5, sun: 0xffd8a8, sunStrength: 1.6, sunAngle: -1, night: 0, sea: 0x35cfd0 },
];

const mixColor = (a: number, b: number, t: number): number => {
  const part = (shift: number): number => {
    const from = (a >> shift) & 0xff;
    const to = (b >> shift) & 0xff;
    return Math.round(from + (to - from) * t) << shift;
  };
  return part(16) | part(8) | part(0);
};
const mix = (a: number, b: number, t: number): number => a + (b - a) * t;

/** The world's light at this moment of play. It is a soft loop, so evening never ends anything. */
export function lightAt(clock: number): Light {
  const phase = (((clock + DAY_SECONDS * 0.1) % DAY_SECONDS) + DAY_SECONDS) % DAY_SECONDS / DAY_SECONDS;
  let after = 1;
  while (after < STOPS.length - 1 && (STOPS[after]?.at ?? 1) < phase) after += 1;
  const a = STOPS[after - 1] ?? STOPS[0];
  const b = STOPS[after] ?? STOPS[1];
  if (!a || !b) throw new Error('No light stops');
  const span = b.at - a.at;
  const t = span > 0 ? (phase - a.at) / span : 0;
  return {
    sky: mixColor(a.sky, b.sky, t),
    fog: mixColor(a.fog, b.fog, t),
    hemiSky: mixColor(a.hemiSky, b.hemiSky, t),
    hemiGround: mixColor(a.hemiGround, b.hemiGround, t),
    hemiStrength: mix(a.hemiStrength, b.hemiStrength, t),
    sun: mixColor(a.sun, b.sun, t),
    sunStrength: mix(a.sunStrength, b.sunStrength, t),
    sunAngle: mix(a.sunAngle, b.sunAngle, t),
    night: mix(a.night, b.night, t),
    sea: mixColor(a.sea, b.sea, t),
  };
}
