import { burst, canSpeak, onLanguageChange, speak, stopSpeaking, store } from '@playroom/kit';
import { byId, centerOf } from './dom.ts';
import { PROGRESS_KEY, readProgress, withLevel, withStar } from './progress.ts';
import type { Progress, ScoredMode } from './progress.ts';
import type { Level } from './rounds.ts';
import { text } from './lang/index.ts';

/** A line is read when it is spoken, so 🔊 repeats it in the language in use. */
export type Line = () => string;

let lastLine: Line | null = null;
let starsShown: number | null = null;

/** Says a line and remembers it for the 🔊 button. */
export function say(line: Line): void {
  lastLine = line;
  if (canSpeak()) speak(line());
}

export function sayAgain(): void {
  if (lastLine) say(lastLine);
}

export function hush(): void {
  lastLine = null;
  stopSpeaking();
}

/** Draws words now and again whenever the language changes, until the signal aborts. */
export function words(signal: AbortSignal, draw: () => void): void {
  draw();
  const stop = onLanguageChange(draw);
  signal.addEventListener('abort', stop, { once: true });
}

export function loadProgress(): Progress {
  return readProgress(store.get<unknown>(PROGRESS_KEY, null));
}

export function saveLevel(mode: ScoredMode, level: Level): void {
  store.set(PROGRESS_KEY, withLevel(loadProgress(), mode, level));
}

export function showStars(count: number | null): void {
  starsShown = count;
  const badge = byId('stars');
  badge.hidden = count === null;
  badge.textContent = `⭐ ${count ?? 0}`;
  badge.setAttribute('aria-label', text().starsLabel(count ?? 0));
}

/** Redraws the star badge's label, for when the language changes. */
export function redrawStars(): void {
  showStars(starsShown);
}

/** Saves a star, bumps the top bar, and bursts from the element that earned it. */
export function awardStar(mode: ScoredMode, from: HTMLElement): void {
  const progress = withStar(loadProgress(), mode);
  store.set(PROGRESS_KEY, progress);
  showStars(progress.stars[mode]);
  const { x, y } = centerOf(from);
  burst(x, y);
}
