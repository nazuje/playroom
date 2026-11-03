import '@playroom/kit/kit.css';
import './style.css';
import {
  burst,
  canSpeak,
  getLanguage,
  homeButton,
  languageButton,
  onLanguageChange,
  playNote,
  playSound,
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
import { itemNote, melody } from './notes.ts';
import { makeTrain, MAX_LEVEL, type Blank, type Item, type Train } from './pattern.ts';
import { onPanelPress, onPress, openPanel } from './press.ts';
import { BONK_HIT_MS, Scene } from './scene.ts';
import { bestAfter, levelStars, readBest, trainStars, type BlankResult, type Stars } from './stars.ts';
import { drawStars, drawWinTrain } from './win.ts';

useClips(clips);

const FURTHEST_KEY = 'pattern-train:furthest';
const BEST_KEY = 'pattern-train:best';
/** A child who has been still this long gets a gentle pulse on the answer. */
const IDLE_MS = 8000;
/** The full train sings its pattern a car at a time, this far apart. */
const SING_STEP_MS = 150;
/** The win scene shows this many cars at most, so a long growing train still fits the parade. */
const WIN_CARS = 8;
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
const winWorld = byId('win-world');
const winStars = byId('win-stars');

const scene = new Scene(byId('scene'), byId('rows'), byId('toot'), text);

let furthest = readFurthest(store.get<unknown>(FURTHEST_KEY, 1));
let best = readBest(store.get<unknown>(BEST_KEY, {}));
let level = furthest;
let trainsDone = 0;
/** Stars for each train finished on this level so far. */
let earned: Stars[] = [];
/** How each empty car on this train is going: wrong taps so far, and whether the nudge showed it. */
let results = new Map<number, BlankResult>();
let idleTimer: ReturnType<typeof setTimeout> | undefined;
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
      station.textContent = done ? '⭐'.repeat(earned[i] ?? 1) : '';
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
      button.dataset.name = item.name;
      button.setAttribute('aria-label', text().itemName(item));
      onPress(button, () => void choose(item, button));
      return button;
    }),
  );
}

function ask(current: Blank): void {
  if (!train) return;
  blank = current;
  scene.setActive(current.index);
  drawOptions(current);
  armIdle();
  const question = train.question;
  setPrompt(() => text().questions[question]);
  speak(text().questions[question]);
}

function resultFor(index: number): BlankResult {
  const result = results.get(index) ?? { misses: 0, nudged: false };
  results.set(index, result);
  return result;
}

/** Waits a while for a tap, then pulses the answer and its car. No words, so it works with the sound off. */
function armIdle(): void {
  clearTimeout(idleTimer);
  scene.setNudge(null);
  optionsEl.querySelectorAll('.nudge').forEach((button) => button.classList.remove('nudge'));
  if (blank) idleTimer = setTimeout(nudge, IDLE_MS);
}

function nudge(): void {
  if (!blank || !picker.hidden || !winPanel.hidden) return;
  // The chant is a hint already. Let it finish before pulsing over it.
  if (stopChant) {
    armIdle();
    return;
  }
  resultFor(blank.index).nudged = true;
  scene.setNudge(blank.index);
  optionsEl.querySelector(`[data-name="${CSS.escape(blank.answer.name)}"]`)?.classList.add('nudge');
}

/** The wrong pick bonks off the car with a boing, and the train hiccups. */
function wrongAnswer(current: Blank, item: Item, button: HTMLButtonElement): void {
  endChant();
  resultFor(current.index).misses += 1;
  scene.bonk(current.index, item, button);
  playSound('boing');
  const token = run;
  setTimeout(() => {
    if (token === run) playSound('bonk');
  }, BONK_HIT_MS);
  button.disabled = true;
  button.classList.add('wiggle');
  setPrompt(() => text().tryAgain);
  speak(text().tryAgain);
}

async function choose(item: Item, button: HTMLButtonElement): Promise<void> {
  if (!train || !blank || button.disabled) return;
  if (item.name !== blank.answer.name) {
    wrongAnswer(blank, item, button);
    return;
  }
  playNote(itemNote(train, item), { seconds: 0.35 });
  playSound('whoosh');

  const token = run;
  const solved = blank;
  blank = null;
  armIdle();
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
  playSound('pop');
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

/** The full train sings its pattern, each car lighting up on its own note. Resolves false if a new train took over. */
async function sing(current: Train, token: number): Promise<boolean> {
  const tune = melody(current);
  for (let car = 0; car < tune.length; car++) {
    if (token !== run) return false;
    scene.setBeat(car);
    playNote(tune[car], { seconds: 0.22, gain: 0.5 });
    await pause(SING_STEP_MS);
  }
  scene.setBeat(null);
  await pause(200);
  return token === run;
}

async function trainFull(token: number): Promise<void> {
  if (!train) return;
  earned.push(trainStars(train.blanks.map((done) => resultFor(done.index))));
  trainsDone += 1;
  furthest = furthestAfterTrain(furthest, level, trainsDone);
  store.set(FURTHEST_KEY, furthest);
  drawJourney();
  setHint(false);
  if (!(await sing(train, token))) return;

  const cheerAt = trainsDone % text().cheers.length;
  const cheer = text().cheers[cheerAt];
  setPrompt(() => text().cheers[cheerAt]);
  speak(cheer);
  playSound('toot');
  scene.whistle(cheer);
  await pause(1100);
  if (token !== run) return;
  playSound('whoosh');
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
  const stars = levelStars(earned);
  drawStars(winStars, stars, words.starsLabel(stars));
}

function levelDone(): void {
  const stars = levelStars(earned);
  best = bestAfter(best, level, stars);
  store.set(BEST_KEY, best);
  drawWinTrain(winWorld, train ? train.cars.slice(0, WIN_CARS) : []);
  drawWin();
  openPanel(winPanel);
  nextBtn.focus();
  playSound('tada');
  burst(window.innerWidth / 2, window.innerHeight / 3, 28);
  setTimeout(() => burst(window.innerWidth / 4, window.innerHeight / 4, 18), 350);
  setTimeout(() => burst((window.innerWidth * 3) / 4, window.innerHeight / 4, 18), 700);
  speak(level === MAX_LEVEL ? text().lineDoneSpoken : text().levelDoneSpoken(level));
}

async function nextTrain(): Promise<void> {
  const token = ++run;
  endChant();
  train = makeTrain(level, Math.random, train?.themeId);
  filled = new Set();
  results = new Map();
  blank = null;
  armIdle();
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
  earned = [];
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
      const record = best[number];
      button.className = `btn level-tile${number === furthest ? ' furthest' : ''}`;
      button.setAttribute('aria-label', record ? `${text().level(number)}, ${text().starsLabel(record)}` : text().level(number));
      button.innerHTML = `<span class="level-label"><span class="level-name">${text().level(number)}</span><span class="level-best" aria-hidden="true">${'⭐'.repeat(record ?? 0)}</span></span><span class="level-sample" aria-hidden="true">${preview}</span>`;
      onPanelPress(button, picker, () => startLevel(number));
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
  openPanel(picker);
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
onPress(levelBtn, openPicker);
onPress(sayBtn, toggleChant);
onPress(hintBtn, () => setHint(!hintOn));
onPanelPress(aboardBtn, picker, () => startLevel(furthest));
onPanelPress(pickerClose, picker, () => {
  picker.hidden = true;
  armIdle();
});
onPanelPress(winLevels, winPanel, openPicker);
onPanelPress(nextBtn, winPanel, () => startLevel(level === MAX_LEVEL ? 1 : level + 1));
// Any touch or key counts as the child being there, and holds off the nudge.
document.addEventListener('pointerdown', armIdle, true);
document.addEventListener('keydown', armIdle, true);

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
