// A rare surprise, so the tenth stack still has something new: about one set in eight hides a golden block. It
// shows up only in the curtain call, as the last block to bow, so it never changes what the puzzle asks.
import { seeded, SET } from './levels.ts';

export const GOLDEN_ODDS = 1 / 8;

/** Which puzzle of a level's nth go holds the golden block, or null for none. The same go always gets the same. */
export function goldenFor(id: number, go: number): number | null {
  const random = seeded(id * 7349 + go * 9973 + 17);
  if (random() >= GOLDEN_ODDS) return null;
  return Math.floor(random() * SET);
}
