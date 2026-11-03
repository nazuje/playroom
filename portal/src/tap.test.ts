import { describe, expect, it } from 'vitest';
import { TAP_SLOP_PX, isTap, type Gesture } from './tap.ts';

const still: Gesture = { moved: 0, scrolled: 0, pointers: 1, cancelled: false };

describe('isTap', () => {
  it('opens a game for a still tap, or a little wobble', () => {
    expect(isTap(still)).toBe(true);
    expect(isTap({ ...still, moved: TAP_SLOP_PX, scrolled: -TAP_SLOP_PX })).toBe(true);
  });

  it('opens nothing after a swipe along the shelf', () => {
    expect(isTap({ ...still, moved: 60 })).toBe(false);
    expect(isTap({ ...still, scrolled: 40 })).toBe(false);
    expect(isTap({ ...still, scrolled: -40 })).toBe(false);
  });

  it('opens nothing for a palm or two fingers', () => {
    expect(isTap({ ...still, pointers: 2 })).toBe(false);
  });

  it('opens nothing once the browser took the finger for scrolling', () => {
    expect(isTap({ ...still, cancelled: true })).toBe(false);
  });
});
