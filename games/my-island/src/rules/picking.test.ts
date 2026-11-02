import { describe, expect, it } from 'vitest';
import { pickSpot, type ScreenSpot } from './picking.ts';

const spot = (id: string, x: number, y: number, reach = 50, depth = 10): ScreenSpot => ({ id, x, y, reach, depth });

describe('working out what a tap meant', () => {
  it('finds the nearest thing within reach', () => {
    expect(pickSpot([spot('a', 100, 100), spot('b', 130, 100)], 125, 100)?.id).toBe('b');
  });

  it('finds nothing when the tap is on open ground', () => {
    expect(pickSpot([spot('a', 100, 100)], 300, 300)).toBeNull();
  });

  it('gives big things a bigger reach', () => {
    expect(pickSpot([spot('small', 100, 100, 30), spot('big', 180, 100, 90)], 102, 100)?.id).toBe('small');
    expect(pickSpot([spot('small', 100, 100, 30), spot('big', 180, 100, 90)], 135, 100)?.id).toBe('big');
  });

  it('prefers what is in front when two are on the same spot', () => {
    expect(pickSpot([spot('back', 100, 100, 50, 30), spot('front', 100, 100, 50, 10)], 100, 100)?.id).toBe('front');
  });
});
