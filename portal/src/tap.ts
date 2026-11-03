/** How far a finger may drift and still count as a tap, in CSS pixels. Further is a swipe. */
export const TAP_SLOP_PX = 10;

/** What happened between a finger going down on a tile and the click that followed. */
export interface Gesture {
  /** Furthest the pointer got from where it went down. */
  moved: number;
  /** How far the shelf under it scrolled meanwhile, either way. */
  scrolled: number;
  /** Most pointers down at once: more than one is a palm or two children. */
  pointers: number;
  /** The browser took the pointer over for scrolling. */
  cancelled: boolean;
}

/** Only a still, single tap opens a game, so a swipe along a shelf or a palm opens nothing. */
export function isTap({ moved, scrolled, pointers, cancelled }: Gesture): boolean {
  return !cancelled && pointers <= 1 && moved <= TAP_SLOP_PX && Math.abs(scrolled) <= TAP_SLOP_PX;
}
