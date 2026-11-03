import { playSound, store } from '@playroom/kit';
import { button, el, replayClass } from '../dom.ts';
import { Beaker, fillFor } from '../beaker.ts';
import { flyDrop, potButton } from '../pots.ts';
import { COLORS, mix, PAINTS, totalParts } from '../mix.ts';
import type { ColorId, Paint, Parts } from '../mix.ts';
import { FILLS_KEY, PICTURES, readFills } from '../pictures.ts';
import type { Fills, Picture } from '../pictures.ts';
import { say, words } from '../screen.ts';
import { text } from '../lang/index.ts';
import { Nudge } from '../nudge.ts';

const SVG_NS = 'http://www.w3.org/2000/svg';
const BLANK = '#ffffff';
/** How long the sponge has to be held down to wipe a picture. A tap or a palm brushing past is not enough. */
export const HOLD_MS = 1200;
/** A beaker this full of a dull color gets a nudge towards the rinse button. */
const MUDDY_PARTS = 4;

/**
 * A button that acts only when held down for HOLD_MS. A short press calls onShort
 * instead. A keyboard press, which can't be held, acts at once.
 */
function holdButton(className: string, onHeld: () => void, onShort: () => void): HTMLButtonElement {
  const node = el('button', className);
  node.type = 'button';
  let timer: ReturnType<typeof setTimeout> | undefined;
  node.addEventListener('pointerdown', (event) => {
    if (event.button !== 0 || timer !== undefined) return;
    node.classList.add('holding');
    timer = setTimeout(() => {
      timer = undefined;
      node.classList.remove('holding');
      onHeld();
    }, HOLD_MS);
  });
  const letGo = (): void => {
    if (timer === undefined) return;
    clearTimeout(timer);
    timer = undefined;
    node.classList.remove('holding');
    onShort();
  };
  for (const type of ['pointerup', 'pointerleave', 'pointercancel'] as const) node.addEventListener(type, letGo);
  node.addEventListener('contextmenu', (event) => event.preventDefault());
  node.addEventListener('click', (event) => {
    if (event.detail === 0) onHeld();
  });
  return node;
}

function pictureSvg(picture: Picture, fills: Record<string, string>, onTap: (id: string, shape: SVGPathElement) => void): SVGSVGElement {
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('viewBox', '0 0 400 320');
  svg.setAttribute('class', 'picture');
  svg.setAttribute('role', 'group');
  svg.setAttribute('aria-label', text().pictureLabel(text().pictures[picture.id]));
  for (const region of picture.regions) {
    const shape = document.createElementNS(SVG_NS, 'path');
    shape.setAttribute('d', region.d);
    shape.setAttribute('class', 'region');
    shape.setAttribute('role', 'button');
    shape.setAttribute('tabindex', '0');
    shape.setAttribute('aria-label', text().regions[region.id]);
    shape.style.fill = fills[region.id] ?? BLANK;
    shape.addEventListener('pointerdown', (event) => {
      if (event.button !== 0) return;
      onTap(region.id, shape);
    });
    shape.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        onTap(region.id, shape);
      }
    });
    svg.append(shape);
  }
  return svg;
}

export function showFree(root: HTMLElement, signal: AbortSignal): void {
  let parts: Parts = {};
  let color: ColorId | null = null;
  let fills: Fills = readFills(store.get<unknown>(FILLS_KEY, null));
  let picture = PICTURES[0] as Picture;
  /** The picture as it was before the last wipe, until the next stroke. */
  let undo: Record<string, string> | null = null;
  /** Set once the mix has been used, so the next paint starts a clean beaker. */
  let used = false;
  const nudge = new Nudge(signal);

  const beaker = new Beaker();
  const name = el('p', 'color-name');
  const recipe = el('p', 'small-print');
  const pots = el('div', 'pots');
  const emptyBtn = button('btn btn-rinse', '', () => {
    void emptyBeaker();
  });
  const canvas = el('div', 'canvas');
  const pickers = el('div', 'picture-picks');
  const clearBtn = holdButton('icon-btn tool-btn hold-btn', wipe, () => {
    replayClass(clearBtn, 'wiggle');
    playSound('bonk');
    say(() => text().clearAsk);
  });
  clearBtn.append(el('span', 'hold-icon', '🧽'));
  const undoBtn = button('icon-btn tool-btn', '↩️', restore);
  undoBtn.hidden = true;

  function refresh(): void {
    const page = text();
    name.textContent = color ? page.colorLabel(color) : page.tapAPaint;
    name.classList.toggle('color-name-on', color !== null);
    name.style.setProperty('--paint', color ? COLORS[color].hex : 'transparent');
    recipe.textContent = page.recipe(parts);
    emptyBtn.disabled = color === null;
    beaker.setLabel(color ? page.beakerOf(color) : page.emptyBeaker);
  }

  function addPaint(paint: Paint, pot: HTMLButtonElement): void {
    // A mix that has been painted with is finished: a new paint starts a clean beaker.
    if (used) {
      used = false;
      parts = {};
      color = null;
    }
    const before = color;
    parts = { ...parts, [paint]: (parts[paint] ?? 0) + 1 };
    color = mix(parts);
    if (!color) return;
    const stirred = before ? [COLORS[before].hex, COLORS[paint].hex] : [COLORS[paint].hex];
    flyDrop(pot, beaker.element, COLORS[paint].hex);
    beaker.stir(stirred, COLORS[color].hex, fillFor(totalParts(parts)));
    const made = color;
    if (made !== before) say(() => text().colorSpoken(made));
    refresh();
    const { family, tone } = COLORS[made];
    const muddy = family === 'brown' || family === 'grey' || tone === 'muted';
    if (muddy && totalParts(parts) >= MUDDY_PARTS) nudge.now(emptyBtn);
    else nudge.now(canvas);
  }

  async function emptyBeaker(): Promise<void> {
    parts = {};
    color = null;
    used = false;
    refresh();
    playSound('whoosh');
    nudge.now(...pots.querySelectorAll('button'));
    await beaker.empty();
  }

  function paintRegion(id: string, shape: SVGPathElement): void {
    if (!color) {
      beaker.wiggle();
      nudge.now(...pots.querySelectorAll('button'));
      say(() => text().paintFirst);
      return;
    }
    const hex = COLORS[color].hex;
    shape.style.fill = hex;
    replayClass(shape, 'splat');
    playSound('pop');
    fills = { ...fills, [picture.id]: { ...fills[picture.id], [id]: hex } };
    store.set(FILLS_KEY, fills);
    used = true;
    forgetUndo();
    nudge.later(...pots.querySelectorAll('button'));
  }

  function drawPicture(): void {
    canvas.replaceChildren(pictureSvg(picture, fills[picture.id] ?? {}, paintRegion));
    for (const pick of pickers.querySelectorAll('button')) {
      pick.setAttribute('aria-pressed', String(pick.dataset['picture'] === picture.id));
    }
  }

  function drawTools(): void {
    clearBtn.setAttribute('aria-label', text().clear);
    undoBtn.setAttribute('aria-label', text().undo);
  }

  function forgetUndo(): void {
    undo = null;
    undoBtn.hidden = true;
    clearBtn.hidden = false;
  }

  /** The picture is precious: wiping it takes a long hold, and the sponge turns into an undo button. */
  function wipe(): void {
    const before = fills[picture.id] ?? {};
    if (Object.keys(before).length === 0) return;
    undo = before;
    fills = { ...fills, [picture.id]: {} };
    store.set(FILLS_KEY, fills);
    playSound('whoosh');
    drawPicture();
    clearBtn.hidden = true;
    undoBtn.hidden = false;
  }

  function restore(): void {
    if (!undo) return;
    fills = { ...fills, [picture.id]: undo };
    store.set(FILLS_KEY, fills);
    playSound('boing');
    forgetUndo();
    drawPicture();
  }

  for (const paint of PAINTS) {
    pots.append(potButton(signal, paint, (pot) => addPaint(paint, pot)));
  }
  const picks = PICTURES.map((option) => {
    const pick = button('level-btn', '', () => {
      if (picture === option) return;
      picture = option;
      forgetUndo();
      drawPicture();
      say(() => text().pictures[option.id]);
    });
    pick.dataset['picture'] = option.id;
    return { option, pick };
  });
  pickers.append(...picks.map(({ pick }) => pick));

  const lab = el('div', 'free-lab');
  const bench = el('div', 'bench-wrap');
  bench.append(beaker.element, el('div', 'bench'));
  const readout = el('div', 'readout');
  readout.append(name, recipe, emptyBtn);
  const top = el('div', 'free-top');
  top.append(bench, readout);
  lab.append(top, pots);
  const studio = el('div', 'free-studio');
  const tools = el('div', 'picture-tools');
  tools.append(pickers, clearBtn, undoBtn);
  studio.append(canvas, tools);
  const layout = el('div', 'play-free');
  layout.append(lab, studio);
  root.replaceChildren(layout);

  words(signal, () => {
    emptyBtn.textContent = text().empty;
    for (const { option, pick } of picks) pick.textContent = `${option.emoji} ${text().pictures[option.id]}`;
    drawTools();
    refresh();
    drawPicture();
  });
  say(() => text().freeIntro);
  nudge.now(...pots.querySelectorAll('button'));
}
