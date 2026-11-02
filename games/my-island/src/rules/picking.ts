export interface ScreenSpot {
  id: string;
  /** Where it appears on screen, in pixels. */
  x: number;
  y: number;
  /** How far from it a tap still counts, in pixels. */
  reach: number;
  /** How far it is from the camera, to break ties in favour of what's in front. */
  depth: number;
}

/** The thing a tap meant. Little fingers miss, so the nearest spot within reach wins. */
export function pickSpot(spots: readonly ScreenSpot[], x: number, y: number): ScreenSpot | null {
  let best: ScreenSpot | null = null;
  let bestScore = Infinity;
  for (const spot of spots) {
    const away = Math.hypot(spot.x - x, spot.y - y);
    if (away > spot.reach) continue;
    const score = away / spot.reach + spot.depth * 0.001;
    if (score < bestScore) {
      best = spot;
      bestScore = score;
    }
  }
  return best;
}
