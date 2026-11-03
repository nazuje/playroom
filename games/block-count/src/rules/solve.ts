// The solver: what a careful player can work out from the fixed view. Every block that shows is there, and since
// blocks never float, so is every block under it. Nothing else is forced, so the fewest blocks that explain the
// view are those and no more. The generator only makes stacks where that is the whole stack, which is what makes
// every count certain.
import { pictureOf, sightIfAdded, sightOf, verdictOf, type CubeSight, type Point } from './sight.ts';
import { countOf, cubeKey, cubesOf, depthOf, heldUp, sameHeights, widthOf, type Cube, type Heights } from './stack.ts';

export interface View {
  sights: CubeSight[];
  seen: Cube[];
  hidden: Cube[];
  /** Blocks that show only a little: never in a puzzle, because it would be unclear whether they count as seen. */
  slivers: Cube[];
  /** The fewest blocks that explain the view: everything seen, held up from below. */
  least: number[][];
}

export function viewOf(heights: Heights, eye: Point): View {
  const sights = sightOf(cubesOf(heights), eye);
  const by = (verdict: string) => sights.filter((sight) => verdictOf(sight) === verdict).map((sight) => sight.cube);
  const seen = by('seen');
  return { sights, seen, hidden: by('hidden'), slivers: by('sliver'), least: heldUp(seen, widthOf(heights), depthOf(heights)) };
}

/** The view pins the stack down: no slivers, and the fewest blocks that explain it are the whole stack. */
export const pinnedDown = (heights: Heights, view: View): boolean => view.slivers.length === 0 && sameHeights(view.least, heights);

/** The count a careful player works out from the view alone. */
export const countFromView = (view: View): number => countOf(view.least);

export const hiddenKeys = (view: View): string[] => view.hidden.map(cubeKey);

/** What a map's stack would look like from the same eye. */
export const pictureFor = (heights: Heights, eye: Point): string => pictureOf(sightOf(cubesOf(heights), eye));

/** The maps whose stack looks exactly like the one on the stage. A fair map question has exactly one. */
export function mapsMatching(heights: Heights, eye: Point, maps: readonly Heights[]): number[] {
  const picture = pictureFor(heights, eye);
  return maps.flatMap((map, at) => (pictureFor(map, eye) === picture ? [at] : []));
}

/**
 * Every spot where one more block could stand, on top of a column or on the empty floor, up to this height,
 * would show if a block stood there. So the view also proves nothing else is there: a block added anywhere would
 * be seen.
 */
export function emptySpotsShow(heights: Heights, eye: Point, ceiling: number): boolean {
  const cubes = cubesOf(heights);
  return heights.every((row, z) =>
    row.every((height, x) => height >= ceiling || verdictOf(sightIfAdded(cubes, [x, height, z], eye)) === 'seen'),
  );
}
