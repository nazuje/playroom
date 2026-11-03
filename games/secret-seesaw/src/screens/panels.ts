import { burst } from '@playroom/kit';
import { text } from '../lang/index.ts';
import { LEVELS, WORLDS, type Level, type WorldId } from '../rules/levels.ts';
import { isDone, isOpen, nextLevel, type Progress } from '../rules/progress.ts';
import { pickSound } from '../sounds.ts';
import { button, calm, element } from '../ui.ts';
import type { TryReport } from './play.ts';

const WORLD_ART: Record<WorldId, string> = { box: '🎁', level: '⚖️', boxes: '📦', both: '↔️', two: '🎩' };
/** Long enough for a mashing hand to stop before the next level can start. */
const NEXT_AFTER_MS = 800;
/** The last card has one button, held back long enough that a mashing hand can't skip the party. */
const FINALE_AFTER_MS = 600;
const FINALE_BURSTS = 6;
const FINALE_BURST_GAP_MS = 220;
/** A retry comes back within a second, but not under a hand that is still mashing. */
const RETRY_AFTER_MS = 350;

/** A big button that ignores taps until a mashing hand has had time to lift. */
function armedButton(className: string, label: string, onPress: () => void, afterMs = NEXT_AFTER_MS): HTMLButtonElement {
  const made = button(className);
  made.textContent = label;
  let armed = false;
  window.setTimeout(() => {
    armed = true;
    made.classList.add('armed');
  }, afterMs);
  made.addEventListener('click', () => {
    if (!armed) return;
    pickSound();
    onPress();
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
  tile.addEventListener('click', () => {
    if (!open) return;
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
  const panel = element('div', 'map');
  const sheet = element('div', 'map-sheet');
  const next = nextLevel(options.progress);
  sheet.append(...WORLDS.map((world) => worldBlock(world, options, next)));
  panel.append(sheet);
  host.append(panel);
  sheet.querySelector('.tile-next')?.scrollIntoView({ block: 'center' });
  return () => panel.remove();
}

export interface WonOptions {
  report: TryReport;
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
  const row = element('div', 'card-row');
  const again = armedButton('card-btn card-small-btn', '🔄', onAgain);
  again.setAttribute('aria-label', text().again);
  again.dataset.action = 'again';
  const map = armedButton('card-btn card-small-btn', '🗺️', onMap);
  map.setAttribute('aria-label', text().levels);
  map.dataset.action = 'map';
  row.append(again, map);
  // Three stars already says "no mistakes", so the count only shows when there were some.
  panel.append(stars, line);
  if (report.misses > 0) panel.append(small);
  if (onNext) {
    const next = armedButton('card-btn card-main', `${text().next} ▶`, onNext);
    next.dataset.action = 'next';
    panel.append(next);
  }
  panel.append(row);
  host.append(panel);
  if (!calm()) {
    const box = stars.getBoundingClientRect();
    burst(box.left + box.width / 2, box.top + box.height / 2, 26);
  }
  return () => panel.remove();
}

export interface LostOptions {
  canSkip: boolean;
  onRetry: () => void;
  onSkip: () => void;
  onMap: () => void;
}

/** After a tumble: one big button for a fresh try, and a small skip once a level has beaten a child 5 times. */
export function showLost(host: HTMLElement, { canSkip, onRetry, onSkip, onMap }: LostOptions): () => void {
  const panel = element('div', 'card card-lost');
  const face = element('div', 'card-face');
  face.textContent = '🙃';
  const again = armedButton('card-btn card-main', `🔄 ${text().tryAgain}`, onRetry, RETRY_AFTER_MS);
  again.dataset.action = 'try-again';
  const row = element('div', 'card-row');
  const map = armedButton('card-btn card-small-btn', '🗺️', onMap, RETRY_AFTER_MS);
  map.setAttribute('aria-label', text().levels);
  map.dataset.action = 'map';
  row.append(map);
  if (canSkip) {
    const skip = armedButton('card-btn card-skip', `${text().skip} ⏭️`, onSkip, RETRY_AFTER_MS);
    skip.dataset.action = 'skip';
    row.append(skip);
  }
  panel.append(face, again, row);
  host.append(panel);
  return () => panel.remove();
}

export interface FinaleOptions {
  stars: number;
  onMap: () => void;
}

/** Level 24 is won: a trophy, confetti from all over, and one big button back to the levels. */
export function showFinale(host: HTMLElement, { stars, onMap }: FinaleOptions): () => void {
  const panel = element('div', 'card card-finale');
  const trophy = element('div', 'card-trophy');
  trophy.textContent = '🏆';
  const line = element('p', 'card-line');
  line.textContent = text().allDone;
  const score = element('p', 'card-score');
  score.textContent = `★ ${stars}`;
  const map = armedButton('card-btn card-main', `🗺️ ${text().levels}`, onMap, FINALE_AFTER_MS);
  map.dataset.action = 'map';
  map.dataset.finale = 'true';
  panel.append(trophy, line, score, map);
  host.append(panel);
  const timers: number[] = [];
  if (!calm()) {
    for (let at = 0; at < FINALE_BURSTS; at += 1) {
      timers.push(
        window.setTimeout(() => {
          const x = window.innerWidth * (0.15 + ((at * 0.37) % 0.7));
          const y = window.innerHeight * (0.2 + ((at * 0.29) % 0.5));
          burst(x, y, 30);
        }, at * FINALE_BURST_GAP_MS),
      );
    }
  }
  return () => {
    for (const timer of timers) window.clearTimeout(timer);
    panel.remove();
  };
}
