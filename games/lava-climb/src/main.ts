import '@playroom/kit/kit.css';
import './style.css';
import { canSpeak, getLanguage, homeButton, languageButton, onLanguageChange, speak, store, useClips } from '@playroom/kit';
import { text } from './lang/index.ts';
import clips from './lang/sl.clips.json';
import { buildLevel } from './level.ts';
import { DEMOS, HINTS, PLANS, WORLD_OF } from './levels.ts';
import { startPlay, type PlayScreen } from './play.ts';
import { addSinge, addSkip, addWin, cleanProgress, type Progress } from './save.ts';
import { showMap } from './screens.ts';
import { deniedSound } from './sounds.ts';
import { button, element } from './ui.ts';
import { WORLDS } from './worlds.ts';

const PROGRESS_KEY = 'lava-climb:progress';

function byId(id: string): HTMLElement {
  const found = document.getElementById(id);
  if (!found) throw new Error(`Missing #${id} in index.html`);
  return found;
}

useClips(clips);

const bar = byId('topbar');
const app = byId('app');
const home = homeButton();
const heading = element('h1', 'title');
const repeat = button('bar-btn');
repeat.textContent = '🔊';
repeat.hidden = !canSpeak();
const language = languageButton(['en', 'sl']);
language.classList.add('topbar-end');

let progress: Progress = cleanProgress(store.get<unknown>(PROGRESS_KEY, null), PLANS.length);
let play: PlayScreen | null = null;
let line = text().where;

function saveProgress(next: Progress): void {
  progress = next;
  store.set(PROGRESS_KEY, next);
}

function labelPage(): void {
  document.documentElement.lang = getLanguage();
  document.title = text().title;
  document.querySelector('meta[name="description"]')?.setAttribute('content', text().description);
  heading.textContent = text().title;
  home.setAttribute('aria-label', text().home);
  repeat.setAttribute('aria-label', text().sayAgain);
}

function setScreen(name: 'map' | 'play'): void {
  document.body.dataset.screen = name;
}

function map(): void {
  play?.stop();
  play = null;
  setScreen('map');
  bar.append(home, heading, repeat, language);
  labelPage();
  drawMap();
  line = text().where;
  speak(line);
}

function drawMap(): void {
  showMap(app, {
    progress,
    onLevel: go,
    onLocked: () => {
      deniedSound();
      line = text().lockedLine;
      speak(line);
    },
  });
}

function go(index: number): void {
  play?.stop();
  setScreen('play');
  const plan = PLANS[index]!;
  const worldId = WORLD_OF[index]!;
  play = startPlay(app, {
    number: index + 1,
    level: buildLevel(plan),
    world: WORLDS[worldId],
    hint: HINTS[index + 1] ?? null,
    demo: DEMOS[index + 1] ?? null,
    worldIntro: index === 0 || WORLD_OF[index - 1] !== worldId,
    hasNext: index + 1 < PLANS.length,
    finished: progress.stars[index]! > 0 || progress.open > index + 1,
    slots: [repeat, language],
    singes: () => progress.singes,
    onSinge: () => saveProgress(addSinge(progress)),
    onWin: (stars, seconds, secret) => saveProgress(addWin(progress, { index, stars: stars.count, seconds, secret })),
    onNext: () => {
      if (index + 1 < PLANS.length) go(index + 1);
      else {
        map();
        line = text().allDone;
        speak(line);
      }
    },
    onAgain: () => go(index),
    onMap: map,
    onSkip: () => {
      saveProgress(addSkip(progress, index));
      go(index + 1 < PLANS.length ? index + 1 : index);
    },
    onFailedView: map,
  });
  labelPage();
}

repeat.addEventListener('click', () => speak(play ? play.line() : line));

onLanguageChange(() => {
  labelPage();
  if (play) play.redraw();
  else drawMap();
});

map();
