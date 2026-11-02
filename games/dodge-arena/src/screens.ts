import { burst } from '@playroom/kit';
import { formatTime } from './clock.ts';
import type { Kind } from './dangers.ts';
import { text } from './lang/index.ts';
import { isOpen, nextStage, totalStars, type Progress } from './progress.ts';
import { STAGES } from './stages.ts';
import { button, element } from './ui.ts';

export const KIND_ART: Record<Kind, string> = { meteor: '☄️', boulder: '🪨', beam: '🔦', ring: '💫', bar: '🌀', slime: '🟢' };
/** Long enough for a held finger or a mashing hand to stop, and still well under a second to the next try. */
const RETRY_AFTER_MS = 350;

/**
 * Keeps the result buttons from answering until a mashing hand has stopped. A single tap in that moment
 * isn't lost: it counts as soon as the wait ends. Two or more taps in the wait are a mash, and count for nothing.
 */
function holdButtons(panel: HTMLElement, buttons: readonly HTMLButtonElement[], whenOpen: () => void): { open: () => boolean; stop: () => void } {
  let waiting = true;
  let taps = 0;
  let early: HTMLButtonElement | null = null;
  panel.dataset.waiting = 'true';
  const watch = (event: PointerEvent): void => {
    taps += 1;
    const pressed = event.target instanceof Element ? event.target.closest('button') : null;
    early = taps === 1 && pressed && buttons.includes(pressed) ? pressed : null;
  };
  document.addEventListener('pointerdown', watch, true);
  const stopWatching = (): void => document.removeEventListener('pointerdown', watch, true);
  const timer = setTimeout(() => {
    waiting = false;
    delete panel.dataset.waiting;
    stopWatching();
    whenOpen();
    if (early && taps === 1) early.click();
  }, RETRY_AFTER_MS);
  return {
    open: () => !waiting,
    stop() {
      clearTimeout(timer);
      stopWatching();
    },
  };
}
const STAR_GAP_MS = 260;

export interface HomeOptions {
  progress: Progress;
  onEndless: () => void;
  onChallenge: () => void;
}

export function showHome(host: HTMLElement, { progress, onEndless, onChallenge }: HomeOptions): () => void {
  const panel = element('div', 'home');
  const logo = element('h2', 'logo');
  logo.textContent = text().title;
  const row = element('div', 'home-row');
  const play = button('big-btn big-go');
  play.dataset.mode = 'endless';
  const playArt = element('span', 'big-art');
  playArt.textContent = '▶';
  const playName = element('span', 'big-name');
  playName.textContent = text().endless;
  const playBest = element('span', 'big-note');
  playBest.textContent = progress.best ? `🏆 ${formatTime(progress.best)}` : '🏆 –';
  play.append(playArt, playName, playBest);
  play.addEventListener('click', onEndless);
  const challenge = button('big-btn big-stages');
  challenge.dataset.mode = 'challenge';
  const challengeArt = element('span', 'big-art');
  challengeArt.textContent = '🎯';
  const challengeName = element('span', 'big-name');
  challengeName.textContent = text().challenge;
  const challengeStars = element('span', 'big-note');
  challengeStars.textContent = `★ ${totalStars(progress)} / ${STAGES.length * 3}`;
  challenge.append(challengeArt, challengeName, challengeStars);
  challenge.addEventListener('click', onChallenge);
  row.append(play, challenge);
  panel.append(logo, row);
  host.append(panel);
  return () => panel.remove();
}

export function showStages(host: HTMLElement, progress: Progress, onStage: (id: number) => void): () => void {
  const panel = element('div', 'stages');
  const heading = element('h2', 'stages-title');
  heading.textContent = text().stagesLabel;
  const grid = element('div', 'stage-grid');
  const next = nextStage(progress);
  for (const stage of STAGES) {
    const open = isOpen(progress, stage.id);
    const tile = button(`stage-tile${stage.id === next ? ' stage-next' : ''}`);
    tile.dataset.stage = String(stage.id);
    tile.dataset.open = String(open);
    tile.disabled = !open;
    tile.setAttribute('aria-label', open ? `${text().stage(stage.id)}. ${text().surviveFor(stage.goal)}` : text().locked);
    const number = element('span', 'stage-number');
    number.textContent = String(stage.id);
    const art = element('span', 'stage-art');
    art.textContent = open ? stage.kinds.slice(0, 3).map((kind) => KIND_ART[kind]).join('') : '🔒';
    const stars = progress.stars[stage.id - 1] ?? 0;
    const row = element('span', 'stage-stars');
    row.textContent = '★'.repeat(stars) + '☆'.repeat(3 - stars);
    tile.append(number, art, row);
    tile.addEventListener('click', () => onStage(stage.id));
    grid.append(tile);
  }
  panel.append(heading, grid);
  host.append(panel);
  return () => panel.remove();
}

export interface ResultOptions {
  /** The number to show big, in seconds. */
  seconds: number;
  /** Lost endless runs and stages show the time, won stages show stars too. */
  stars: number | null;
  best: number | null;
  isBest: boolean;
  heading: string;
  /** What the time is measured against, for a stage. */
  goal: number | null;
  canNext: boolean;
  canSkip: boolean;
  onRetry: () => void;
  onNext: () => void;
  onSkip: () => void;
  calm: boolean;
}

function starsRow(count: number, calm: boolean): HTMLElement {
  const row = element('div', 'result-stars');
  for (let at = 0; at < 3; at += 1) {
    const star = element('span', at < count ? 'result-star result-star-on' : 'result-star');
    star.textContent = '★';
    if (!calm) star.style.animationDelay = `${at * STAR_GAP_MS}ms`;
    row.append(star);
  }
  return row;
}

export function showResult(host: HTMLElement, options: ResultOptions): () => void {
  const panel = element('div', 'result');
  panel.dataset.result = options.stars === null ? 'time' : 'stage';
  const heading = element('h2', 'result-heading');
  heading.textContent = options.heading;
  const time = element('div', 'result-time');
  time.textContent = formatTime(options.seconds);
  const unit = element('span', 'result-unit');
  unit.textContent = ` ${text().seconds}`;
  if (options.seconds < 60) time.append(unit);
  panel.append(heading, time);
  if (options.goal !== null) {
    const goal = element('div', 'result-note');
    goal.textContent = text().surviveFor(options.goal);
    panel.append(goal);
  }
  if (options.stars !== null) panel.append(starsRow(options.stars, options.calm));
  if (options.best !== null) {
    const best = element('div', options.isBest ? 'result-note result-best' : 'result-note');
    best.textContent = `🏆 ${text().best}: ${formatTime(options.best)}`;
    panel.append(best);
  }
  const row = element('div', 'result-row');
  const retry = button('big-btn big-go result-retry');
  retry.dataset.action = 'retry';
  retry.textContent = `↻ ${text().retry}`;
  const actions = new Map<HTMLButtonElement, () => void>([[retry, options.onRetry]]);
  const main = options.canNext ? button('big-btn big-stages') : null;
  if (main) {
    main.dataset.action = 'next';
    main.textContent = `▶ ${text().next}`;
    actions.set(main, options.onNext);
    row.append(main);
  }
  row.append(retry);
  panel.append(row);
  if (options.canSkip) {
    const skip = button('small-btn');
    skip.dataset.action = 'skip';
    skip.textContent = `⏭ ${text().skip}`;
    actions.set(skip, options.onSkip);
    panel.append(skip);
  }
  host.append(panel);
  const held = holdButtons(panel, [...actions.keys()], () => (main ?? retry).focus({ preventScroll: true }));
  for (const [item, act] of actions) {
    item.addEventListener('click', () => {
      if (held.open()) act();
    });
  }
  if (options.isBest || options.stars === 3) {
    const box = panel.getBoundingClientRect();
    burst(box.left + box.width / 2, box.top + box.height / 3, options.calm ? 8 : 26);
  }
  return () => {
    held.stop();
    panel.remove();
  };
}
