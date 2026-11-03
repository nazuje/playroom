// Draws a patch as SVG: its shapes, with their colour, fill, count, size, turn and spot, or its buttons. Shapes
// are drawn round the middle at radius 1 and placed with a transform, so every attribute is exact.
import { COLORS, MARK_SPOTS, MIDDLE, SHAPES, type Cell, type ColorName, type ShapeName } from '../rules/cells.ts';

const SVG = 'http://www.w3.org/2000/svg';

export const INK = '#2a1030';
const PAPER = '#fff6e6';

export const PAINT: Record<ColorName, string> = {
  red: '#ef3b3b',
  orange: '#ff8a1c',
  yellow: '#ffd21a',
  green: '#2fb344',
  blue: '#2f7cf6',
  purple: '#9b4dff',
};

function starPath(): string {
  const points = Array.from({ length: 10 }, (_, at) => {
    const angle = (Math.PI / 5) * at - Math.PI / 2;
    const radius = at % 2 === 0 ? 1 : 0.43;
    return `${(Math.cos(angle) * radius).toFixed(3)} ${(Math.sin(angle) * radius + 0.08).toFixed(3)}`;
  });
  return `M ${points.join(' L ')} Z`;
}

/** Each shape at radius 1, pointing up when it has a direction. */
const PATHS: Record<ShapeName, string> = {
  circle: 'M -0.92 0 A 0.92 0.92 0 1 0 0.92 0 A 0.92 0.92 0 1 0 -0.92 0 Z',
  square: 'M -0.8 -0.8 H 0.8 V 0.8 H -0.8 Z',
  triangle: 'M 0 -0.98 L 0.98 0.74 L -0.98 0.74 Z',
  star: starPath(),
  heart:
    'M 0 0.92 C -0.35 0.62 -1 0.2 -1 -0.3 C -1 -0.74 -0.62 -0.97 -0.32 -0.97 C -0.14 -0.97 -0.03 -0.87 0 -0.7 C 0.03 -0.87 0.14 -0.97 0.32 -0.97 C 0.62 -0.97 1 -0.74 1 -0.3 C 1 0.2 0.35 0.62 0 0.92 Z',
  diamond: 'M 0 -1 L 0.74 0 L 0 1 L -0.74 0 Z',
  arrow: 'M 0 -1 L 0.92 -0.04 L 0.36 -0.04 L 0.36 0.96 L -0.36 0.96 L -0.36 -0.04 L -0.92 -0.04 Z',
  moon: 'M 0.66 -0.72 A 0.98 0.98 0 1 0 0.66 0.72 A 0.8 0.8 0 1 1 0.66 -0.72 Z',
};

/** Big shapes when every patch holds one in the middle, and smaller ones when they share or move round the patch. */
const ROOMY_RADII = [17, 26, 36];
const SNUG_RADII = [9, 13.5, 19];
const MARK_RADIUS = 10.5;

const GROUPS: Record<number, [number, number][]> = {
  1: [[50, 50]],
  2: [
    [29, 50],
    [71, 50],
  ],
  3: [
    [29, 31],
    [71, 31],
    [50, 71],
  ],
};
const CORNERS: [number, number][] = [
  [27, 27],
  [73, 27],
  [73, 73],
  [27, 73],
];
const MARK_AT = [22, 50, 78];

export const isRoomy = (cells: readonly Cell[]): boolean => cells.every((cell) => cell.count === 1 && cell.spot === MIDDLE && cell.marks === 0);

/** Where each shape of a patch sits, and how big it is, in a 100 by 100 patch. */
export function placesOf(cell: Cell, roomy: boolean): { x: number; y: number; r: number }[] {
  if (cell.marks) {
    return Array.from({ length: MARK_SPOTS }, (_, bit) => bit)
      .filter((bit) => cell.marks & (1 << bit))
      .map((bit) => ({ x: MARK_AT[bit % 3], y: MARK_AT[Math.floor(bit / 3)], r: MARK_RADIUS }));
  }
  const r = (roomy ? ROOMY_RADII : SNUG_RADII)[cell.size];
  if (cell.spot !== MIDDLE) {
    const [x, y] = CORNERS[cell.spot];
    return [{ x, y, r }];
  }
  return (GROUPS[cell.count] ?? GROUPS[1]).map(([x, y]) => ({ x, y, r }));
}

let defined = false;

/** The striped fills, once per page, so every patch can share them. */
function defineStripes(): void {
  if (defined) return;
  defined = true;
  const holder = document.createElementNS(SVG, 'svg');
  holder.setAttribute('aria-hidden', 'true');
  holder.setAttribute('width', '0');
  holder.setAttribute('height', '0');
  holder.style.position = 'absolute';
  holder.innerHTML = `<defs>${COLORS.map(
    (color) =>
      `<pattern id="stripes-${color}" patternUnits="userSpaceOnUse" width="0.42" height="0.42" patternTransform="rotate(45)"><rect width="0.42" height="0.42" fill="#ffffff"/><rect width="0.21" height="0.42" fill="${PAINT[color]}"/></pattern>`,
  ).join('')}</defs>`;
  document.body.append(holder);
}

function shapeMarkup(cell: Cell, x: number, y: number, r: number): string {
  const path = PATHS[SHAPES[cell.shape]];
  const color = COLORS[cell.color];
  const place = `translate(${x} ${y}) rotate(${cell.turn * 90}) scale(${r})`;
  // Outlines are drawn in patch units, so a small shape gets a fine line and a big one a bold line.
  const line = (width: number) => (width / r).toFixed(3);
  if (cell.fill === 2) {
    return `<g transform="${place}"><path d="${path}" fill="${PAPER}" stroke="${INK}" stroke-width="${line(Math.max(5, r * 0.36))}" stroke-linejoin="round"/><path d="${path}" fill="none" stroke="${PAINT[color]}" stroke-width="${line(Math.max(3, r * 0.24))}" stroke-linejoin="round"/></g>`;
  }
  const fill = cell.fill === 1 ? `url(#stripes-${color})` : PAINT[color];
  return `<g transform="${place}"><path d="${path}" fill="${fill}" stroke="${INK}" stroke-width="${line(Math.max(1.8, r * 0.1))}" stroke-linejoin="round"/></g>`;
}

/** The art for one patch or piece. */
export function pieceArt(cell: Cell, roomy: boolean): SVGSVGElement {
  defineStripes();
  const art = document.createElementNS(SVG, 'svg');
  art.setAttribute('viewBox', '0 0 100 100');
  art.setAttribute('class', 'art');
  art.setAttribute('aria-hidden', 'true');
  art.innerHTML = placesOf(cell, roomy)
    .map(({ x, y, r }) => shapeMarkup(cell, x, y, r))
    .join('');
  return art;
}
