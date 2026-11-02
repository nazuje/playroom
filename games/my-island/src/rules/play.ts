import type { CropId } from '../data/crops.ts';
import { FRIENDS, friendById, type FriendId } from '../data/friends.ts';
import { furnitureById, type Room } from '../data/furniture.ts';
import type { Look } from '../data/looks.ts';
import { MAIN_ARRIVE, MAIN_DOCK, PLACES, PLOT_SPOTS, SNOW_ARRIVE, SNOW_DOCK, placeById, type Area } from '../data/map.ts';
import { TRICKS, type CareAction, type PetId, type Trick } from '../data/pets.ts';
import type { TreatId } from '../data/recipes.ts';
import { bake, giveTreat, treatsHeld } from './bakery.ts';
import { lightAt } from './daylight.ts';
import { buy, indoorGround, moveItem, nearestFit, placeItem, putAway, roomList, solidTiles, turnItem, type BuyResult, type Ground } from './decor.ts';
import { fillFinds, findSpots, newFinds, takeFind, type Finds, type Spots } from './finds.ts';
import { landFish } from './fishing.ts';
import { growGarden, harvest, openPlots, plant, plotStage, rainOnGarden, water } from './garden.ts';
import { findPath, nearestReachable, straighten, type Grid, type Step } from './path.ts';
import { adopt, care, setFollowing } from './pets.ts';
import { acceptQuest, boatOpen, bridgeOpen, currentQuest, finishQuest, islandLevel, recordEvent } from './quests.ts';
import { makeRandom } from './rng.ts';
import { outcome, type Outcome, type Say } from './say.ts';
import { SPAWN, type Island } from './state.ts';
import { begun, skyAt, type Sky, type SkyEvent } from './surprises.ts';
import type { Target } from './target.ts';
import { makeWalker, stepWalker, type Walker } from './walker.ts';
import { areaAt, walkable, type World } from './world.ts';

export const WALK_SPEED = 3.6;
const PET_SPEED = 4.4;
const PET_HOME_SPEED = 1.4;
const TRAIL_GAP = 0.3;
const TRAIL_LENGTH = 80;
const FOLLOW_GAP = 1.3;
/** Where pets that stay at home play, in front of the Pet Corner. */
export const PET_YARD = { x: 32, z: 41 };
const YARD_REACH = 2.5;

export type Mode = 'walk' | 'inside' | 'decor';

export interface PetBody {
  x: number;
  z: number;
  facing: number;
  moving: boolean;
  trick: Trick | null;
  trickLeft: number;
  nextTrickIn: number;
  goal: Step;
  restLeft: number;
}

export interface Play {
  island: Island;
  world: World;
  walker: Walker;
  pending: Target | null;
  finds: Finds;
  spots: Spots;
  bodies: PetBody[];
  /** The player's recent footsteps, newest first. Pets walk along them, so they never need a map. */
  trail: Step[];
  area: Area;
  /** Places already named aloud this session. */
  heard: Set<Area>;
  sky: Sky;
  mode: Mode;
  random: () => number;
  /** Tiles outdoor decorations stand on. */
  solid: Uint8Array;
}

export interface TickResult {
  arrived: Target | null;
  newArea: Area | null;
  tricks: number[];
  findsChanged: boolean;
  outcomes: Outcome[];
  sky: SkyEvent[];
}

const KEEP_CLEAR: readonly (readonly [number, number])[] = [
  ...FRIENDS.map(({ x, z }) => [x, z] as const),
  ...PLACES.flatMap(({ stand, x, z }) => [stand, [Math.floor(x), Math.floor(z)] as const]),
  ...PLOT_SPOTS.flatMap(([x, z]) => [[x, z] as const, [x, z + 1] as const]),
  [SPAWN.x, SPAWN.z],
  [MAIN_ARRIVE.x, MAIN_ARRIVE.z],
  [SNOW_ARRIVE.x, SNOW_ARRIVE.z],
  [PET_YARD.x, PET_YARD.z],
];
const DECOR_TILES = new Set(['grass', 'sand', 'plaza', 'forest', 'hill', 'snow']);

const tileIndex = (play: Play, x: number, z: number): number => z * play.world.width + x;

export function grid(play: Play): Grid {
  const bridge = bridgeOpen(play.island);
  return {
    width: play.world.width,
    depth: play.world.depth,
    walkable: (x, z) => walkable(play.world, x, z, { bridge }) && !play.solid[tileIndex(play, x, z)],
  };
}

/** Where outdoor decorations may go: open ground, off the paths, and clear of friends, doors and garden beds. */
export function outdoorGround(play: Play): Ground {
  const { world } = play;
  return (x, z) => {
    if (x < 0 || z < 0 || x >= world.width || z >= world.depth) return false;
    if (world.blocked[tileIndex(play, x, z)] || !DECOR_TILES.has(world.tiles[tileIndex(play, x, z)] ?? 'sea')) return false;
    return KEEP_CLEAR.every(([kx, kz]) => Math.hypot(kx - x, kz - z) >= 2);
  };
}

export function refreshSolid(play: Play): void {
  play.solid.fill(0);
  for (const [x, z] of solidTiles(play.island.outdoor)) {
    if (x >= 0 && z >= 0 && x < play.world.width && z < play.world.depth) play.solid[tileIndex(play, x, z)] = 1;
  }
}

const freeForFinds = (play: Play) => (x: number, z: number): boolean =>
  walkable(play.world, x, z, { bridge: true }) && !play.solid[tileIndex(play, x, z)];

export const here = (play: Play): Step => ({ x: Math.round(play.walker.x), z: Math.round(play.walker.z) });

/** Puts the player back on open ground if something now stands where they are. */
function unstick(play: Play): void {
  const map = grid(play);
  const { x, z } = here(play);
  if (map.walkable(x, z)) return;
  for (let reach = 1; reach < 12; reach += 1) {
    for (let dz = -reach; dz <= reach; dz += 1) {
      for (let dx = -reach; dx <= reach; dx += 1) {
        if (map.walkable(x + dx, z + dz)) {
          play.walker.x = x + dx;
          play.walker.z = z + dz;
          play.walker.route = [];
          return;
        }
      }
    }
  }
  play.walker.x = SPAWN.x;
  play.walker.z = SPAWN.z;
}

function newBody(x: number, z: number, random: () => number): PetBody {
  return { x, z, facing: 0, moving: false, trick: null, trickLeft: 0, nextTrickIn: 4 + random() * 8, goal: { x, z }, restLeft: random() * 3 };
}

export function startPlay(island: Island, world: World): Play {
  openPlots(island);
  const random = makeRandom(Math.floor(island.luck * 7919 + island.clock));
  const play: Play = {
    island,
    world,
    walker: makeWalker(Math.round(island.x), Math.round(island.z), WALK_SPEED),
    pending: null,
    finds: newFinds(Math.floor(island.luck * 31 + island.clock)),
    spots: { beach: [], forest: [], hill: [], snow: [] },
    bodies: [],
    trail: [],
    area: 'village',
    heard: new Set(),
    sky: skyAt(island.clock, lightAt(island.clock).night),
    mode: 'walk',
    random,
    solid: new Uint8Array(world.width * world.depth),
  };
  refreshSolid(play);
  unstick(play);
  play.area = areaAt(world, here(play).x, here(play).z);
  play.heard.add(play.area);
  play.spots = findSpots(world, freeForFinds(play));
  fillFinds(play.finds, play.spots, island.clock, freeForFinds(play), true);
  play.bodies = island.pets.map((pet, index) =>
    pet.following ? newBody(play.walker.x - 1 - index * 0.6, play.walker.z + 0.8, random) : newBody(PET_YARD.x + index * 0.7 - 1, PET_YARD.z, random),
  );
  return play;
}

/** Tiles to stand on to use something, best first. */
function standOptions(play: Play, target: Target): Step[] {
  const from = here(play);
  const around = (x: number, z: number): Step[] =>
    [[0, 1], [1, 1], [-1, 1], [1, 0], [-1, 0], [0, -1], [1, -1], [-1, -1], [0, 2], [2, 0], [-2, 0], [0, -2]]
      .map(([dx = 0, dz = 0]) => ({ x: x + dx, z: z + dz }))
      .sort((a, b) => Math.hypot(a.x - from.x, a.z - from.z) * 0.15 + (Math.abs(a.x - x) + Math.abs(a.z - z)) - (Math.hypot(b.x - from.x, b.z - from.z) * 0.15 + (Math.abs(b.x - x) + Math.abs(b.z - z))));
  switch (target.kind) {
    case 'ground':
      return [{ x: Math.floor(target.x), z: Math.floor(target.z) }];
    case 'friend': {
      const friend = friendById(target.id);
      return around(friend.x, friend.z);
    }
    case 'plot': {
      const [x = 0, z = 0] = PLOT_SPOTS[target.index] ?? [];
      return [{ x, z: z + 1 }, { x, z }, ...around(x, z)];
    }
    case 'place': {
      const [x, z] = placeById(target.id).stand;
      return [{ x, z }, ...around(x, z)];
    }
    case 'find': {
      const find = play.finds.list.find(({ uid }) => uid === target.uid);
      return find ? [{ x: find.x, z: find.z }, ...around(find.x, find.z)] : [];
    }
    case 'pet': {
      const body = play.bodies[target.index];
      return body ? [{ x: Math.round(body.x), z: Math.round(body.z) }, ...around(Math.round(body.x), Math.round(body.z))] : [];
    }
    default:
      return [];
  }
}

export interface GoResult {
  moving: boolean;
  /** Why the way is shut, so the child hears what opens it. */
  blocked: 'bridge' | 'boat' | null;
}

const onSnow = (z: number): boolean => z < 22;

/** Sets off towards something. Arrival comes later, from tick. */
export function goTo(play: Play, target: Target): GoResult {
  if (play.mode !== 'walk') return { moving: false, blocked: null };
  unstick(play);
  const map = grid(play);
  const from = here(play);
  const options = standOptions(play, target);
  for (const stand of options.slice(0, 14)) {
    if (!map.walkable(stand.x, stand.z)) continue;
    const route = findPath(map, from, stand);
    if (!route) continue;
    play.walker.route = straighten(map, route).slice(1);
    play.pending = target;
    return { moving: play.walker.route.length > 0, blocked: null };
  }
  const spot = options[0];
  if (!spot) return { moving: false, blocked: null };
  let blocked: GoResult['blocked'] = null;
  if (onSnow(spot.z) !== onSnow(from.z)) blocked = 'boat';
  else if (areaAt(play.world, spot.x, spot.z) === 'hill' && !bridgeOpen(play.island)) blocked = 'bridge';
  if (blocked === 'boat' && boatOpen(play.island)) return goTo(play, { kind: 'place', id: onSnow(from.z) ? 'boatBack' : 'boat' });
  const near = nearestReachable(map, from, { x: Math.max(0, Math.min(play.world.width - 1, spot.x)), z: Math.max(0, Math.min(play.world.depth - 1, spot.z)) }, 16);
  play.pending = null;
  if (near) {
    const route = findPath(map, from, near);
    play.walker.route = route ? straighten(map, route).slice(1) : [];
  }
  return { moving: play.walker.route.length > 0, blocked };
}

/** A few steps one way, for arrow keys. */
export function nudge(play: Play, dx: number, dz: number): GoResult {
  const { x, z } = here(play);
  return goTo(play, { kind: 'ground', x: x + dx * 3, z: z + dz * 3 });
}

/** Where something is, in tile units, for facing it and for the keyboard's "use what's near". */
export function targetSpot(play: Play, target: Target): Step | null {
  switch (target.kind) {
    case 'friend':
      return friendById(target.id);
    case 'plot': {
      const [x = 0, z = 0] = PLOT_SPOTS[target.index] ?? [];
      return { x, z };
    }
    case 'place': {
      const place = placeById(target.id);
      return { x: place.x - 0.5, z: place.z - 0.5 };
    }
    case 'find':
      return play.finds.list.find(({ uid }) => uid === target.uid) ?? null;
    case 'pet':
      return play.bodies[target.index] ?? null;
    case 'ground':
      return { x: target.x, z: target.z };
    default:
      return null;
  }
}

/** The thing nearest the player that a key press could use, if any is close. */
export function nearestUse(play: Play): Target | null {
  const level = islandLevel(play.island);
  const options: Target[] = [
    ...FRIENDS.filter((friend) => friend.level <= level).map((friend): Target => ({ kind: 'friend', id: friend.id })),
    ...PLACES.map((place): Target => ({ kind: 'place', id: place.id })),
    ...play.island.plots.map((_, index): Target => ({ kind: 'plot', index })),
    ...play.finds.list.map((find): Target => ({ kind: 'find', uid: find.uid })),
    ...play.bodies.map((_, index): Target => ({ kind: 'pet', index })),
  ];
  let best: Target | null = null;
  let bestAway = 3.2;
  for (const option of options) {
    const spot = targetSpot(play, option);
    if (!spot) continue;
    const away = Math.hypot(spot.x - play.walker.x, spot.z - play.walker.z);
    if (away < bestAway) {
      best = option;
      bestAway = away;
    }
  }
  return best;
}

function trailPoint(play: Play, distance: number): Step {
  let left = distance;
  let last: Step = { x: play.walker.x, z: play.walker.z };
  for (const point of play.trail) {
    const gap = Math.hypot(point.x - last.x, point.z - last.z);
    if (gap >= left) {
      const t = gap > 0 ? left / gap : 0;
      return { x: last.x + (point.x - last.x) * t, z: last.z + (point.z - last.z) * t };
    }
    left -= gap;
    last = point;
  }
  return last;
}

function moveBody(body: PetBody, seconds: number, speed: number): void {
  const dx = body.goal.x - body.x;
  const dz = body.goal.z - body.z;
  const gap = Math.hypot(dx, dz);
  body.moving = gap > 0.12;
  if (!body.moving) return;
  const step = Math.min(gap, speed * seconds);
  body.x += (dx / gap) * step;
  body.z += (dz / gap) * step;
  body.facing = Math.atan2(dx, dz);
}

function movePets(play: Play, seconds: number): number[] {
  const tricks: number[] = [];
  const map = grid(play);
  let place = 0;
  play.island.pets.forEach((pet, index) => {
    let body = play.bodies[index];
    if (!body) {
      body = newBody(play.walker.x, play.walker.z + 1, play.random);
      play.bodies[index] = body;
    }
    if (pet.following && play.mode !== 'inside') {
      place += 1;
      body.goal = trailPoint(play, place * FOLLOW_GAP);
      if (Math.hypot(body.goal.x - body.x, body.goal.z - body.z) > 14) {
        body.x = body.goal.x;
        body.z = body.goal.z;
      }
      moveBody(body, seconds, PET_SPEED);
    } else if (!pet.following) {
      body.restLeft -= seconds;
      if (body.restLeft <= 0 && !body.moving) {
        const x = Math.round(PET_YARD.x + (play.random() * 2 - 1) * YARD_REACH);
        const z = Math.round(PET_YARD.z + (play.random() * 2 - 1) * YARD_REACH * 0.6);
        if (map.walkable(x, z)) body.goal = { x, z };
        body.restLeft = 2 + play.random() * 3;
      }
      if (Math.hypot(body.goal.x - body.x, body.goal.z - body.z) > 20) {
        body.x = body.goal.x;
        body.z = body.goal.z;
      }
      moveBody(body, seconds, PET_HOME_SPEED);
    } else {
      body.moving = false;
    }
    if (body.trickLeft > 0) {
      body.trickLeft -= seconds;
      if (body.trickLeft <= 0) body.trick = null;
    }
    body.nextTrickIn -= seconds;
    if (body.nextTrickIn <= 0 && !body.moving && !body.trick) {
      body.trick = TRICKS[Math.floor(play.random() * TRICKS.length)] ?? 'hop';
      body.trickLeft = 1.4;
      body.nextTrickIn = 7 + play.random() * 9;
      tricks.push(index);
    }
  });
  return tricks;
}

const SKY_LINES: Readonly<Record<SkyEvent, Say>> = {
  rain: { line: 'rain' },
  rainbow: { line: 'rainbow' },
  star: { line: 'star' },
  parade: { line: 'parade' },
  whale: { line: 'whale' },
};

function skyOutcomes(play: Play, events: readonly SkyEvent[]): Outcome[] {
  const results: Outcome[] = [];
  for (const event of events) {
    if (event === 'whale' && play.area !== 'beach') continue;
    if (play.mode === 'inside' && event !== 'rain') continue;
    if (event === 'rain') rainOnGarden(play.island);
    const result = outcome({ say: [SKY_LINES[event]], sound: event === 'rain' ? 'pop' : 'ding' });
    if (event !== 'rain') {
      const key = `surprise:${event}`;
      if (!play.island.book[key]) result.first = key;
      play.island.book[key] = (play.island.book[key] ?? 0) + 1;
    }
    results.push(result);
  }
  return results;
}

export function tick(play: Play, seconds: number): TickResult {
  const { island, walker } = play;
  island.clock += seconds;
  growGarden(island, seconds);
  let arrived: Target | null = null;
  if (play.mode === 'walk') {
    stepWalker(walker, seconds);
    if (play.pending && walker.route.length === 0) {
      arrived = play.pending;
      play.pending = null;
      const spot = targetSpot(play, arrived);
      if (spot && arrived.kind !== 'ground' && Math.hypot(spot.x - walker.x, spot.z - walker.z) > 0.2) {
        walker.facing = Math.atan2(spot.x - walker.x, spot.z - walker.z);
      }
    }
  }
  island.x = walker.x;
  island.z = walker.z;
  const lastStep = play.trail[0];
  if (!lastStep || Math.hypot(lastStep.x - walker.x, lastStep.z - walker.z) > TRAIL_GAP) {
    play.trail.unshift({ x: walker.x, z: walker.z });
    if (play.trail.length > TRAIL_LENGTH) play.trail.length = TRAIL_LENGTH;
  }
  const tricks = movePets(play, seconds);
  const findsChanged = fillFinds(play.finds, play.spots, island.clock, freeForFinds(play));
  let newArea: Area | null = null;
  const area = play.mode === 'inside' ? play.area : areaAt(play.world, here(play).x, here(play).z);
  if (area !== play.area) {
    play.area = area;
    if (!play.heard.has(area)) {
      play.heard.add(area);
      newArea = area;
    }
  }
  const now = skyAt(island.clock, lightAt(island.clock).night);
  const events = begun(play.sky, now);
  play.sky = now;
  return { arrived, newArea, tricks, findsChanged, outcomes: skyOutcomes(play, events), sky: events };
}

/** Runs an action and notes what it did to the current quest. A job finished in front of the friend who asked is handed in at once. */
function track(play: Play, result: Outcome, act: () => boolean, friendHere?: FriendId): Outcome {
  const { island } = play;
  const before = { ...island.quests };
  if (!act()) return result;
  const after = island.quests;
  if (before.done !== after.done || before.stage !== 'active') return result;
  const quest = currentQuest(after);
  if (after.stage === 'ready' && quest) {
    if (friendHere && quest.friend === friendHere) return mergeOutcomes(result, finish(play));
    result.quest = 'ready';
    result.say.push({ back: quest.friend });
    result.sound = 'tada';
  } else if (after.count > before.count) {
    result.quest = 'progress';
  }
  return result;
}

export function mergeOutcomes(first: Outcome, second: Outcome): Outcome {
  return { ...first, ...second, say: [...first.say, ...second.say], shells: (first.shells ?? 0) + (second.shells ?? 0) || undefined };
}

function finish(play: Play): Outcome {
  const { island } = play;
  const done = island.quests.done;
  const { shells, level } = finishQuest(island);
  if (!shells) return outcome();
  openPlots(island);
  const result = outcome({ say: [{ thanks: done % 3 }], sound: 'tada', cheer: true, shells, quest: 'finished' });
  if (level) {
    result.level = level;
    result.say.push({ level });
  }
  if (!currentQuest(island.quests)) result.say.push({ line: 'allDone' });
  return result;
}

function talk(play: Play, id: FriendId): Outcome {
  const { island } = play;
  const quest = currentQuest(island.quests);
  const result = outcome({ sound: 'pop' });
  if (quest && quest.friend === id) {
    if (island.quests.stage === 'offered') {
      acceptQuest(island);
      result.say.push({ quest: quest.id });
      result.quest = 'accepted';
      if ((island.quests.stage as string) === 'ready') return mergeOutcomes(result, finish(play));
      return result;
    }
    if (island.quests.stage === 'ready') return finish(play);
  }
  const active = quest && quest.friend === id && island.quests.stage === 'active';
  const giving = quest?.goal.type === 'give' && quest.goal.to === id && island.quests.stage === 'active';
  if (treatsHeld(island).length) {
    result.open = 'give';
    if (active && !giving) result.say.push({ quest: quest.id });
    return result;
  }
  result.say.push(active ? { quest: quest.id } : { chat: id });
  return result;
}

function tend(play: Play, index: number): Outcome {
  const { island } = play;
  const plot = island.plots[index];
  if (!plot) return outcome({ say: [{ line: 'locked' }], sound: 'bonk' });
  const stage = plotStage(plot);
  if (stage === 'empty') return outcome({ say: [{ line: 'pickSeed' }], open: 'seeds', sound: 'pop' });
  if (stage === 'ripe') return track(play, outcome({ say: [{ line: 'harvested' }], sound: 'pop', cheer: true }), () => harvest(island, index) !== null);
  if (!plot.watered) return track(play, outcome({ say: [{ line: 'watered' }], sound: 'whoosh' }), () => water(island, index));
  return outcome({ say: [{ line: 'growing' }], sound: 'boing' });
}

function sail(play: Play, toSnow: boolean): Outcome {
  const arrive = toSnow ? SNOW_ARRIVE : MAIN_ARRIVE;
  play.walker.x = arrive.x;
  play.walker.z = arrive.z;
  play.walker.route = [];
  play.walker.facing = toSnow ? Math.PI : 0;
  play.trail = [];
  play.island.pets.forEach((pet, index) => {
    const body = play.bodies[index];
    if (!pet.following || !body) return;
    body.x = arrive.x + 0.6 * (index % 2 ? 1 : -1);
    body.z = arrive.z + (toSnow ? -0.8 : 0.8);
    body.goal = { x: body.x, z: body.z };
  });
  return outcome({ say: [{ line: toSnow ? 'sail' : 'sailHome' }], sound: 'whoosh' });
}

function usePlace(play: Play, id: string): Outcome {
  switch (id) {
    case 'bakery':
      return outcome({ say: [{ line: 'bakery' }], open: 'bakery', sound: 'pop' });
    case 'pets':
      return outcome({ say: [{ line: 'petCorner' }], open: 'pets', sound: 'pop' });
    case 'fishing':
      return outcome({ say: [{ line: 'fishStart' }], open: 'fishing', sound: 'pop' });
    case 'house':
      play.mode = 'inside';
      play.walker.route = [];
      return outcome({ say: [{ line: 'house' }], open: 'house', sound: 'pop' });
    case 'wardrobe':
      return outcome({ say: [{ line: 'wardrobe' }], open: 'wardrobe', sound: 'pop' });
    case 'bridge':
      return bridgeOpen(play.island) ? outcome() : outcome({ say: [{ line: 'bridgeShut' }], sound: 'bonk' });
    case 'boat':
      return boatOpen(play.island) ? sail(play, true) : outcome({ say: [{ line: 'boatShut' }], sound: 'bonk' });
    case 'boatBack':
      return sail(play, false);
    default:
      return outcome();
  }
}

function collect(play: Play, uid: number): Outcome {
  const result = outcome({ sound: 'pop' });
  let taken: ReturnType<typeof takeFind> = null;
  track(play, result, () => {
    taken = takeFind(play.island, play.finds, uid, play.island.clock);
    return taken !== null;
  });
  const got = taken as ReturnType<typeof takeFind>;
  if (!got) return result;
  if (got.item.startsWith('shell')) result.shells = 1;
  if (got.golden) {
    result.say.unshift({ line: 'butterfly' });
    result.cheer = true;
  } else if (got.first) {
    result.say.unshift({ line: 'newFind' });
  }
  if (got.first) result.first = got.item;
  return result;
}

/** Does whatever the target is for, once the player has walked there. */
export function arrive(play: Play, target: Target): Outcome {
  switch (target.kind) {
    case 'friend':
      return talk(play, target.id);
    case 'plot':
      return tend(play, target.index);
    case 'place':
      return usePlace(play, target.id);
    case 'find':
      return collect(play, target.uid);
    case 'pet':
      return play.island.pets[target.index] ? outcome({ open: 'care', sound: 'boing' }) : outcome();
    default:
      return outcome();
  }
}

export function plantSeed(play: Play, index: number, crop: CropId): Outcome {
  return track(play, outcome({ say: [{ line: 'waterIt' }], sound: 'dig' }), () => plant(play.island, index, crop));
}

export function bakeTreat(play: Play, id: TreatId): Outcome {
  return track(play, outcome({ say: [{ line: 'baked' }], sound: 'ding', cheer: true }), () => bake(play.island, id));
}

export function give(play: Play, friend: FriendId, treat: TreatId): Outcome {
  return track(play, outcome({ say: [{ line: 'yum' }], sound: 'burp', shells: 2 }), () => giveTreat(play.island, friend, treat), friend);
}

export function adoptPet(play: Play, kind: PetId): Outcome {
  let index = -1;
  const result = track(play, outcome({ say: [{ line: 'newPet' }], sound: 'boing', cheer: true }), () => {
    index = adopt(play.island, kind);
    return index >= 0;
  });
  if (index >= 0) {
    const pet = play.island.pets[index];
    play.bodies[index] = pet?.following
      ? newBody(play.walker.x + 0.8, play.walker.z + 0.8, play.random)
      : newBody(PET_YARD.x, PET_YARD.z, play.random);
  }
  return result;
}

export function carePet(play: Play, index: number, action: CareAction): Outcome {
  let trick: Trick | null = null;
  const result = track(play, outcome({ say: [{ line: action }], sound: action === 'feed' ? 'burp' : 'boing' }), () => {
    trick = care(play.island, index, action);
    return trick !== null;
  });
  const body = play.bodies[index];
  if (body && trick) {
    body.trick = trick;
    body.trickLeft = 1.4;
  }
  return result;
}

export function followMe(play: Play, index: number, following: boolean): Outcome {
  setFollowing(play.island, index, following);
  const body = play.bodies[index];
  if (body && following) {
    body.x = play.walker.x + 0.8;
    body.z = play.walker.z + 0.8;
  }
  return outcome({ say: [{ line: following ? 'follow' : 'stay' }], sound: 'boing' });
}

export function catchFish(play: Play): Outcome {
  let caught: { id: string; first: boolean } | null = null;
  const result = track(play, outcome({ sound: 'tada', shells: 1, cheer: true }), () => {
    caught = landFish(play.island, play.random());
    return true;
  });
  const got = caught as { id: string; first: boolean } | null;
  if (got) {
    result.say.unshift({ line: got.first ? 'newFind' : 'fishCaught' });
    if (got.first) result.first = got.id;
  }
  return result;
}

export const missFish = (): Outcome => outcome({ say: [{ line: 'fishMiss' }], sound: 'bonk' });

export function dressUp(play: Play, look: Look): Outcome {
  const before = JSON.stringify(play.island.look);
  return track(play, outcome({ sound: 'pop' }), () => {
    if (JSON.stringify(look) === before) return false;
    play.island.look = { ...look };
    recordEvent(play.island, { type: 'wardrobe' });
    return true;
  });
}

export const groundFor = (play: Play, room: Room): Ground => (room === 'home' ? indoorGround : outdoorGround(play));

export function buyItem(play: Play, id: string): { result: BuyResult; outcome: Outcome } {
  const result = buy(play.island, id);
  if (result === 'bought') return { result, outcome: outcome({ sound: 'ding' }) };
  return { result, outcome: outcome({ say: [{ line: result === 'shells' ? 'needShells' : 'locked' }], sound: 'bonk' }) };
}

function afterOutdoorChange(play: Play, room: Room): void {
  if (room !== 'outdoor') return;
  refreshSolid(play);
  play.finds.list = play.finds.list.filter((find) => !play.solid[tileIndex(play, find.x, find.z)]);
  unstick(play);
}

export function putItem(play: Play, room: Room, id: string, x: number, z: number, turn: number): { uid: number | null; outcome: Outcome } {
  let uid: number | null = null;
  const result = track(play, outcome({ say: [{ line: 'placed' }], sound: 'pop' }), () => {
    uid = placeItem(play.island, room, id, x, z, turn, groundFor(play, room))?.uid ?? null;
    return uid !== null;
  });
  if (uid === null) return { uid, outcome: outcome({ say: [{ line: 'noRoom' }], sound: 'bonk' }) };
  afterOutdoorChange(play, room);
  return { uid, outcome: result };
}

/** Puts a decoration down at the free spot nearest a tap, so a near miss still works. */
export function putNear(play: Play, room: Room, id: string, x: number, z: number, turn = 0): { uid: number | null; outcome: Outcome } {
  const item = furnitureById(id);
  const spot = item ? nearestFit(roomList(play.island, room), item, x, z, turn, groundFor(play, room)) : null;
  if (!spot) return { uid: null, outcome: outcome({ say: [{ line: 'noRoom' }], sound: 'bonk' }) };
  return putItem(play, room, id, spot.x, spot.z, turn);
}

/** Moves a placed decoration to the free spot nearest a tap. */
export function moveNear(play: Play, room: Room, uid: number, x: number, z: number): boolean {
  const placed = roomList(play.island, room).find((entry) => entry.uid === uid);
  const item = placed ? furnitureById(placed.item) : undefined;
  if (!placed || !item) return false;
  const spot = nearestFit(roomList(play.island, room), item, x, z, placed.turn, groundFor(play, room), uid);
  return spot ? movePlaced(play, room, uid, spot.x, spot.z) : false;
}
export function turnPlaced(play: Play, room: Room, uid: number): boolean {
  const done = turnItem(play.island, room, uid, groundFor(play, room));
  if (done) afterOutdoorChange(play, room);
  return done;
}

export function movePlaced(play: Play, room: Room, uid: number, x: number, z: number): boolean {
  const done = moveItem(play.island, room, uid, x, z, groundFor(play, room));
  if (done) afterOutdoorChange(play, room);
  return done;
}

export function removePlaced(play: Play, room: Room, uid: number): boolean {
  const done = putAway(play.island, room, uid);
  if (done) afterOutdoorChange(play, room);
  return done;
}

export function leaveHouse(play: Play): void {
  play.mode = 'walk';
  const [x, z] = placeById('house').stand;
  play.walker.x = x;
  play.walker.z = z;
  play.walker.facing = 0;
}

export function setDecorating(play: Play, on: boolean): void {
  if (play.mode === 'inside') return;
  play.mode = on ? 'decor' : 'walk';
  play.walker.route = [];
  play.pending = null;
}

export const onSnowIsle = (play: Play): boolean => onSnow(play.walker.z);

/** The docks, for drawing. */
export const DOCKS = { main: MAIN_DOCK, snow: SNOW_DOCK };
