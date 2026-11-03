// The pond comes to life as levels are finished: each finished level brings one new pond friend, a flower, a frog,
// a dragonfly-ish butterfly and so on, shown on the near bank while playing and in a row on the map.
import { LEVELS } from './levels.ts';
import { isDone, type Progress } from './progress.ts';

/** One friend per level, in level order. */
export const LIFE: readonly string[] = [
  '🌼', '🐸', '🐞', '🌷', '🐢', '🦋', '🌻', '🦆', '🐌', '🌸', '🐝', '🍄',
  '🦔', '🌺', '🐛', '🐇', '🌿', '🐟', '🦢', '🌹', '🐿️', '🦉', '🍀', '🌈',
];

/** The friend a level brings. */
export const lifeOf = (id: number): string => LIFE[(id - 1) % LIFE.length];

/** Every friend earned so far, in level order. */
export const lifeEarned = (progress: Progress): string[] => LEVELS.filter((level) => isDone(progress, level.id)).map((level) => lifeOf(level.id));
