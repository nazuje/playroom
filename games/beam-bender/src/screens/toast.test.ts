import { describe, expect, it } from 'vitest';
import { pickTipSpot } from './toast.ts';

const dock = { left: 0, top: 480, right: 360, bottom: 560 };
/** A tip 300px wide whose text wraps to more lines as it gets narrower. */
const measure = (maxWidth: number): { width: number; height: number } => ({ width: Math.min(300, maxWidth), height: maxWidth >= 300 ? 40 : 90 });

describe('where a tip goes', () => {
  it('centers in the first strip with room', () => {
    const above = { left: 0, top: 100, right: 360, bottom: 130 };
    const below = { left: 0, top: 400, right: 360, bottom: 470 };
    expect(pickTipSpot([above, below], dock, measure)).toEqual({ maxWidth: 344, left: 30, top: 415 });
  });

  it('skips a strip too narrow to read in', () => {
    const beside = { left: 700, top: 260, right: 820, bottom: 390 };
    const spot = pickTipSpot([beside], dock, measure);
    expect(spot.top).toBe(dock.top + (dock.bottom - dock.top - 40) / 2);
  });

  it('falls back to the dock and never grows below it', () => {
    const narrowDock = { left: 670, top: 40, right: 840, bottom: 120 };
    const spot = pickTipSpot([], narrowDock, measure);
    expect(spot).toEqual({ maxWidth: 154, left: 678, top: 30 });
  });
});
