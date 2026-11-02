import '@playroom/kit/kit.css';
import './style.css';
import { canSpeak, getLanguage, homeButton, languageButton, onLanguageChange, say, speak, stopSpeaking, store, useClips } from '@playroom/kit';
import { createStage, type Stage } from '@playroom/stage3d';
import { text } from './lang/index.ts';
import clips from './lang/sl.clips.json';
import { boardFor, levelById, MAIN_LEVELS, type Level, type WorldId } from './rules/levels.ts';
import { startPlay } from './rules/play.ts';
import { addFound, addSkip, addWin, cleanProgress, isOpen, nextLevel, totalStars, type Progress } from './rules/progress.ts';
import { showLost, showMap, showWon } from './screens/panels.ts';
import { startPlayScreen, type PlayScreen, type WinReport } from './screens/play.ts';
import { pickSound, stopSounds } from './sounds.ts';
import { button, element, onPress } from './ui.ts';
import { createView, type Rect, type View } from './view/view.ts';

const PROGRESS_KEY = 'beam-bender:progress';
const WORLDS_SEEN_KEY = 'beam-bender:worlds-seen';
const LOSSES_BEFORE_SKIP = 5;
const CAMERA = { fov: 12, near: 1, far: 120 };
/** The overlay's padding under the fizzle card plus a little air above it. */
const CARD_GAP_PX = 24;

function byId(id: string): HTMLElement {
  const found = document.getElementById(id);
  if (!found) throw new Error(`Missing #${id} in index.html`);
  return found;
}

useClips(clips);

const bar = byId('topbar');
const overlay = byId('overlay');
const stageHost = byId('stage');
const heading = element('h1', 'title');
const home = homeButton();
const levels = button('bar-btn');
levels.textContent = '🗺️';
levels.dataset.action = 'levels';
const repeat = button('bar-btn');
repeat.textContent = '🔊';
repeat.hidden = !canSpeak();
const language = languageButton(['en', 'sl']);
bar.append(home, heading, language, repeat, levels);

let headingFor: (() => string) | null = null;

function labelPage(): void {
  document.documentElement.lang = getLanguage();
  document.title = text().title;
  document.querySelector('meta[name="description"]')?.setAttribute('content', text().description);
  heading.textContent = headingFor ? headingFor() : text().title;
  home.setAttribute('aria-label', text().home);
  levels.setAttribute('aria-label', text().showLevels);
  repeat.setAttribute('aria-label', text().sayAgain);
}

function showNo3d(): void {
  const note = element('p', 'no-3d');
  note.textContent = text().no3d;
  overlay.replaceChildren(note);
  repeat.hidden = true;
  levels.hidden = true;
  document.body.dataset.screen = 'no-3d';
}

function safeRect(): Rect {
  const box = byId('safe').getBoundingClientRect();
  return { left: box.left, top: box.top, right: box.right, bottom: box.bottom };
}

function runGame(view: View): void {
  let progress: Progress = cleanProgress(store.get<unknown>(PROGRESS_KEY, null));
  let seen = new Set(store.get<string[]>(WORLDS_SEEN_KEY, []));
  let play: PlayScreen | null = null;
  let closeOverlay: () => void = () => {};
  let redraw: () => void = () => {};
  let spokenLast = (): string => text().pickLevel;
  const losses = new Map<number, number>();
  const hintsSpent = new Map<number, number>();

  function setScreen(name: string): void {
    document.body.dataset.screen = name;
    levels.hidden = name === 'map';
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
    delete document.body.dataset.disco;
  }

  function showBackdrop(): void {
    const level = levelById(nextLevel(progress) ?? MAIN_LEVELS.length) as Level;
    const board = boardFor(level);
    view.showLevel(board, startPlay(board, level));
    view.frameBoard(safeRect());
  }

  function pickLevel(): void {
    clearScreen();
    setScreen('map');
    document.body.dataset.level = '';
    showBackdrop();
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

  function firstSight(world: WorldId): boolean {
    if (seen.has(world)) return false;
    seen = new Set([...seen, world]);
    store.set(WORLDS_SEEN_KEY, [...seen]);
    return true;
  }

  function onSecret(level: Level): void {
    if (level.unlocks === undefined) return;
    saveProgress(addFound(progress, level.unlocks));
  }

  function nextAfter(id: number): number | null {
    const next = MAIN_LEVELS.find((level) => level.id > id && isOpen(progress, level.id));
    return next?.id ?? null;
  }

  function onScore({ level, stars }: WinReport): void {
    saveProgress(addWin(progress, level.id, stars));
    hintsSpent.delete(level.id);
    losses.delete(level.id);
  }

  function onWin(report: WinReport): void {
    const { level, stars } = report;
    setScreen('won');
    document.body.dataset.stars = String(stars);
    const next = nextAfter(level.id);
    const bonus = level.unlocks !== undefined && progress.found.includes(level.unlocks) && !progress.stars[level.unlocks] ? level.unlocks : null;
    const line = text()[`stars${stars}` as 'stars1' | 'stars2' | 'stars3'];
    const draw = (): void => {
      closeOverlay();
      closeOverlay = showWon(overlay, {
        report,
        bonus,
        onNext: next ? () => openLevel(next) : null,
        onBonus: bonus ? () => openLevel(bonus) : null,
        onAgain: () => openLevel(level.id),
        onMap: pickLevel,
      });
      overlay.querySelector<HTMLElement>('[data-action="next"]')?.focus({ preventScroll: true });
    };
    draw();
    redraw = draw;
    spokenLast = () => line;
    speak(bonus ? text().bonusOpen : next === null && level.world !== 'bonus' ? text().allDone : line);
  }

  function retryNow(): void {
    clearOverlay();
    setScreen('play');
    play?.retry();
  }

  function onLoss(level: Level): void {
    const count = (losses.get(level.id) ?? 0) + 1;
    losses.set(level.id, count);
    setScreen('lost');
    const lines = text().lost;
    const pick = count % lines.length;
    const canSkip = count >= LOSSES_BEFORE_SKIP && level.world !== 'bonus';
    const draw = (): void => {
      closeOverlay();
      closeOverlay = showLost(overlay, {
        line: text().lost[pick],
        canSkip,
        onRetry: retryNow,
        onSkip() {
          saveProgress(addSkip(progress, level.id));
          const next = nextLevel(progress);
          if (next && next !== level.id) openLevel(next);
          else pickLevel();
        },
      });
      overlay.querySelector<HTMLElement>('[data-action="try-again"]')?.focus({ preventScroll: true });
      const card = overlay.querySelector<HTMLElement>('.card-lost');
      if (card) document.body.style.setProperty('--card-room', `${card.offsetHeight + CARD_GAP_PX}px`);
    };
    draw();
    redraw = draw;
    spokenLast = () => text().lost[pick];
    speak(canSkip && count === LOSSES_BEFORE_SKIP ? text().canSkip : lines[pick]);
  }

  function openLevel(id: number): void {
    const level = levelById(id);
    if (!level || !isOpen(progress, id)) return;
    clearScreen();
    setScreen('play');
    document.body.dataset.level = String(id);
    headingFor = () => (level.world === 'bonus' ? `💎 ${text().level(id)}` : text().level(id));
    labelPage();
    spokenLast = () => text().ideas[level.world];
    play = startPlayScreen({
      level,
      view,
      piecesHost: byId('pieces'),
      meterHost: byId('meter'),
      dockHost: byId('dock'),
      toastHost: byId('toast'),
      safeArea: safeRect,
      hintsSpent: hintsSpent.get(id) ?? 0,
      announce: firstSight(level.world),
      onHint: (spent) => hintsSpent.set(id, spent),
      onScore,
      onWin,
      onLoss: () => onLoss(level),
      onSecret: () => onSecret(level),
      onStart: () => {
        clearOverlay();
        setScreen('play');
      },
    });
  }

  onPress(levels, () => {
    pickSound();
    stopSpeaking();
    pickLevel();
  });
  onPress(repeat, () => speak(spokenLast()));

  onLanguageChange(() => {
    labelPage();
    play?.relabel();
    redraw();
  });

  new ResizeObserver(() => view.frameBoard(safeRect())).observe(byId('safe'));

  window.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && document.body.dataset.screen !== 'map') {
      pickLevel();
      return;
    }
    if (document.body.dataset.screen === 'play' && play?.key(event.key.length === 1 ? event.key.toLowerCase() : event.key)) event.preventDefault();
  });

  labelPage();
  pickLevel();
}

const stage: Stage | null = createStage(stageHost, CAMERA);
if (stage) {
  runGame(createView(stage));
  stage.start();
} else {
  labelPage();
  showNo3d();
}
