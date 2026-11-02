import type { Demo } from './demo.ts';
import type { Plan, MoveSpec, DropSpec } from './level.ts';
import type { HintId } from './lang/en.ts';
import { mirrored, START, STAMPS, TOP, type Stamp, type StampName } from './stamps.ts';

export type WorldId = 'shaft' | 'ice' | 'clock' | 'top';

export const WORLD_IDS: readonly WorldId[] = ['shaft', 'ice', 'clock', 'top'];
export const WALLS_FROM = 3;
export const DASH_FROM = 8;

/** A stamp name, with ! for its mirror image. */
type Piece = StampName | `${StampName}!`;

interface Design {
  world: WorldId;
  /** Lava speed in units a second, about a tile a second at the slow end. */
  lava: number;
  /** Seconds for the speed star. */
  par: number;
  /** Bottom of the tower first. */
  pieces: Piece[];
  ice?: boolean;
  fish?: boolean;
}

const DESIGNS: Design[] = [
  // Volcano Shaft.
  { world: 'shaft', lava: 10, par: 26, pieces: ['steps', 'steps!', 'stepsGem', 'steps!', 'steps', 'stepsGem!', 'steps', 'steps!'] },
  { world: 'shaft', lava: 10, par: 27, pieces: ['steps', 'crumbSteps', 'crumbSteps!', 'steps', 'crumbSteps', 'stepsGem!', 'crumbSteps', 'crumbSteps!', 'steps'] },
  { world: 'shaft', lava: 10, par: 22, pieces: ['steps', 'kick', 'steps', 'kick!', 'steps!', 'kick', 'stepsGem', 'kick!', 'steps!'] },
  { world: 'shaft', lava: 12, par: 28, pieces: ['steps', 'spikeSteps', 'spikeSteps!', 'stepsGem', 'spikeSteps', 'kick', 'steps', 'spikeSteps!', 'spikeSteps', 'steps'] },
  { world: 'shaft', lava: 12, par: 33, fish: true, pieces: ['steps', 'padLow', 'steps', 'padLow!', 'spikeSteps', 'padLow', 'crumbSteps', 'stepsGem', 'padLow!', 'spikeSteps!', 'pad', 'steps'] },
  { world: 'shaft', lava: 13, par: 36, pieces: ['steps', 'rockSteps', 'steps!', 'rockSteps!', 'stepsGem', 'crumbSteps', 'rockSteps', 'steps!', 'rocksGem', 'kick!', 'steps!'] },
  // Ice Tower.
  { world: 'ice', lava: 21, par: 35, ice: true, pieces: ['zig', 'zig!', 'hops!', 'stairs', 'zig', 'slab', 'bridge', 'shaft', 'hops!', 'slab!', 'teeth', 'jaws', 'gemHigh'] },
  { world: 'ice', lava: 24, par: 42, pieces: ['dashGap', 'dashSpikes!', 'dashGap!', 'zig!', 'dashGap!', 'dashShaft!', 'hops!', 'stairs', 'dashSpikes', 'dashShaft', 'crumbs!', 'zig', 'hops'] },
  { world: 'ice', lava: 24, par: 36, ice: true, pieces: ['ferry', 'lift', 'ferry!', 'ferries!', 'slab!', 'dashGap!', 'bridge', 'lift', 'ferry', 'ferries', 'zig', 'hops'] },
  { world: 'ice', lava: 33, par: 32, ice: true, pieces: ['twist', 'ferries', 'dashSpikes', 'zig!', 'dashShaft!', 'lift!', 'bridge', 'dashGap', 'ferries', 'dashSpikes', 'bridge'] },
  { world: 'ice', lava: 29, par: 41, ice: true, fish: true, pieces: ['teeth', 'spikeShaft', 'dashGap!', 'rocksGem', 'zig', 'nook', 'gemHigh', 'dashSpikes', 'spikeShaft', 'rocks', 'dashShaft!', 'hops!', 'bridge'] },
  { world: 'ice', lava: 23, par: 37, ice: true, pieces: ['jaws', 'dashShaft!', 'lift', 'dashSpikes', 'twist', 'dashGap', 'bridge', 'jaws!', 'spikeShaft', 'dashGap!', 'crumbs', 'bridge'] },
  // Clockwork Tower.
  { world: 'clock', lava: 47, par: 27, pieces: ['belts', 'zig', 'zig!', 'beltSpikes!', 'belts', 'zig', 'hops', 'belts', 'zig', 'beltSpikes!', 'stairs', 'zig', 'hops'] },
  { world: 'clock', lava: 49, par: 31, pieces: ['ferry', 'ferries', 'beltSpikes!', 'belts!', 'lift', 'stepping', 'bridge', 'beltSpikes!', 'ferries!', 'zig!', 'stepping', 'bridge'] },
  { world: 'clock', lava: 36, par: 34, pieces: ['rocks', 'belts', 'rocksGem!', 'dashBelt', 'dashShaft!', 'crumbs', 'gemHigh', 'rocks', 'dashBelt', 'dashShaft!', 'bridge'] },
  { world: 'clock', lava: 42, par: 36, pieces: ['stepping', 'beltSpikes', 'twist', 'dashBelt', 'spikeShaft', 'ferries', 'bridge', 'stepping', 'twist', 'dashBelt', 'spikeShaft', 'bridge'] },
  { world: 'clock', lava: 40, par: 34, fish: true, pieces: ['crumbLine', 'dashBelt', 'drop!', 'tightrope', 'nook!', 'stepping', 'bridge', 'drop', 'tightrope!', 'dashBelt', 'bridge'] },
  { world: 'clock', lava: 48, par: 42, pieces: ['drop', 'ferries', 'beltSpikes!', 'gauntlet', 'lift!', 'dashBelt', 'bridge', 'drop!', 'gauntlet', 'bridge'] },
  // The Top.
  { world: 'top', lava: 56, par: 43, pieces: ['gauntlet', 'tightrope', 'needles', 'dashSpikes!', 'zig!', 'stepping', 'bridge', 'tightrope', 'needles', 'gauntlet!', 'bridge'] },
  { world: 'top', lava: 36, par: 37, pieces: ['needles', 'drop!', 'tightrope', 'dashShaft', 'crumbs!', 'dashGap', 'bridge', 'needles', 'drop!', 'tightrope', 'bridge'] },
  { world: 'top', lava: 65, par: 45, pieces: ['drop', 'gauntlet!', 'stepping!', 'needles', 'summit', 'drop', 'gauntlet!', 'tightrope!', 'summit'] },
  { world: 'top', lava: 68, par: 49, fish: true, pieces: ['tightrope', 'needles', 'gauntlet!', 'nook', 'stepping!', 'summit', 'gauntlet', 'needles', 'drop!', 'summit'] },
  { world: 'top', lava: 75, par: 47, pieces: ['gauntlet', 'drop', 'dashShaft!', 'tightrope', 'needles', 'summit', 'gauntlet', 'tightrope', 'drop', 'summit'] },
  { world: 'top', lava: 78, par: 58, pieces: ['drop', 'needles', 'gauntlet!', 'stepping!', 'tightrope', 'gauntlet', 'summit', 'needles', 'gauntlet!', 'tightrope!', 'drop!', 'summit'] },
];

function stampOf(piece: Piece): Stamp {
  return piece.endsWith('!') ? mirrored(STAMPS[piece.slice(0, -1) as StampName]) : STAMPS[piece as StampName];
}

function planOf(design: Design, index: number): Plan {
  const stamps = design.pieces.map(stampOf);
  const body = [...stamps].reverse().flatMap((stamp) => stamp.rows);
  const moves: MoveSpec[] = [...stamps].reverse().flatMap((stamp) => stamp.moves ?? []);
  const drops: DropSpec[] = [...stamps].reverse().flatMap((stamp) => stamp.drops ?? []);
  const map = [...TOP, ...body, ...START];
  const number = index + 1;
  return {
    id: `l${number}`,
    map: design.ice ? map.map((row) => row.replaceAll('=', '%')) : map,
    lavaSpeed: design.lava,
    lavaDelay: Math.max(0, 6 - 2 * Math.floor(index / 6)),
    par: design.par,
    walls: number >= WALLS_FROM,
    dash: number >= DASH_FROM,
    fish: design.fish ?? false,
    moves,
    drops,
  };
}

export const PLANS: readonly Plan[] = DESIGNS.map(planOf);
/** Each level's pieces, bottom first, for the planner's reports. */
export const PIECES_OF: readonly string[][] = DESIGNS.map((design) => design.pieces);
export const WORLD_OF: readonly WorldId[] = DESIGNS.map((design) => design.world);

/** The level that first shows each new idea, by level number. */
export const HINTS: Readonly<Record<number, HintId>> = { 1: 'jump', 2: 'crumble', 3: 'wall', 4: 'spikes', 5: 'pad', 6: 'rocks', 7: 'ice', 8: 'dash', 9: 'moving', 13: 'belts' };

/** Wordless lessons: a see-through hero shows the new move on the level that first needs it. */
export const DEMOS: Readonly<Record<number, Demo>> = {
  // Jump at the rough wall, slide, jump off it, and drift back onto the ledge above.
  3: {
    from: { x: 175, rowsUp: 10 },
    moves: [
      { ticks: 30, dir: 0 },
      { ticks: 22, dir: -1, jump: true },
      { ticks: 48, dir: -1 },
      { ticks: 36, dir: -1, jump: true },
      { ticks: 14, dir: -1 },
      { ticks: 40, dir: 0 },
    ],
  },
  // A full jump, then the dash at the top carries the hero across the gap.
  8: {
    from: { x: 78, rowsUp: 6 },
    moves: [
      { ticks: 30, dir: 0 },
      { ticks: 59, dir: 1, jump: true },
      { ticks: 8, dir: 1, jump: true, dash: true },
      { ticks: 16, dir: 1, jump: true },
      { ticks: 8, dir: 1 },
      { ticks: 40, dir: 0 },
    ],
  },
};
