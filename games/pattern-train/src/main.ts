import '@playroom/kit/kit.css';
import './style.css';
import {
  burst,
  canSpeak,
  getLanguage,
  homeButton,
  languageButton,
  onLanguageChange,
  say,
  speak,
  stopSpeaking,
  store,
  useClips,
} from '@playroom/kit';
import { planChant, playChant } from './chant.ts';
import { furthestAfterTrain, readFurthest, TRAINS_PER_LEVEL } from './journey.ts';
import { text } from './lang/index.ts';
import clips from './lang/sl.clips.json';
import { makeTrain, MAX_LEVEL, type Blank, type Item, type Train } from './pattern.ts';
import { Scene } from './scene.ts';

useClips(clips);

const FURTHEST_KEY = 'pattern-train:furthest';
const LEVEL_PREVIEWS = ['🔴🔵🔴🔵', '🔴🔴🔵🔴🔴🔵', '🔴🔵🟡🔴🔵🟡', '🔴🔴🔵🔵🔴🔴🔵🔵', '🔴🔵❓🔵🔴🔵', '🔴🔵🔴🔴🔵🔴🔴🔴🔵'];

function byId<T extends HTMLElement = HTMLElement>(id: string): T {
  const found = document.getElementById(id);
  if (!found) throw new Error(`Missing #${id} in index.html`);
  return found as T;
}

const pause = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const home = homeButton();
const titleEl = byId('title');
const levelBtn = byId('level-btn');
const journeyEl = byId('journey');
const promptEl = byId('prompt');
const sayBtn = byId<HTMLButtonElement>('say');
const hintBtn = byId<HTMLButtonElement>('hint');
const hintNote = byId('hint-note');
const optionsEl = byId('options');
const picker = byId('picker');
const pickerTitle = byId('picker-title');
const pickerNote = byId('picker-note');
const pickerClose = byId('picker-close');
const levelsEl = byId('levels');
const aboardBtn = byId('aboard');
const winPanel = byId('win');
const winTitle = byId('win-title');
const nextBtn = byId('next');
const winLevels = byId('win-levels');

const scene = new Scene(byId('scene'), byId('rows'), byId('toot'), text);

let furthest = readFurthest(store.get<unknown>(FURTHEST_KEY, 1));
let level = furthest;
let trainsDone = 0;
let train: Train | null = null;
let filled = new Set<number>();
let blank: Blank | null = null;
let hintOn = false;
let stopChant: (() => void) | null = null;
/** The words under the train, kept as a recipe so a language switch can say them again in the new language. */
let promptLine: (() => string) | null = null;
/** Bumped whenever a new train or level takes over, so older animations know to stop. */
let run = 0;

/** One quiet word at a set pitch, waiting its turn, that reports when it finishes. */
function sayWord(word: string, pitch: number, done: () => void): void {
  if (!canSpeak()) {
    done();
    return;
  }
  void say(word, { rate: 1, pitch, queue: true }).then(done);
}

function endChant(): void {
  stopChant?.();
  stopChant = null;
  scene.setBeat(null);
  sayBtn.classList.remove('playing');
}

function toggleChant(): void {
  if (stopChant) {
    endChant();
    stopSpeaking();
    return;
  }
  if (!train || !blank) return;
  stopSpeaking();
  sayBtn.classList.add('playing');
  stopChant = playChant(planChant(train, filled, text()), {
    say: sayWord,
    onBeat: (beat) => scene.setBeat(beat.car),
    onEnd: endChant,
  });
}

function hintLine(current: Train): string {
  return current.rule === 'growing' ? text().hintGrowing(current.cars[0]) : text().hintRepeats;
}

function setPrompt(line: (() => string) | null): void {
  promptLine = line;
  promptEl.textContent = line ? line() : '';
}

function setHint(on: boolean): void {
  hintOn = on && train !== null;
  hintBtn.setAttribute('aria-pressed', String(hintOn));
  hintNote.textContent = hintOn && train ? hintLine(train) : '';
  scene.setHint(hintOn && train ? train.hint : []);
}

function drawJourney(): void {
  journeyEl.setAttribute('aria-label', text().journey(level, Math.min(trainsDone + 1, TRAINS_PER_LEVEL), TRAINS_PER_LEVEL));
  journeyEl.replaceChildren(
    ...Array.from({ length: TRAINS_PER_LEVEL }, (_, i) => {
      const station = document.createElement('li');
      const done = i < trainsDone;
      station.className = `station${done ? ' done' : ''}${i === trainsDone ? ' here' : ''}`;
      station.textContent = done ? '⭐' : '';
      return station;
    }),
  );
  levelBtn.textContent = text().level(level);
}

function drawOptions(current: Blank): void {
  optionsEl.style.setProperty('--count', String(current.options.length));
  optionsEl.replaceChildren(
    ...current.options.map((item) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'btn opt';
      button.textContent = item.emoji;
      button.setAttribute('aria-label', text().itemName(item));
      button.addEventListener('click', () => void choose(item, button));
      return button;
    }),
  );
}

function ask(current: Blank): void {
  if (!train) return;
  blank = current;
  scene.setActive(current.index);
  drawOptions(current);
  const question = train.question;
  setPrompt(() => text().questions[question]);
  speak(text().questions[question]);
}

function wrongAnswer(button: HTMLButtonElement): void {
  endChant();
  button.disabled = true;
  button.classList.add('wiggle');
  setPrompt(() => text().tryAgain);
  speak(text().tryAgain);
}

async function choose(item: Item, button: HTMLButtonElement): Promise<void> {
  if (!train || !blank) return;
  if (item.name !== blank.answer.name) {
    wrongAnswer(button);
    return;
  }

  const token = run;
  const solved = blank;
  blank = null;
  endChant();
  // The hop measures the button straight away, so the buttons can go right after it starts.
  const landing = scene.hop(solved.index, item, button);
  optionsEl.replaceChildren();
  setPrompt(null);
  await landing;
  if (token !== run) return;
  filled.add(solved.index);
  const { x, y } = scene.carCenter(solved.index);
  burst(x, y);
  speak(text().itemName(item));
  setPrompt(() => {
    const name = text().itemName(item);
    return name[0].toUpperCase() + name.slice(1) + '!';
  });

  await pause(1000);
  if (token !== run) return;
  const nextBlank = train.blanks.find((candidate) => !filled.has(candidate.index));
  if (nextBlank) ask(nextBlank);
  else await trainFull(token);
}

async function trainFull(token: number): Promise<void> {
  trainsDone += 1;
  furthest = furthestAfterTrain(furthest, level, trainsDone);
  store.set(FURTHEST_KEY, furthest);
  drawJourney();
  setHint(false);

  const cheerAt = trainsDone % text().cheers.length;
  const cheer = text().cheers[cheerAt];
  setPrompt(() => text().cheers[cheerAt]);
  speak(cheer);
  scene.whistle(cheer);
  await pause(1100);
  if (token !== run) return;
  await scene.depart();
  if (token !== run) return;
  if (trainsDone >= TRAINS_PER_LEVEL) levelDone();
  else void nextTrain();
}

function drawWin(): void {
  const words = text();
  const last = level === MAX_LEVEL;
  winTitle.textContent = last ? words.lineDone : words.levelDone(level);
  nextBtn.textContent = last ? words.rideAgain : words.nextLevel;
  winLevels.textContent = words.pickLevel;
}

function levelDone(): void {
  drawWin();
  winPanel.hidden = false;
  nextBtn.focus();
  burst(window.innerWidth / 2, window.innerHeight / 3, 28);
  speak(level === MAX_LEVEL ? text().lineDoneSpoken : text().levelDoneSpoken(level));
}

async function nextTrain(): Promise<void> {
  const token = ++run;
  endChant();
  train = makeTrain(level, Math.random, train?.themeId);
  filled = new Set();
  blank = null;
  setHint(false);
  optionsEl.replaceChildren();
  setPrompt(null);
  scene.show(train);
  await scene.arrive();
  if (token !== run) return;
  ask(train.blanks[0]);
}

function startLevel(chosen: number): void {
  level = chosen;
  trainsDone = 0;
  picker.hidden = true;
  winPanel.hidden = true;
  drawJourney();
  speak(text().allAboard);
  void nextTrain();
}

function drawLevels(): void {
  levelsEl.replaceChildren(
    ...LEVEL_PREVIEWS.map((preview, i) => {
      const number = i + 1;
      const button = document.createElement('button');
      button.type = 'button';
      button.className = `btn level-tile${number === furthest ? ' furthest' : ''}`;
      button.setAttribute('aria-label', text().level(number));
      button.innerHTML = `<span class="level-name">${text().level(number)}</span><span class="level-sample" aria-hidden="true">${preview}</span>`;
      button.addEventListener('click', () => startLevel(number));
      return button;
    }),
  );
}

function drawPicker(): void {
  drawLevels();
  aboardBtn.textContent = text().aboardLevel(furthest);
}

function openPicker(): void {
  endChant();
  stopSpeaking();
  drawPicker();
  pickerClose.hidden = train === null || winPanel.hidden === false;
  winPanel.hidden = true;
  picker.hidden = false;
  aboardBtn.focus();
}

/** Every word on screen in the current language, redrawn from the state already there. */
function drawWords(): void {
  const words = text();
  document.documentElement.lang = getLanguage();
  document.title = words.title;
  document.querySelector('meta[name="description"]')?.setAttribute('content', words.description);
  home.setAttribute('aria-label', words.homeLabel);
  titleEl.textContent = words.title;
  pickerTitle.textContent = words.title;
  pickerNote.textContent = words.pickerNote;
  pickerClose.textContent = words.backToTrain;
  sayBtn.textContent = words.sayIt;
  hintBtn.setAttribute('aria-label', words.hintLabel);
  optionsEl.setAttribute('aria-label', words.answersLabel);
  promptEl.textContent = promptLine ? promptLine() : '';
  drawJourney();
  drawPicker();
  drawWin();
  setHint(hintOn);
  scene.relabel();
  if (blank) {
    const shown = blank.options;
    optionsEl.querySelectorAll('button').forEach((button, i) => button.setAttribute('aria-label', words.itemName(shown[i])));
  }
}

const topbar = byId('topbar');
topbar.prepend(home);
topbar.append(languageButton(['en', 'sl']));
onLanguageChange(() => {
  // A chant already planned would carry on in the old language.
  endChant();
  drawWords();
});
levelBtn.addEventListener('click', openPicker);
sayBtn.addEventListener('click', toggleChant);
hintBtn.addEventListener('click', () => setHint(!hintOn));
aboardBtn.addEventListener('click', () => startLevel(furthest));
pickerClose.addEventListener('click', () => {
  picker.hidden = true;
});
winLevels.addEventListener('click', openPicker);
nextBtn.addEventListener('click', () => startLevel(level === MAX_LEVEL ? 1 : level + 1));

// Leaving the page or the tab shouldn't leave a voice chanting in an empty room.
window.addEventListener('pagehide', stopSpeaking);
document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    endChant();
    stopSpeaking();
  }
});

drawWords();
openPicker();
