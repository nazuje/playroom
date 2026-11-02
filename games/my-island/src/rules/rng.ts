/** One step of a small seeded generator. Returns a number from 0 to 1 and the seed to use next. */
export function nextRandom(seed: number): { value: number; seed: number } {
  const next = (seed + 0x6d2b79f5) | 0;
  let t = next;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return { value: ((t ^ (t >>> 14)) >>> 0) / 4294967296, seed: next };
}

/** A repeatable stream of random numbers, for things that aren't saved. */
export function makeRandom(seed: number): () => number {
  let current = seed;
  return () => {
    const { value, seed: next } = nextRandom(current);
    current = next;
    return value;
  };
}
