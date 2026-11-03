// The tide pool at the top of the screen: the target critter in its ring of bubbles with the ↻ shell beside it,
// or in "which two are the same?" two slots for the cards picked. It also does everything the pool does: the
// target turns for ↻, a whirlpool spins under it when the right critter flies in, the two snap together, the
// critters get dizzy when a try runs out, and the hints and demos play here.
import { text } from '../lang/index.ts';
import { ACCENTS, keyOf, type Tile } from '../rules/shapes.ts';
import type { Puzzle } from '../rules/levels.ts';
import { calm, element } from '../ui.ts';
import { critterArt } from './art.ts';
import { fit, type Fit } from './fit.ts';

export interface BoardView {
  show(puzzle: Puzzle): void;
  /** Sizes the pool and the sand bed to the screen. */
  layout(): Fit | null;
  /** The target's ring, or in "which two are the same?" the tray with both slots. */
  target(): HTMLElement | null;
  /** The target's drawing, or a slot's. */
  art(slot?: number): SVGSVGElement | null;
  slot(index: number): HTMLElement | null;
  helper(): HTMLElement | null;
  /** Puts a card's critter in a slot, or empties it. */
  setSlot(index: number, shape: readonly Tile[] | null): SVGSVGElement | null;
  /** The ↻ button: the target turns a quarter clockwise. */
  turnTarget(): void;
  /** Quarter turns ↻ has given the target, 0 to 3. */
  readonly turned: number;
  onTarget(listener: () => void): void;
  onHelper(listener: () => void): void;
  hop(target?: Element | null): void;
  /** The whirlpool spins under the target while the right critter flies in. */
  whirl(ms: number): void;
  /** The two critters click together, with a ring of bubbles. */
  snap(): void;
  /** Every critter spins dizzily, for a try that ran out. */
  dizzy(): void;
  /** The target turns slowly all the way round, a quarter at a time, as a hint. */
  tour(): void;
  /** A ghost of the target flips over beside it, to show what backwards means. */
  flipGhost(): void;
  /** The painted tiles glow one after another, to show the colours matter. */
  glowAccents(): void;
  relabel(): void;
  /** One pearl per puzzle of the set: lit for each one done. */
  pearls(done: number, total: number): void;
}

const HOP_MS = 520;
const SNAP_MS = 900;
const TOUR_MS = 3200;
const FLIP_MS = 2400;

export function createBoard(host: HTMLElement, bar: HTMLElement): BoardView {
  let puzzle: Puzzle | null = null;
  let turned = 0;
  let onTarget: () => void = () => {};
  let onHelper: () => void = () => {};
  const stage = element('div', 'stage');
  const pearlRow = element('div', 'pearls');
  const pool = element('div', 'pool');

  /** Restarts a CSS animation on something, even if it is still running. */
  function replay(target: Element | null, className: string, ms: number): void {
    if (!target) return;
    target.classList.remove(className);
    void (target as HTMLElement).offsetWidth;
    target.classList.add(className);
    window.setTimeout(() => target.classList.remove(className), ms);
  }

  function pressable(made: HTMLElement, run: () => void): void {
    made.addEventListener('pointerdown', (event) => {
      if (event.button === 0) run();
    });
    made.addEventListener('click', (event) => {
      if (event.detail === 0) run();
    });
  }

  function ring(className: string): HTMLButtonElement {
    const made = element('button', className);
    made.type = 'button';
    made.append(element('span', 'whirl'), element('span', 'bubbles'));
    pressable(made, () => onTarget());
    return made;
  }

  const art = (slot?: number): SVGSVGElement | null =>
    (slot === undefined ? pool.querySelector('.target .art') : pool.querySelector(`.slot[data-slot="${slot}"] .art`)) as SVGSVGElement | null;

  function label(): void {
    pool.querySelector('.target')?.setAttribute('aria-label', text().target);
    pool.querySelector('.helper')?.setAttribute('aria-label', text().helper);
    pool.querySelectorAll('.slot').forEach((slot) => slot.setAttribute('aria-label', text().tray));
  }

  function layout(): Fit | null {
    if (!puzzle) return null;
    const room = window.innerHeight - bar.getBoundingClientRect().height;
    const sizes = fit(window.innerWidth, room, { kind: puzzle.kind, options: puzzle.options.length, big: puzzle.big, helper: puzzle.helper !== 'none' });
    const style = document.documentElement.style;
    style.setProperty('--target', `${sizes.target}px`);
    style.setProperty('--option', `${sizes.option}px`);
    style.setProperty('--per-row', String(sizes.perRow));
    style.setProperty('--helper', `${sizes.helper}px`);
    return sizes;
  }

  function showTurn(): void {
    const drawing = art();
    if (!drawing) return;
    drawing.style.setProperty('--base', `${turned * 90}deg`);
    stage.dataset.turned = String(((turned % 4) + 4) % 4);
  }

  return {
    show(next) {
      puzzle = next;
      turned = 0;
      delete stage.dataset.state;
      stage.dataset.kind = next.kind;
      if (next.kind === 'pairs') {
        const tray = element('div', 'tray target-tray');
        const first = ring('slot');
        first.dataset.slot = '0';
        const second = ring('slot');
        second.dataset.slot = '1';
        const equals = element('span', 'equals');
        equals.textContent = '=';
        tray.append(first, equals, second);
        pool.replaceChildren(tray);
      } else {
        const target = ring('target');
        target.dataset.key = keyOf(next.target);
        target.append(critterArt(next.target, next.side, next.body));
        // The ↻ shell sits beside the ring, on the corner of its box, never inside the target's button.
        const pond = element('div', 'pond');
        pond.append(target);
        if (next.helper !== 'none') {
          const helper = element('button', 'helper');
          helper.type = 'button';
          helper.dataset.action = 'helper';
          helper.textContent = '↻';
          pressable(helper, () => onHelper());
          pond.append(helper);
        }
        pool.replaceChildren(pond);
      }
      stage.replaceChildren(pearlRow, pool);
      host.replaceChildren(stage);
      showTurn();
      label();
      layout();
    },
    layout,
    target: () => pool.querySelector('.target, .tray'),
    art,
    slot: (index) => pool.querySelector(`.slot[data-slot="${index}"]`),
    helper: () => pool.querySelector('.helper'),
    setSlot(index, shape) {
      const slot = pool.querySelector<HTMLElement>(`.slot[data-slot="${index}"]`);
      if (!slot || !puzzle) return null;
      slot.querySelector('.art')?.remove();
      slot.querySelector('.badge')?.remove();
      slot.classList.remove('backwards');
      slot.classList.toggle('filled', shape !== null);
      if (!shape) {
        delete slot.dataset.key;
        return null;
      }
      const drawing = critterArt(shape, puzzle.side, puzzle.body);
      slot.dataset.key = keyOf(shape);
      slot.append(drawing);
      return drawing;
    },
    turnTarget() {
      turned += 1;
      showTurn();
      replay(pool.querySelector('.helper'), 'spun', 600);
    },
    get turned() {
      return ((turned % 4) + 4) % 4;
    },
    onTarget(next) {
      onTarget = next;
    },
    onHelper(next) {
      onHelper = next;
    },
    hop(target = pool.querySelector('.target, .tray')) {
      replay(target, 'hop', HOP_MS);
    },
    whirl(ms) {
      const whirl = pool.querySelector('.target .whirl, .slot[data-slot="0"] .whirl');
      if (!whirl || calm()) return;
      replay(whirl, 'whirling', ms + 400);
    },
    snap() {
      const holder = pool.querySelector('.target, .slot[data-slot="0"]');
      replay(holder, 'snap', SNAP_MS);
      replay(holder?.querySelector('.bubbles') ?? null, 'pop-ring', SNAP_MS);
    },
    dizzy() {
      stage.dataset.state = 'dizzy';
    },
    tour() {
      replay(art(), 'tour', TOUR_MS);
    },
    flipGhost() {
      const target = pool.querySelector<HTMLElement>('.target');
      const drawing = art();
      if (!target || !drawing || calm()) return;
      const ghost = element('div', 'mirror-ghost');
      ghost.append(drawing.cloneNode(true));
      const mark = element('span', 'mirror-mark');
      mark.textContent = '🪞';
      ghost.append(mark);
      target.append(ghost);
      window.setTimeout(() => ghost.remove(), FLIP_MS);
    },
    glowAccents() {
      const drawing = art();
      if (!drawing || !puzzle) return;
      const painted = [...drawing.querySelectorAll<SVGGElement>('.tile')].filter((tile) =>
        puzzle?.target.some(
          (one) => String(one.x) === tile.dataset.x && String(one.y) === tile.dataset.y && (ACCENTS as readonly number[]).includes(one.paint),
        ),
      );
      painted.forEach((tile, at) => window.setTimeout(() => replay(tile, 'glow', 700), at * 500));
    },
    relabel: label,
    pearls(done, total) {
      const before = Number(pearlRow.dataset.done ?? 0);
      pearlRow.dataset.done = String(done);
      pearlRow.replaceChildren(
        ...Array.from({ length: total }, (_, at) => {
          const pearl = element('span', at < done ? 'pearl pearl-on' : at === done ? 'pearl pearl-now' : 'pearl');
          if (at < done && at >= before && done > 0) pearl.classList.add('pearl-pop');
          return pearl;
        }),
      );
    },
  };
}
