// Number blocks and map cards for the dock. A number block is a chunky cream block with its digit and, up to 12,
// its dots in rows of five, so a child who can't read numbers yet can count them. A map card is the stack seen
// from above: one square per column with its height, coloured like that column's top block, and the pink peg's
// dot in the front left corner.
import type { Heights } from '../rules/stack.ts';
import { element } from '../ui.ts';
import { cssColour, layerColour } from './palette.ts';

const DOTS_IN_A_ROW = 5;
const MOST_DOTS = 12;

export function pips(value: number): HTMLElement {
  const holder = element('span', 'pips');
  for (let at = 0; at < value; at += 1) holder.append(element('span', 'pip'));
  holder.style.setProperty('--cols', String(Math.max(1, Math.min(DOTS_IN_A_ROW, value))));
  return holder;
}

/** What a number block shows: the digit, and its dots when there are few enough to count. */
export function fillNumber(face: HTMLElement, value: number, dots: boolean): void {
  face.dataset.value = String(value);
  const digit = element('span', 'digit');
  digit.textContent = String(value);
  face.replaceChildren(digit);
  if (dots && value > 0 && value <= MOST_DOTS) face.append(pips(value));
}

export function numberBlock(className: string, value: number, dots: boolean): HTMLElement {
  const made = element('span', `num ${className}`.trim());
  fillNumber(made, value, dots);
  return made;
}

/** The stack from above, front row at the bottom, as the camera sees it from the front. */
export function mapGrid(heights: Heights): HTMLElement {
  const grid = element('span', 'map-grid');
  grid.style.setProperty('--cols', String(heights[0].length));
  heights.forEach((row) =>
    row.forEach((height) => {
      const cell = element('span', height > 0 ? 'map-cell' : 'map-cell map-empty');
      cell.textContent = height > 0 ? String(height) : '';
      if (height > 0) cell.style.setProperty('--top', cssColour(layerColour(height - 1)));
      grid.append(cell);
    }),
  );
  grid.append(element('span', 'peg-dot'));
  return grid;
}
