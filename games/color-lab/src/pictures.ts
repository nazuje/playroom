export type PictureId = 'butterfly' | 'house';

export type RegionId =
  | 'sky'
  | 'wingTopLeft'
  | 'wingTopRight'
  | 'wingLowLeft'
  | 'wingLowRight'
  | 'spotLeft'
  | 'spotRight'
  | 'body'
  | 'grass'
  | 'sun'
  | 'chimney'
  | 'wall'
  | 'roof'
  | 'door'
  | 'window';

/** A part of a picture. Its name for screen readers lives in `src/lang/`, keyed by id. */
export interface Region {
  id: RegionId;
  /** SVG path data, in the picture's 400 by 320 space. */
  d: string;
}

export interface Picture {
  id: PictureId;
  emoji: string;
  regions: Region[];
}

function circle(cx: number, cy: number, r: number): string {
  return `M${cx - r} ${cy}a${r} ${r} 0 1 0 ${r * 2} 0a${r} ${r} 0 1 0 ${-r * 2} 0Z`;
}

export const PICTURES: Picture[] = [
  {
    id: 'butterfly',
    emoji: '🦋',
    regions: [
      { id: 'sky', d: 'M0 0H400V320H0Z' },
      {
        id: 'wingTopLeft',
       
        d: 'M196 150C180 90 120 20 60 26C14 30 6 92 30 136C52 176 130 184 196 164Z',
      },
      {
        id: 'wingTopRight',
       
        d: 'M204 150C220 90 280 20 340 26C386 30 394 92 370 136C348 176 270 184 204 164Z',
      },
      {
        id: 'wingLowLeft',
       
        d: 'M196 172C140 184 72 188 62 228C54 266 92 304 132 298C170 292 192 232 196 190Z',
      },
      {
        id: 'wingLowRight',
       
        d: 'M204 172C260 184 328 188 338 228C346 266 308 304 268 298C230 292 208 232 204 190Z',
      },
      { id: 'spotLeft', d: circle(100, 96, 42) },
      { id: 'spotRight', d: circle(300, 96, 42) },
      {
        id: 'body',
       
        d: 'M200 62C216 62 222 78 218 94C228 150 224 240 200 282C176 240 172 150 182 94C178 78 184 62 200 62Z',
      },
    ],
  },
  {
    id: 'house',
    emoji: '🏠',
    regions: [
      { id: 'sky', d: 'M0 0H400V320H0Z' },
      { id: 'grass', d: 'M0 262C90 244 300 244 400 262V320H0Z' },
      { id: 'sun', d: circle(338, 62, 44) },
      { id: 'chimney', d: 'M232 46H284V128H232Z' },
      { id: 'wall', d: 'M66 142H306V280H66Z' },
      { id: 'roof', d: 'M186 34L330 150H42Z' },
      { id: 'door', d: 'M154 196C154 172 200 172 200 196V280H154Z' },
      { id: 'window', d: 'M226 176H286V236H226Z' },
    ],
  },
];

export type Fills = Record<string, Record<string, string>>;

export const FILLS_KEY = 'color-lab-pictures';

/** Keeps only saved paint that still belongs to a real region of a real picture. */
export function readFills(saved: unknown): Fills {
  const fills: Fills = {};
  if (typeof saved !== 'object' || saved === null) return fills;
  const pictures = saved as Record<string, unknown>;
  for (const picture of PICTURES) {
    const regions = pictures[picture.id];
    if (typeof regions !== 'object' || regions === null) continue;
    const entries = Object.entries(regions).filter(
      ([id, hex]) =>
        picture.regions.some((region) => region.id === id) &&
        typeof hex === 'string' &&
        /^#[0-9a-f]{6}$/.test(hex),
    );
    fills[picture.id] = Object.fromEntries(entries) as Record<string, string>;
  }
  return fills;
}
