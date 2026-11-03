// One try at a level on screen: a set of three quilts, the basket of pieces, a piece flying into the gap, the tune
// when it fits, the pop-back wobble and shaking line when it doesn't, the tangle when a try runs out, the hint, the
// idle nudge and the one-time demos of each new rule.
import { burst, say, speak, store } from '@playroom/kit';
import { text } from '../lang/index.ts';
import { cellKey } from '../rules/cells.ts';
import type { Level } from '../rules/levels.ts';
import { starsFor } from '../rules/misses.ts';
import { answer, linesFor, movingRules, puzzleOf, showLine, startPlay, type Play } from '../rules/play.ts';
import { tuneFor } from '../rules/tune.ts';
import { doneSound, hintSound, landSound, liftSound, missSound, patchNote, pickSound, stopSounds, tangleSound } from '../sounds.ts';
import { button, calm, element, onPress } from '../ui.ts';
import type { BoardView } from '../view/board.ts';
import type { DemoStep, Guide } from '../view/guide.ts';
import { pieceArt } from '../view/pieces.ts';

const FLY_MS = 340;
const WOBBLE_MS = 620;
const BACK_MS = 320;
const NOTE_MS = 150;
const AFTER_TUNE_MS = 700;
const RETRY_ARMED_MS = 600;
const MISSES_BEFORE_HINT = 2;
const IDLE_MS = 8000;
/** The first world is for age 4, so its first nudge of each set comes sooner. */
const FIRST_NUDGE_MS = 3500;
const SWEEP_STEP_MS = 260;
const DEMO_AFTER_MS = 800;
const HOP_STEP_MS = 560;
const SHOWN_KEY = 'missing-piece:shown';

export interface WinReport {
  level: Level;
  stars: number;
  /** Misses over every try of this level since it was last won. */
  misses: number;
}

export interface PlayScreenOptions {
  /** The try's set of puzzles. */
  puzzles: Level[];
  board: BoardView;
  dock: HTMLElement;
  guide: Guide;
  /** The world's idea is said on its first level. */
  sayIdea: boolean;
  /** Misses on this level over every try so far, kept across visits until it is won. */
  missesBefore: number;
  /** Failed tries on this level before this one, for the skip button. */
  failsBefore: number;
  canSkipAfter: number;
  onMiss: () => void;
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

/** A new kind of rule gets a demo the first time it appears. */
type Demo = 'rows' | 'cols' | 'across' | 'down' | 'latin' | 'join' | 'cancel';

export function startPlayScreen(options: PlayScreenOptions): PlayScreen {
  const { puzzles, board, dock, guide } = options;
  let play: Play = startPlay(puzzles);
  let level = puzzleOf(play);
  let tune = tuneFor(level);
  let gapIndex = level.cells.length - 1;
  let busy = false;
  let stopped = false;
  let reactions = 0;
  let cheers = 0;
  let hinted = false;
  let totalMisses = options.missesBefore;
  let totalFails = options.failsBefore;
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
    body.go = String(level.go);
    body.step = String(play.at);
    body.status = play.won ? 'won' : play.failed ? (busy ? 'busy' : 'failed') : busy ? 'busy' : 'playing';
  }

  // ---------- The basket ----------

  const pieceButton = (at: number): HTMLButtonElement | null => dock.querySelector(`[data-option="${at}"]`);

  function pieceFor(at: number): HTMLButtonElement {
    const made = button('piece');
    made.dataset.option = String(at);
    made.dataset.key = cellKey(level.options[at]);
    made.append(pieceArt(level.options[at], board.roomy));
    made.setAttribute('aria-label', text().piece(at + 1));
    if (play.tried.includes(at)) {
      made.classList.add('tried');
      made.setAttribute('aria-disabled', 'true');
    }
    onPress(made, () => onPiece(at));
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
      // The retry button waits for the tangle, so a mashing hand can't skip past it.
      if (!busy) parts.push(retryButton());
    } else {
      const basket = element('div', 'basket');
      basket.append(...level.options.map((_, at) => pieceFor(at)));
      parts.push(basket);
    }
    if (totalFails >= options.canSkipAfter && !play.won) parts.push(skipButton());
    dock.replaceChildren(...parts);
    dock.dataset.mode = play.failed ? 'retry' : 'pieces';
    mark();
  }

  /** A piece hops, as the hand passes over it or the gap is tapped. */
  function bounce(piece: HTMLElement, delay = 0): void {
    piece.classList.remove('bounce');
    void piece.offsetWidth;
    piece.style.animationDelay = `${delay}ms`;
    piece.classList.add('bounce');
  }

  /** Tapping the gap makes the pieces hop one after another, so a child knows where to look next. */
  function focusBasket(): void {
    dock.querySelectorAll<HTMLElement>('.piece').forEach((piece, at) => bounce(piece, at * 90));
  }

  // ---------- Flying pieces ----------

  function fly(from: Element, to: Element, ms: number, art: SVGSVGElement, done: () => void): void {
    if (calm() || ms === 0) {
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
    flyer.append(art);
    document.body.append(flyer);
    flyers.add(flyer);
    const dx = end.left + end.width / 2 - (start.left + start.width / 2);
    const dy = end.top + end.height / 2 - (start.top + start.height / 2);
    const scale = end.width / start.width;
    const flight = flyer.animate(
      [
        { transform: 'translate(0, 0) scale(1) rotate(0deg)' },
        { transform: `translate(${dx * 0.5}px, ${dy * 0.5 - 40}px) scale(${(1 + scale) / 2 + 0.08}) rotate(-6deg)`, offset: 0.55 },
        { transform: `translate(${dx}px, ${dy}px) scale(${scale}) rotate(0deg)` },
      ],
      { duration: ms, easing: 'ease-in-out' },
    );
    later(ms, () => {
      flight.cancel();
      flyer.remove();
      flyers.delete(flyer);
      done();
    });
  }

  // ---------- Hints, nudges and demos ----------

  const at = (index: number) => () => board.cellAt(index);

  /** Patches along the lines that show a rule, hopping one after another with their notes. */
  function lineSteps(attr: (typeof level.attrs)[number]): DemoStep[] {
    const lines = showLine(level, attr);
    const size = level.size;
    const indices: number[] = [];
    for (const row of lines.rows) for (let col = 0; col < size; col += 1) indices.push(row * size + col);
    for (const col of lines.cols) for (let row = 0; row < size; row += 1) if (!indices.includes(row * size + col)) indices.push(row * size + col);
    const law = level.laws[attr];
    if (law === 'join' || law === 'cancel') {
      return [
        { at: at(0), ms: HOP_STEP_MS, className: 'hop', run: () => patchNote(tune[0]) },
        { at: at(1), ms: HOP_STEP_MS, className: 'hop', run: () => patchNote(tune[1]) },
        { at: at(2), ms: 1500, run: () => board.merge(0) },
      ];
    }
    return indices.map((index) => ({ at: at(index), ms: HOP_STEP_MS, className: 'hop', run: () => patchNote(tune[index]) }));
  }

  const toGap: DemoStep = { at: () => board.gap(), ms: 1300, className: 'hop' };

  function showHint(): void {
    if (hinted || guide.busy || totalMisses < MISSES_BEFORE_HINT || play.won || play.failed) return;
    hinted = true;
    hintSound();
    void say(text().hint, { queue: true });
    // Each rule shows once along its line, patch by patch with its notes, then the hand rests on the gap.
    const rules = movingRules(level);
    guide.demo([...rules.flatMap(lineSteps), toGap]);
  }

  /**
   * The nudge after a quiet spell: the hand taps the gap, then travels down across the basket as each piece hops
   * under it, and comes back to rest on the gap. It never stops on a piece, which would look like the answer. After
   * a lost try it points at the retry button.
   */
  function nudge(): void {
    if (play.failed) {
      guide.point(dock.querySelector('[data-action="retry"]'));
      return;
    }
    const pieces = [...dock.querySelectorAll<HTMLElement>('.piece')];
    guide.demo(
      [
        { at: () => board.gap(), ms: 800, className: 'hop' },
        ...pieces.map((piece) => ({ at: () => piece, ms: SWEEP_STEP_MS, run: () => bounce(piece) })),
        { at: () => board.gap(), ms: 900, className: 'hop' },
      ],
      true,
    );
  }

  function armIdle(wait = IDLE_MS): void {
    window.clearTimeout(idleTimer);
    idleTimer = window.setTimeout(() => {
      if (stopped || play.won) return;
      if (!busy && !guide.busy) nudge();
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

  /** The first time a kind of rule appears, the patches show it once without words. */
  function runDemos(): void {
    const seen = shown();
    const fresh = movingRules(level).filter((attr) => {
      const kind = level.laws[attr] as Demo;
      return !seen.includes(kind);
    });
    if (!fresh.length) return;
    const kinds = [...new Set(fresh.map((attr) => level.laws[attr] as Demo))];
    store.set(SHOWN_KEY, [...seen, ...kinds]);
    const firstOfEach = kinds.map((kind) => fresh.find((attr) => level.laws[attr] === kind) as (typeof fresh)[number]);
    later(DEMO_AFTER_MS, () => guide.demo([...firstOfEach.flatMap(lineSteps), toGap]));
  }

  // ---------- Taps ----------

  function onCell(index: number): void {
    if (index === gapIndex) {
      board.hop(index);
      if (!play.won) {
        focusBasket();
        speak(play.failed ? text().failed : text().ask);
      }
      return;
    }
    board.hop(index);
    patchNote(tune[index]);
  }

  function win(): void {
    guide.hide();
    mark();
    options.onWin({ level, stars: starsFor(totalMisses), misses: totalMisses });
  }

  /** The quilt lights up patch by patch, each with its note: the pattern played as a tune. */
  function playTune(): number {
    board.finish();
    level.cells.forEach((_, index) => {
      later(index * NOTE_MS, () => {
        board.glow(index);
        patchNote(tune[index]);
      });
    });
    const end = level.cells.length * NOTE_MS;
    later(end, () => {
      doneSound();
      const box = board.gap()?.getBoundingClientRect();
      if (box && !calm()) burst(box.left + box.width / 2, box.top + box.height / 2, 18);
    });
    return end + AFTER_TUNE_MS;
  }

  /** The quilt tangles behind a retry button that is there at once and ready to tap within a second. */
  function fail(): void {
    totalFails += 1;
    options.onFail(totalFails);
    busy = false;
    drawDock();
    later(WOBBLE_MS / 2, () => {
      board.tangle();
      tangleSound();
    });
    void say(text().failed, { queue: true });
    if (totalFails === options.canSkipAfter) void say(text().canSkip, { queue: true });
  }

  /** The next quilt of the set comes up. */
  function nextPuzzle(): void {
    level = puzzleOf(play);
    tune = tuneFor(level);
    gapIndex = level.cells.length - 1;
    hinted = false;
    busy = false;
    board.show(level);
    board.lights(play.at, puzzles.length);
    drawDock();
    board.layout();
    runDemos();
  }

  function onPiece(index: number): void {
    const source = pieceButton(index);
    if (play.tried.includes(index)) {
      // A piece that already bounced out shakes its head.
      source?.classList.remove('nope');
      void source?.offsetWidth;
      source?.classList.add('nope');
      return;
    }
    if (busy || play.won || play.failed) return;
    const result = answer(play, index);
    const gap = board.gap();
    if (!result || !source || !gap) return;
    play = result.play;
    busy = true;
    guide.hide();
    mark();
    liftSound();
    source.classList.add('away');
    const piece = level.options[index];
    if (!result.right) {
      totalMisses += 1;
      options.onMiss();
    }
    // The flight starts first, from where the piece sits, then a try that just ran out puts up its retry at once.
    fly(source, gap, FLY_MS, pieceArt(piece, board.roomy), () => {
      board.setGap(piece);
      landSound();
      gap.classList.remove('land');
      void gap.offsetWidth;
      gap.classList.add('land');
      if (result.right) {
        const wait = playTune();
        board.lights(result.solvedOne ? play.at : puzzles.length, puzzles.length);
        void say(text().cheers[cheers % text().cheers.length]);
        cheers += 1;
        later(wait, result.solvedOne ? nextPuzzle : win);
        return;
      }
      const reaction = reactions % text().oops.length;
      reactions += 1;
      gap.classList.add('wobble');
      missSound(reaction);
      void say(text().oops[reaction]);
      if (result.broken) board.shake(linesFor(level, result.broken));
      if (play.failed) return;
      mark();
      later(WOBBLE_MS, () => {
        gap.classList.remove('wobble', 'land');
        board.setGap(null);
        const home = pieceButton(index) ?? source;
        fly(gap, home, BACK_MS, pieceArt(piece, board.roomy), () => {
          busy = false;
          drawDock();
          showHint();
        });
      });
    });
    if (play.failed) fail();
  }

  board.onCell(onCell);
  board.show(level);
  board.lights(0, puzzles.length);
  drawDock();
  board.layout();
  document.addEventListener('pointerdown', woke, true);
  armIdle(level.big ? FIRST_NUDGE_MS : IDLE_MS);
  if (options.sayIdea) void say(text().ideas[level.world]);
  void say(text().ask, { queue: true });
  runDemos();
  if (totalMisses >= MISSES_BEFORE_HINT && !guide.busy) later(DEMO_AFTER_MS * 2, showHint);

  return {
    relabel() {
      if (!play.won && !busy) drawDock();
      board.relabel();
    },
    sayAgain() {
      if (play.won) return;
      void say(text().ideas[level.world]);
      void say(play.failed ? text().failed : text().ask, { queue: true });
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
