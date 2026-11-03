// One try at a level on screen: taps on the seesaws, the tray, the answers, the honest wobble of a wrong number,
// the tumble when a try runs out of misses, and the pointing hand and pulsing hints for a child who can't read.
import { burst, say, speak } from '@playroom/kit';
import { text } from '../lang/index.ts';
import { allItems, findItem, type Effect, type Mystery } from '../rules/board.ts';
import { MOST_ANSWER, type Level } from '../rules/levels.ts';
import { asked, guess, isLevelBoard, openLean, place, startPlay, starsFor, tap, valuesWith, type Play } from '../rules/play.ts';
import { stepsTo } from '../rules/solve.ts';
import { hintSound, pairSound, placeSound, rightSound, stopSounds, stuckSound, swapSound, tumbleSound, weightSound, wrongSound } from '../sounds.ts';
import { button, calm, element, onPress } from '../ui.ts';
import { weightFace } from '../view/items.ts';
import { clearPointer, pointAt } from '../view/pointer.ts';
import type { Scene } from '../view/scene.ts';
import { answerRow, answerTarget, type PickerPlace } from './answers.ts';

const WRONG_MS = 1000;
const RIGHT_MS = 900;
const LEVEL_WIN_MS = 700;
const TUMBLE_MS = 1300;
const MISSES_BEFORE_HINT = 2;
const SAY_AGAIN_AFTER_MS = 3500;
/** Quiet this long and a hand points at what to tap next. */
const IDLE_MS = 8000;
/** On the "both sides" world a hand shows the first pair this soon, before anything goes wrong. */
const SHOW_PAIR_MS = 2500;

export interface TryReport {
  level: Level;
  stars: number;
  misses: number;
}

export interface PlayScreenOptions {
  level: Level;
  scene: Scene;
  dock: HTMLElement;
  /** Tries on this level that ended in a tumble, so the skip button can count them. */
  failedBefore: number;
  canSkipAfter: number;
  pickerPlace: () => PickerPlace;
  onSkip: () => void;
  onWin: (report: TryReport) => void;
  onFail: (report: TryReport) => void;
}

export interface PlayScreen {
  relabel(): void;
  /** The line the 🔊 button repeats. */
  spoken(): string;
  stop(): void;
}

export function startPlayScreen(options: PlayScreenOptions): PlayScreen {
  const { level, scene, dock } = options;
  let play: Play = startPlay(level);
  let busy = false;
  let stopped = false;
  let stepped = 0;
  let saidPair = false;
  let saidSwap = false;
  let movedPair = false;
  let lastLine = 0;
  let idleTimer = 0;
  let idleShown = false;
  const timers = new Set<number>();

  function later(ms: number, run: () => void): void {
    const timer = window.setTimeout(() => {
      timers.delete(timer);
      if (!stopped) run();
    }, ms);
    timers.add(timer);
  }

  function mark(): void {
    const body = document.body.dataset;
    body.misses = String(play.misses);
    body.asking = asked(play) ?? '';
    body.status = play.won ? 'won' : play.failed ? 'failed' : busy ? 'busy' : 'playing';
  }

  const intro = (): string => {
    const first = level.ask[0];
    return level.world === 'two' && first ? `${text().ideas.two} ${text().ask[first]}` : text().ideas[level.world];
  };

  function spoken(): string {
    const mystery = asked(play);
    return play.asking > 0 && mystery ? text().ask[mystery] : intro();
  }

  function sayIntro(): void {
    const first = level.ask[0];
    void say(text().ideas[level.world]);
    if (level.world === 'two' && first) void say(text().ask[first], { queue: true });
  }

  /** A line that a tap can trigger again and again is said at most once every few seconds. */
  function sayNow(line: string): void {
    const now = Date.now();
    if (now - lastLine < SAY_AGAIN_AFTER_MS) return;
    lastLine = now;
    speak(line);
  }

  // ---------- The dock ----------

  function trayRow(): HTMLElement {
    const row = element('div', 'tray');
    for (const weight of play.board.tray) {
      const made = button('item weight tray-weight');
      made.dataset.tray = weight.id;
      made.dataset.value = String(weight.value);
      made.append(element('span', 'knob'), weightFace(weight.value));
      made.setAttribute('aria-label', text().putOn(weight.value));
      onPress(made, () => onTray(weight.id));
      row.append(made);
    }
    return row;
  }

  function onStep(by: number): void {
    if (busy || play.won || play.failed) return;
    stepped = Math.max(0, Math.min(MOST_ANSWER, stepped + by));
    weightSound(stepped);
    speak(text().number(stepped));
    drawDock();
  }

  function skipButton(): HTMLButtonElement {
    const made = button('skip');
    made.dataset.action = 'skip';
    made.textContent = `${text().skip} ⏭️`;
    onPress(made, () => options.onSkip());
    return made;
  }

  function drawDock(): void {
    const mystery = asked(play);
    const parts: HTMLElement[] = [];
    if (isLevelBoard(level)) parts.push(trayRow());
    else if (mystery && !play.won) {
      parts.push(answerRow({ level, mystery, tried: play.tried, place: options.pickerPlace(), stepped, onChoice, onStep }));
    }
    if (options.failedBefore >= options.canSkipAfter && !play.won) parts.push(skipButton());
    dock.replaceChildren(...parts);
    dock.dataset.mode = isLevelBoard(level) ? 'tray' : level.answer === 'picker' ? options.pickerPlace() : level.answer;
    mark();
  }

  /** Shakes the answers awake and points at them, as tapping a box does. */
  function focusAnswers(): void {
    const { pulse, hand } = answerTarget(dock);
    pointAt(pulse, hand);
  }

  // ---------- Pointing hands ----------

  function pointIdle(): void {
    if (isLevelBoard(level)) pointAt(dock.querySelector('.tray'), dock.querySelector('.tray-weight'));
    else focusAnswers();
  }

  function armIdle(): void {
    window.clearTimeout(idleTimer);
    if (idleShown || stopped) return;
    idleTimer = window.setTimeout(() => {
      if (stopped || busy || play.won || play.failed) return;
      idleShown = true;
      pointIdle();
      sayNow(spoken());
    }, IDLE_MS);
  }

  /** A box with a twin across the seesaw: the move to discover on the "both sides" world. */
  function showFirstPair(): void {
    if (stopped || movedPair || play.misses > 0 || busy) return;
    for (const seesaw of play.board.seesaws) {
      const twin = seesaw.left.find((item) => item.kind === 'mystery' && seesaw.right.some((other) => other.kind === 'mystery' && other.mystery === item.mystery));
      if (twin) {
        pointAt(document.querySelector(`#scene [data-item="${twin.id}"]`));
        return;
      }
    }
  }

  const onAnyTap = (): void => {
    clearPointer();
    armIdle();
  };

  // ---------- Hints ----------

  function showHint(): void {
    if (play.misses < MISSES_BEFORE_HINT || play.won || play.failed) return;
    if (isLevelBoard(level)) {
      const need = -openLean(play);
      if (need < 0) {
        scene.hint(play.board.seesaws[0][level.open ?? 'right'].filter((item) => item.kind === 'weight' && item.loose).map((item) => item.id));
      } else {
        const fits = play.board.tray.filter((weight) => weight.value <= need).sort((a, b) => b.value - a.value);
        const exact = fits.find((weight) => weight.value === need) ?? fits[0];
        for (const made of dock.querySelectorAll('.hint')) made.classList.remove('hint');
        if (exact) dock.querySelector(`[data-tray="${exact.id}"]`)?.classList.add('hint');
      }
    } else {
      const mystery = asked(play);
      if (!mystery) return;
      const steps = stepsTo(play.board, mystery);
      if (steps?.length) scene.hint([steps[0]]);
      else scene.hintIsolated(play.board, mystery);
    }
    hintSound();
    speak(text().hint);
  }

  // ---------- Taps ----------

  function soundFor(effect: Effect, value: number): void {
    if (effect.type === 'pair' || effect.type === 'take') {
      pairSound();
      if (!saidPair) speak(text().stillLevel);
      saidPair = true;
    } else if (effect.type === 'swap') {
      swapSound();
      if (!saidSwap) speak(text().swapped);
      saidSwap = true;
    } else if (effect.type === 'back') {
      placeSound();
    } else if (effect.type === 'stuck') {
      scene.wiggle(effect.id);
      if (effect.why !== 'alone') {
        // A weight that can't move still says its number, so a child can count along.
        weightSound(value);
        speak(text().number(value));
        return;
      }
      stuckSound();
      sayNow(text().findTwin);
    }
  }

  function onTap(id: string): void {
    if (busy || play.won || play.failed) return;
    const spot = findItem(play.board, id);
    // Tapping the mystery being asked, with nothing to pair it with, means "let me answer".
    if (spot?.item.kind === 'mystery' && spot.item.mystery === asked(play) && tap(play, id).effect.type === 'stuck') {
      scene.wiggle(id);
      focusAnswers();
      sayNow(text().ask[spot.item.mystery]);
      return;
    }
    const value = spot?.item.kind === 'weight' ? spot.item.value : 0;
    const result = tap(play, id);
    play = result.play;
    if (result.effect.type === 'pair') movedPair = true;
    if (result.effect.type !== 'stuck') scene.update(play.board, result.effect);
    soundFor(result.effect, value);
    if (result.effect.type === 'back') drawDock();
    if (play.won) winLevelBoard();
    mark();
  }

  function winLevelBoard(): void {
    busy = true;
    mark();
    scene.cheer();
    void say(text().levelWin);
    later(LEVEL_WIN_MS, () => options.onWin({ level, stars: starsFor(play.misses), misses: play.misses }));
  }

  function onTray(trayId: string): void {
    if (busy || play.won) return;
    const placed = place(play, trayId);
    if (!placed) return;
    play = placed.play;
    scene.update(play.board, placed.effect);
    const weight = findItem(play.board, trayId)?.item;
    weightSound(weight?.kind === 'weight' ? weight.value : 1);
    drawDock();
    if (play.won) {
      winLevelBoard();
      return;
    }
    if (placed.over) {
      wrongSound();
      speak(text().tooHeavy);
      showHint();
      return;
    }
    if (weight?.kind === 'weight') speak(text().number(weight.value));
  }

  function burstAt(mystery: Mystery): void {
    if (calm()) return;
    for (const made of document.querySelectorAll<HTMLElement>(`#scene [data-mystery="${mystery}"]`)) {
      const box = made.getBoundingClientRect();
      burst(box.left + box.width / 2, box.top, 14);
    }
  }

  /** Too many wrong numbers: everything tumbles off, and the next try is a fresh puzzle. */
  function tumble(heavy: boolean, mystery: Mystery): void {
    const lean = play.board.seesaws.map((seesaw) => {
      const side = seesaw.left.some((item) => item.kind === 'mystery' && item.mystery === mystery) ? 'left' : 'right';
      return heavy === (side === 'left') ? -1 : 1;
    });
    scene.unpeekAll();
    scene.tumble(lean);
    tumbleSound();
    void say(text().tumble);
    later(TUMBLE_MS, () => options.onFail({ level, stars: 0, misses: play.misses }));
  }

  function onChoice(value: number): void {
    const mystery = asked(play);
    if (busy || play.won || play.failed || !mystery || play.tried.includes(value)) {
      if (mystery && play.tried.includes(value)) stuckSound();
      return;
    }
    const result = guess(play, value);
    if (!result) return;
    const before = play;
    play = result.play;
    busy = true;
    drawDock();
    scene.peekAll(mystery, value);
    if (!result.right) {
      scene.weigh(valuesWith(before, value));
      wrongSound();
      void say(result.heavy ? text().tooHeavy : text().tooLight);
      later(WRONG_MS, () => {
        if (play.failed) {
          tumble(result.heavy, mystery);
          return;
        }
        scene.unpeekAll();
        scene.weigh(level.values);
        busy = false;
        drawDock();
        showHint();
      });
      return;
    }
    rightSound();
    burstAt(mystery);
    void say(text().cheer(value));
    later(RIGHT_MS, () => {
      scene.update(play.board);
      if (play.won) {
        scene.cheer();
        mark();
        options.onWin({ level, stars: starsFor(play.misses), misses: play.misses });
        return;
      }
      busy = false;
      stepped = 0;
      drawDock();
      const next = asked(play);
      if (next) void say(text().ask[next], { queue: true });
    });
  }

  scene.onTap(onTap);
  // The dock first, so the seesaws are laid out in the room that is really left for them.
  drawDock();
  scene.show(level, play.board);
  sayIntro();
  document.addEventListener('pointerdown', onAnyTap, true);
  armIdle();
  const hasPair = allItems(play.board).some((item) => item.kind === 'mystery') && level.world === 'both';
  if (hasPair) later(SHOW_PAIR_MS, showFirstPair);

  return {
    relabel() {
      if (!play.won && !play.failed) drawDock();
      if (!play.failed) scene.update(play.board);
    },
    spoken,
    stop() {
      stopped = true;
      for (const timer of timers) window.clearTimeout(timer);
      timers.clear();
      window.clearTimeout(idleTimer);
      document.removeEventListener('pointerdown', onAnyTap, true);
      clearPointer();
      stopSounds();
      delete document.body.dataset.status;
    },
  };
}

