import type { Rect } from '../view/view.ts';

export interface TipSpot {
  left: number;
  top: number;
  maxWidth: number;
}

export interface Size {
  width: number;
  height: number;
}

const EDGE_PX = 8;
const WIDEST_PX = 420;
const NARROWEST_PX = 120;

/**
 * Where a tip goes: centered in the first free strip it fits, so it never covers the board. With no room
 * anywhere, it sits on the fallback (the dock), growing up from its bottom edge. `measure` gives the tip's
 * size when held to a width.
 */
export function pickTipSpot(strips: readonly Rect[], fallback: Rect, measure: (maxWidth: number) => Size): TipSpot {
  for (const strip of strips) {
    const room = strip.right - strip.left - EDGE_PX * 2;
    if (room < NARROWEST_PX) continue;
    const maxWidth = Math.min(WIDEST_PX, room);
    const size = measure(maxWidth);
    const height = strip.bottom - strip.top;
    if (size.height + EDGE_PX * 2 > height) continue;
    return { maxWidth, left: strip.left + (strip.right - strip.left - size.width) / 2, top: strip.top + (height - size.height) / 2 };
  }
  const maxWidth = Math.min(WIDEST_PX, fallback.right - fallback.left - EDGE_PX * 2);
  const size = measure(maxWidth);
  const height = fallback.bottom - fallback.top;
  const top = size.height > height ? fallback.bottom - size.height : fallback.top + (height - size.height) / 2;
  return { maxWidth, left: fallback.left + (fallback.right - fallback.left - size.width) / 2, top };
}
