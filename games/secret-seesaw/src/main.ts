import '@playroom/kit/kit.css';
import './style.css';
import { canSpeak, getLanguage, homeButton, languageButton, onLanguageChange, say, speak, stopSpeaking, store, useClips } from '@playroom/kit';
import { text } from './lang/index.ts';
import clips from './lang/sl.clips.json';
import { levelById, LEVELS } from './rules/levels.ts';
import { addSkip, addWin, cleanProgress, isOpen, nextLevel, totalStars, type Progress } from './rules/progress.ts';
import { showMap, showWon } from './screens/panels.ts';
import { startPlayScreen, type PlayScreen, type WinReport } from './screens/play.ts';
import { pickSound, stopSounds, winSound } from './sounds.ts';
import { button, element, onPress } from './ui.ts';
import { createScene } from './view/scene.ts';

const PROGRESS_KEY = 'secret-seesaw:progress';
const MISSES_BEFORE_SKIP = 5;
/** The picker sits under the seesaw when there's room for it, and in a pop-up sheet on narrow screens. */
const ROOM_FOR_PICKER = '(min-width: 640px) and (min-height: 600px)';

function byId(id: string): HTMLElement {
  const found = document.getElementById(id);
  if (!found) throw new Error(`Missing #${id} in index.html`);
  return found;
}

useClips(clips);

const bar = byId('topbar');
const overlay = byId('overlay');
const sceneHost = byId('scene');
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

const scene = createScene(sceneHost);
let progress: Progress = cleanProgress(store.get<unknown>(PROGRESS_KEY, null));
let play: PlayScreen | null = null;
let closeOverlay: () => void = () => {};
let redraw: () => void = () => {};
let spokenLast = (): string => text().pickLevel;
let headingFor: (() => string) | null = null;
const misses = new Map<number, number>();

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
  delete document.body.dataset.sheet;
}

function pickLevel(): void {
  clearScreen();
  setScreen('map');
  document.body.dataset.level = '';
  sceneHost.replaceChildren();
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
  misses.delete(level.id);
  setScreen('won');
  document.body.dataset.stars = String(stars);
  winSound();
  const next = nextAfter(level.id);
  const line = text()[`stars${stars}` as 'stars1' | 'stars2' | 'stars3'];
  const draw = (): void => {
    closeOverlay();
    closeOverlay = showWon(overlay, {
      report,
      onNext: next ? () => openLevel(next) : null,
      onAgain: () => openLevel(level.id),
      onMap: pickLevel,
    });
  };
  draw();
  redraw = draw;
  spokenLast = () => line;
  void say(next === null ? text().allDone : line, { queue: true });
}

function openLevel(id: number): void {
  const level = levelById(id);
  if (!level || !isOpen(progress, id)) return;
  clearScreen();
  setScreen('play');
  document.body.dataset.level = String(id);
  document.body.dataset.world = level.world;
  headingFor = () => text().level(id);
  labelPage();
  stopSpeaking();
  play = startPlayScreen({
    level,
    scene,
    dock,
    missesBefore: misses.get(id) ?? 0,
    canSkipAfter: MISSES_BEFORE_SKIP,
    onMiss: (total) => misses.set(id, total),
    onSkip() {
      saveProgress(addSkip(progress, id));
      const next = nextLevel(progress);
      if (next && next !== id) openLevel(next);
      else pickLevel();
    },
    onWin,
  });
  spokenLast = () => play?.spoken() ?? text().pickLevel;
}

onPress(levels, () => {
  pickSound();
  stopSpeaking();
  pickLevel();
});
onPress(restart, () => {
  pickSound();
  play?.restart();
});
onPress(repeat, () => speak(spokenLast()));

onLanguageChange(() => {
  labelPage();
  play?.relabel();
  redraw();
});

function choosePickerPlace(): void {
  document.body.dataset.picker = window.matchMedia(ROOM_FOR_PICKER).matches ? 'inline' : 'sheet';
}
window.matchMedia(ROOM_FOR_PICKER).addEventListener('change', () => {
  choosePickerPlace();
  scene.layout();
});
choosePickerPlace();
new ResizeObserver(() => scene.layout()).observe(sceneHost);

window.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && document.body.dataset.screen !== 'map') pickLevel();
});

labelPage();
pickLevel();
