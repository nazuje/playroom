import { describe, expect, it } from 'vitest';
import { carelessMisses, carelessOrder, nudgesFrom, quickCount } from './careless.ts';
import { LEVEL_COUNT, LEVELS, levelFor, missLimit, seeded, SET, SETS, setFor, VARIANTS, WORLDS, type Level } from './levels.ts';
import { answer, startPlay } from './play.ts';
import { eyeFor, SEEN_SHARE, sightOf, verdictOf } from './sight.ts';
import { emptySpotsShow, mapsMatching, pictureFor, viewOf } from './solve.ts';
import { countOf, cubeKey, cubesOf, heightsKey, heldUp, mirrored, missingFrom, openTops, tallestOf } from './stack.ts';

const everyPuzzle: Level[] = LEVELS.flatMap(({ id }) => Array.from({ length: VARIANTS }, (_, variant) => levelFor(id, variant) as Level));
const named = (level: Level) => `level ${level.id} variant ${level.variant}`;
const worldOf = (id: number) => LEVELS[id - 1].world;
/** The last three levels of every world after the first. */
const lateLevels = WORLDS.slice(1).flatMap((world) => LEVELS.filter((level) => level.world === world).slice(-3).map((level) => level.id));

describe('what the camera sees', () => {
  const eye = eyeFor(2, 2, 2);

  it('sees a lone block', () => {
    const [sight] = sightOf(cubesOf([[1]]), eyeFor(1, 1, 1));
    expect(verdictOf(sight)).toBe('seen');
    expect(sight.share).toBeGreaterThan(1);
  });

  it('loses the block at the back left under a block, with blocks to its right and in front', () => {
    const heights = [
      [2, 1],
      [1, 1],
    ];
    const view = viewOf(heights, eye);
    expect(view.hidden.map(cubeKey)).toEqual(['0,0,0']);
    expect(view.seen).toHaveLength(4);
  });

  it('still sees a block under another when its front is open', () => {
    const view = viewOf([[2, 1]], eyeFor(2, 1, 2));
    expect(view.hidden).toEqual([]);
  });

  it('never sees a block walled in on every side it could show', () => {
    const heights = [
      [3, 3, 3],
      [3, 3, 3],
      [3, 3, 3],
    ];
    const view = viewOf(heights, eyeFor(3, 3, 3));
    // The back left column shows only its top, and the middle column only its top.
    expect(view.hidden.map(cubeKey)).toEqual(expect.arrayContaining(['0,0,0', '0,1,0', '1,0,1', '1,1,1']));
  });

  it('tells stacks apart that look different, and not ones that look the same', () => {
    const heights = [
      [2, 1],
      [1, 0],
    ];
    expect(pictureFor(heights, eye)).not.toBe(pictureFor(mirrored(heights), eye));
    expect(pictureFor(heights, eye)).toBe(pictureFor(heights.map((row) => [...row]), eye));
  });
});

describe('the staircase', () => {
  it('has 24 levels in 5 worlds, in order', () => {
    expect(LEVEL_COUNT).toBe(24);
    expect([...new Set(LEVELS.map((level) => level.world))]).toEqual([...WORLDS]);
  });

  it('starts with a row of 3 blocks and ends with a stack of more than 20', () => {
    expect(levelFor(1, 0)?.heights).toEqual([[1, 1, 1]]);
    const last = Array.from({ length: VARIANTS }, (_, variant) => levelFor(LEVEL_COUNT, variant) as Level);
    for (const level of last) expect(level.count, named(level)).toBeGreaterThan(20);
  });

  it('gives every level 15 different stacks in 5 sets of 3', () => {
    for (const { id } of LEVELS) {
      const keys = Array.from({ length: VARIANTS }, (_, variant) => heightsKey((levelFor(id, variant) as Level).heights));
      expect(new Set(keys).size, `level ${id}`).toBe(VARIANTS);
      const sets = Array.from({ length: SETS }, (_, go) => setFor(id, go));
      expect(sets.every((set) => set.length === SET)).toBe(true);
      expect(new Set(sets.flat().map((level) => level.variant)).size).toBe(VARIANTS);
      expect(setFor(id, SETS).map((level) => level.variant)).toEqual(setFor(id, 0).map((level) => level.variant));
    }
  });

  it('turns the turntable only on the first two worlds', () => {
    for (const level of everyPuzzle) expect(level.turn, named(level)).toBe(level.world === 'see' || level.world === 'hide');
  });
});

describe('every puzzle has one answer', () => {
  // The proof the whole game rests on. From the camera's fixed view, take every block that clearly shows. Blocks
  // never float, so each one stands on blocks down to the floor. That is the fewest blocks the view allows, and it
  // must be the whole stack: nothing hides that isn't holding something up.
  it('is pinned down by the view: the fewest blocks that explain it, held up from below, are the whole stack', () => {
    for (const level of everyPuzzle) {
      const sights = sightOf(cubesOf(level.heights), level.eye);
      const seen = sights.filter((sight) => sight.share >= SEEN_SHARE).map((sight) => sight.cube);
      const unclear = sights.filter((sight) => sight.share < SEEN_SHARE && sight.faces.some((face) => face.clear > 0));
      expect(unclear, `${named(level)} shows a sliver`).toEqual([]);
      expect(heldUp(seen, level.width, level.depth), named(level)).toEqual(level.heights);
      expect(seen.length + level.hidden.length, named(level)).toBe(countOf(level.heights));
    }
  });

  it('would show one more block anywhere it could stand, so the view also proves nothing else is there', () => {
    for (const level of everyPuzzle) {
      expect(emptySpotsShow(level.heights, level.eye, level.box || tallestOf(level.heights)), named(level)).toBe(true);
    }
  });

  it('only hides blocks that sit under another block', () => {
    for (const level of everyPuzzle) {
      for (const key of level.hidden) {
        const [x, y, z] = key.split(',').map(Number);
        expect(level.heights[z][x], `${named(level)} ${key}`).toBeGreaterThan(y + 1);
      }
    }
  });

  it('asks for the count, or what fills the box, and offers it', () => {
    for (const level of everyPuzzle) {
      if (level.ask === 'count') expect(level.truth, named(level)).toBe(countOf(level.heights));
      if (level.ask === 'fill') {
        expect(level.truth, named(level)).toBe(missingFrom(level.heights, level.box));
        expect(tallestOf(level.heights), named(level)).toBeLessThanOrEqual(level.box);
      }
      if (level.answer !== 'maps') expect(level.numbers, named(level)).toContain(level.truth);
    }
  });

  it('shows every block on the first world', () => {
    for (const level of everyPuzzle.filter((one) => one.world === 'see')) {
      expect(level.hidden, named(level)).toEqual([]);
      expect(level.count, named(level)).toBeGreaterThanOrEqual(2);
      expect(level.count, named(level)).toBeLessThanOrEqual(5);
    }
  });

  it('hides at least one block in every counting puzzle after the first world', () => {
    for (const level of everyPuzzle.filter((one) => one.world !== 'see' && one.ask === 'count')) {
      expect(level.hidden.length, named(level)).toBeGreaterThan(0);
    }
  });

  it('moves the right token round on three-token levels', () => {
    for (const { id } of LEVELS.filter((level) => level.answer === 'three')) {
      const places = new Set(Array.from({ length: VARIANTS }, (_, variant) => levelFor(id, variant) as Level).map((level) => level.numbers.indexOf(level.truth)));
      expect(places.size, `level ${id}`).toBe(3);
    }
  });

  it('has exactly one map that looks like the stage, among five different maps, with the mirror always there', () => {
    for (const level of everyPuzzle.filter((one) => one.ask === 'map')) {
      expect(level.maps, named(level)).toHaveLength(5);
      expect(new Set(level.maps.map(heightsKey)).size, named(level)).toBe(5);
      expect(mapsMatching(level.heights, level.eye, level.maps), named(level)).toEqual([level.truth]);
      expect(level.maps[level.truth]).toEqual(level.heights);
      expect(level.maps.map(heightsKey), named(level)).toContain(heightsKey(mirrored(level.heights)));
      // Each wrong map's stack also looks different from every other card's, so no two cards could both be right.
      const pictures = level.maps.map((map) => pictureFor(map, level.eye));
      expect(new Set(pictures).size, named(level)).toBe(5);
    }
    for (const { id } of LEVELS.filter((level) => level.ask === 'map')) {
      const places = new Set(Array.from({ length: VARIANTS }, (_, variant) => (levelFor(id, variant) as Level).truth));
      expect(places.size, `level ${id}`).toBe(5);
    }
  });
});

describe('the careless eye', () => {
  it('nudges a number up and down from its first guess', () => {
    expect(nudgesFrom(5, [1, 2, 3, 4, 5, 6, 7, 8])).toEqual([5, 6, 4, 7, 3, 8, 2, 1]);
    expect(nudgesFrom(1, [1, 2, 3])).toEqual([1, 2, 3]);
  });

  it('wins every first-world puzzle at once', () => {
    for (const level of everyPuzzle.filter((one) => one.world === 'see')) expect(carelessMisses(level, seeded(1)), named(level)).toBe(0);
  });

  it('misses at least once on every puzzle after the first world, so it never gets 3 stars there', () => {
    for (const level of everyPuzzle.filter((one) => one.world !== 'see')) {
      expect(carelessMisses(level, seeded(level.variant)), named(level)).toBeGreaterThan(0);
    }
  });

  it('counts short on "fill the box" by counting only the empty tops', () => {
    for (const level of everyPuzzle.filter((one) => one.ask === 'fill')) {
      expect(quickCount(level), named(level)).toBe(openTops(level.heights, level.box));
      expect(quickCount(level), named(level)).toBeLessThan(level.truth);
    }
  });

  it('runs out of tries on every set of the last three levels of every world after the first', () => {
    for (const id of lateLevels) {
      for (let go = 0; go < SETS; go += 1) {
        const random = seeded(id * 100 + go);
        let play = startPlay(setFor(id, go));
        while (!play.won && !play.failed) {
          const level = play.puzzles[play.at];
          const order = carelessOrder(level, random).filter((pick) => !play.tried.includes(pick));
          play = (answer(play, order[0]) as { play: typeof play }).play;
        }
        expect(play.failed, `level ${id} (${worldOf(id)}) set ${go}`).toBe(true);
      }
    }
  });

  it('wins the first levels of the second world, with misses to spare', () => {
    for (const id of [6, 7]) {
      for (let go = 0; go < SETS; go += 1) {
        const misses = setFor(id, go).reduce((sum, level) => sum + carelessMisses(level, seeded(go)), 0);
        expect(misses, `level ${id} set ${go}`).toBeLessThan(missLimit(setFor(id, go)[0]));
      }
    }
  });
});
