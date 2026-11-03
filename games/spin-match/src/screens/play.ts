// One try at a level on screen: a set of three puzzles, the critters on the sand, the right one spinning up through
// a whirlpool to snap onto the target, a backwards one flipping over, a tile out of place lighting up, the dizzy
// spin when a try runs out, the ↻ button, the hint, the idle nudge and the one-time demos of each new idea.
import { burst, say, speak, store } from '@playroom/kit';
import { text } from '../lang/index.ts';
import type { Puzzle } from '../rules/levels.ts';
import { starsFor } from '../rules/misses.ts';
import { answer, answerPair, pairKey, puzzleOf, startPlay, type Answered, type Feedback, type Play } from '../rules/play.ts';
import { keyOf, turn, turnBetween } from '../rules/shapes.ts';
import { bubbleSound, dizzySound, flipSound, hintSound, oddSound, pickSound, shapeSound, snapSound, stopSounds, turnSound, whirrSound } from '../sounds.ts';
import { button, calm, element, onPress } from '../ui.ts';
import { critterArt, markTiles } from '../view/art.ts';
import type { BoardView } from '../view/board.ts';
import type { DemoStep, Guide } from '../view/guide.ts';

const FLY_MS = 760;
const SHOW_SLOT_MS = 280;
const AFTER_SNAP_MS = 950;
/** How long a wrong choice shows what is wrong before the critters can be tapped again. */
const FEEDBACK_MS = 1200;
/** A wrong choice that ends a try shows what is wrong this long, then the retry button comes up. */
const FAIL_SHOW_MS = 420;
const RETRY_ARMED_MS = 350;
const MISSES_BEFORE_HINT = 2;
const IDLE_MS = 8000;
/** The first world is for age 5, so its first nudge of each set comes sooner. */
const FIRST_NUDGE_MS = 3500;
const SWEEP_STEP_MS = 260;
/** When the hand is still busy with a demo, the nudge looks again this soon rather than waiting a whole quiet spell. */
const BUSY_RETRY_MS = 600;
const DEMO_AFTER_MS = 800;
const TOUR_MS = 3200;
const SHOWN_KEY = 'spin-match:shown';

export interface WinReport {
  puzzle: Puzzle;
  stars: number;
  /** Misses over every try of this level since it was last won. */
  misses: number;
  /** ↻ was used as a hint on the mirror world. */
  hinted: boolean;
}

export interface PlayScreenOptions {
  /** The try's set of puzzles. */
  puzzles: Puzzle[];
  board: BoardView;
  dock: HTMLElement;
  guide: Guide;
  /** The world's idea is said on its first level. */
  sayIdea: boolean;
  /** Misses on this level over every try so far, kept across visits until it is won. */
  missesBefore: number;
  /** ↻ was used as a hint on this level since it was last won. */
  hintedBefore: boolean;
  /** Failed tries on this level before this one, for the skip button. */
  failsBefore: number;
  canSkipAfter: number;
  onMiss: () => void;
  onHint: () => void;
  onFail: (total: number) => void;
  onRetry: () => void;
  onSkip: () => void;
  onWin: (report: WinReport) => void;
}

export interface PlayScreen {
  relabel(): void;
  /** Says the instruction again, for the 🔊 button. */
  sayAgain(): void;
  stop(): void;
}

/** A new idea gets a demo the first time it appears. */
type Demo = 'turn' | 'mirror' | 'colour' | 'pairs';

function demoFor(puzzle: Puzzle): Demo | null {
  if (puzzle.kind === 'pairs') return 'pairs';
  if (puzzle.world === 'spin') return 'turn';
  if (puzzle.world === 'mirror') return 'mirror';
  if (puzzle.world === 'colour') return 'colour';
  return null;
}

/** Restarts a CSS animation on something, even if it is still running. */
function replay(target: Element | null | undefined, className: string, ms: number): void {
  if (!target) return;
  target.classList.remove(className);
  void (target as HTMLElement).getBoundingClientRect();
  target.classList.add(className);
  window.setTimeout(() => target.classList.remove(className), ms);
}

/** Quarter turns as the shortest spin: three clockwise is one the other way. */
const shortest = (quarters: number): number => (quarters === 3 ? -1 : quarters);

export function startPlayScreen(options: PlayScreenOptions): PlayScreen {
  const { puzzles, board, dock, guide } = options;
  let play: Play = startPlay(puzzles);
  let puzzle = puzzleOf(play);
  let busy = false;
  let stopped = false;
  let reactions = 0;
  let cheers = 0;
  let hinted = false;
  let helped = options.hintedBefore;
  let totalMisses = options.missesBefore;
  let totalFails = options.failsBefore;
  /** The first card picked in "which two are the same?". */
  let selected: number | null = null;
  /** What each wrong option showed, so it keeps showing when the sand bed is drawn again. */
  const marks = new Map<number, Feedback>();
  let idleTimer = 0;
  const timers = new Set<number>();
  const flyers = new Set<HTMLElement>();

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
    body.levelMisses = String(totalMisses);
    body.go = String(puzzle.go);
    body.step = String(play.at);
    body.kind = puzzle.kind;
    body.turned = String(board.turned);
    body.selected = selected === null ? '' : String(selected);
    body.status = play.won ? 'won' : busy ? 'busy' : play.failed ? 'failed' : 'playing';
  }

  // ---------- The sand bed ----------

  const pebble = (at: number): HTMLButtonElement | null => dock.querySelector(`[data-option="${at}"]`);

  function showMark(holder: HTMLElement, art: SVGSVGElement, feedback: Feedback): void {
    if (feedback.kind === 'mirror') {
      holder.classList.add('backwards');
      const badge = element('span', 'badge');
      badge.textContent = '🪞';
      holder.append(badge);
    } else if (feedback.kind === 'tiles') markTiles(art, feedback.wrong, feedback.missing);
  }

  function pebbleFor(at: number): HTMLButtonElement {
    const made = button('pebble');
    made.dataset.option = String(at);
    made.dataset.key = keyOf(puzzle.options[at]);
    const art = critterArt(puzzle.options[at], puzzle.side, puzzle.body);
    made.append(art);
    made.setAttribute('aria-label', text().option(at + 1));
    const shown = marks.get(at);
    if (play.tried.includes(at)) {
      made.classList.add('tried');
      made.setAttribute('aria-disabled', 'true');
    }
    if (shown) showMark(made, art, shown);
    if (selected === at) made.classList.add('picked');
    onPress(made, () => onOption(at));
    return made;
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
      // The retry button waits until the wrong choice has shown what was wrong, so a mashing hand can't skip past it.
      if (!busy) parts.push(retryButton());
    } else {
      const bed = element('div', 'bed');
      bed.append(...puzzle.options.map((_, at) => pebbleFor(at)));
      parts.push(bed);
    }
    if (totalFails >= options.canSkipAfter && !play.won) parts.push(skipButton());
    dock.replaceChildren(...parts);
    dock.dataset.mode = play.failed ? 'retry' : 'options';
    mark();
  }

  /** A critter hops, as the hand passes over it or the target is tapped. */
  function bounce(target: HTMLElement, delay = 0): void {
    target.classList.remove('bounce');
    void target.offsetWidth;
    target.style.animationDelay = `${delay}ms`;
    target.classList.add('bounce');
  }

  /** Tapping the target makes the critters on the sand hop one after another, so a child knows where to look next. */
  function focusBed(): void {
    dock.querySelectorAll<HTMLElement>('.pebble').forEach((one, at) => bounce(one, at * 90));
  }

  function cancelTours(): void {
    document.querySelectorAll('.art.tour').forEach((art) => art.classList.remove('tour'));
  }

  // ---------- Flying critters ----------

  /** A drawing flies from one place to another, growing to the new size and turning some quarter turns on the way. */
  function fly(from: Element, to: Element, quarters: number, done: () => void): void {
    if (calm()) {
      done();
      return;
    }
    const start = from.getBoundingClientRect();
    const end = to.getBoundingClientRect();
    const flyer = element('div', 'flyer');
    flyer.style.left = `${start.left}px`;
    flyer.style.top = `${start.top}px`;
    flyer.style.width = `${start.width}px`;
    flyer.style.height = `${start.height}px`;
    const copy = from.cloneNode(true) as SVGSVGElement;
    copy.classList.remove('flip', 'tour');
    copy.style.removeProperty('--base');
    flyer.append(copy);
    document.body.append(flyer);
    flyers.add(flyer);
    const dx = end.left + end.width / 2 - (start.left + start.width / 2);
    const dy = end.top + end.height / 2 - (start.top + start.height / 2);
    const scale = end.width / start.width;
    const flight = flyer.animate(
      [
        { transform: 'translate(0, 0) scale(1) rotate(0deg)' },
        { transform: `translate(${dx * 0.35 + 40}px, ${dy * 0.5}px) scale(${(1 + scale) / 2 + 0.1}) rotate(${quarters * 45}deg)`, offset: 0.5 },
        { transform: `translate(${dx}px, ${dy}px) scale(${scale}) rotate(${quarters * 90}deg)` },
      ],
      { duration: FLY_MS, easing: 'ease-in-out' },
    );
    later(FLY_MS, () => {
      flight.cancel();
      flyer.remove();
      flyers.delete(flyer);
      done();
    });
  }

  /** The right choice has landed: the two click together. */
  function landed(result: Answered): void {
    board.snap();
    snapSound();
    const box = board.art(puzzle.kind === 'pairs' ? 0 : undefined)?.getBoundingClientRect();
    if (box && !calm()) burst(box.left + box.width / 2, box.top + box.height / 2, 20);
    board.pearls(result.solvedOne ? play.at : puzzles.length, puzzles.length);
    void say(text().cheers[cheers % text().cheers.length]);
    cheers += 1;
    later(AFTER_SNAP_MS, result.solvedOne ? nextPuzzle : win);
  }

  /** The right critter spins up from the sand through the whirlpool and lies down exactly on the target. */
  function spinHome(at: number, result: Answered): void {
    const source = pebble(at);
    const from = source?.querySelector('.art');
    const to = board.art();
    if (!source || !from || !to) return landed(result);
    const shown = turn(puzzle.target, board.turned);
    const quarters = shortest(turnBetween(puzzle.options[at], shown));
    source.classList.add('away');
    board.whirl(FLY_MS);
    whirrSound(FLY_MS);
    fly(from, to, quarters, () => landed(result));
  }

  /** In "which two are the same?", the second card spins and lies down on the first. */
  function spinPair(first: number, second: number, result: Answered): void {
    later(SHOW_SLOT_MS, () => {
      const from = board.art(1);
      const to = board.art(0);
      if (!from || !to) return landed(result);
      const quarters = shortest(turnBetween(puzzle.options[second], puzzle.options[first]));
      board.whirl(FLY_MS);
      whirrSound(FLY_MS);
      fly(from, to, quarters, () => {
        board.setSlot(1, null);
        landed(result);
      });
      from.style.opacity = '0';
    });
  }

  // ---------- Wrong choices ----------

  function react(holder: HTMLElement, art: SVGSVGElement, feedback: Feedback): void {
    const lines = feedback.kind === 'mirror' ? text().backwards : feedback.kind === 'tiles' ? text().moved : text().otherShape;
    const line = lines[reactions % lines.length];
    reactions += 1;
    void say(line);
    if (feedback.kind === 'mirror') {
      flipSound();
      // Flipped over, a backwards critter is the target turned: that is what "backwards" means.
      replay(art, 'flip', 1150);
    } else if (feedback.kind === 'tiles') {
      oddSound();
      replay(holder, 'wobble', 700);
    } else {
      shapeSound();
      replay(holder, 'wobble', 700);
    }
    showMark(holder, art, feedback);
  }

  function missed(holder: HTMLElement, art: SVGSVGElement, feedback: Feedback, after: () => void): void {
    totalMisses += 1;
    options.onMiss();
    react(holder, art, feedback);
    mark();
    if (play.failed) {
      later(FAIL_SHOW_MS, fail);
      return;
    }
    later(FEEDBACK_MS, () => {
      after();
      busy = false;
      drawDock();
      showHint();
    });
  }

  // ---------- Hints, nudges and demos ----------

  const sweep = (): DemoStep[] =>
    [...dock.querySelectorAll<HTMLElement>('.pebble')].map((one) => ({ at: () => one, ms: SWEEP_STEP_MS, run: () => bounce(one) }));

  const toTarget = (ms: number): DemoStep => ({ at: () => board.target(), ms, className: 'hop' });

  function showHint(): void {
    if (hinted || guide.busy || totalMisses < MISSES_BEFORE_HINT || play.won || play.failed) return;
    hinted = true;
    hintSound();
    void say(text().hint, { queue: true });
    if (puzzle.kind === 'pairs') {
      // Every card turns slowly all the way round, so they can be compared at every turn.
      dock.querySelectorAll('.pebble .art').forEach((art) => replay(art, 'tour', TOUR_MS));
      guide.demo([{ at: () => board.target(), ms: TOUR_MS }]);
    } else if (puzzle.helper !== 'none') {
      guide.demo([{ at: () => board.helper(), ms: 1800, className: 'glow' }, toTarget(900)]);
    } else {
      board.tour();
      guide.demo([{ at: () => board.target(), ms: TOUR_MS }]);
    }
  }

  /**
   * The nudge after a quiet spell: the hand taps the target, then travels across the sand as each critter hops
   * under it, and comes back to rest on the target. It never stops on a critter, which would look like the
   * answer. After a lost try it points at the retry button.
   */
  function nudge(): void {
    if (play.failed) {
      guide.point(dock.querySelector('[data-action="retry"]'));
      return;
    }
    guide.demo([toTarget(800), ...sweep(), toTarget(900)], true);
  }

  function armIdle(wait = IDLE_MS): void {
    window.clearTimeout(idleTimer);
    idleTimer = window.setTimeout(() => {
      if (stopped || play.won) return;
      if (busy || guide.busy) {
        armIdle(BUSY_RETRY_MS);
        return;
      }
      nudge();
      armIdle();
    }, wait);
  }

  function woke(): void {
    if (!guide.busy) guide.hide();
    armIdle();
  }

  function shown(): Demo[] {
    const saved = store.get<unknown>(SHOWN_KEY, []);
    return Array.isArray(saved) ? (saved.filter((one) => typeof one === 'string') as Demo[]) : [];
  }

  function demoSteps(demo: Demo): DemoStep[] {
    if (demo === 'turn') {
      return [
        {
          at: () => board.helper(),
          ms: 1100,
          className: 'glow',
          run: () => {
            board.turnTarget();
            turnSound();
            mark();
          },
        },
        toTarget(1000),
        ...sweep(),
        toTarget(700),
      ];
    }
    if (demo === 'mirror') {
      return [
        {
          at: () => board.target(),
          ms: 2400,
          run: () => {
            board.flipGhost();
            flipSound();
          },
        },
        ...sweep(),
        toTarget(700),
      ];
    }
    if (demo === 'colour') return [{ at: () => board.target(), ms: 1800, run: () => board.glowAccents() }, ...sweep(), toTarget(700)];
    return [
      { at: () => board.slot(0), ms: 800, className: 'hop', run: bubbleSound },
      { at: () => board.slot(1), ms: 800, className: 'hop', run: bubbleSound },
      ...sweep(),
      toTarget(700),
    ];
  }

  /** The first time an idea appears, the hand shows it once without words. */
  function runDemos(): void {
    const demo = demoFor(puzzle);
    const seen = shown();
    if (!demo || seen.includes(demo)) return;
    store.set(SHOWN_KEY, [...seen, demo]);
    later(DEMO_AFTER_MS, () => {
      if (!busy && !play.won) guide.demo(demoSteps(demo));
    });
  }

  // ---------- Taps ----------

  function onTarget(): void {
    board.hop();
    bubbleSound();
    if (play.won) return;
    focusBed();
    speak(play.failed ? text().failed : puzzle.kind === 'pairs' ? text().askPair : text().ask);
  }

  function onHelper(): void {
    if (busy || play.won || play.failed) return;
    cancelTours();
    guide.hide();
    board.turnTarget();
    turnSound();
    if (puzzle.helper === 'hint' && !helped) {
      helped = true;
      options.onHint();
    }
    mark();
  }

  function nope(target: HTMLElement | null): void {
    target?.classList.remove('nope');
    void target?.offsetWidth;
    target?.classList.add('nope');
  }

  function onCard(at: number): void {
    if (busy || play.won || play.failed) return;
    if (selected === null || selected === at) {
      const picking = selected === null;
      selected = picking ? at : null;
      pickSound();
      board.setSlot(0, picking ? puzzle.options[at] : null);
      if (picking) board.hop(board.slot(0));
      drawDock();
      return;
    }
    const first = selected;
    if (play.triedPairs.includes(pairKey(first, at))) {
      nope(pebble(at));
      return;
    }
    const result = answerPair(play, first, at);
    if (!result) return;
    play = result.play;
    busy = true;
    guide.hide();
    cancelTours();
    pickSound();
    pebble(at)?.classList.add('picked');
    const art = board.setSlot(1, puzzle.options[at]);
    mark();
    if (result.right) {
      spinPair(first, at, result);
      return;
    }
    const slot = board.slot(1);
    if (!art || !slot || !result.feedback) return;
    missed(slot, art, result.feedback, () => {
      selected = null;
      board.setSlot(0, null);
      board.setSlot(1, null);
    });
  }

  function onOption(at: number): void {
    if (puzzle.kind === 'pairs') {
      onCard(at);
      return;
    }
    const source = pebble(at);
    if (play.tried.includes(at)) {
      // A critter that was already wrong shakes its head.
      nope(source);
      return;
    }
    if (busy || play.won || play.failed) return;
    const result = answer(play, at);
    const art = source?.querySelector<SVGSVGElement>('.art');
    if (!result || !source || !art) return;
    play = result.play;
    busy = true;
    guide.hide();
    cancelTours();
    pickSound();
    mark();
    if (result.right) {
      spinHome(at, result);
      return;
    }
    if (!result.feedback) return;
    marks.set(at, result.feedback);
    missed(source, art, result.feedback, () => undefined);
  }

  function win(): void {
    guide.hide();
    mark();
    options.onWin({ puzzle, stars: starsFor(totalMisses, helped), misses: totalMisses, hinted: helped });
  }

  /** The critters get dizzy behind a retry button that is ready to tap within a second. */
  function fail(): void {
    totalFails += 1;
    options.onFail(totalFails);
    busy = false;
    drawDock();
    board.dizzy();
    dizzySound();
    void say(text().failed, { queue: true });
    if (totalFails === options.canSkipAfter) void say(text().canSkip, { queue: true });
  }

  /** The next puzzle of the set comes up. */
  function nextPuzzle(): void {
    puzzle = puzzleOf(play);
    hinted = false;
    busy = false;
    selected = null;
    marks.clear();
    board.show(puzzle);
    board.pearls(play.at, puzzles.length);
    drawDock();
    board.layout();
    runDemos();
  }

  board.onTarget(onTarget);
  board.onHelper(onHelper);
  board.show(puzzle);
  board.pearls(0, puzzles.length);
  drawDock();
  board.layout();
  document.addEventListener('pointerdown', woke, true);
  armIdle(puzzle.big ? FIRST_NUDGE_MS : IDLE_MS);
  if (options.sayIdea) void say(text().ideas[puzzle.world]);
  void say(puzzle.kind === 'pairs' ? text().askPair : text().ask, { queue: true });
  runDemos();
  if (totalMisses >= MISSES_BEFORE_HINT && !guide.busy) later(DEMO_AFTER_MS * 2, showHint);

  return {
    relabel() {
      if (!play.won && !busy) drawDock();
      board.relabel();
    },
    sayAgain() {
      if (play.won) return;
      void say(text().ideas[puzzle.world]);
      void say(play.failed ? text().failed : puzzle.kind === 'pairs' ? text().askPair : text().ask, { queue: true });
    },
    stop() {
      stopped = true;
      for (const timer of timers) window.clearTimeout(timer);
      timers.clear();
      for (const flyer of flyers) flyer.remove();
      flyers.clear();
      window.clearTimeout(idleTimer);
      document.removeEventListener('pointerdown', woke, true);
      guide.hide();
      stopSounds();
      delete document.body.dataset.status;
    },
  };
}
