// One try at a level on screen: a set of three stacks on the stage, the answer blocks, stepper, grid or map
// cards, the curtain call for each right answer, where every block bows with its number and the hidden ones come
// out last, the jelly wobble for a wrong one, the end of a try, the hint, the idle nudge, the one-time demos of
// each new idea, and the "blocks never float" lesson.
import { burst, say, speak, store } from '@playroom/kit';
import { text } from '../lang/index.ts';
import type { Level } from '../rules/levels.ts';
import { starsFor } from '../rules/misses.ts';
import { answer, puzzleOf, startPlay, type Play } from '../rules/play.ts';
import {
  bowSound,
  bravoSound,
  failSound,
  hintSound,
  knockSound,
  landSound,
  openSound,
  pickSound,
  rightSound,
  stepSound,
  stopSounds,
  thumpSound,
  turnSound,
  wobbleSound,
} from '../sounds.ts';
import { button, calm, element, onPress } from '../ui.ts';
import type { BoardView, RevealKind, RevealStep } from '../view/board.ts';
import type { DemoStep, Guide } from '../view/guide.ts';
import { fillNumber, mapGrid, numberBlock } from '../view/tokens.ts';

/** Counts of up to this many blocks are said out loud, one number a bow. Longer ones play notes and say the total. */
const SAY_EACH_UP_TO = 10;
const BOW_MS = 520;
const QUICK_COUNT_MS = 3200;
const FASTEST_BOW_MS = 120;
const MAP_BOW_MS = 360;
const LEAD_MS = 320;
const OPEN_BEFORE_MS = 380;
const CHEER_AFTER_MS = 380;
const NEXT_AFTER_MS = 1500;
const WIN_AFTER_MS = 1400;
const WRONG_MS = 950;
const RETRY_ARMED_MS = 420;
const MISSES_BEFORE_HINT = 2;
const PEEK_MS = 1700;
const IDLE_MS = 8000;
const DEMO_AFTER_MS = 900;
const HOLD_MS = 420;
const REPEAT_MS = 110;
const SHOWN_KEY = 'block-count:shown';

export interface WinReport {
  level: Level;
  stars: number;
  misses: number;
}

export interface PlayScreenOptions {
  /** The set's puzzles, all of one level. */
  puzzles: readonly Level[];
  board: BoardView;
  dock: HTMLElement;
  guide: Guide;
  /** The level is the first of its world, so its idea gets said. */
  firstOfWorld: boolean;
  /** Misses on this level since it was last won, before this try. Stars and the hint count them all. */
  missesBefore: number;
  failsBefore: number;
  canSkipAfter: number;
  /** Numbers as a −/+ stepper, for phones, instead of a grid. */
  stepper: () => boolean;
  onMiss: () => void;
  onFail: (total: number) => void;
  onRetry: () => void;
  onSkip: () => void;
  onWin: (report: WinReport) => void;
}

export interface PlayScreen {
  relabel(): void;
  /** The stepper and the grid swap when the screen turns. */
  redock(): void;
  sayAgain(): void;
  stop(): void;
}

type Demo = 'count' | 'turn' | 'lesson' | 'stepper' | 'fill' | 'map';

export function startPlayScreen(options: PlayScreenOptions): PlayScreen {
  const { puzzles, board, dock, guide } = options;
  let play: Play = startPlay(puzzles);
  let level = puzzleOf(play);
  let busy = false;
  let stopped = false;
  let reactions = 0;
  let stepValue = 0;
  let missedHere = false;
  let introGoing = true;
  let totalMisses = options.missesBefore;
  let totalFails = options.failsBefore;
  let idleTimer = 0;
  let holdTimer = 0;
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
    body.variant = String(level.variant);
    body.at = String(play.at);
    body.ask = level.ask;
    body.status = play.won ? 'won' : play.failed ? (busy ? 'busy' : 'failed') : busy ? 'busy' : 'playing';
  }

  const askLine = (): string => text().asks[level.ask];
  const usesStepper = (): boolean => level.answer === 'picker' && options.stepper();
  const isTried = (pick: number): boolean => play.tried.includes(pick);
  const lastNumber = (): number => level.numbers[level.numbers.length - 1] ?? 0;

  // ---------- The dock ----------

  function choiceButton(value: number, className: string, face: HTMLElement, label: string): HTMLButtonElement {
    const made = button(className);
    made.dataset.choice = String(value);
    made.append(face);
    if (isTried(value)) {
      made.classList.add('tried');
      made.setAttribute('aria-disabled', 'true');
    }
    made.setAttribute('aria-label', label);
    onPress(made, () => onChoice(value));
    return made;
  }

  function drawStep(show: HTMLElement): void {
    show.dataset.value = String(stepValue);
    const face = show.querySelector<HTMLElement>('.num');
    if (face) fillNumber(face, stepValue, stepValue <= 12);
    show.classList.toggle('tried', isTried(stepValue));
    dock.querySelector('.step-ok')?.classList.toggle('ready', stepValue !== 0);
  }

  function holdButton(label: string, delta: number, show: HTMLElement): HTMLButtonElement {
    const made = button('step-btn');
    made.textContent = delta < 0 ? '−' : '+';
    made.dataset.step = String(delta);
    made.setAttribute('aria-label', label);
    const nudge = (): void => {
      const next = Math.max(0, Math.min(lastNumber(), stepValue + delta));
      if (next === stepValue) return;
      stepValue = next;
      stepSound(stepValue);
      drawStep(show);
    };
    const release = (): void => window.clearTimeout(holdTimer);
    made.addEventListener('pointerdown', (event) => {
      if (event.button !== 0 || busy || play.won || play.failed) return;
      nudge();
      release();
      // Holding it down keeps counting, so 25 is a hold and not 25 taps.
      const repeat = (): void => {
        nudge();
        holdTimer = window.setTimeout(repeat, REPEAT_MS);
      };
      holdTimer = window.setTimeout(repeat, HOLD_MS);
    });
    for (const name of ['pointerup', 'pointercancel', 'pointerleave'] as const) made.addEventListener(name, release);
    made.addEventListener('click', (event) => {
      if (event.detail === 0 && !busy) nudge();
    });
    return made;
  }

  function stepperRow(): HTMLElement {
    const row = element('div', 'stepper');
    const show = element('div', 'step-show');
    show.append(numberBlock('num-step', stepValue, true));
    show.setAttribute('aria-live', 'polite');
    const ok = button('step-ok');
    ok.dataset.action = 'ok';
    ok.textContent = '✓';
    ok.setAttribute('aria-label', text().ok);
    onPress(ok, () => {
      if (stepValue === 0) {
        // Nothing set yet: + wiggles to say where to start.
        poke(dock.querySelector('[data-step="1"]'), 'poked');
        thumpSound();
        return;
      }
      onChoice(stepValue);
    });
    row.append(holdButton(text().less, -1, show), show, holdButton(text().more, 1, show), ok);
    drawStep(show);
    ok.classList.toggle('ready', stepValue !== 0);
    return row;
  }

  function answerRow(): HTMLElement {
    const row = element('div', 'answer');
    if (level.answer === 'maps') {
      const holder = element('div', 'maps');
      holder.append(...level.maps.map((map, at) => choiceButton(at, 'map-card', mapGrid(map), text().map(at + 1))));
      holder.querySelectorAll<HTMLElement>('.map-card').forEach((card, at) => card.style.setProperty('--i', String(at)));
      row.append(holder);
    } else if (usesStepper()) {
      row.append(stepperRow());
    } else if (level.answer === 'three') {
      const holder = element('div', 'choices');
      holder.append(...level.numbers.map((value) => choiceButton(value, 'choice', numberBlock('num-big', value, true), String(value))));
      holder.querySelectorAll<HTMLElement>('.choice').forEach((one, at) => one.style.setProperty('--i', String(at)));
      row.append(holder);
    } else {
      const grid = element('div', 'picker-grid');
      grid.dataset.count = String(level.numbers.length);
      grid.append(...level.numbers.map((value) => choiceButton(value, 'pick', numberBlock('num-pick', value, false), String(value))));
      grid.querySelectorAll<HTMLElement>('.pick').forEach((one, at) => one.style.setProperty('--i', String(at % 15)));
      row.append(grid);
    }
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

  function retryButton(): HTMLButtonElement {
    const made = button('retry');
    made.dataset.action = 'retry';
    made.textContent = '🔄';
    made.setAttribute('aria-label', text().retry);
    later(RETRY_ARMED_MS, () => made.classList.add('armed'));
    onPress(made, () => {
      if (!made.classList.contains('armed')) return;
      pickSound();
      options.onRetry();
    });
    return made;
  }

  function drawDock(): void {
    const parts: HTMLElement[] = [];
    if (play.failed) {
      if (!busy) parts.push(retryButton());
    } else if (!play.won) parts.push(answerRow());
    if (totalFails >= options.canSkipAfter && !play.won) parts.push(skipButton());
    dock.replaceChildren(...parts);
    dock.dataset.mode = play.failed ? 'retry' : usesStepper() ? 'stepper' : level.answer;
    mark();
  }

  function focusDock(): void {
    const target = dock.querySelector('.answer');
    if (!target) return;
    target.classList.remove('focus');
    void (target as HTMLElement).offsetWidth;
    target.classList.add('focus');
  }

  /** Every tap moves something, so it answers even with the sound off. */
  function poke(target: Element | null, className: string): void {
    if (!target) return;
    target.classList.remove(className);
    void (target as HTMLElement).offsetWidth;
    target.classList.add(className);
    later(650, () => target.classList.remove(className));
  }

  // ---------- Hints, nudges and demos ----------

  /** On the first world the stack counts itself slowly, a block at a time. Later the stack opens for a peek. */
  function showHint(): void {
    if (totalMisses < MISSES_BEFORE_HINT || play.won || play.failed) return;
    hintSound();
    if (level.world === 'see') {
      const steps = board.revealPlan('count');
      steps.forEach((step, at) =>
        later(400 + at * 650, () => {
          const lit = board.tapBlock(step.blocks[0]);
          knockSound(lit);
          speak(text().number(lit));
        }),
      );
      return;
    }
    board.open(true);
    openSound();
    void say(text().hint, { queue: true });
    later(PEEK_MS, () => {
      // A try that ended meanwhile keeps the stack open, to show what was hiding.
      if (!busy && !play.failed && !play.won) board.open(false);
    });
  }

  const answerSpot = (): Element | null => dock.querySelector('.answer');
  const stackSpot = (): Element | null => board.spot('stack');

  function waveAnswers(): void {
    const row = answerSpot();
    if (!row || calm()) return;
    row.classList.remove('wave');
    void (row as HTMLElement).offsetWidth;
    row.classList.add('wave');
    later(2400, () => row.classList.remove('wave'));
  }

  /**
   * The next thing to tap. On the stepper that's + until the number has moved, then ✓. Anywhere else it's the
   * stack, which says the question, while the answers bounce together. Never one answer alone.
   */
  function nextThing(): Element | null {
    if (play.failed) return dock.querySelector('[data-action="retry"]');
    if (usesStepper()) return dock.querySelector(stepValue === 0 ? '[data-step="1"]' : '[data-action="ok"]');
    waveAnswers();
    return stackSpot();
  }

  function armIdle(): void {
    window.clearTimeout(idleTimer);
    idleTimer = window.setTimeout(() => {
      if (stopped || play.won) return;
      if (!busy && !guide.busy) guide.point(nextThing());
      armIdle();
    }, IDLE_MS);
  }

  function woke(): void {
    introGoing = false;
    if (!guide.busy) guide.hide();
    armIdle();
  }

  function shown(): Demo[] {
    const saved = store.get<unknown>(SHOWN_KEY, []);
    return Array.isArray(saved) ? (saved.filter((one) => typeof one === 'string') as Demo[]) : [];
  }

  function remember(demo: Demo): void {
    store.set(SHOWN_KEY, [...shown(), demo]);
  }

  /** The first time an idea appears, a hand shows it once without words. */
  function demoFor(): { key: Demo; steps: DemoStep[] } | null {
    const seen = shown();
    const inDock = (selector: string) => () => dock.querySelector(selector);
    const tapping = board
      .revealPlan('count')
      .slice(0, 5)
      .map(
        (step): DemoStep => ({
          at: () => board.spot('block', step.blocks[0]),
          ms: 700,
          act() {
            const lit = board.tapBlock(step.blocks[0]);
            knockSound(lit);
            speak(text().number(lit));
          },
        }),
      );
    const demos: { key: Demo; when: boolean; steps: DemoStep[] }[] = [
      { key: 'count', when: level.answer === 'three', steps: [...tapping, { at: stackSpot, ms: 1500, glow: answerSpot }] },
      {
        key: 'turn',
        when: level.turn,
        steps: [
          { at: () => board.spot('turn'), ms: 1300, act: () => board.turn() },
          { at: () => board.spot('turn'), ms: 1000 },
        ],
      },
      {
        key: 'stepper',
        when: usesStepper(),
        steps: [
          { at: inDock('[data-step="1"]'), ms: 1200, className: 'poked' },
          { at: inDock('[data-action="ok"]'), ms: 1200, className: 'poked' },
        ],
      },
      {
        key: 'fill',
        when: level.ask === 'fill',
        steps: [
          { at: () => board.spot('box'), ms: 1500, act: () => board.flash('box') },
          { at: stackSpot, ms: 1400, glow: answerSpot },
        ],
      },
      {
        key: 'map',
        when: level.ask === 'map',
        steps: [
          { at: () => board.spot('peg'), ms: 1500, act: () => board.flash('peg') },
          { at: inDock('.map-card .peg-dot'), ms: 1300, glow: answerSpot },
          { at: stackSpot, ms: 1200, glow: answerSpot },
        ],
      },
    ];
    return demos.find((demo) => demo.when && !seen.includes(demo.key)) ?? null;
  }

  function runDemo(): void {
    const demo = demoFor();
    if (!demo) return;
    remember(demo.key);
    later(DEMO_AFTER_MS, () => guide.demo(demo.steps));
  }

  // ---------- The curtain call ----------

  function missed(): void {
    totalMisses += 1;
    missedHere = true;
    options.onMiss();
  }

  const revealKind = (): RevealKind => level.ask;

  /** Every block bows in turn with its number. Returns when the last one has bowed. */
  function curtainCall(): number {
    const kind = revealKind();
    const steps = board.revealPlan(kind);
    const sayEach = kind !== 'map' && steps.length <= SAY_EACH_UP_TO;
    const per = kind === 'map' ? MAP_BOW_MS : sayEach ? BOW_MS : Math.max(FASTEST_BOW_MS, QUICK_COUNT_MS / steps.length);
    const firstHidden = steps.findIndex((step) => step.hidden);
    // "Fill the box" turns the stack to glass at once, so new blocks dropping in at the back still show.
    if (kind === 'fill') later(LEAD_MS - 200, () => board.open(true));
    if (kind === 'count' && firstHidden >= 0) {
      later(LEAD_MS + firstHidden * per - OPEN_BEFORE_MS, () => {
        board.open(true);
        openSound();
      });
    }
    steps.forEach((step: RevealStep, at) => {
      const when = LEAD_MS + at * per + (kind === 'count' && firstHidden >= 0 && at >= firstHidden ? OPEN_BEFORE_MS : 0);
      later(when, () => {
        board.bow(step, kind);
        bowSound(kind === 'map' ? step.n * 2 + at : at, step.hidden);
        if (sayEach) speak(text().number(step.n));
      });
    });
    return LEAD_MS + steps.length * per + (firstHidden >= 0 ? OPEN_BEFORE_MS : 0);
  }

  function cheerLine(): string {
    if (level.ask === 'fill') return text().cheerFill(level.truth);
    if (level.ask === 'map') return text().cheerMap;
    return text().cheerCount(level.truth);
  }

  const bannerText = (): string => (level.ask === 'fill' ? `+${level.truth}` : level.ask === 'map' ? '✓' : String(level.truth));

  function rightAnswer(advanced: boolean): void {
    rightSound();
    board.banner(null);
    board.lock(true);
    const done = curtainCall();
    later(done + CHEER_AFTER_MS, () => {
      board.banner(bannerText(), 'right');
      bravoSound();
      if (!calm()) {
        const box = document.querySelector('#board .total')?.getBoundingClientRect();
        if (box) burst(box.left + box.width / 2, box.top + box.height / 2, 20);
      }
      void say(cheerLine());
      if (missedHere && level.hidden.length) void say(text().hiding, { queue: true });
    });
    later(done + CHEER_AFTER_MS + (advanced ? NEXT_AFTER_MS : WIN_AFTER_MS), advanced ? nextPuzzle : win);
  }

  function wrongAnswer(): void {
    const reaction = reactions % text().oops.length;
    reactions += 1;
    missed();
    board.wobble();
    wobbleSound(reaction);
    if (play.failed) {
      fail();
      return;
    }
    void say(text().oops[reaction]);
    later(WRONG_MS, () => {
      busy = false;
      drawDock();
      showHint();
    });
  }

  /** The try is over: the stack opens to show what was hiding and its count, and 🔄 is ready at once. */
  function fail(): void {
    totalFails += 1;
    options.onFail(totalFails);
    board.open(true);
    // The blocks that were hiding come out pink with their numbers, just as in the curtain call.
    for (const step of board.revealPlan('count')) if (step.hidden) board.bow(step, 'count');
    board.lock(true);
    board.banner(bannerText(), 'wrong');
    failSound();
    void say(text().failed, { queue: true });
    if (totalFails === options.canSkipAfter) void say(text().canSkip, { queue: true });
    busy = false;
    drawDock();
  }

  function onChoice(pick: number): void {
    if (busy || play.won || play.failed || isTried(pick)) return;
    const result = answer(play, pick);
    if (!result) return;
    play = result.play;
    busy = true;
    guide.hide();
    window.clearTimeout(holdTimer);
    drawDock();
    if (result.right) rightAnswer(result.solvedOne);
    else wrongAnswer();
  }

  // ---------- Puzzles coming on ----------

  function showPuzzle(): void {
    board.show(level);
    landSound();
    stepValue = 0;
    missedHere = false;
  }

  function nextPuzzle(): void {
    level = puzzleOf(play);
    busy = false;
    showPuzzle();
    drawDock();
    armIdle();
    void say(text().nextOne);
    void say(askLine(), { queue: true });
    if (totalMisses >= MISSES_BEFORE_HINT) later(DEMO_AFTER_MS, showHint);
  }

  function win(): void {
    guide.hide();
    mark();
    options.onWin({ level: puzzles[0], stars: starsFor(totalMisses), misses: totalMisses });
  }

  /** The idea, then the question. A tap stops the rest, so it never talks over what the child asked to hear. */
  async function sayIntro(): Promise<void> {
    introGoing = true;
    if (options.firstOfWorld) await say(text().ideas[level.world]);
    if (!stopped && introGoing) void say(askLine(), { queue: true });
  }

  function begin(): void {
    busy = false;
    showPuzzle();
    drawDock();
    armIdle();
    void sayIntro();
    runDemo();
    if (totalMisses >= MISSES_BEFORE_HINT) later(DEMO_AFTER_MS, showHint);
  }

  // ---------- Taps on the stage ----------

  board.onTap((tap) => {
    if (stopped) return;
    if (tap.block) {
      knockSound(tap.lit);
      if (tap.lit > 0) speak(text().number(tap.lit));
      return;
    }
    thumpSound();
    if (busy || play.won) return;
    speak(play.failed ? text().failed : askLine());
    if (!play.failed) focusDock();
  });
  board.onTurn(() => {
    if (!stopped) turnSound();
  });

  document.addEventListener('pointerdown', woke, true);
  // The first stack of the second world waits for a short lesson: a block can't float.
  if (level.world === 'hide' && options.firstOfWorld && !shown().includes('lesson')) {
    remember('lesson');
    busy = true;
    drawDock();
    const ms = board.lesson();
    void say(text().lesson);
    later(1500, () => landSound());
    later(ms, begin);
  } else begin();

  return {
    relabel() {
      if (!play.won && !busy) drawDock();
    },
    redock() {
      if (!play.won && !busy) drawDock();
      board.layout();
    },
    sayAgain() {
      if (play.won) return;
      void say(text().ideas[level.world]);
      void say(play.failed ? text().failed : askLine(), { queue: true });
    },
    stop() {
      stopped = true;
      for (const timer of timers) window.clearTimeout(timer);
      timers.clear();
      window.clearTimeout(idleTimer);
      window.clearTimeout(holdTimer);
      document.removeEventListener('pointerdown', woke, true);
      guide.hide();
      board.clear();
      stopSounds();
      delete document.body.dataset.status;
    },
  };
}
