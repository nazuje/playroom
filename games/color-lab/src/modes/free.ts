import { store } from '@playroom/kit';
import { button, el, replayClass } from '../dom.ts';
import { Beaker, fillFor } from '../beaker.ts';
import { flyDrop, potButton } from '../pots.ts';
import { COLORS, mix, PAINTS, totalParts } from '../mix.ts';
import type { ColorId, Paint, Parts } from '../mix.ts';
import { FILLS_KEY, PICTURES, readFills } from '../pictures.ts';
import type { Fills, Picture } from '../pictures.ts';
import { say, words } from '../screen.ts';
import { text } from '../lang/index.ts';

const SVG_NS = 'http://www.w3.org/2000/svg';
const BLANK = '#ffffff';

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
    shape.addEventListener('click', () => {
      onTap(region.id, shape);
      shape.blur();
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
  let confirmingClear = false;

  const beaker = new Beaker();
  const name = el('p', 'color-name');
  const recipe = el('p', 'small-print');
  const pots = el('div', 'pots');
  const emptyBtn = button('btn', '', () => {
    void emptyBeaker();
  });
  const canvas = el('div', 'canvas');
  const pickers = el('div', 'picture-picks');
  const clearBtn = button('btn btn-coral', '', tapClear);

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
  }

  async function emptyBeaker(): Promise<void> {
    parts = {};
    color = null;
    refresh();
    await beaker.empty();
  }

  function paintRegion(id: string, shape: SVGPathElement): void {
    if (!color) {
      beaker.wiggle();
      say(() => text().paintFirst);
      return;
    }
    const hex = COLORS[color].hex;
    shape.style.fill = hex;
    fills = { ...fills, [picture.id]: { ...fills[picture.id], [id]: hex } };
    store.set(FILLS_KEY, fills);
    resetClear();
  }

  function drawPicture(): void {
    canvas.replaceChildren(pictureSvg(picture, fills[picture.id] ?? {}, paintRegion));
    for (const pick of pickers.querySelectorAll('button')) {
      pick.setAttribute('aria-pressed', String(pick.dataset['picture'] === picture.id));
    }
  }

  function drawClear(): void {
    clearBtn.textContent = confirmingClear ? text().clearSure : text().clear;
  }

  function resetClear(): void {
    confirmingClear = false;
    drawClear();
  }

  /** The picture is precious, so clearing takes two taps. */
  function tapClear(): void {
    if (!confirmingClear) {
      confirmingClear = true;
      drawClear();
      replayClass(clearBtn, 'wiggle');
      say(() => text().clearAsk);
      return;
    }
    resetClear();
    fills = { ...fills, [picture.id]: {} };
    store.set(FILLS_KEY, fills);
    drawPicture();
  }

  for (const paint of PAINTS) {
    pots.append(potButton(signal, paint, (pot) => addPaint(paint, pot)));
  }
  const picks = PICTURES.map((option) => {
    const pick = button('level-btn', '', () => {
      picture = option;
      resetClear();
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
  tools.append(pickers, clearBtn);
  studio.append(canvas, tools);
  const layout = el('div', 'play-free');
  layout.append(lab, studio);
  root.replaceChildren(layout);

  words(signal, () => {
    emptyBtn.textContent = text().empty;
    for (const { option, pick } of picks) pick.textContent = `${option.emoji} ${text().pictures[option.id]}`;
    drawClear();
    refresh();
    drawPicture();
  });
  say(() => text().freeIntro);
}
