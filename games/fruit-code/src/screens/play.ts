// One try at a level on screen: tapping rows and fruits, the number buttons, the sticker slap for a found fruit,
// the funny faces for a wrong number, the mixed-up reset when a try runs out, the hint, the idle nudge and the
// one-time demos of each new idea.
import { burst, say, speak, store } from '@playroom/kit';
import { text } from '../lang/index.ts';
import { loneFruit, type Fruit, type Term } from '../rules/equation.ts';
import type { Level } from '../rules/levels.ts';
import { answer, choicesOf, select, startPlay, starsFor, type Play } from '../rules/play.ts';
import { nextStep, plan } from '../rules/solve.ts';
import { fruitSound, hintSound, oopsSound, pickSound, rightSound, rowSound, stepSound, stopSounds } from '../sounds.ts';
import { button, calm, element, onPress } from '../ui.ts';
import type { BoardView, RowId } from '../view/board.ts';
import type { DemoStep, Guide } from '../view/guide.ts';
import { numberFace, promptArt } from '../view/pictures.ts';

const WRONG_MS = 1100;
const RIGHT_MS = 900;
const FAIL_MS = 1300;
const RETRY_ARMED_MS = 600;
const MISSES_BEFORE_HINT = 2;
const IDLE_MS = 8000;
const DEMO_AFTER_MS = 700;
const HOLD_MS = 420;
const REPEAT_MS = 130;
const SHOWN_KEY = 'fruit-code:shown';

export interface WinReport {
  level: Level;
  stars: number;
  misses: number;
}

export interface PlayScreenOptions {
  level: Level;
  board: BoardView;
  dock: HTMLElement;
  guide: Guide;
  /** Misses on this level before this try, so the hint can count them all. */
  missesBefore: number;
  /** Failed tries on this level before this one, for the skip button. */
  failsBefore: number;
  canSkipAfter: number;
  /** The 0 to 20 numbers as a −/+ stepper, for phones, instead of a grid. */
  stepper: () => boolean;
  onMiss: (total: number) => void;
  onFail: (total: number) => void;
  onRetry: () => void;
  onSkip: () => void;
  onWin: (report: WinReport) => void;
}

export interface PlayScreen {
  relabel(): void;
  /** The stepper and the grid swap when the screen turns. */
  redock(): void;
  /** Says the instruction again, for the 🔊 button. */
  sayAgain(): void;
  stop(): void;
}

const one = (fruit: Fruit): Term => ({ fruit, shape: 'one', count: 1, sign: 1 });

type Demo = 'choose' | 'select' | 'stepper' | 'bunch' | 'times' | 'minus';

export function startPlayScreen(options: PlayScreenOptions): PlayScreen {
  const { level, board, dock, guide } = options;
  let play: Play = startPlay(level);
  let busy = false;
  let stopped = false;
  let reactions = 0;
  let stepValue = 0;
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
    body.target = play.target;
    body.known = Object.keys(play.known).join(',');
    body.variant = String(level.variant);
    body.status = play.won ? 'won' : play.failed ? 'failed' : busy ? 'busy' : 'playing';
  }

  /** What the number buttons are setting, as pictures. */
  const targetTerms = (): Term[] => (play.target === 'question' ? level.puzzle.question : [one(play.target)]);
  const askLine = (): string => text().ask(targetTerms());
  const rowLine = (id: RowId): string => (id === 'q' ? text().ask(level.puzzle.question) : text().row(level.puzzle.clues[id]));
  const usesStepper = (): boolean => level.answer === 'picker' && options.stepper();

  function sayIntro(): void {
    void say(text().ideas[level.world]);
    void say(text().ask(level.puzzle.question), { queue: true });
  }

  // ---------- The dock ----------

  function choiceButton(value: number, big: boolean): HTMLButtonElement {
    const made = button(big ? 'choice' : 'pick');
    made.dataset.choice = String(value);
    if (big) made.append(numberFace(value));
    else {
      const digit = element('span', 'digit');
      digit.textContent = String(value);
      made.append(digit);
    }
    if (play.tried[play.target]?.includes(value)) {
      made.classList.add('tried');
      made.setAttribute('aria-disabled', 'true');
    }
    made.setAttribute('aria-label', String(value));
    onPress(made, () => onChoice(value));
    return made;
  }

  function prompt(): HTMLElement {
    const made = element('div', 'prompt');
    made.dataset.target = play.target;
    made.append(promptArt(targetTerms()));
    const equals = element('span', 'prompt-equals');
    equals.textContent = '= ?';
    made.append(equals);
    made.setAttribute('aria-label', text().pickFor(targetTerms()));
    return made;
  }

  /** Shows the stepper's number with its dots, and dims it if it was already tried for this target. */
  function drawStep(show: HTMLElement): void {
    show.dataset.value = String(stepValue);
    const face = show.querySelector('.step-face');
    face?.replaceChildren(numberFace(stepValue));
    show.classList.toggle('tried', play.tried[play.target]?.includes(stepValue) ?? false);
  }

  function holdButton(className: string, label: string, delta: number, show: HTMLElement): HTMLButtonElement {
    const made = button(className);
    made.textContent = delta < 0 ? '−' : '+';
    made.dataset.step = String(delta);
    made.setAttribute('aria-label', label);
    const nudge = (): void => {
      const next = Math.max(0, Math.min(20, stepValue + delta));
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
      // Holding it down keeps counting, so 15 is a hold and not 15 taps.
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
    show.append(promptArt(targetTerms()), element('span', 'step-face'));
    show.setAttribute('aria-live', 'polite');
    drawStep(show);
    const ok = button('step-ok');
    ok.dataset.action = 'ok';
    ok.textContent = '✓';
    ok.setAttribute('aria-label', text().ok);
    onPress(ok, () => onChoice(stepValue));
    row.append(holdButton('step-btn', text().less, -1, show), show, holdButton('step-btn', text().more, 1, show), ok);
    return row;
  }

  function answerRow(): HTMLElement {
    const row = element('div', 'answer');
    if (usesStepper()) {
      row.append(stepperRow());
      return row;
    }
    row.append(prompt());
    const choices = choicesOf(play);
    if (level.answer === 'three') {
      const holder = element('div', 'choices');
      holder.append(...choices.map((value) => choiceButton(value, true)));
      row.append(holder);
      return row;
    }
    const grid = element('div', 'picker-grid');
    grid.append(...choices.map((value) => choiceButton(value, false)));
    row.append(grid);
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
    // The retry button waits for the tumble, so a mashing hand can't skip past it.
    if (play.failed) {
      if (!busy) parts.push(retryButton());
    }
    else if (!play.won) parts.push(answerRow());
    if (totalFails >= options.canSkipAfter && !play.won) parts.push(skipButton());
    dock.replaceChildren(...parts);
    dock.dataset.mode = play.failed ? 'retry' : usesStepper() ? 'stepper' : level.answer;
    mark();
  }

  /** Tapping the thing being asked about lights up the numbers, so a child knows where to go next. */
  function focusDock(): void {
    const target = dock.querySelector('.answer');
    if (!target) return;
    target.classList.remove('focus');
    void (target as HTMLElement).offsetWidth;
    target.classList.add('focus');
  }

  // ---------- Hints, nudges and demos ----------

  function showHint(): void {
    if (totalMisses < MISSES_BEFORE_HINT || play.won || play.failed) return;
    const step = nextStep(level.puzzle, play.known);
    if (!step) return;
    if (step.kind === 'fruit') board.hint(step.rows, step.fruit);
    else board.hint(['q'], null);
    hintSound();
    void say(text().hint, { queue: true });
  }

  /** The next thing to tap: the fruit to work out next, or the numbers once it is picked. */
  function nextThing(): Element | null {
    if (play.failed) return dock.querySelector('[data-action="retry"]');
    const step = nextStep(level.puzzle, play.known);
    const lone = loneFruit(level.puzzle);
    if (step?.kind === 'fruit' && step.fruit !== lone && play.target !== step.fruit) {
      return document.querySelector(`#board [data-row="${step.rows[0]}"] .fruit[data-fruit="${step.fruit}"]`);
    }
    return dock.querySelector('.step-show, .choices, .picker-grid');
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
    if (!guide.busy) guide.hide();
    armIdle();
  }

  function shown(): Demo[] {
    const saved = store.get<unknown>(SHOWN_KEY, []);
    return Array.isArray(saved) ? (saved.filter((one) => typeof one === 'string') as Demo[]) : [];
  }

  /** The first time an idea appears, a hand shows it once. */
  function demoFor(): { key: Demo; steps: DemoStep[] } | null {
    const seen = shown();
    const terms = level.puzzle.clues.flatMap((row) => row.terms);
    const first = (selector: string) => () => document.querySelector(`#board ${selector}`);
    const lone = loneFruit(level.puzzle);
    const between = plan(level.puzzle).find((step) => step.kind === 'fruit' && step.fruit !== lone);
    const demos: { key: Demo; when: boolean; steps: DemoStep[] }[] = [
      {
        key: 'choose',
        when: level.answer === 'three',
        steps: [
          { at: first('[data-row="0"] .total'), ms: 1300 },
          { at: () => dock.querySelector('.choices'), ms: 1400 },
        ],
      },
      {
        key: 'select',
        when: between?.kind === 'fruit',
        steps: [
          { at: first(`.fruit[data-fruit="${between?.kind === 'fruit' ? between.fruit : ''}"]`), ms: 1400, className: 'selected' },
          { at: () => dock.querySelector('.answer'), ms: 1300 },
        ],
      },
      {
        key: 'stepper',
        when: usesStepper(),
        steps: [
          { at: () => dock.querySelector('[data-step="1"]'), ms: 1200 },
          { at: () => dock.querySelector('.step-show'), ms: 900 },
          { at: () => dock.querySelector('[data-action="ok"]'), ms: 1200 },
        ],
      },
      { key: 'bunch', when: terms.some((term) => term.shape === 'bunch'), steps: [{ at: first('.shape-bunch'), ms: 2200, className: 'count-demo' }] },
      { key: 'times', when: terms.some((term) => term.shape === 'times'), steps: [{ at: first('.shape-times'), ms: 2000, className: 'count-demo' }] },
      { key: 'minus', when: terms.some((term) => term.sign < 0), steps: [{ at: first('.op-minus'), ms: 1800, className: 'count-demo' }] },
    ];
    return demos.find((demo) => demo.when && !seen.includes(demo.key)) ?? null;
  }

  function runDemo(): void {
    const demo = demoFor();
    if (!demo) return;
    store.set(SHOWN_KEY, [...shown(), demo.key]);
    later(DEMO_AFTER_MS, () => guide.demo(demo.steps));
  }

  // ---------- Taps ----------

  function missed(): void {
    totalMisses += 1;
    options.onMiss(totalMisses);
  }

  function retarget(next: Play): boolean {
    const changed = next.target !== play.target;
    play = next;
    if (!changed) return false;
    stepValue = 0;
    board.update(play);
    drawDock();
    return true;
  }

  function onFruit(fruit: Fruit, row: RowId): void {
    fruitSound(fruit);
    if (busy || play.won || play.failed) {
      speak(rowLine(row));
      return;
    }
    const changed = retarget(select(play, fruit));
    speak(rowLine(row));
    if (play.known[fruit] === undefined) focusDock();
    if (changed) void say(askLine(), { queue: true });
  }

  function onRow(row: RowId): void {
    rowSound();
    speak(rowLine(row));
    if (row !== 'q' || busy || play.won || play.failed) return;
    retarget(select(play, 'question'));
    focusDock();
  }

  function burstOn(fruit: Fruit | null): void {
    if (calm()) return;
    const spots = fruit
      ? [...document.querySelectorAll<HTMLElement>(`#board .fruit[data-fruit="${fruit}"]`)]
      : [...document.querySelectorAll<HTMLElement>('#board .row-question .total')];
    const first = spots[0]?.getBoundingClientRect();
    if (first) burst(first.left + first.width / 2, first.top + first.height / 2, 14);
  }

  function win(): void {
    guide.hide();
    board.update({ ...play, known: { ...level.values } });
    burstOn(null);
    mark();
    options.onWin({ level, stars: starsFor(play.misses), misses: play.misses });
  }

  function fail(): void {
    totalFails += 1;
    options.onFail(totalFails);
    board.scramble();
    oopsSound(1);
    void say(text().failed, { queue: true });
    if (totalFails === options.canSkipAfter) void say(text().canSkip, { queue: true });
    later(FAIL_MS, () => {
      busy = false;
      drawDock();
    });
  }

  function onChoice(value: number): void {
    if (busy || play.won || play.failed || play.tried[play.target]?.includes(value)) return;
    const before = play;
    const result = answer(play, value);
    if (!result) return;
    play = result.play;
    busy = true;
    guide.hide();
    drawDock();
    if (!result.right) {
      const reaction = reactions;
      reactions += 1;
      board.wrong(before, value, result.checks, reaction);
      oopsSound(reaction % text().oops.length);
      void say(text().oops[reaction % text().oops.length]);
      missed();
      later(WRONG_MS, () => {
        board.update(play);
        if (play.failed) {
          fail();
          return;
        }
        busy = false;
        drawDock();
        showHint();
      });
      return;
    }
    rightSound();
    let wait = RIGHT_MS;
    if (result.decoded) {
      wait = Math.max(wait, board.slap(play, result.decoded));
      burstOn(result.decoded);
      void say(text().found(result.decoded, value));
    } else {
      void say(text().cheer(value));
    }
    later(wait, () => {
      if (play.won) {
        win();
        return;
      }
      busy = false;
      stepValue = 0;
      board.update(play);
      drawDock();
      void say(askLine(), { queue: true });
    });
  }

  board.onFruit(onFruit);
  board.onRow(onRow);
  // The dock first, so the board is sized in the room that is really left for it.
  drawDock();
  board.show(level);
  board.update(play);
  document.addEventListener('pointerdown', woke, true);
  armIdle();
  sayIntro();
  runDemo();
  if (totalMisses >= MISSES_BEFORE_HINT) later(DEMO_AFTER_MS, showHint);

  return {
    relabel() {
      if (!play.won) drawDock();
      board.update(play);
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
      stopSounds();
      delete document.body.dataset.status;
    },
  };
}
