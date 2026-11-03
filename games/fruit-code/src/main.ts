import '@playroom/kit/kit.css';
import './style.css';
import { canSpeak, getLanguage, homeButton, languageButton, onLanguageChange, say, speak, stopSpeaking, store, useClips } from '@playroom/kit';
import { text } from './lang/index.ts';
import clips from './lang/sl.clips.json';
import { levelFor, LEVELS } from './rules/levels.ts';
import { addMiss, cleanMisses, missesSoFar, settle, type MissLog } from './rules/misses.ts';
import { addSkip, addWin, cleanProgress, isOpen, nextLevel, totalStars, type Progress } from './rules/progress.ts';
import { showFinale, showMap, showWon } from './screens/panels.ts';
import { startPlayScreen, type PlayScreen, type WinReport } from './screens/play.ts';
import { pickSound, stopSounds, winSound } from './sounds.ts';
import { button, element, onPress } from './ui.ts';
import { createBoard } from './view/board.ts';
import { createGuide } from './view/guide.ts';

const PROGRESS_KEY = 'fruit-code:progress';
/** How many goes each level has had, so every retry and replay gets a fresh puzzle, even after a reload. */
const GOES_KEY = 'fruit-code:goes';
/** Misses per level over every try until it is won, so a fresh puzzle after a tumble can't wash them away. */
const MISSES_KEY = 'fruit-code:misses';
const FAILS_BEFORE_SKIP = 5;
/** All 21 numbers fit under the board on a tablet. A phone gets a −/+ stepper, so the board is never covered. */
const ROOM_FOR_GRID = '(min-width: 640px) and (min-height: 600px)';

function byId(id: string): HTMLElement {
  const found = document.getElementById(id);
  if (!found) throw new Error(`Missing #${id} in index.html`);
  return found;
}

useClips(clips);

const bar = byId('topbar');
const overlay = byId('overlay');
const boardHost = byId('board');
const dock = byId('dock');
const heading = element('h1', 'title');
const home = homeButton();
const levels = button('bar-btn');
levels.textContent = '🗺️';
levels.dataset.action = 'levels';
const restart = button('bar-btn');
restart.textContent = '🔄';
restart.dataset.action = 'restart';
const repeat = button('bar-btn');
repeat.textContent = '🔊';
repeat.hidden = !canSpeak();
const language = languageButton(['en', 'sl']);
bar.append(home, heading, language, repeat, restart, levels);

const board = createBoard(boardHost);
const guide = createGuide();
let progress: Progress = cleanProgress(store.get<unknown>(PROGRESS_KEY, null));
let play: PlayScreen | null = null;
let closeOverlay: () => void = () => {};
let redraw: () => void = () => {};
let spokenLast = (): string => text().pickLevel;
let headingFor: (() => string) | null = null;
let missLog: MissLog = cleanMisses(store.get<unknown>(MISSES_KEY, null));

function saveMisses(next: MissLog): void {
  missLog = next;
  store.set(MISSES_KEY, missLog);
}
const fails = new Map<number, number>();

function goesSoFar(): Record<string, number> {
  const saved = store.get<unknown>(GOES_KEY, {});
  return typeof saved === 'object' && saved !== null ? (saved as Record<string, number>) : {};
}

/** Starts the level's next go and returns which one it is. */
function nextGo(id: number): number {
  const goes = goesSoFar();
  const go = Number.isInteger(goes[id]) && goes[id] >= 0 ? goes[id] : 0;
  store.set(GOES_KEY, { ...goes, [id]: go + 1 });
  return go;
}

function labelPage(): void {
  document.documentElement.lang = getLanguage();
  document.title = text().title;
  document.querySelector('meta[name="description"]')?.setAttribute('content', text().description);
  heading.textContent = headingFor ? headingFor() : text().title;
  home.setAttribute('aria-label', text().home);
  levels.setAttribute('aria-label', text().showLevels);
  restart.setAttribute('aria-label', text().restart);
  repeat.setAttribute('aria-label', text().sayAgain);
}

function setScreen(name: string): void {
  document.body.dataset.screen = name;
  levels.hidden = name === 'map';
  restart.hidden = name !== 'play';
}

function saveProgress(next: Progress): void {
  progress = next;
  store.set(PROGRESS_KEY, progress);
}

function clearOverlay(): void {
  closeOverlay();
  closeOverlay = () => {};
  redraw = () => {};
}

function clearScreen(): void {
  clearOverlay();
  stopSounds();
  play?.stop();
  play = null;
  headingFor = null;
  dock.replaceChildren();
}

function pickLevel(): void {
  clearScreen();
  setScreen('map');
  document.body.dataset.level = '';
  boardHost.replaceChildren();
  const draw = (): void => {
    closeOverlay();
    closeOverlay = showMap(overlay, { progress, onLevel: openLevel });
  };
  draw();
  redraw = draw;
  spokenLast = () => text().pickLevel;
  headingFor = () => `★ ${totalStars(progress)}`;
  labelPage();
  void say(text().pickLevel, { queue: true });
}

function nextAfter(id: number): number | null {
  return LEVELS.find((level) => level.id > id && isOpen(progress, level.id))?.id ?? null;
}

function onWin(report: WinReport): void {
  const { level, stars } = report;
  saveProgress(addWin(progress, level.id, stars));
  saveMisses(settle(missLog, level.id));
  fails.delete(level.id);
  setScreen('won');
  document.body.dataset.stars = String(stars);
  winSound();
  // The next open level, or any level still waiting, such as one skipped earlier. None left means the finale.
  const next = nextAfter(level.id) ?? nextLevel(progress);
  const line = text()[`stars${stars}` as 'stars1' | 'stars2' | 'stars3'];
  const draw = (): void => {
    closeOverlay();
    closeOverlay =
      next === null
        ? showFinale(overlay, { totalStars: totalStars(progress), onMap: pickLevel })
        : showWon(overlay, {
            report,
            onNext: () => openLevel(next),
            onAgain: () => openLevel(level.id),
            onMap: pickLevel,
          });
  };
  draw();
  redraw = draw;
  spokenLast = () => (next === null ? text().allDone : line);
  document.body.dataset.finale = String(next === null);
  void say(next === null ? text().allDone : line, { queue: true });
}

function openLevel(id: number): void {
  if (!levelFor(id, 0) || !isOpen(progress, id)) return;
  const level = levelFor(id, nextGo(id));
  if (!level) return;
  clearScreen();
  setScreen('play');
  document.body.dataset.level = String(id);
  document.body.dataset.world = level.world;
  headingFor = () => text().level(id);
  labelPage();
  stopSpeaking();
  play = startPlayScreen({
    level,
    board,
    dock,
    guide,
    missesBefore: missesSoFar(missLog, id),
    failsBefore: fails.get(id) ?? 0,
    canSkipAfter: FAILS_BEFORE_SKIP,
    stepper: () => document.body.dataset.picker === 'stepper',
    onMiss: () => saveMisses(addMiss(missLog, id)),
    onFail: (total) => fails.set(id, total),
    onRetry: () => openLevel(id),
    onSkip() {
      saveProgress(addSkip(progress, id));
      const next = nextLevel(progress);
      if (next && next !== id) openLevel(next);
      else pickLevel();
    },
    onWin,
  });
}

onPress(levels, () => {
  pickSound();
  stopSpeaking();
  pickLevel();
});
// Starting again is a new go, with a fresh puzzle.
onPress(restart, () => {
  pickSound();
  const id = Number(document.body.dataset.level);
  if (id) openLevel(id);
});
onPress(repeat, () => {
  if (play && document.body.dataset.screen === 'play') play.sayAgain();
  else speak(spokenLast());
});

onLanguageChange(() => {
  labelPage();
  play?.relabel();
  redraw();
});

function choosePickerPlace(): void {
  document.body.dataset.picker = window.matchMedia(ROOM_FOR_GRID).matches ? 'grid' : 'stepper';
}
window.matchMedia(ROOM_FOR_GRID).addEventListener('change', () => {
  choosePickerPlace();
  play?.redock();
});
choosePickerPlace();
new ResizeObserver(() => board.layout()).observe(boardHost);

window.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && document.body.dataset.screen !== 'map') pickLevel();
});

labelPage();
pickLevel();
