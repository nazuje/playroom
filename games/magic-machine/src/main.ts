import '@playroom/kit/kit.css';
import './style.css';
import { canSpeak, getLanguage, homeButton, languageButton, onLanguageChange, say, speak, stopSpeaking, store, useClips } from '@playroom/kit';
import { text } from './lang/index.ts';
import clips from './lang/sl.clips.json';
import { levelFor, LEVELS } from './rules/levels.ts';
import { addSkip, addWin, cleanMisses, cleanProgress, isOpen, nextLevel, totalStars, withMisses, type Progress } from './rules/progress.ts';
import { showFinale, showMap, showWon } from './screens/panels.ts';
import { startPlayScreen, type PlayScreen, type WinReport } from './screens/play.ts';
import { pickSound, stopSounds, winSound } from './sounds.ts';
import { button, element, onPress } from './ui.ts';
import { createBoard } from './view/board.ts';
import { createGuide } from './view/guide.ts';

const PROGRESS_KEY = 'magic-machine:progress';
/** How many goes each level has had, so every retry and replay gets a fresh puzzle, even after a reload. */
const GOES_KEY = 'magic-machine:goes';
const FAILS_BEFORE_SKIP = 5;
/**
 * All 21 numbers fit under the machine on a tablet, in two rows when it lies flat and three when it stands up. A
 * phone gets a −/+ stepper, so the machine is never covered.
 */
const ROOM_FOR_GRID = '(min-width: 820px) and (min-height: 600px), (min-width: 700px) and (min-height: 900px)';

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
/** The heading, and a shorter one for a narrow phone. */
let headingFor: (() => [string, string]) | null = null;
/** Misses on each level since it was last won, kept across tries and reloads, so starting again never buys stars. */
const MISSES_KEY = 'magic-machine:misses';
const missesNow = (): Record<number, number> => cleanMisses(store.get<unknown>(MISSES_KEY, {}));
const setMisses = (id: number, total: number): void => store.set(MISSES_KEY, withMisses(missesNow(), id, total));
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
  const [long, short] = headingFor ? headingFor() : [text().title, text().title];
  const full = element('span', 'title-long');
  full.textContent = long;
  const brief = element('span', 'title-short');
  brief.textContent = short;
  heading.replaceChildren(full, brief);
  home.setAttribute('aria-label', text().home);
  levels.setAttribute('aria-label', text().showLevels);
  restart.setAttribute('aria-label', text().restart);
  repeat.setAttribute('aria-label', text().sayAgain);
}

function setScreen(name: string): void {
  document.body.dataset.screen = name;
  delete document.body.dataset.finale;
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
  headingFor = () => [`★ ${totalStars(progress)}`, `★ ${totalStars(progress)}`];
  labelPage();
  void say(text().pickLevel, { queue: true });
}

function nextAfter(id: number): number | null {
  return LEVELS.find((level) => level.id > id && isOpen(progress, level.id))?.id ?? null;
}

function onWin(report: WinReport): void {
  const { level, stars } = report;
  saveProgress(addWin(progress, level.id, stars));
  setMisses(level.id, 0);
  fails.delete(level.id);
  setScreen('won');
  document.body.dataset.stars = String(stars);
  winSound();
  const next = nextAfter(level.id);
  const line = text()[`stars${stars}` as 'stars1' | 'stars2' | 'stars3'];
  // The last level gets the end of the game: confetti, a cheer and one big button.
  const finale = level.id === LEVELS[LEVELS.length - 1].id;
  if (finale) document.body.dataset.finale = 'true';
  const draw = (): void => {
    closeOverlay();
    closeOverlay = finale
      ? showFinale(overlay, { report, totalStars: totalStars(progress), onMap: pickLevel })
      : showWon(overlay, {
          report,
          onNext: next ? () => openLevel(next) : null,
          onAgain: () => openLevel(level.id),
          onMap: pickLevel,
        });
  };
  draw();
  redraw = draw;
  spokenLast = () => (finale ? text().allDone : line);
  void say(finale ? text().allDone : line, { queue: true });
}

function openLevel(id: number): void {
  if (!levelFor(id, 0) || !isOpen(progress, id)) return;
  const level = levelFor(id, nextGo(id));
  if (!level) return;
  clearScreen();
  setScreen('play');
  document.body.dataset.level = String(id);
  document.body.dataset.world = level.world;
  headingFor = () => [text().level(id), `⚙️ ${id}`];
  labelPage();
  stopSpeaking();
  play = startPlayScreen({
    level,
    board,
    dock,
    guide,
    missesBefore: missesNow()[id] ?? 0,
    failsBefore: fails.get(id) ?? 0,
    canSkipAfter: FAILS_BEFORE_SKIP,
    stepper: () => document.body.dataset.picker === 'stepper',
    onMiss: (total) => setMisses(id, total),
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
