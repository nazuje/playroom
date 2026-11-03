// One level on screen: taps on the seesaws, the tray, the answer buttons, the honest wobble of a wrong number
// and the hint after two misses.
import { burst, say, speak } from '@playroom/kit';
import { text } from '../lang/index.ts';
import { findItem, type Effect, type Mystery } from '../rules/board.ts';
import type { Level } from '../rules/levels.ts';
import { asked, guess, isLevelBoard, openLean, place, startPlay, starsFor, tap, valuesWith, type Play } from '../rules/play.ts';
import { stepsTo } from '../rules/solve.ts';
import { hintSound, pairSound, pickSound, placeSound, rightSound, stopSounds, stuckSound, swapSound, weightSound, wrongSound } from '../sounds.ts';
import { button, calm, element, onPress } from '../ui.ts';
import { mysteryIcon, pips, weightFace } from '../view/items.ts';
import type { Scene } from '../view/scene.ts';

const WRONG_MS = 1000;
const RIGHT_MS = 900;
const LEVEL_WIN_MS = 700;
const MISSES_BEFORE_HINT = 2;
const SAY_AGAIN_AFTER_MS = 3500;

export interface WinReport {
  level: Level;
  stars: number;
  misses: number;
}

export interface PlayScreenOptions {
  level: Level;
  scene: Scene;
  dock: HTMLElement;
  /** Misses on this level before this go, so the skip button can count every try. */
  missesBefore: number;
  canSkipAfter: number;
  onMiss: (total: number) => void;
  onSkip: () => void;
  onWin: (report: WinReport) => void;
}

export interface PlayScreen {
  restart(): void;
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
  let sheetOpen = false;
  let saidPair = false;
  let saidSwap = false;
  let lastTwinLine = 0;
  let totalMisses = options.missesBefore;
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
    body.status = play.won ? 'won' : busy ? 'busy' : 'playing';
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

  function choiceButton(value: number, big: boolean): HTMLButtonElement {
    const made = button(big ? 'choice' : 'pick');
    made.dataset.choice = String(value);
    const digit = element('span', 'digit');
    digit.textContent = String(value);
    made.append(digit);
    if (big) made.append(pips(value));
    if (play.tried.includes(value)) {
      made.classList.add('tried');
      made.setAttribute('aria-disabled', 'true');
    }
    made.setAttribute('aria-label', String(value));
    onPress(made, () => onChoice(value));
    return made;
  }

  function prompt(mystery: Mystery): HTMLElement {
    const sheet = level.answer === 'picker';
    const made = sheet ? button('prompt') : element('div', 'prompt');
    made.append(mysteryIcon(mystery));
    const equals = element('span', 'prompt-equals');
    equals.textContent = '= ?';
    made.append(equals);
    made.setAttribute('aria-label', text().answer(mystery));
    if (made instanceof HTMLButtonElement) {
      onPress(made, () => {
        if (busy) return;
        pickSound();
        sheetOpen = !sheetOpen;
        drawDock();
      });
    }
    return made;
  }

  function answerRow(mystery: Mystery): HTMLElement {
    const row = element('div', 'answer');
    row.append(prompt(mystery));
    if (level.answer === 'three') {
      const choices = element('div', 'choices');
      choices.append(...level.choices.map((value) => choiceButton(value, true)));
      row.append(choices);
      return row;
    }
    const picker = element('div', 'picker');
    picker.dataset.open = String(sheetOpen);
    const grid = element('div', 'picker-grid');
    grid.append(...level.choices.map((value) => choiceButton(value, false)));
    const close = button('picker-close');
    close.textContent = '✕';
    close.setAttribute('aria-label', text().close);
    onPress(close, () => {
      sheetOpen = false;
      drawDock();
    });
    picker.append(close, grid);
    row.append(picker);
    return row;
  }

  function skipButton(): HTMLButtonElement {
    const made = button('skip');
    made.dataset.action = 'skip';
    made.textContent = `${text().skip} ⏭️`;
    onPress(made, () => {
      pickSound();
      options.onSkip();
    });
    return made;
  }

  function drawDock(): void {
    const mystery = asked(play);
    const parts: HTMLElement[] = [];
    if (isLevelBoard(level)) parts.push(trayRow());
    else if (mystery && !play.won) parts.push(answerRow(mystery));
    if (totalMisses >= options.canSkipAfter && !play.won) parts.push(skipButton());
    dock.replaceChildren(...parts);
    dock.dataset.mode = isLevelBoard(level) ? 'tray' : level.answer;
    document.body.dataset.sheet = String(sheetOpen && level.answer === 'picker');
    mark();
  }

  // ---------- Hints ----------

  function showHint(): void {
    if (play.misses < MISSES_BEFORE_HINT || play.won) return;
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

  function missed(): void {
    totalMisses += 1;
    options.onMiss(totalMisses);
    if (totalMisses === options.canSkipAfter) void say(text().canSkip, { queue: true });
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
      const now = Date.now();
      if (now - lastTwinLine > SAY_AGAIN_AFTER_MS) {
        lastTwinLine = now;
        speak(text().findTwin);
      }
    }
  }

  function onTap(id: string): void {
    if (busy || play.won) return;
    const spot = findItem(play.board, id);
    const value = spot?.item.kind === 'weight' ? spot.item.value : 0;
    const result = tap(play, id);
    play = result.play;
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
      missed();
      drawDock();
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

  function onChoice(value: number): void {
    const mystery = asked(play);
    if (busy || play.won || !mystery || play.tried.includes(value)) return;
    const result = guess(play, value);
    if (!result) return;
    const before = play;
    play = result.play;
    busy = true;
    sheetOpen = false;
    drawDock();
    scene.peekAll(mystery, value);
    if (!result.right) {
      scene.weigh(valuesWith(before, value));
      wrongSound();
      void say(result.heavy ? text().tooHeavy : text().tooLight);
      missed();
      later(WRONG_MS, () => {
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
      drawDock();
      const next = asked(play);
      if (next) void say(text().ask[next], { queue: true });
    });
  }

  function begin(): void {
    play = startPlay(level);
    busy = false;
    sheetOpen = false;
    saidPair = false;
    saidSwap = false;
    for (const timer of timers) window.clearTimeout(timer);
    timers.clear();
    // The dock first, so the seesaws are laid out in the room that is really left for them.
    drawDock();
    scene.show(level, play.board);
  }

  scene.onTap(onTap);
  begin();
  sayIntro();

  return {
    restart() {
      stopSounds();
      begin();
      sayIntro();
    },
    relabel() {
      if (!play.won) drawDock();
      scene.update(play.board);
    },
    spoken,
    stop() {
      stopped = true;
      for (const timer of timers) window.clearTimeout(timer);
      timers.clear();
      stopSounds();
      delete document.body.dataset.status;
    },
  };
}
