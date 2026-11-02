// The island as data: where each place sits, in world tiles. x runs east, z runs south, and the camera looks north.

export interface Blob {
  x: number;
  z: number;
  rx: number;
  rz: number;
}

export const WORLD_WIDTH = 112;
export const WORLD_DEPTH = 84;

/** Land is the union of these ovals, with a wobble on the edge so no coast looks drawn with a compass. */
export const MAIN_LAND: readonly Blob[] = [
  { x: 46, z: 47, rx: 25, rz: 21 },
  { x: 29, z: 44, rx: 13, rz: 15 },
  { x: 62, z: 38, rx: 13, rz: 13 },
  { x: 47, z: 63, rx: 21, rz: 9 },
];
export const HILL_LAND: Blob = { x: 91, z: 44, rx: 13, rz: 12 };
export const SNOW_LAND: Blob = { x: 40, z: 11, rx: 15, rz: 8.5 };

export const BEACH: Blob = { x: 47, z: 66, rx: 26, rz: 9 };
export const FOREST: Blob = { x: 62, z: 36, rx: 13, rz: 11 };
export const POND: Blob = { x: 61, z: 53, rx: 5.5, rz: 4 };
export const PLAZA = { x: 44, z: 46, r: 6.5 };
export const FARM = { x0: 20, z0: 41, x1: 33, z1: 54 };

/** Walkways, as lists of corners. The bridge and the docks are separate because they open later. */
export const PATHS: readonly (readonly [number, number])[][] = [
  [[44, 46], [46, 60]],
  [[44, 46], [34, 47]],
  [[44, 46], [35, 41], [33, 40]],
  [[44, 46], [52, 42], [59, 38], [62, 34]],
  [[44, 46], [55, 48], [66, 47], [70, 44]],
  [[44, 46], [43, 36], [42, 28]],
  [[44, 46], [40, 54], [38, 60], [34, 60]],
];

export const BRIDGE = { x0: 70, x1: 80, z: 44, width: 3 };
export const MAIN_DOCK = { x: 42, z0: 25, z1: 29 };
export const SNOW_DOCK = { x: 42, z0: 17, z1: 21 };

/** Buildings, as a footprint of tiles that can't be walked on. */
export interface Building {
  id: string;
  x: number;
  z: number;
  w: number;
  d: number;
}

export const BUILDINGS: readonly Building[] = [
  { id: 'bakery', x: 48, z: 34, w: 6, d: 5 },
  { id: 'house', x: 31, z: 54, w: 6, d: 5 },
  { id: 'pets', x: 29, z: 33, w: 7, d: 6 },
  { id: 'wardrobe', x: 37, z: 49, w: 2, d: 2 },
];

/** Fixed places you can tap to use. `stand` is where the player waits while using it. */
export interface Place {
  id: string;
  x: number;
  z: number;
  stand: readonly [number, number];
}

export const PLACES: readonly Place[] = [
  { id: 'bakery', x: 51, z: 38.5, stand: [51, 40] },
  { id: 'house', x: 34, z: 59, stand: [34, 60] },
  { id: 'pets', x: 32.5, z: 38.5, stand: [33, 40] },
  { id: 'fishing', x: 61, z: 49.2, stand: [61, 48] },
  { id: 'wardrobe', x: 38, z: 51, stand: [38, 51] },
  { id: 'bridge', x: 70.5, z: 44, stand: [69, 44] },
  { id: 'boat', x: 45, z: 25.5, stand: [42, 27] },
  { id: 'boatBack', x: 45, z: 20.5, stand: [42, 19] },
];

export const placeById = (id: string): Place => {
  const found = PLACES.find((place) => place.id === id);
  if (!found) throw new Error(`Unknown place ${id}`);
  return found;
};

/** Where the twelve garden beds lie, in rows. The first few are open from the start. */
export const PLOT_SPOTS: readonly (readonly [number, number])[] = Array.from({ length: 12 }, (_, index) => {
  const column = index % 4;
  const row = Math.floor(index / 4);
  return [22 + column * 3, 43 + row * 3] as const;
});

/** Where the sailing boat goes: the trip from the main dock to Snowy Isle. */
export const SNOW_ARRIVE = { x: 42, z: 19 };
export const MAIN_ARRIVE = { x: 42, z: 27 };

/** A few tiles the camera can pause on, for a place-name line the first time you visit. */
export const AREAS = ['beach', 'village', 'farm', 'forest', 'pond', 'hill', 'snow'] as const;
export type Area = (typeof AREAS)[number];
