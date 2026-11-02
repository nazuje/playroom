import { describe, expect, it } from 'vitest';
import { DAY_SECONDS, lightAt } from './daylight.ts';

describe('daylight', () => {
  it('starts as a bright morning', () => {
    expect(lightAt(0).night).toBe(0);
    expect(lightAt(0).sunStrength).toBeGreaterThan(1.5);
  });

  it('comes round to the same light after a full day', () => {
    expect(lightAt(DAY_SECONDS + 30)).toEqual(lightAt(30));
  });

  it('gets to a soft night and back, and is never pitch dark', () => {
    let darkest = 0;
    let dimmest = 99;
    for (let clock = 0; clock < DAY_SECONDS; clock += 5) {
      const light = lightAt(clock);
      darkest = Math.max(darkest, light.night);
      dimmest = Math.min(dimmest, light.hemiStrength);
    }
    expect(darkest).toBe(1);
    expect(dimmest).toBeGreaterThan(1.2);
  });

  it('never jumps between one moment and the next', () => {
    let last = lightAt(0);
    for (let clock = 1; clock < DAY_SECONDS * 2; clock += 1) {
      const light = lightAt(clock);
      expect(Math.abs(light.night - last.night)).toBeLessThan(0.06);
      expect(Math.abs(light.sunStrength - last.sunStrength)).toBeLessThan(0.1);
      last = light;
    }
  });

  it('copes with a huge clock', () => {
    expect(Number.isFinite(lightAt(1e9).night)).toBe(true);
  });
});
