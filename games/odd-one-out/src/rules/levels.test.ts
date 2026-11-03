import { describe, expect, it } from 'vitest';
import { rivals } from './careless.ts';
import { carelessGoal, fair, ideasOf, LEVEL_COUNT, LEVELS, makePuzzle, missLimit, missLimitFor, puzzleFor, puzzleKey, seeded, SET, setFor, WORLDS, type Puzzle } from './levels.ts';
import { ALSO, alsoIn, clashes, CLASHING, GROUPS, NOT_SORTABLE, PICS, picsIn } from './pics.ts';
import { aboutOf, featureOf, oddOnes, rulesFor, rulesSingling, singledBy, solve, type Feature, type Rule } from './solve.ts';
import { ARROW, CARD, drawn, PLAIN_SHAPES, picture, SHAPES, shapeId, thingKey, type Thing } from './things.ts';

const GOES = 20;
const everyGo: Puzzle[] = LEVELS.flatMap((level) => Array.from({ length: GOES }, (_, go) => puzzleFor(level.id, go) as Puzzle));
const named = (puzzle: Puzzle) => `level ${puzzle.id} go ${puzzle.go}`;
const inWorld = (world: string) => everyGo.filter((puzzle) => puzzle.world === world);
const pic = (glyph: string): Thing => picture(PICS.findIndex((one) => one.glyph === glyph));
const shape = (name: string, parts: Partial<Thing> = {}): Thing => drawn({ shape: shapeId(name), ...parts });
const cards = (dots: number[]): Thing[] => dots.map((count) => drawn({ shape: CARD, dots: count }));

/**
 * A second solver for the "same" and "alternate" rules, written another way: by counting values. If the two
 * ever disagree, one of them has a bug.
 */
function countingSame(things: readonly Thing[], feature: Feature): number[] {
  const values = things.map((thing, at) => featureOf(thing, feature, at, things.length));
  const tally = new Map<unknown, number>();
  for (const value of values) tally.set(value, (tally.get(value) ?? 0) + 1);
  const shared = [...tally.entries()].find(([value, count]) => count === things.length - 1 && value !== null);
  return shared ? values.flatMap((value, at) => (value !== shared[0] ? [at] : [])) : [];
}

describe('the pictures', () => {
  it('puts every picture in exactly one group, with no picture that could sit in two', () => {
    const glyphs = PICS.map((one) => one.glyph);
    expect(new Set(glyphs).size).toBe(glyphs.length);
    for (const glyph of NOT_SORTABLE) expect(glyphs, glyph).not.toContain(glyph);
    for (const group of GROUPS) expect(picsIn(group).length, group).toBeGreaterThanOrEqual(10);
  });

  it('never puts two of the groups in use on one picture, so each first-world puzzle is three of one group and one of another', () => {
    for (const puzzle of inWorld('kinds')) {
      const groups = puzzle.things.map((thing) => PICS[thing.pic as number].group);
      const shared = groups.filter((_, at) => at !== puzzle.answer);
      expect(new Set(shared).size, named(puzzle)).toBe(1);
      expect(groups[puzzle.answer], named(puzzle)).not.toBe(shared[0]);
    }
  });
});

describe('pictures that could sit in two groups', () => {
  const glyphOf = (thing: Thing) => PICS[thing.pic as number].glyph;
  const groupOf = (thing: Thing) => PICS[thing.pic as number].group;

  it('lists the pairings that are never allowed', () => {
    expect(CLASHING).toEqual([
      ['food', 'plants'],
      ['vehicles', 'toys'],
    ]);
    // The ones a tester caught: a tomato is a plant too, and a red car looks like a toy car.
    expect(ALSO['🍅']).toContain('plants');
    expect(ALSO['🚗']).toContain('toys');
    for (const glyph of ['🐶', '🐱', '🐷', '🐰', '🐨', '🐵']) expect(ALSO[glyph], glyph).toContain('toys');
    for (const glyph of Object.keys(ALSO)) expect(PICS.map((pic) => pic.glyph), glyph).toContain(glyph);
  });

  it('never puts food with plants, vehicles with toys, or any picture with a group it could also be in', () => {
    for (const puzzle of inWorld('kinds')) {
      const odd = puzzle.things[puzzle.answer];
      const friends = puzzle.things.filter((_, at) => at !== puzzle.answer);
      const shared = groupOf(friends[0]);
      expect(clashes(shared, groupOf(odd)), `${named(puzzle)} ${shared} and ${groupOf(odd)}`).toBe(false);
      expect(alsoIn(odd.pic as number), `${named(puzzle)} ${glyphOf(odd)} among ${shared}`).not.toContain(shared);
      for (const friend of friends) expect(alsoIn(friend.pic as number), `${named(puzzle)} ${glyphOf(friend)} with ${glyphOf(odd)}`).not.toContain(groupOf(odd));
    }
  });
});

describe('the solver', () => {
  it('singles out the thing that breaks a shared look, and nothing when none does', () => {
    expect(oddOnes([pic('🐶'), pic('🐱'), pic('🐷'), pic('🚗')])).toEqual([3]);
    // Two animals, an owl that flies and a car: "the only one that flies" points at the owl, so it isn't fair.
    expect(oddOnes([pic('🐶'), pic('🐱'), pic('🦉'), pic('🚗')])).toEqual([2, 3]);
    expect(solve([pic('🐶'), pic('🐱'), pic('🦉'), pic('🚗')])).toBeNull();
    expect(oddOnes([shape('circle'), shape('circle'), shape('square'), shape('square')])).toEqual([]);
  });

  it('sees one look that depends on another, both ways', () => {
    const big = (color: number, name: string) => shape(name, { size: 2, color });
    const small = (color: number, name: string) => shape(name, { size: 0, color });
    const things = [big(0, 'circle'), small(4, 'square'), big(0, 'star'), small(4, 'heart'), big(4, 'moon')];
    expect(singledBy({ kind: 'pair', a: 'size', b: 'color' }, things)).toEqual([4]);
    expect(oddOnes(things)).toEqual([4]);
    // One of each is no pairing: a group needs two at least.
    expect(singledBy({ kind: 'pair', a: 'shape', b: 'color' }, things)).toEqual([]);
  });

  it('sees a sequence broken in one place, and a pair of looks taking turns', () => {
    expect(singledBy({ kind: 'step', feature: 'dots' }, cards([1, 2, 3, 4, 5, 7]))).toEqual([5]);
    expect(singledBy({ kind: 'step', feature: 'dots' }, cards([9, 7, 6, 3, 1]))).toEqual([2]);
    const arrows = [0, 2, 4, 7, 0, 2].map((turn) => drawn({ shape: ARROW, turn }));
    expect(singledBy({ kind: 'step', feature: 'turn' }, arrows)).toEqual([3]);
    const colors = [0, 4, 0, 4, 0, 0].map((color) => shape('circle', { color }));
    expect(singledBy({ kind: 'alternate', feature: 'color' }, colors)).toEqual([5]);
    // In a row of four, "taking turns" rests on one lone value, so it is no rule there.
    expect(singledBy({ kind: 'alternate', feature: 'color' }, colors.slice(0, 4).map((one, at) => (at === 3 ? { ...one, color: 0 } : one)))).toEqual([]);
  });

  it('sees hidden rules: sides that match the dots, and the card whose number tells a fib', () => {
    const polygons = ['triangle', 'square', 'pentagon', 'hexagon', 'square'].map((name) => shape(name, { dots: SHAPES[shapeId(name)].sides as number }));
    polygons[4] = { ...polygons[4], dots: 5 };
    expect(singledBy({ kind: 'same', feature: 'sidesMatch' }, polygons)).toEqual([4]);
    const numbered = cards([2, 5, 7, 3, 6]).map((card, at) => ({ ...card, numeral: at === 1 ? 4 : card.dots }));
    expect(singledBy({ kind: 'same', feature: 'honest' }, numbered)).toEqual([1]);
  });

  it('agrees with a second solver that counts values instead', () => {
    for (const puzzle of everyGo) {
      for (const rule of rulesFor(puzzle.things)) {
        if (rule.kind !== 'same') continue;
        expect(singledBy(rule, puzzle.things), `${named(puzzle)} ${rule.feature}`).toEqual(countingSame(puzzle.things, rule.feature));
      }
    }
  });

  it('turns down a puzzle where the odd one is odd in a second, unrelated way', () => {
    const things = [shape('circle', { color: 0 }), shape('circle', { color: 0 }), shape('circle', { color: 0 }), shape('circle', { color: 4, size: 0 })];
    expect(solve(things)).toBe(3);
    expect(fair({ things, answer: 3, rule: { kind: 'same', feature: 'color' } })).toBe(false);
    expect(fair({ things: things.map((thing) => ({ ...thing, size: 2 })), answer: 3, rule: { kind: 'same', feature: 'color' } })).toBe(true);
  });
});

describe('every puzzle', () => {
  it('has 24 levels in 5 worlds, in order', () => {
    expect(LEVEL_COUNT).toBe(24);
    expect([...new Set(LEVELS.map((level) => level.world))]).toEqual([...WORLDS]);
  });

  it('has exactly one thing that breaks the rule the level meant, and it is the answer', () => {
    for (const puzzle of everyGo) expect(singledBy(puzzle.rule, puzzle.things), named(puzzle)).toEqual([puzzle.answer]);
  });

  it('lets no other rule the game knows single out anything else', () => {
    for (const puzzle of everyGo) {
      expect(oddOnes(puzzle.things), named(puzzle)).toEqual([puzzle.answer]);
      expect(solve(puzzle.things), named(puzzle)).toBe(puzzle.answer);
      for (const [at] of puzzle.things.entries()) {
        if (at === puzzle.answer) continue;
        expect(rulesSingling(puzzle.things, at), `${named(puzzle)} thing ${at}`).toEqual([]);
      }
    }
  });

  it('is about one idea: any other rule that also singles out the answer is about the same looks', () => {
    for (const puzzle of everyGo) {
      const about = aboutOf(puzzle.rule);
      for (const rule of rulesSingling(puzzle.things, puzzle.answer)) {
        expect(about, `${named(puzzle)} ${JSON.stringify(rule)}`).toEqual(expect.arrayContaining(aboutOf(rule)));
      }
    }
  });

  it('only draws what can be seen: dots on cards and polygons, turns on shapes that look turned, mirrors on lopsided shapes', () => {
    for (const puzzle of everyGo) {
      for (const thing of puzzle.things) {
        if (thing.pic !== null) continue;
        const info = SHAPES[thing.shape];
        if (thing.dots > 0) expect(info.name === 'card' || info.sides !== null, named(puzzle)).toBe(true);
        if (thing.turn !== 0) expect(info.turnable, named(puzzle)).toBe(true);
        if (thing.flip !== 0) expect(info.symmetric, named(puzzle)).toBe(false);
        expect(thing.dots).toBeLessThanOrEqual(9);
      }
    }
  });

  it('makes every thing differ from the others from the fourth world on', () => {
    for (const puzzle of everyGo.filter((one) => one.world === 'pairs' || one.world === 'tricky')) {
      expect(new Set(puzzle.things.map(thingKey)).size, named(puzzle)).toBe(puzzle.things.length);
    }
  });

  it('is the same every time it is made, and every go is a fresh puzzle', () => {
    for (const level of LEVELS) {
      expect(puzzleKey(makePuzzle(level.id, 3) as Puzzle)).toBe(puzzleKey(puzzleFor(level.id, 3) as Puzzle));
      const keys = Array.from({ length: GOES }, (_, go) => puzzleKey(puzzleFor(level.id, go) as Puzzle));
      expect(new Set(keys).size, `level ${level.id}`).toBe(GOES);
    }
  });

  it('puts the odd one where no tapping pattern can learn: not always one place, not a cycle, not where it was last time', () => {
    const MANY = 120;
    for (const world of WORLDS) {
      const levels = LEVELS.filter((level) => level.world === world);
      const count = levels[0].count;
      const answers = levels.map((level) => Array.from({ length: MANY }, (_, go) => (puzzleFor(level.id, go) as Puzzle).answer));
      const all = answers.flat();
      // Three standard deviations above chance, over every go of the world's levels.
      const chance = 1 / count;
      const most = chance + 3 * Math.sqrt((chance * (1 - chance)) / all.length);
      for (let place = 0; place < count; place += 1) expect(all.filter((at) => at === place).length / all.length, `${world} always ${place}`).toBeLessThan(most);
      const cycle = answers.flatMap((row) => row.map((at, go) => (at === go % count ? 1 : 0)));
      expect(cycle.reduce((sum: number, hit) => sum + hit, 0) / cycle.length, `${world} cycle`).toBeLessThan(most);
      const again = answers.flatMap((row) => row.slice(1).map((at, go) => (at === row[go] ? 1 : 0)));
      expect(again.reduce((sum: number, hit) => sum + hit, 0) / again.length, `${world} same as last time`).toBeLessThan(most);
    }
  });

  it('turns mirror puzzles only by quarter turns on the fourth world', () => {
    for (const puzzle of inWorld('pairs').filter((one) => one.idea === 'mirror')) {
      for (const thing of puzzle.things) expect(thing.turn % 2, named(puzzle)).toBe(0);
    }
  });

  it('moves the odd one around the pond', () => {
    for (const level of LEVELS) {
      const places = new Set(Array.from({ length: GOES }, (_, go) => (puzzleFor(level.id, go) as Puzzle).answer));
      expect(places.size, `level ${level.id}`).toBeGreaterThanOrEqual(3);
    }
  });
});

describe('the staircase', () => {
  it('starts with four big pictures, then four shapes, five cards, five shapes and six of anything', () => {
    for (const puzzle of inWorld('kinds')) {
      expect(puzzle.things).toHaveLength(4);
      expect(puzzle.big).toBe(true);
      expect(puzzle.things.every((thing) => thing.pic !== null)).toBe(true);
    }
    for (const puzzle of inWorld('looks')) {
      expect(puzzle.things).toHaveLength(4);
      expect(['color', 'shape', 'size', 'fill']).toContain(puzzle.idea);
      expect(puzzle.things.every((thing) => PLAIN_SHAPES.includes(thing.shape))).toBe(true);
    }
    for (const puzzle of inWorld('count')) {
      expect(puzzle.things).toHaveLength(5);
      expect(['count', 'parity', 'honest']).toContain(puzzle.idea);
      expect(puzzle.things.every((thing) => thing.shape === CARD && thing.dots > 0)).toBe(true);
    }
    for (const puzzle of inWorld('pairs')) {
      expect(puzzle.things).toHaveLength(5);
      expect(['pair', 'symmetry', 'mirror']).toContain(puzzle.idea);
    }
    for (const puzzle of inWorld('tricky')) expect(puzzle.things).toHaveLength(6);
  });

  it('brings every idea it promises', () => {
    const seen = (id: number) => new Set(Array.from({ length: GOES }, (_, go) => (puzzleFor(id, go) as Puzzle).idea));
    for (const level of LEVELS) expect([...seen(level.id)].sort(), `level ${level.id}`).toEqual([...ideasOf(level.id)].sort());
    const rules = new Set(inWorld('tricky').map((puzzle) => puzzle.rule.kind + ('feature' in puzzle.rule ? puzzle.rule.feature : '')));
    expect([...rules]).toEqual(expect.arrayContaining(['samesidesMatch', 'stepdots', 'stepturn', 'alternatecolor', 'alternateshape']));
  });

  const SETS = GOES / SET;
  const slipsIn = (set: Puzzle[]) => {
    const each = set.map((puzzle) => rivals(puzzle.things, puzzle.answer, puzzle.glance));
    // The fewest taps the careless eye can waste on the set, and the most, with ties going against it.
    return { least: each.reduce((sum, eye) => sum + eye.ahead, 0), most: each.reduce((sum, eye) => sum + eye.ahead + eye.tied, 0), each };
  };

  it('makes the careless eye slip in every set past the first world, so careless play never earns three stars there', () => {
    for (const level of LEVELS.filter((one) => one.world !== 'kinds')) {
      for (let set = 0; set < SETS; set += 1) expect(slipsIn(setFor(level.id, set)).least, `level ${level.id} set ${set}`).toBeGreaterThanOrEqual(1);
    }
  });

  it('lets the careless eye win every try of the early levels and lose every try of the late ones', () => {
    for (const level of LEVELS) {
      const goal = carelessGoal(level.id);
      for (let set = 0; set < SETS; set += 1) {
        const puzzles = setFor(level.id, set);
        const { least, most, each } = slipsIn(puzzles);
        const where = `level ${level.id} set ${set}`;
        if (goal === 'wins' && level.world !== 'kinds') expect(most, where).toBeLessThan(missLimit(puzzles[0]));
        if (goal === 'loses') {
          // It runs out on the very first puzzle.
          expect(each[0].ahead, where).toBeGreaterThanOrEqual(missLimit(puzzles[0]));
          // Tapping whatever looks least different is no trick either.
          for (const [at, eye] of each.entries()) expect(eye.ahead + eye.tied, where).toBeLessThan(puzzles[at].things.length - 1);
        }
        if (goal === undefined) expect(least, where).toBeGreaterThanOrEqual(missLimit(puzzles[0]));
      }
    }
    const early = LEVELS.filter((level) => level.world === 'kinds' || level.world === 'looks');
    expect(early.every((level) => carelessGoal(level.id) === 'wins')).toBe(true);
    expect(LEVELS.filter((level) => level.world === 'tricky').every((level) => carelessGoal(level.id) === 'loses')).toBe(true);
  });

  it('never fails a try on the first world, and elsewhere allows two fewer misses than things, at most 3', () => {
    expect([4, 5, 6].map(missLimitFor)).toEqual([2, 3, 3]);
    for (const puzzle of everyGo) expect(missLimit(puzzle)).toBe(puzzle.world === 'kinds' ? Infinity : Math.min(puzzle.things.length - 2, 3));
  });

  it('makes tapping every pad in reading order, or at random, rarely win a try', () => {
    const random = seeded(7);
    for (const level of LEVELS.filter((one) => one.world !== 'kinds')) {
      let byOrder = 0;
      let byChance = 0;
      const tries = 2000;
      const sweeps = 30;
      for (let set = 0; set < sweeps; set += 1) {
        const puzzles = setFor(level.id, set);
        // Left to right: the misses on a puzzle are the odd one's place.
        if (puzzles.reduce((sum, puzzle) => sum + puzzle.answer, 0) < missLimit(puzzles[0])) byOrder += 1;
      }
      for (let go = 0; go < tries; go += 1) {
        const puzzles = setFor(level.id, go % sweeps);
        let misses = 0;
        for (const puzzle of puzzles) {
          const order = puzzle.things.map((_, at) => ({ at, key: random() })).sort((a, b) => a.key - b.key);
          misses += order.findIndex(({ at }) => at === puzzle.answer);
        }
        if (misses < missLimit(puzzles[0])) byChance += 1;
      }
      const late = level.world === 'pairs' || level.world === 'tricky';
      // A try ends on the 2nd miss with four things and the 3rd with five or six, never on a miss that lets tapping
      // everything solve a puzzle, and random tapping wins a late set under 10% of the time.
      expect(missLimit(setFor(level.id, 0)[0])).toBeLessThanOrEqual(level.count - 1);
      expect(byChance / tries, `level ${level.id} at random`).toBeLessThan(late ? 0.1 : 0.12);
      expect(byOrder / sweeps, `level ${level.id} left to right`).toBeLessThanOrEqual(0.2);
    }
  });

  it('makes guessing at random rarely win a late try', () => {
    // Taps in a random order: the chance a whole set of three is done within the miss limit.
    const chance = (options: number, limit: number): number => {
      let ways = [1];
      for (let puzzle = 0; puzzle < SET; puzzle += 1) {
        const next = new Array(ways.length + options - 1).fill(0);
        ways.forEach((p, misses) => {
          for (let more = 0; more < options; more += 1) next[misses + more] += p / options;
        });
        ways = next;
      }
      return ways.slice(0, limit).reduce((sum, p) => sum + p, 0);
    };
    expect(chance(6, missLimitFor(6))).toBeLessThan(0.05);
    expect(chance(5, missLimitFor(5))).toBeLessThan(0.09);
    expect(chance(4, missLimitFor(4))).toBeLessThan(0.07);
  });
});

describe('every rule kind', () => {
  it('is checked for every drawn puzzle', () => {
    const kinds = new Set(rulesFor(inWorld('tricky')[0].things).map((rule: Rule) => rule.kind));
    expect([...kinds].sort()).toEqual(['alternate', 'pair', 'same', 'step']);
  });
});
