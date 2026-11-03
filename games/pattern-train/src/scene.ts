import { CAR_HEIGHT, fitTrain, GAP, ROW_GAP, type TrainFit } from './layout.ts';
import type { Item, Range, Train } from './pattern.ts';

const ARRIVE_MS = 1300;
const DEPART_MS = 1200;
const HOP_MS = 480;
const REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)');

/** Waits for an animation, whether it finishes or gets cancelled by the next train. */
async function settled(animation: Animation): Promise<void> {
  await animation.finished.catch(() => undefined);
}

function makeCell(className: string): HTMLElement {
  const cell = document.createElement('div');
  cell.className = `cell ${className}`;
  const body = document.createElement('div');
  body.className = 'body';
  const mark = document.createElement('span');
  mark.className = 'mark';
  mark.setAttribute('aria-hidden', 'true');
  cell.append(mark, body);
  return cell;
}

function setContents(cell: HTMLElement, className: string, text: string, label: string): void {
  const contents = document.createElement('span');
  contents.className = className;
  contents.textContent = text;
  cell.setAttribute('aria-label', label);
  cell.querySelector('.body')?.replaceChildren(contents);
}

/** What a screen reader hears for each car, read fresh so a language switch can relabel the train. */
export interface SceneLabels {
  engine: string;
  emptyCar: string;
  itemName: (item: Item) => string;
}

/** The drawn train: it knows how to fit, arrive, load, whistle and leave, but not the rules. */
export class Scene {
  private readonly scene: HTMLElement;
  private readonly rows: HTMLElement;
  private readonly toot: HTMLElement;
  private readonly labels: () => SceneLabels;
  private engine = makeCell('engine');
  private cars: HTMLElement[] = [];
  /** What each car holds, or null while it is still empty. */
  private loads: (Item | null)[] = [];
  private fit: TrainFit | null = null;

  constructor(scene: HTMLElement, rows: HTMLElement, toot: HTMLElement, labels: () => SceneLabels) {
    this.scene = scene;
    this.rows = rows;
    this.toot = toot;
    this.labels = labels;
    new ResizeObserver(() => this.layout()).observe(scene);
  }

  /** Draws a new train, off screen if it is about to arrive. */
  show(train: Train): void {
    const labels = this.labels();
    this.engine = makeCell('engine');
    setContents(this.engine, 'load', '🚂', labels.engine);
    const empty = new Set(train.blanks.map((blank) => blank.index));
    this.loads = train.cars.map((item, index) => (empty.has(index) ? null : item));
    this.cars = this.loads.map((item) => {
      const cell = makeCell('car');
      if (item) {
        setContents(cell, 'load', item.emoji, labels.itemName(item));
      } else {
        cell.classList.add('empty');
        setContents(cell, 'ask', '?', labels.emptyCar);
      }
      return cell;
    });
    this.toot.hidden = true;
    this.fit = null;
    this.layout();
  }

  /** Wraps the train onto as many tracks as gives the biggest cars. */
  private layout(): void {
    if (this.cars.length === 0) return;
    const fit = fitTrain(this.cars.length + 1, this.scene.clientWidth - 16, this.scene.clientHeight - 24);
    if (this.fit && fit.size === this.fit.size && fit.columns === this.fit.columns) return;
    this.fit = fit;
    this.rows.style.setProperty('--car', `${fit.size}px`);
    this.rows.style.setProperty('--car-h', `${Math.floor(fit.size * CAR_HEIGHT)}px`);
    this.rows.style.setProperty('--gap', `${GAP}px`);
    this.rows.style.setProperty('--row-gap', `${ROW_GAP}px`);
    this.rows.style.width = `${fit.columns * fit.size + (fit.columns - 1) * GAP}px`;

    const cells = [this.engine, ...this.cars];
    const tracks: HTMLElement[] = [];
    for (let start = 0; start < cells.length; start += fit.columns) {
      const track = document.createElement('div');
      track.className = 'track';
      const coupled = document.createElement('div');
      coupled.className = 'coupled';
      coupled.append(...cells.slice(start, start + fit.columns));
      track.append(coupled);
      tracks.push(track);
    }
    this.rows.replaceChildren(...tracks);
  }

  private async slide(frames: Keyframe[], duration: number, easing: string): Promise<void> {
    if (REDUCED.matches) return;
    this.rows.classList.add('chugging');
    const parts = [...this.rows.querySelectorAll<HTMLElement>('.coupled')];
    const moves = parts.map((part) => part.animate(frames, { duration, easing, fill: 'forwards' }));
    await Promise.all(moves.map(settled));
    this.rows.classList.remove('chugging');
    moves.forEach((move) => move.cancel());
  }

  /** The engine leads, and the 🚂 emoji faces left, so trains pull in from the right. */
  async arrive(): Promise<void> {
    const from = this.scene.clientWidth + 40;
    await this.slide([{ transform: `translateX(${from}px)` }, { transform: 'none' }], ARRIVE_MS, 'cubic-bezier(0.2, 0.7, 0.3, 1)');
  }

  async depart(): Promise<void> {
    const to = -(this.scene.clientWidth * 2 + 40);
    await this.slide([{ transform: 'none' }, { transform: `translateX(${to}px)` }], DEPART_MS, 'cubic-bezier(0.6, 0, 0.9, 0.5)');
    this.rows.replaceChildren();
    this.toot.hidden = true;
    this.cars = [];
  }

  /** A little plume of steam and a speech bubble. */
  whistle(sound: string): void {
    this.toot.textContent = sound;
    this.toot.hidden = false;
    for (const delay of [0, 180, 360]) {
      const puff = document.createElement('span');
      puff.className = 'puff';
      puff.textContent = '💨';
      puff.style.animationDelay = `${delay}ms`;
      puff.addEventListener('animationend', () => puff.remove());
      this.engine.append(puff);
    }
  }

  private center(element: HTMLElement): { x: number; y: number } {
    const box = element.getBoundingClientRect();
    return { x: box.left + box.width / 2, y: box.top + box.height / 2 };
  }

  carCenter(index: number): { x: number; y: number } {
    return this.center(this.cars[index]);
  }

  /** The chosen item leaps from its button in a little arc and lands in the car. */
  async hop(index: number, item: Item, from: HTMLElement): Promise<void> {
    const cell = this.cars[index];
    if (!REDUCED.matches) {
      const start = this.center(from);
      const end = this.center(cell);
      const flyer = document.createElement('span');
      flyer.className = 'flyer';
      flyer.textContent = item.emoji;
      flyer.style.left = `${end.x}px`;
      flyer.style.top = `${end.y}px`;
      flyer.style.fontSize = `${Math.round(cell.offsetWidth * 0.58)}px`;
      document.body.append(flyer);
      const dx = start.x - end.x;
      const dy = start.y - end.y;
      const peak = Math.min(dy, 0) - 70;
      await settled(
        flyer.animate(
          [
            { transform: `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px)) scale(1.2)` },
            { transform: `translate(calc(-50% + ${dx * 0.4}px), calc(-50% + ${peak}px)) scale(1.3)`, offset: 0.6 },
            { transform: 'translate(-50%, -50%) scale(1)' },
          ],
          { duration: HOP_MS, easing: 'ease-out' },
        ),
      );
      flyer.remove();
    }
    cell.classList.remove('empty', 'active');
    this.loads[index] = item;
    setContents(cell, 'load', item.emoji, this.labels().itemName(item));
    cell.classList.add('landed');
  }

  /** Renames every car in the current language, leaving the train where it is. */
  relabel(): void {
    const labels = this.labels();
    this.engine.setAttribute('aria-label', labels.engine);
    this.cars.forEach((cell, i) => {
      const item = this.loads[i];
      cell.setAttribute('aria-label', item ? labels.itemName(item) : labels.emptyCar);
    });
  }

  /** Marks the car the next answer goes into. */
  setActive(index: number | null): void {
    this.cars.forEach((cell, i) => cell.classList.toggle('active', i === index));
  }

  /** Lights one car for the chant, or none. */
  setBeat(index: number | null): void {
    this.cars.forEach((cell, i) => {
      const lit = i === index;
      if (lit) {
        // Restarting the bounce lets the same car bounce again on a repeat.
        cell.classList.remove('beat');
        void cell.offsetWidth;
      }
      cell.classList.toggle('beat', lit);
    });
  }

  /** Draws the soft bracket around each range, or clears it. */
  setHint(ranges: readonly Range[]): void {
    this.cars.forEach((cell, i) => {
      const range = ranges.find(({ start, end }) => i >= start && i < end);
      cell.classList.toggle('hinted', range !== undefined);
      cell.classList.toggle('hint-start', range?.start === i);
      cell.classList.toggle('hint-end', range !== undefined && range.end - 1 === i);
    });
  }
}
