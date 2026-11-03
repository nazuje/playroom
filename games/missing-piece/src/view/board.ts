// The quilt on the clothesline: its patches, the gap, and everything the quilt does. Patches hop when tapped or
// shown, a broken line shakes, the finished quilt lights up patch by patch as its tune plays, and a try that runs
// out tangles every patch.
import { text } from '../lang/index.ts';
import { cellKey, type Cell } from '../rules/cells.ts';
import type { Level } from '../rules/levels.ts';
import type { Lines } from '../rules/play.ts';
import { calm, element } from '../ui.ts';
import { fit, type Fit } from './fit.ts';
import { isRoomy, pieceArt } from './pieces.ts';

export interface BoardView {
  show(level: Level): void;
  /** Sizes the quilt and the basket to the screen. */
  layout(): Fit | null;
  cellAt(index: number): HTMLElement | null;
  gap(): HTMLElement | null;
  /** Shows a piece sitting in the gap, or the empty "?". */
  setGap(cell: Cell | null): void;
  onCell(listener: (index: number) => void): void;
  /** A patch hops, as when it is tapped. */
  hop(index: number): void;
  /** The lines a broken rule runs along shake and flash. */
  shake(lines: Lines): void;
  /** Lights one patch for its note of the tune. */
  glow(index: number): void;
  /** The whole quilt shines and billows on the line. */
  finish(): void;
  /** Every patch spins out of place, for a try that ran out. */
  tangle(): void;
  /** The first two patches of a row fly onto the third, to show buttons adding up or cancelling out. */
  merge(row: number): void;
  relabel(): void;
  /** One light per puzzle of the set, hung on the line: lit for each one done. */
  lights(done: number, total: number): void;
  readonly roomy: boolean;
}

const HOP_MS = 520;
const SHAKE_MS = 700;
const GLOW_MS = 520;

export function createBoard(host: HTMLElement, bar: HTMLElement): BoardView {
  let level: Level | null = null;
  let roomy = true;
  let listener: (index: number) => void = () => {};
  const stage = element('div', 'stage');
  const quilt = element('div', 'quilt');
  const lamps = element('div', 'lights');
  stage.append(element('div', 'rope'), lamps, quilt, element('span', 'peg peg-left'), element('span', 'peg peg-right'));

  const cells = (): HTMLElement[] => [...quilt.querySelectorAll<HTMLElement>('.patch')];

  /** Restarts a CSS animation on something, even if it is still running. */
  function replay(target: Element | null, className: string, ms: number): void {
    if (!target) return;
    target.classList.remove(className);
    void (target as HTMLElement).offsetWidth;
    target.classList.add(className);
    window.setTimeout(() => target.classList.remove(className), ms);
  }

  function patch(cell: Cell, index: number, isGap: boolean): HTMLButtonElement {
    const made = element('button', isGap ? 'patch gap' : 'patch');
    made.type = 'button';
    made.dataset.cell = String(index);
    if (!isGap) {
      made.dataset.key = cellKey(cell);
      made.append(pieceArt(cell, roomy));
    } else {
      const mark = element('span', 'gap-mark');
      mark.textContent = '?';
      made.append(mark);
    }
    made.addEventListener('pointerdown', (event) => {
      if (event.button !== 0) return;
      listener(index);
    });
    made.addEventListener('click', (event) => {
      if (event.detail === 0) listener(index);
    });
    return made;
  }

  function label(): void {
    for (const one of cells()) one.setAttribute('aria-label', one.classList.contains('gap') ? text().gap : text().patch);
  }

  function layout(): Fit | null {
    if (!level) return null;
    const room = window.innerHeight - bar.getBoundingClientRect().height;
    const sizes = fit(window.innerWidth, room, level.size, level.options.length, level.big);
    const style = document.documentElement.style;
    style.setProperty('--cell', `${sizes.cell}px`);
    style.setProperty('--piece', `${sizes.piece}px`);
    style.setProperty('--per-row', String(sizes.perRow));
    style.setProperty('--n', String(level.size));
    return sizes;
  }

  return {
    show(next) {
      level = next;
      roomy = isRoomy([...next.cells, ...next.options]);
      quilt.replaceChildren(...next.cells.map((cell, at) => patch(cell, at, at === next.cells.length - 1)));
      quilt.dataset.size = String(next.size);
      delete quilt.dataset.state;
      label();
      host.replaceChildren(stage);
      layout();
    },
    layout,
    cellAt: (index) => quilt.querySelector(`[data-cell="${index}"]`),
    gap: () => quilt.querySelector('.gap'),
    setGap(cell) {
      const gap = quilt.querySelector<HTMLElement>('.gap');
      if (!gap) return;
      if (!cell) {
        const mark = element('span', 'gap-mark');
        mark.textContent = '?';
        gap.replaceChildren(mark);
        delete gap.dataset.key;
        gap.classList.remove('filled');
        return;
      }
      gap.replaceChildren(pieceArt(cell, roomy));
      gap.dataset.key = cellKey(cell);
      gap.classList.add('filled');
    },
    onCell(next) {
      listener = next;
    },
    hop(index) {
      replay(quilt.querySelector(`[data-cell="${index}"]`), 'hop', HOP_MS);
    },
    shake(lines) {
      if (!level) return;
      const size = level.size;
      for (const one of cells()) {
        const at = Number(one.dataset.cell);
        const inLine = lines.rows.includes(Math.floor(at / size)) || lines.cols.includes(at % size);
        if (inLine) replay(one, calm() ? 'flash' : 'shake', SHAKE_MS);
      }
    },
    glow(index) {
      replay(quilt.querySelector(`[data-cell="${index}"]`), 'glow', GLOW_MS);
    },
    finish() {
      quilt.dataset.state = 'done';
      replay(stage, 'billow', 1400);
    },
    tangle() {
      quilt.dataset.state = 'tangled';
      for (const one of cells()) {
        // Each patch spins its own way, as if the wind blew the quilt into a knot.
        const spin = (Math.random() * 2 - 1) * (calm() ? 0 : 200);
        one.style.setProperty('--spin', `${spin.toFixed(0)}deg`);
        one.style.setProperty('--dx', `${((Math.random() * 2 - 1) * 30).toFixed(0)}%`);
        one.style.setProperty('--dy', `${((Math.random() * 2 - 1) * 30).toFixed(0)}%`);
      }
    },
    merge(row) {
      if (!level || level.size < 3 || calm()) return;
      const base = row * level.size;
      const target = quilt.querySelector(`[data-cell="${base + 2}"]`)?.getBoundingClientRect();
      if (!target) return;
      for (const from of [base, base + 1]) {
        const source = quilt.querySelector(`[data-cell="${from}"]`);
        const art = source?.querySelector('svg');
        if (!source || !art) continue;
        const box = source.getBoundingClientRect();
        const ghost = element('div', 'ghost');
        ghost.style.left = `${box.left}px`;
        ghost.style.top = `${box.top}px`;
        ghost.style.width = `${box.width}px`;
        ghost.style.height = `${box.height}px`;
        ghost.append(art.cloneNode(true));
        document.body.append(ghost);
        const flight = ghost.animate(
          [
            { transform: 'translate(0, 0)', opacity: 0.9 },
            { transform: `translate(${target.left - box.left}px, ${target.top - box.top}px)`, opacity: 0.85, offset: 0.7 },
            { transform: `translate(${target.left - box.left}px, ${target.top - box.top}px) scale(1.08)`, opacity: 0 },
          ],
          { duration: 1300, easing: 'ease-in-out' },
        );
        flight.onfinish = () => ghost.remove();
        flight.oncancel = () => ghost.remove();
      }
      window.setTimeout(() => replay(quilt.querySelector(`[data-cell="${base + 2}"]`), 'glow', GLOW_MS), 950);
    },
    relabel: label,
    lights(done, total) {
      const before = Number(lamps.dataset.done ?? 0);
      lamps.dataset.done = String(done);
      lamps.replaceChildren(
        ...Array.from({ length: total }, (_, at) => {
          const lamp = element('span', at < done ? 'light light-on' : at === done ? 'light light-now' : 'light');
          if (at < done && at >= before && done > 0) lamp.classList.add('light-pop');
          return lamp;
        }),
      );
    },
    get roomy() {
      return roomy;
    },
  };
}
