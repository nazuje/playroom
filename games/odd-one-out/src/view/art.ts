// Draws a thing: a picture as a big emoji, or a shape in SVG, so every look the rules use is exact. Shapes sit in a
// 100 by 100 box, scaled by size, turned in eighths and mirrored left to right. Dots sit like a dice, in buddy
// pairs (an odd count leaves one alone at the bottom), or scattered by the puzzle's seed.
import type { DotLayout } from '../rules/levels.ts';
import { PICS } from '../rules/pics.ts';
import { COLORS, SHAPES, type Thing } from '../rules/things.ts';
import { element } from '../ui.ts';

const SVG = 'http://www.w3.org/2000/svg';

/** Paint and its darker edge for each colour, bright enough to tell apart on the cream plate. */
export const PAINT: Record<(typeof COLORS)[number], [string, string]> = {
  red: ['#e63946', '#a4161a'],
  orange: ['#fb8b24', '#b35c00'],
  yellow: ['#ffd23f', '#b88a00'],
  green: ['#3bbf4f', '#1d7a2e'],
  blue: ['#2f7de1', '#17498f'],
  purple: ['#9b5de5', '#5f2ea8'],
};

export const paintOf = (color: number): [string, string] => PAINT[COLORS[color] ?? 'red'];

const SCALE = [0.52, 0.74, 0.96];
const R = 42;

function svg(tag: string, attributes: Record<string, string | number>): SVGElement {
  const made = document.createElementNS(SVG, tag);
  for (const [name, value] of Object.entries(attributes)) made.setAttribute(name, String(value));
  return made;
}

const points = (list: readonly (readonly [number, number])[]): string => list.map(([x, y]) => `${(50 + x * R).toFixed(1)},${(50 + y * R).toFixed(1)}`).join(' ');

function regular(sides: number, turn = -Math.PI / 2): [number, number][] {
  return Array.from({ length: sides }, (_, at) => {
    const angle = turn + (at * 2 * Math.PI) / sides;
    return [Math.cos(angle), Math.sin(angle)];
  });
}

function star(): [number, number][] {
  return Array.from({ length: 10 }, (_, at) => {
    const angle = -Math.PI / 2 + (at * Math.PI) / 5;
    const reach = at % 2 === 0 ? 1 : 0.45;
    return [Math.cos(angle) * reach, Math.sin(angle) * reach + 0.06];
  });
}

/** The outline of a shape, as an SVG element without paint. */
function outline(name: string): SVGElement {
  switch (name) {
    case 'circle':
      return svg('circle', { cx: 50, cy: 50, r: R * 0.92 });
    case 'square':
      return svg('rect', { x: 50 - R * 0.82, y: 50 - R * 0.82, width: R * 1.64, height: R * 1.64, rx: 4 });
    case 'triangle':
      return svg('polygon', { points: points([[0, -1], [0.95, 0.72], [-0.95, 0.72]]) });
    case 'star':
      return svg('polygon', { points: points(star()) });
    case 'heart':
      return svg('path', {
        d: 'M50 86 C 18 64, 8 46, 12 30 C 16 14, 40 10, 50 28 C 60 10, 84 14, 88 30 C 92 46, 82 64, 50 86 Z',
      });
    case 'moon':
      // A crescent lying like a smile: the bottom of a circle with a bite out of the top.
      return svg('path', { d: 'M12 34 A 38 38 0 0 0 88 34 A 46 46 0 0 1 12 34 Z' });
    case 'pentagon':
      return svg('polygon', { points: points(regular(5).map(([x, y]) => [x, y + 0.08])) });
    case 'hexagon':
      return svg('polygon', { points: points(regular(6, 0)) });
    case 'cross':
      return svg('polygon', {
        points: points([
          [-0.32, -0.92],
          [0.32, -0.92],
          [0.32, -0.32],
          [0.92, -0.32],
          [0.92, 0.32],
          [0.32, 0.32],
          [0.32, 0.92],
          [-0.32, 0.92],
          [-0.32, 0.32],
          [-0.92, 0.32],
          [-0.92, -0.32],
          [-0.32, -0.32],
        ]),
      });
    case 'arrow':
      return svg('polygon', {
        points: points([
          [0, -0.98],
          [0.8, -0.1],
          [0.3, -0.1],
          [0.3, 0.95],
          [-0.3, 0.95],
          [-0.3, -0.1],
          [-0.8, -0.1],
        ]),
      });
    case 'flag':
      return svg('polygon', {
        points: points([
          [-0.62, -0.95],
          [-0.36, -0.95],
          [0.8, -0.5],
          [-0.36, -0.02],
          [-0.36, 0.95],
          [-0.62, 0.95],
        ]),
      });
    case 'boot':
      return svg('path', { d: 'M24 8 L54 8 L54 56 Q 86 58 90 78 L90 92 L24 92 Z' });
    case 'ell':
      return svg('polygon', {
        points: points([
          [-0.62, -0.95],
          [-0.12, -0.95],
          [-0.12, 0.42],
          [0.68, 0.42],
          [0.68, 0.92],
          [-0.62, 0.92],
        ]),
      });
    default:
      // A card for dots.
      return svg('rect', { x: 50 - R * 0.78, y: 50 - R, width: R * 1.56, height: R * 2, rx: 11 });
  }
}

/** Dots on a square from -1 to 1, like a dice for up to nine. */
function diceSpots(count: number): [number, number][] {
  const c: [number, number] = [0, 0];
  const tl: [number, number] = [-1, -1];
  const tr: [number, number] = [1, -1];
  const bl: [number, number] = [-1, 1];
  const br: [number, number] = [1, 1];
  const ml: [number, number] = [-1, 0];
  const mr: [number, number] = [1, 0];
  const tm: [number, number] = [0, -1];
  const bm: [number, number] = [0, 1];
  const faces: Record<number, [number, number][]> = {
    1: [c],
    2: [tl, br],
    3: [tl, c, br],
    4: [tl, tr, bl, br],
    5: [tl, tr, c, bl, br],
    6: [tl, tr, ml, mr, bl, br],
    7: [tl, tr, ml, c, mr, bl, br],
    8: [tl, tm, tr, ml, mr, bl, bm, br],
    9: [tl, tm, tr, ml, c, mr, bl, bm, br],
  };
  return faces[count] ?? [];
}

/** Buddy pairs, two by two down the card, with an odd one left alone at the bottom. */
function pairSpots(count: number): [number, number][] {
  const rows = Math.ceil(count / 2);
  const gap = rows > 1 ? 2 / (rows - 1) : 0;
  return Array.from({ length: count }, (_, at) => {
    const row = Math.floor(at / 2);
    const y = rows > 1 ? -1 + row * gap : 0;
    const alone = at === count - 1 && count % 2 === 1;
    return [alone ? 0 : at % 2 === 0 ? -0.62 : 0.62, y];
  });
}

/** Scattered spots from a seed: cells of a 4 by 4 grid, each nudged a little, never touching. */
function scatterSpots(count: number, seed: number): [number, number][] {
  let state = seed >>> 0 || 1;
  const next = (): number => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 4294967296;
  };
  const cells = Array.from({ length: 16 }, (_, at) => at);
  for (let at = cells.length - 1; at > 0; at -= 1) {
    const other = Math.floor(next() * (at + 1));
    [cells[at], cells[other]] = [cells[other], cells[at]];
  }
  return cells.slice(0, count).map((cell) => [-1 + ((cell % 4) + 0.5 + (next() - 0.5) * 0.5) * 0.5, -1 + (Math.floor(cell / 4) + 0.5 + (next() - 0.5) * 0.5) * 0.5].map((v) => v * 1.25) as [number, number]);
}

function spotsFor(thing: Thing, layout: DotLayout, seed: number): [number, number][] {
  if (layout === 'pairs') return pairSpots(thing.dots);
  if (layout === 'scatter') return scatterSpots(thing.dots, seed);
  return diceSpots(thing.dots);
}

/** The middle of a shape and how far dots may reach from it, so they stay inside. */
function dotRoom(name: string, numeral: boolean): { x: number; y: number; w: number; h: number } {
  if (name === 'card') return numeral ? { x: 50, y: 60, w: 20, h: 22 } : { x: 50, y: 50, w: 22, h: 30 };
  if (name === 'triangle') return { x: 50, y: 62, w: 13, h: 11 };
  if (name === 'square') return { x: 50, y: 50, w: 22, h: 22 };
  if (name === 'pentagon') return { x: 50, y: 55, w: 19, h: 17 };
  return { x: 50, y: 50, w: 21, h: 21 };
}

export interface ArtOptions {
  layout: DotLayout;
  /** A seed for scattered dots, different for each thing. */
  seed: number;
}

/** The picture of a thing: an emoji, or an SVG shape. */
export function thingArt(thing: Thing, options: ArtOptions): HTMLElement {
  const holder = element('span', 'art');
  if (thing.pic !== null) {
    holder.classList.add('art-pic');
    holder.textContent = PICS[thing.pic].glyph;
    return holder;
  }
  const info = SHAPES[thing.shape];
  const [paint, edge] = paintOf(thing.color);
  const picture = svg('svg', { viewBox: '0 0 100 100', 'aria-hidden': 'true' });
  const turned = svg('g', {
    transform: `rotate(${thing.turn * 45} 50 50) translate(50 50) scale(${SCALE[thing.size] * (thing.flip ? -1 : 1)} ${SCALE[thing.size]}) translate(-50 -50)`,
  });
  turned.setAttribute('class', 'turned');
  const body = outline(info.name);
  const isCard = info.name === 'card';
  const empty = thing.fill === 1;
  body.setAttribute('fill', isCard ? '#fffdf7' : empty ? '#fffaf2' : paint);
  body.setAttribute('stroke', isCard ? paint : edge);
  body.setAttribute('stroke-width', isCard ? '6' : empty ? '9' : '4');
  body.setAttribute('stroke-linejoin', 'round');
  turned.append(body);
  if (thing.dots > 0) {
    const room = dotRoom(info.name, thing.numeral !== null);
    const spots = spotsFor(thing, options.layout, options.seed);
    const radius = Math.min(isCard ? 8.5 : 6.5, (isCard ? 52 : 34) / (Math.sqrt(thing.dots) * 3.2));
    const dotPaint = isCard || empty ? paint : '#ffffff';
    spots.forEach(([x, y], at) => {
      const dot = svg('circle', { cx: room.x + x * room.w, cy: room.y + y * room.h, r: radius, fill: dotPaint });
      dot.setAttribute('class', 'dot');
      (dot as SVGElement).style.setProperty('--at', String(at));
      if (isCard) dot.setAttribute('stroke', edge);
      if (isCard) dot.setAttribute('stroke-width', '1.5');
      turned.append(dot);
    });
  }
  if (thing.numeral !== null) {
    const label = svg('text', { x: 50, y: 33, 'text-anchor': 'middle', 'font-size': 26, 'font-weight': 700, fill: edge });
    label.textContent = String(thing.numeral);
    turned.append(label);
  }
  picture.append(turned);
  holder.append(picture);
  return holder;
}
