import { burst } from '@playroom/kit';
import { text } from '../lang/index.ts';
import { LEVELS, WORLDS, type Level, type WorldId } from '../rules/levels.ts';
import { COLORS } from '../rules/cells.ts';
import { PAINT } from '../view/pieces.ts';
import { isDone, isOpen, nextLevel, type Progress } from '../rules/progress.ts';
import { pickSound } from '../sounds.ts';
import { button, calm, element, onPress } from '../ui.ts';
import type { WinReport } from './play.ts';

const WORLD_ART: Record<WorldId, string> = { match: '🟥', pair: '🎨', grow: '🪜', once: '🔀', tricky: '🧠' };
/** Long enough for a mashing hand to stop before the next level can start. */
const NEXT_AFTER_MS = 600;
/**
 * The small buttons in the card's top corners wait longer, so a hand still mashing after the big button wakes up
 * lands on "next level", never on the map or a replay.
 */
const SMALL_AFTER_MS = 1600;
const TILES_AFTER_MS = 450;
let shownAt = 0;

/** A big button that ignores taps until a mashing hand has had time to lift. */
function armedButton(className: string, label: string, onChoose: () => void, wait = NEXT_AFTER_MS): HTMLButtonElement {
  const made = button(className);
  made.textContent = label;
  let armed = false;
  window.setTimeout(() => {
    armed = true;
    made.classList.add('armed');
  }, wait);
  onPress(made, () => {
    if (!armed) return;
    pickSound();
    onChoose();
  });
  return made;
}

export interface MapOptions {
  progress: Progress;
  onLevel: (id: number) => void;
}

function levelTile(level: Level, { progress, onLevel }: MapOptions, next: number | null): HTMLButtonElement {
  const open = isOpen(progress, level.id);
  const tile = button(level.id === next ? 'tile tile-next' : 'tile');
  tile.dataset.level = String(level.id);
  tile.dataset.open = String(open);
  tile.dataset.done = String(isDone(progress, level.id));
  tile.setAttribute('aria-label', open ? text().level(level.id) : text().locked(level.id));
  const number = element('span', 'tile-number');
  number.textContent = open ? String(level.id) : '🔒';
  const stars = element('span', 'tile-stars');
  const earned = progress.stars[level.id] ?? 0;
  stars.textContent = open ? '★'.repeat(earned) + '☆'.repeat(3 - earned) : '';
  tile.append(number, stars);
  // The tap that opened the map ends in a click, which must not land on a tile and start a level, however late it
  // comes. So a tile only counts a click whose press began on it, or one from a keyboard.
  let pressed = false;
  tile.addEventListener('pointerdown', () => {
    pressed = performance.now() - shownAt >= TILES_AFTER_MS;
  });
  tile.addEventListener('click', (event) => {
    if (!open || (event.detail !== 0 && !pressed)) return;
    pressed = false;
    pickSound();
    onLevel(level.id);
  });
  if (!open) tile.classList.add('tile-shut');
  return tile;
}

function worldBlock(world: WorldId, options: MapOptions, next: number | null): HTMLElement {
  const block = element('section', 'world');
  const heading = element('h2', 'world-name');
  heading.textContent = `${WORLD_ART[world]} ${text().worlds[world]}`;
  const grid = element('div', 'world-grid');
  grid.append(...LEVELS.filter((level) => level.world === world).map((level) => levelTile(level, options, next)));
  block.append(heading, grid);
  return block;
}

/** Every world on one scrolling sheet. */
export function showMap(host: HTMLElement, options: MapOptions): () => void {
  shownAt = performance.now();
  const panel = element('div', 'map');
  const sheet = element('div', 'map-sheet');
  const next = nextLevel(options.progress);
  sheet.append(...WORLDS.map((world) => worldBlock(world, options, next)));
  panel.append(sheet);
  host.append(panel);
  window.setTimeout(() => panel.classList.add('armed'), TILES_AFTER_MS);
  sheet.querySelector('.tile-next')?.scrollIntoView({ block: 'center' });
  return () => panel.remove();
}

export interface WonOptions {
  report: WinReport;
  onNext: (() => void) | null;
  onAgain: () => void;
  onMap: () => void;
}

export function showWon(host: HTMLElement, { report, onNext, onAgain, onMap }: WonOptions): () => void {
  const panel = element('div', 'card');
  panel.dataset.stars = String(report.stars);
  const stars = element('div', 'card-stars');
  for (let star = 1; star <= 3; star += 1) {
    const mark = element('span', star <= report.stars ? 'star star-on' : 'star');
    mark.textContent = '★';
    mark.style.setProperty('--delay', `${star * 0.16}s`);
    stars.append(mark);
  }
  const line = element('p', 'card-line');
  line.textContent = text()[`stars${report.stars}` as 'stars1' | 'stars2' | 'stars3'];
  const small = element('p', 'card-small');
  small.textContent = text().misses(report.misses);
  // Replay and the map sit small in the top corners, away from the big "next level" button a mashing hand finds.
  const row = element('div', 'card-row card-corners');
  const again = armedButton('card-btn card-small-btn', '🔄', onAgain, SMALL_AFTER_MS);
  again.setAttribute('aria-label', text().again);
  again.dataset.action = 'again';
  const map = armedButton('card-btn card-small-btn', '🗺️', onMap, SMALL_AFTER_MS);
  map.setAttribute('aria-label', text().levels);
  map.dataset.action = 'map';
  row.append(again, map);
  // Three stars already says "no mistakes", so the count only shows when there were some.
  panel.append(row, stars, line);
  if (report.misses > 0) panel.append(small);
  if (onNext) {
    const next = armedButton('card-btn card-main card-next', `${text().next} ▶`, onNext);
    next.dataset.action = 'next';
    panel.append(next);
  }
  host.append(panel);
  if (!calm()) {
    const box = stars.getBoundingClientRect();
    burst(box.left + box.width / 2, box.top + box.height / 2, 26);
  }
  return () => panel.remove();
}

export interface FinaleOptions {
  report: WinReport;
  totalStars: number;
  onMap: () => void;
}

/** Fireworks of confetti from several spots, a few times over, for finishing the whole staircase. */
function confetti(): void {
  if (calm()) return;
  const spots = [
    [0.2, 0.25],
    [0.8, 0.3],
    [0.5, 0.15],
    [0.3, 0.7],
    [0.7, 0.65],
  ];
  spots.forEach(([x, y], at) => {
    window.setTimeout(() => burst(window.innerWidth * x, window.innerHeight * y, 30), at * 280);
  });
}

/** The end of the game: a little quilt that lights up patch by patch, every star so far, and one button to the map. */
export function showFinale(host: HTMLElement, { report, totalStars, onMap }: FinaleOptions): () => void {
  const panel = element('div', 'card card-finale');
  panel.dataset.stars = String(report.stars);
  const trophy = element('div', 'finale-quilt');
  for (let at = 0; at < 9; at += 1) {
    const square = element('span', 'finale-patch');
    square.style.setProperty('--paint', PAINT[COLORS[(at * 4) % COLORS.length]]);
    square.style.setProperty('--delay', `${at * 0.12}s`);
    trophy.append(square);
  }
  const cup = element('span', 'finale-cup');
  cup.textContent = '🏆';
  trophy.append(cup);
  const line = element('p', 'card-line');
  line.textContent = text().allDone;
  const total = element('p', 'finale-total');
  total.textContent = `★ ${totalStars}`;
  const map = armedButton('card-btn card-main', '🗺️', onMap);
  map.setAttribute('aria-label', text().levels);
  map.dataset.action = 'map';
  panel.append(trophy, line, total, map);
  host.append(panel);
  confetti();
  return () => panel.remove();
}
