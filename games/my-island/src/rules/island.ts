import { FRIENDS } from '../data/friends.ts';
import { PLOT_SPOTS } from '../data/map.ts';
import { buildWorld, type World } from './world.ts';

let cached: World | null = null;

/** The one island map. It is the same for every save, so it's built once. */
export function theWorld(): World {
  cached ??= buildWorld(
    FRIENDS.map(({ x, z }) => [x, z] as const),
    PLOT_SPOTS,
  );
  return cached;
}
