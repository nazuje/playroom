import { describe, expect, it } from 'vitest';
import { begun, PARADE_FIRST, RAIN_FIRST, RAIN_SECONDS, skyAt, type SkyEvent } from './surprises.ts';

describe('rare surprises', () => {
  it('starts calm', () => {
    expect(Object.values(skyAt(0, 0)).every((value) => value < 0 || value === undefined)).toBe(true);
  });

  it('rains for a little while, and the first rain ends in a rainbow', () => {
    expect(skyAt(RAIN_FIRST + 1, 0).rain).toBeGreaterThanOrEqual(0);
    expect(skyAt(RAIN_FIRST + RAIN_SECONDS + 2, 0).rain).toBe(-1);
    expect(skyAt(RAIN_FIRST + RAIN_SECONDS + 2, 0).rainbow).toBeGreaterThanOrEqual(0);
  });

  it('only drops stars at night', () => {
    let day = 0;
    let night = 0;
    for (let clock = 0; clock < 2000; clock += 0.5) {
      if (skyAt(clock, 0).star >= 0) day += 1;
      if (skyAt(clock, 1).star >= 0) night += 1;
    }
    expect(day).toBe(0);
    expect(night).toBeGreaterThan(10);
  });

  it('holds a parade now and then', () => {
    expect(skyAt(PARADE_FIRST + 5, 0).parade).toBeGreaterThan(0);
  });

  it('keeps every surprise rare: each is off most of the time', () => {
    const on: Record<SkyEvent, number> = { rain: 0, rainbow: 0, star: 0, parade: 0, whale: 0 };
    const samples = 6000;
    for (let at = 0; at < samples; at += 1) {
      const sky = skyAt(at, 1);
      for (const event of Object.keys(on) as SkyEvent[]) if (sky[event] >= 0) on[event] += 1;
    }
    for (const event of Object.keys(on) as SkyEvent[]) {
      expect(on[event], event).toBeGreaterThan(0);
      expect(on[event] / samples, event).toBeLessThan(0.12);
    }
  });

  it('reports a surprise once, as it starts', () => {
    const before = skyAt(RAIN_FIRST - 0.1, 0);
    const now = skyAt(RAIN_FIRST + 0.1, 0);
    expect(begun(before, now)).toContain('rain');
    expect(begun(now, skyAt(RAIN_FIRST + 0.2, 0))).not.toContain('rain');
  });
});
