import '@playroom/kit/kit.css';
import './style.css';
import { canSpeak, getLanguage, homeButton, languageButton, onLanguageChange, say, speak, stopSpeaking, store, useClips } from '@playroom/kit';
import { text } from './lang/index.ts';
import clips from './lang/sl.clips.json';
import { levelById, LEVELS, setFor } from './rules/levels.ts';
import { addMiss, cleanMisses, missesSoFar, settle, type MissLog } from './rules/misses.ts';
import { lifeEarned, lifeOf } from './rules/life.ts';
import { addSkip, addWin, cleanProgress, isDone, isOpen, totalStars, type Progress } from './rules/progress.ts';
import { showFinale, showMap, showWon } from './screens/panels.ts';
import { startPlayScreen, type PlayScreen, type WinReport } from './screens/play.ts';
import { friendSound, pickSound, stopSounds, winSound } from './sounds.ts';
import { button, element, onPress } from './ui.ts';
import { createGuide } from './view/guide.ts';
import { createPond } from './view/pond.ts';

const PROGRESS_KEY = 'odd-one-out:progress';
/** How many tries each level has had, so every retry and replay gets a fresh set of puzzles, even after a reload. */
const GOES_KEY = 'odd-one-out:goes';
/** Misses per level over every try until it is won, so a fresh set after a lost try can't wash them away. */
const MISSES_KEY = 'odd-one-out:misses';
const FAILS_BEFORE_SKIP = 5;

function byId(id: string): HTMLElement {
  const found = document.getElementById(id);
  if (!found) throw new Error(`Missing #${id} in index.html`);
  return found;
}

useClips(clips);

const bar = byId('topbar');
const overlay = byId('overlay');
const pondHost = byId('pond');
/** The skip button's corner of the near bank. */
const dock = byId('dock-end');
/** The near bank, where every pond friend earned so far sits. */
const bank = byId('bank');
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
repeat.dataset.action = 'repeat';
repeat.hidden = !canSpeak();
const language = languageButton(['en', 'sl']);
bar.append(home, heading, language, repeat, restart, levels);

const pond = createPond(pondHost);
const guide = createGuide();
let progress: Progress = cleanProgress(store.get<unknown>(PROGRESS_KEY, null));
let play: PlayScreen | null = null;
let closeOverlay: () => void = () => {};
let redraw: () => void = () => {};
let spokenLast = (): string => text().pickLevel;
/** The heading, and a shorter one for a narrow phone. */
let headingFor: (() => [string, string]) | null = null;
let missLog: MissLog = cleanMisses(store.get<unknown>(MISSES_KEY, null));
const fails = new Map<number, number>();

function saveMisses(next: MissLog): void {
  missLog = next;
  store.set(MISSES_KEY, missLog);
}

function goesSoFar(): Record<string, number> {
  const saved = store.get<unknown>(GOES_KEY, {});
  return typeof saved === 'object' && saved !== null ? (saved as Record<string, number>) : {};
}

/** Starts the level's next try and returns which one it is. */
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
  drawBank();
}

/** The pond friends on the near bank, the newest first. */
function drawBank(): void {
  bank.replaceChildren(
    ...lifeEarned(progress)
      .reverse()
      .map((glyph) => {
        const friend = element('span', 'bank-friend');
        friend.textContent = glyph;
        return friend;
      }),
  );
  bank.setAttribute('aria-label', text().life);
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
  const draw = (): void => {
    closeOverlay();
    closeOverlay = showMap(overlay, { progress, life: lifeEarned(progress), onLevel: openLevel });
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
  const { puzzle, stars } = report;
  const id = puzzle.id;
  // The first win of a level brings a new pond friend, which the card shows.
  const newFriend = isDone(progress, id) ? null : lifeOf(id);
  saveProgress(addWin(progress, id, stars));
  saveMisses(settle(missLog, id));
  fails.delete(id);
  // Nothing in the dock, skip button included, stays live under the card.
  dock.replaceChildren();
  setScreen('won');
  document.body.dataset.stars = String(stars);
  winSound();
  if (newFriend) window.setTimeout(friendSound, 900);
  const next = nextAfter(id);
  const line = text()[`stars${stars}` as 'stars1' | 'stars2' | 'stars3'];
  // The last level gets the end of the game: confetti, a cheer and one big button.
  const finale = id === LEVELS[LEVELS.length - 1].id;
  if (finale) document.body.dataset.finale = 'true';
  const draw = (): void => {
    closeOverlay();
    closeOverlay = finale
      ? showFinale(overlay, { report, totalStars: totalStars(progress), life: lifeEarned(progress), onMap: pickLevel })
      : showWon(overlay, {
          report,
          newFriend,
          onNext: next ? () => openLevel(next) : null,
          onAgain: () => openLevel(id),
          onMap: pickLevel,
        });
  };
  draw();
  redraw = draw;
  spokenLast = () => (finale ? text().allDone : line);
  void say(finale ? text().allDone : line, { queue: true });
}

function openLevel(id: number): void {
  const level = levelById(id);
  if (!level || !isOpen(progress, id)) return;
  const puzzles = setFor(id, nextGo(id));
  clearScreen();
  setScreen('play');
  document.body.dataset.level = String(id);
  document.body.dataset.world = level.world;
  document.body.dataset.big = String(level.big);
  headingFor = () => [text().level(id), `🦄 ${id}`];
  labelPage();
  stopSpeaking();
  const firstOfWorld = LEVELS.find((one) => one.world === level.world)?.id === id;
  play = startPlayScreen({
    puzzles,
    pond,
    float: pondHost,
    dock,
    guide,
    sayIdea: firstOfWorld,
    missesBefore: missesSoFar(missLog, id),
    failsBefore: fails.get(id) ?? 0,
    canSkipAfter: FAILS_BEFORE_SKIP,
    onMiss: () => saveMisses(addMiss(missLog, id)),
    onFail: (total) => fails.set(id, total),
    onRetry: () => openLevel(id),
    // Skipping always moves on to the next level in order, or back to the map after the last one.
    onSkip() {
      saveProgress(addSkip(progress, id));
      if (levelById(id + 1)) openLevel(id + 1);
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
// Starting again is a new try, with fresh puzzles.
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
  drawBank();
  play?.relabel();
  redraw();
});

window.addEventListener('resize', () => pond.layout());

window.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && document.body.dataset.screen !== 'map') pickLevel();
});

labelPage();
drawBank();
pickLevel();
