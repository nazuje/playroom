// Critters in SVG: rounded tiles in a body colour with a shine, a face that looks one way, and accents painted as a
// dot, a ring or a diamond. Every accent looks the same turned or mirrored, so only the tiles' places and the face
// tell which way a critter lies. Each drawing is a square box centred on the critter, all at one scale per puzzle,
// so the view can spin one drawing with CSS until it lies exactly over another.
import { BODY, FACE, GEM, normalise, SPOT, STRIPE, width, height, type Shape, type Tile } from '../rules/shapes.ts';

const SVG = 'http://www.w3.org/2000/svg';

/** Body colours, one per puzzle: coral, sunshine, lilac, bubblegum and tangerine. */
export const BODY_PAINT = ['#ff7a6b', '#ffcb3d', '#c39bff', '#ff9fcf', '#ffa04d'];
export const BODY_DARK = ['#c9473b', '#c7901a', '#8a5fd1', '#d0679c', '#cc6a1e'];
const ACCENT_PAINT: Record<number, string> = { [SPOT]: '#2f5bea', [STRIPE]: '#4b2477', [GEM]: '#fdfcff' };
const INK = '#1d2b4a';
/** Room around the critter inside its box, in tiles. */
const MARGIN = 0.16;

function svg<K extends keyof SVGElementTagNameMap>(tag: K, attrs: Record<string, string | number>): SVGElementTagNameMap[K] {
  const made = document.createElementNS(SVG, tag);
  for (const [name, value] of Object.entries(attrs)) made.setAttribute(name, String(value));
  return made;
}

function face(look: number): SVGGElement {
  const group = svg('g', { class: 'face', transform: `rotate(${look * 90} 0.5 0.5)` });
  for (const x of [0.31, 0.69]) {
    group.append(svg('circle', { cx: x, cy: 0.38, r: 0.14, fill: '#ffffff', stroke: INK, 'stroke-width': 0.035 }));
    group.append(svg('circle', { class: 'pupil', cx: x, cy: 0.35, r: 0.07, fill: INK }));
  }
  group.append(svg('path', { d: 'M0.33 0.64 Q0.5 0.8 0.67 0.64', fill: 'none', stroke: INK, 'stroke-width': 0.06, 'stroke-linecap': 'round' }));
  for (const x of [0.2, 0.8]) group.append(svg('circle', { cx: x, cy: 0.62, r: 0.07, fill: '#ff5d8f', opacity: 0.55 }));
  return group;
}

function accent(paint: number): SVGElement | null {
  if (paint === SPOT) return svg('circle', { cx: 0.5, cy: 0.52, r: 0.2, fill: '#ffffff' });
  if (paint === STRIPE) return svg('circle', { cx: 0.5, cy: 0.52, r: 0.2, fill: 'none', stroke: '#ffd23f', 'stroke-width': 0.1 });
  if (paint === GEM) return svg('path', { d: 'M0.5 0.24 L0.76 0.52 L0.5 0.8 L0.24 0.52 Z', fill: '#e0218a', stroke: '#9c0f5f', 'stroke-width': 0.04 });
  return null;
}

function tile(one: Tile, body: number): SVGGElement {
  const group = svg('g', { class: 'tile', transform: `translate(${one.x} ${one.y})` });
  group.dataset.x = String(one.x);
  group.dataset.y = String(one.y);
  const fill = ACCENT_PAINT[one.paint] ?? BODY_PAINT[body];
  const edge = one.paint === BODY || one.paint === FACE ? BODY_DARK[body] : INK;
  group.append(svg('rect', { class: 'tile-back', x: 0.04, y: 0.04, width: 0.92, height: 0.92, rx: 0.22, fill, stroke: edge, 'stroke-width': 0.06 }));
  group.append(svg('rect', { x: 0.16, y: 0.1, width: 0.68, height: 0.2, rx: 0.1, fill: '#ffffff', opacity: one.paint === GEM ? 0.9 : 0.38 }));
  if (one.paint === FACE) group.append(face(one.look));
  const mark = accent(one.paint);
  if (mark) group.append(mark);
  return group;
}

/** A critter's drawing, in a square box of `side` tiles centred on it. */
export function critterArt(shape: Shape, side: number, body: number): SVGSVGElement {
  const tiles = normalise(shape);
  const box = side + 2 * MARGIN;
  const left = width(tiles) / 2 - box / 2;
  const top = height(tiles) / 2 - box / 2;
  const made = svg('svg', { class: 'art', viewBox: `${left} ${top} ${box} ${box}`, 'aria-hidden': 'true' });
  for (const one of tiles) made.append(tile(one, body));
  return made;
}

/** Lights up the tiles that are in the wrong place or painted wrong, and outlines where the right ones belong. */
export function markTiles(art: SVGSVGElement, wrong: readonly Tile[], missing: readonly Tile[]): void {
  for (const one of wrong) art.querySelector(`.tile[data-x="${one.x}"][data-y="${one.y}"]`)?.classList.add('odd');
  for (const one of missing) {
    art.append(svg('rect', { class: 'ghost-tile', x: one.x + 0.08, y: one.y + 0.08, width: 0.84, height: 0.84, rx: 0.2 }));
  }
}
