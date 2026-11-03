// One try at a level on screen: a shift of three puzzles on the machine, the answer tokens, cards or stepper, the
// machine running each answer, a lamp and a cheer for each solved puzzle, the funny sputter for a wrong one, the
// wobble when a try runs out, the hint, the idle nudge and the one-time demos of each new idea.
import { burst, say, speak, store } from '@playroom/kit';
import { text } from '../lang/index.ts';
import { MOST, type Level } from '../rules/levels.ts';
import { cardKey, hiddenSlot, hiddenSlots, isRuleAsk, steps, type Card } from '../rules/machine.ts';
import { answer, current, pickKey, startPlay, starsFor, type Pick, type Play, type Why } from '../rules/play.ts';
import {
  checkSound,
  clankSound,
  hintSound,
  pickSound,
  rightSound,
  rollSound,
  sputterSound,
  stepSound,
  stopSounds,
  tockSound,
  whirSound,
  wobbleSound,
} from '../sounds.ts';
import { button, calm, element, onPress } from '../ui.ts';
import type { BoardView, SlotId } from '../view/board.ts';
import type { DemoStep, Guide } from '../view/guide.ts';
import { fillToken, ruleFace, token } from '../view/tokens.ts';

const RUN_MS = 900;
const CHECK_STAGGER_MS = 260;
const WRONG_SHOW_MS = 1200;
const WRONG_CARD_MS = 1700;
const WIN_AFTER_MS = 1300;
/** After a solved puzzle that isn't the last of the shift: the lamp lights, a cheer, then the next machine. */
const NEXT_AFTER_MS = 1200;
/** The miss that ends a try runs the machine quickly, so 🔄 is ready to tap within about a second. */
const LOSING_RUN_MS = 320;
const RETRY_ARMED_MS = 420;
const MISSES_BEFORE_HINT = 2;
const PEEK_MS = 1800;
const IDLE_MS = 8000;
const DEMO_AFTER_MS = 700;
const HOLD_MS = 420;
const REPEAT_MS = 130;
const SHOWN_KEY = 'magic-machine:shown';

export interface WinReport {
  level: Level;
  stars: number;
  misses: number;
}

export interface PlayScreenOptions {
  /** The puzzles of this go, all of one level and one shape. */
  shift: readonly Level[];
  board: BoardView;
  dock: HTMLElement;
  guide: Guide;
  /** Misses on this level since it was last won, before this try. Stars and the hint count them all. */
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

type Demo = 'choose' | 'cards' | 'stepper' | 'backwards' | 'fix' | 'pair' | 'chain';

export function startPlayScreen(options: PlayScreenOptions): PlayScreen {
  const { shift, board, dock, guide } = options;
  let play: Play = startPlay(shift);
  // The puzzle on the machine now. They change together when the shift moves on.
  let level = current(play);
  let puzzle = level.puzzle;
  let slot = hiddenSlot(puzzle);
  let slots = hiddenSlots(puzzle);
  let runMs = RUN_MS * puzzle.machines.length * 0.75;
  let busy = false;
  let stopped = false;
  let reactions = 0;
  let stepValue = 0;
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
    body.ask = puzzle.ask;
    body.status = play.won ? 'won' : play.failed ? (busy ? 'busy' : 'failed') : busy ? 'busy' : 'playing';
  }

  function askLine(): string {
    const words = text();
    if (puzzle.ask === 'out') return words.askOut(puzzle.given as number);
    if (puzzle.ask === 'in') return words.askIn(puzzle.given as number);
    if (puzzle.ask === 'rule' && puzzle.machines.length > 1) return words.askSecond;
    if (puzzle.ask === 'fix' && slots.length > 1) return words.askPair;
    return words.asks[puzzle.ask];
  }

  const usesStepper = (): boolean => level.answer === 'picker' && options.stepper();
  const isTried = (pick: Pick): boolean => play.tried.includes(pickKey(pick));

  /**
   * The idea, the examples on the first worlds, then the question. Each example lights up as it is read. A tap
   * stops the rest, so it never talks over what the child asked to hear.
   */
  async function sayIntro(first: string): Promise<void> {
    introGoing = true;
    await say(first);
    if (level.answer !== 'picker' && (level.world === 'add' || level.world === 'take')) {
      for (const [index, pair] of puzzle.examples.entries()) {
        if (stopped || !introGoing) return;
        flashPair(index);
        await say(text().pair(pair.from, pair.to));
      }
    }
    if (!stopped && introGoing) void say(askLine());
  }

  function flashPair(index: number): void {
    const chip = document.querySelector(`#board .pair[data-pair="${index}"]`);
    if (!chip) return;
    chip.classList.remove('reading');
    void (chip as HTMLElement).offsetWidth;
    chip.classList.add('reading');
  }

  // ---------- The dock ----------

  function numberButton(value: number, big: boolean, at: number): HTMLButtonElement {
    const made = button(big ? 'choice' : 'pick');
    made.style.setProperty('--i', String(at));
    made.dataset.choice = String(value);
    made.append(token(big ? 'token-choice' : 'token-pick', value));
    if (isTried(value)) {
      made.classList.add('tried');
      made.setAttribute('aria-disabled', 'true');
    }
    made.setAttribute('aria-label', String(value));
    onPress(made, () => onChoice(value));
    return made;
  }

  /** A card shows its rule, or for two shut plates its two rules in order with an arrow between. */
  function cardButton(card: Card, at: number): HTMLButtonElement {
    const made = button(card.length > 1 ? 'card-pick card-pair' : 'card-pick');
    made.dataset.card = cardKey(card);
    made.style.setProperty('--i', String(at));
    card.forEach((rule, place) => {
      if (place > 0) {
        const arrow = element('span', 'card-then');
        arrow.textContent = '➜';
        made.append(arrow);
      }
      made.append(ruleFace(rule));
    });
    if (isTried(card)) {
      made.classList.add('tried');
      made.setAttribute('aria-disabled', 'true');
    }
    made.setAttribute('aria-label', card.map(text().ruleLabel).join(', '));
    onPress(made, () => onChoice(card));
    return made;
  }

  /** Shows the stepper's number with its dots, and dims it if it was already tried. */
  function drawStep(show: HTMLElement): void {
    show.dataset.value = String(stepValue);
    const face = show.querySelector<HTMLElement>('.token');
    if (face) fillToken(face, stepValue);
    show.classList.toggle('tried', isTried(stepValue));
    // Once a number is set, ✓ pulses gently: that's where it goes in.
    dock.querySelector('.step-ok')?.classList.toggle('ready', stepValue !== 0);
  }

  function holdButton(label: string, delta: number, show: HTMLElement): HTMLButtonElement {
    const made = button('step-btn');
    made.textContent = delta < 0 ? '−' : '+';
    made.dataset.step = String(delta);
    made.setAttribute('aria-label', label);
    const nudge = (): void => {
      const next = Math.max(0, Math.min(MOST, stepValue + delta));
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
    show.append(token('token-step', stepValue));
    show.setAttribute('aria-live', 'polite');
    drawStep(show);
    const ok = button('step-ok');
    ok.dataset.action = 'ok';
    ok.textContent = '✓';
    ok.setAttribute('aria-label', text().ok);
    onPress(ok, () => onChoice(stepValue));
    ok.classList.toggle('ready', stepValue !== 0);
    row.append(holdButton(text().less, -1, show), show, holdButton(text().more, 1, show), ok);
    return row;
  }

  function answerRow(): HTMLElement {
    const row = element('div', 'answer');
    if (level.answer === 'cards') {
      const holder = element('div', 'cards');
      holder.dataset.count = String(level.cards.length);
      holder.append(...level.cards.map(cardButton));
      row.append(holder);
    } else if (usesStepper()) {
      row.append(stepperRow());
    } else if (level.answer === 'three') {
      const holder = element('div', 'choices');
      holder.append(...level.numbers.map((value, at) => numberButton(value, true, at)));
      row.append(holder);
    } else {
      const grid = element('div', 'picker-grid');
      grid.append(...level.numbers.map((value, at) => numberButton(value, false, at)));
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
    // The retry button waits for the wobble, so a mashing hand can't skip past it.
    if (play.failed) {
      if (!busy) parts.push(retryButton());
    } else if (!play.won) parts.push(answerRow());
    if (totalFails >= options.canSkipAfter && !play.won) parts.push(skipButton());
    dock.replaceChildren(...parts);
    dock.dataset.mode = play.failed ? 'retry' : usesStepper() ? 'stepper' : level.answer;
    mark();
  }

  /** Tapping the thing being asked about lights up the answers, so a child knows where to go next. */
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
    hintSound();
    if (isRuleAsk(puzzle.ask)) {
      board.hint('pairs');
      void say(text().checkAll, { queue: true });
    } else if (puzzle.open.every(Boolean)) {
      board.hint('plates');
      void say(text().hint, { queue: true });
    } else {
      // A quick peek behind the plate makes the answer easier to spot, and the plate shuts again.
      board.peek(PEEK_MS);
      void say(text().peek, { queue: true });
    }
  }

  /** What is being asked about: the "?" in the chute, the "?" in the hopper, or the shut plate. */
  function askedThing(): Element | null {
    if (puzzle.ask === 'out') return document.querySelector('#board .slot-out');
    if (puzzle.ask === 'in') return document.querySelector('#board .slot-in');
    return document.querySelector(`#board .plate[data-plate="${slot}"]`);
  }

  const answerSpot = (): Element | null => dock.querySelector('.answer');

  /** Every answer bounces in turn, left to right, so the whole row says "pick one" and none looks like a hint. */
  function waveAnswers(): void {
    const row = answerSpot();
    if (!row || calm()) return;
    row.classList.remove('wave');
    void (row as HTMLElement).offsetWidth;
    row.classList.add('wave');
    const count = row.querySelectorAll('.choice, .card-pick, .pick').length;
    later(500 + count * 120, () => row.classList.remove('wave'));
  }

  /**
   * The next thing to tap. On the stepper that's + until the number has moved, then ✓. Anywhere else it's the
   * thing asked about, which lights up the answers, while the answers bounce together. Never one answer alone,
   * since a hand resting on one would look like a hint.
   */
  function nextThing(): Element | null {
    if (play.failed) return dock.querySelector('[data-action="retry"]');
    if (usesStepper()) return dock.querySelector(stepValue === 0 ? '[data-step="1"]' : '[data-action="ok"]');
    waveAnswers();
    return askedThing();
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

  /** The first time an idea appears, a hand shows it once. */
  function demoFor(): { key: Demo; steps: DemoStep[] } | null {
    const seen = shown();
    const onBoard = (selector: string) => () => document.querySelector(`#board ${selector}`);
    const inDock = (selector: string) => () => dock.querySelector(selector);
    const pairs = puzzle.examples.map((_, index): DemoStep => ({ at: onBoard(`.pair[data-pair="${index}"]`), ms: 900, className: 'reading' }));
    const demos: { key: Demo; when: boolean; steps: DemoStep[] }[] = [
      {
        key: 'choose',
        when: level.answer === 'three' && puzzle.ask === 'out',
        steps: [...pairs, { at: onBoard('.slot-out'), ms: 1100, className: 'poked' }, { at: onBoard('.slot-out'), ms: 1400, glow: answerSpot }],
      },
      {
        key: 'backwards',
        when: puzzle.ask === 'in',
        steps: [
          { at: onBoard('.slot-out'), ms: 1100, className: 'poked' },
          { at: onBoard('.plate'), ms: 900, className: 'shush' },
          { at: onBoard('.slot-in'), ms: 1100, className: 'poked' },
          { at: onBoard('.slot-in'), ms: 1300, glow: answerSpot },
        ],
      },
      {
        key: 'cards',
        when: level.answer === 'cards' && puzzle.ask === 'rule',
        steps: [
          { at: onBoard(`.plate[data-plate="${slot}"]`), ms: 1200, className: 'shush' },
          ...pairs,
          { at: onBoard(`.plate[data-plate="${slot}"]`), ms: 1400, glow: answerSpot },
        ],
      },
      {
        key: 'fix',
        when: puzzle.ask === 'fix' && slots.length === 1,
        steps: [{ at: onBoard('.plate'), ms: 1100, className: 'shush', glow: answerSpot }, ...pairs, { at: onBoard('.plate'), ms: 1100, className: 'shush' }],
      },
      {
        key: 'pair',
        when: puzzle.ask === 'fix' && slots.length > 1,
        steps: [
          ...slots.map((at): DemoStep => ({ at: onBoard(`.plate[data-plate="${at}"]`), ms: 900, className: 'shush' })),
          ...pairs,
          { at: onBoard(`.plate[data-plate="${slots[0]}"]`), ms: 1300, glow: answerSpot },
        ],
      },
      {
        key: 'chain',
        when: puzzle.machines.length > 1,
        steps: [
          { at: onBoard('.slot-in'), ms: 900, className: 'poked' },
          ...puzzle.machines.map((_, at): DemoStep => ({ at: onBoard(`.plate[data-plate="${at}"]`), ms: 900, className: 'shush' })),
          { at: onBoard('.slot-out'), ms: 1000, className: 'poked' },
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
    ];
    return demos.find((demo) => demo.when && !seen.includes(demo.key)) ?? null;
  }

  function runDemo(): void {
    const demo = demoFor();
    if (!demo) return;
    store.set(SHOWN_KEY, [...shown(), demo.key]);
    later(DEMO_AFTER_MS, () => guide.demo(demo.steps));
  }

  // ---------- Running the machine ----------

  function missed(): void {
    totalMisses += 1;
    options.onMiss(totalMisses);
  }

  function burstOn(selector: string): void {
    if (calm()) return;
    const box = document.querySelector(`#board ${selector}`)?.getBoundingClientRect();
    if (box) burst(box.left + box.width / 2, box.top + box.height / 2, 16);
  }

  /** Puts the answer into the machine and runs it. The machine takes about runMs, then the result lands. */
  function runWith(pick: Pick, smoke: boolean, ms = runMs): void {
    if (typeof pick !== 'number') {
      slots.forEach((at, place) => {
        board.setPlate(at, pick[place]);
        document.querySelector(`#board .plate[data-plate="${at}"]`)?.classList.add('trying');
      });
      void say(text().rules(pick));
    } else if (puzzle.ask === 'in') board.setSlot('in', pick);
    later(typeof pick === 'number' && puzzle.ask === 'in' ? Math.min(220, ms / 3) : 0, () => {
      board.drop();
      clankSound();
    });
    board.churn(ms, smoke);
    whirSound(ms);
  }

  /** The next puzzle of the shift goes on the machine, with a cheer and its question. */
  function nextPuzzle(): void {
    level = current(play);
    puzzle = level.puzzle;
    slot = hiddenSlot(puzzle);
    slots = hiddenSlots(puzzle);
    runMs = RUN_MS * puzzle.machines.length * 0.75;
    stepValue = 0;
    busy = false;
    board.show(level);
    resetSlots();
    board.setLamps(play.at, shift.length);
    drawDock();
    armIdle();
    void sayIntro(text().nextOne);
    if (totalMisses >= MISSES_BEFORE_HINT) later(DEMO_AFTER_MS, showHint);
  }

  function win(): void {
    guide.hide();
    mark();
    options.onWin({ level: shift[0], stars: starsFor(totalMisses), misses: totalMisses });
  }

  function rightAnswer(pick: Pick, advanced: boolean): void {
    runWith(pick, false);
    later(runMs + 200, () => {
      if (typeof pick === 'number') {
        // Once it's right, the numbers in the pipes are no secret.
        if (puzzle.machines.length > 1) board.setMiddle(steps(puzzle.machines, puzzle.ask === 'out' ? (puzzle.given as number) : pick).slice(1, -1));
        // The number that went in shows again in the hopper, beside the one that came out.
        if (puzzle.ask === 'out') {
          board.setSlot('in', puzzle.given as number);
          board.setSlot('out', pick, 'right');
        } else {
          board.setSlot('in', pick, 'right');
          board.setSlot('out', puzzle.given as number, 'right');
        }
        rollSound();
        burstOn('.slot-out');
      } else {
        board.checks(puzzle.examples.map(() => true), CHECK_STAGGER_MS);
        puzzle.examples.forEach((_, at) => later(at * CHECK_STAGGER_MS, () => checkSound(at)));
      }
    });
    const checked = typeof pick === 'number' ? 0 : puzzle.examples.length * CHECK_STAGGER_MS;
    later(runMs + 500 + checked, () => {
      document.querySelectorAll('#board .plate.trying').forEach((plate) => plate.classList.remove('trying'));
      board.reveal();
      rightSound();
      board.setLamps(play.won ? shift.length : play.at, shift.length);
      void say(typeof pick === 'number' ? text().cheer(pick) : text().cheerRule);
      void say(text().rules(puzzle.machines), { queue: true });
    });
    later(runMs + 500 + checked + (advanced ? NEXT_AFTER_MS : WIN_AFTER_MS), advanced ? nextPuzzle : win);
  }

  /** The hopper and the chute as the puzzle starts: the given number, a "?", or nothing on rule questions. */
  function resetSlots(): void {
    const { ask, given } = puzzle;
    board.setSlot('in', ask === 'out' ? (given as number) : ask === 'in' ? null : undefined);
    board.setSlot('out', ask === 'in' ? (given as number) : ask === 'out' ? null : undefined);
    board.showGot(undefined);
  }

  function wrongAnswer(pick: Pick, why: Why): void {
    const reaction = reactions % text().oops.length;
    reactions += 1;
    // The miss that ends a try runs fast and offers 🔄 at once. The wobble plays on behind it.
    const losing = play.failed;
    const ms = losing ? LOSING_RUN_MS : runMs;
    runWith(pick, true, ms);
    missed();
    later(ms + (losing ? 20 : 200), () => {
      if (typeof pick !== 'number') {
        board.checks(why.checks ?? [], CHECK_STAGGER_MS);
        (why.checks ?? []).forEach((fits, at) => later(at * CHECK_STAGGER_MS, () => (fits ? checkSound(at) : sputterSound(0))));
      } else if (puzzle.ask === 'in') board.showGot(why.makes ?? null);
      else board.setSlot('out', pick, 'wrong');
      sputterSound(reaction);
      if (losing) fail();
      else void say(text().oops[reaction], { queue: true });
    });
    if (losing) return;
    const wait = runMs + 200 + (typeof pick === 'number' ? WRONG_SHOW_MS : WRONG_CARD_MS);
    later(wait, () => {
      if (typeof pick !== 'number') {
        document.querySelectorAll('#board .plate.trying').forEach((plate) => plate.classList.remove('trying'));
        for (const at of slots) board.setPlate(at, null);
        board.checks(puzzle.examples.map(() => null), 0);
      }
      resetSlots();
      busy = false;
      drawDock();
      showHint();
    });
  }

  function fail(): void {
    totalFails += 1;
    options.onFail(totalFails);
    board.wobble();
    wobbleSound();
    void say(text().failed, { queue: true });
    if (totalFails === options.canSkipAfter) void say(text().canSkip, { queue: true });
    busy = false;
    drawDock();
  }

  function onChoice(pick: Pick): void {
    if (busy || play.won || play.failed || isTried(pick)) return;
    const result = answer(play, pick);
    if (!result) return;
    play = result.play;
    busy = true;
    guide.hide();
    drawDock();
    if (result.right) rightAnswer(pick, result.advanced);
    else wrongAnswer(pick, result.why);
  }

  // ---------- Taps on the board ----------

  function onPair(index: number): void {
    tockSound();
    const pair = puzzle.examples[index];
    speak(text().pair(pair.from, pair.to));
    flashPair(index);
  }

  /** Every tap on the board moves something, so it answers even with the sound off. */
  function poke(target: Element | null, className: string): void {
    if (!target) return;
    target.classList.remove(className);
    void (target as HTMLElement).offsetWidth;
    target.classList.add(className);
    later(650, () => target.classList.remove(className));
  }

  function onPlate(at: number): void {
    tockSound();
    poke(document.querySelector(`#board .plate[data-plate="${at}"]`), 'shush');
    if (puzzle.open[at] || play.won) {
      speak(text().rules([puzzle.machines[at]]));
      return;
    }
    if (isRuleAsk(puzzle.ask) && at === slot) {
      speak(askLine());
      focusDock();
      return;
    }
    speak(text().secret);
  }

  function onSlot(id: SlotId): void {
    tockSound();
    poke(document.querySelector(`#board .slot-${id}`), 'poked');
    speak(askLine());
    if (!busy && !play.won && !play.failed) focusDock();
  }

  board.onPair(onPair);
  board.onPlate(onPlate);
  board.onSlot(onSlot);
  // The dock first, so the board is sized in the room that is really left for it.
  drawDock();
  board.show(level);
  resetSlots();
  board.setLamps(0, shift.length);
  document.addEventListener('pointerdown', woke, true);
  armIdle();
  void sayIntro(text().ideas[level.world]);
  runDemo();
  if (totalMisses >= MISSES_BEFORE_HINT) later(DEMO_AFTER_MS, showHint);

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
      board.stop();
      stopSounds();
      delete document.body.dataset.status;
    },
  };
}
