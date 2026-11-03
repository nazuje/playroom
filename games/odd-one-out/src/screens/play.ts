// One try at a level on screen: a set of three puzzles on the pond, the odd one bounced into the water and the
// friends' dance when it's right, the protest and the friend it points to when it's wrong, everyone tumbling in
// when a try runs out, the hint, the idle nudge and the one-time demo of each new idea.
import { say, speak, store } from '@playroom/kit';
import { text } from '../lang/index.ts';
import type { Puzzle } from '../rules/levels.ts';
import { starsFor } from '../rules/misses.ts';
import { PICS } from '../rules/pics.ts';
import { answer, buddyOf, danceFor, exitFor, members, puzzleOf, startPlay, surpriseFor, type Exit, type Play } from '../rules/play.ts';
import { danceNote, doneSound, exitSound, hintSound, pickSound, protestSound, sinkSound, stopSounds, surpriseSound } from '../sounds.ts';
import { button, onPress } from '../ui.ts';
import type { DemoStep, Guide } from '../view/guide.ts';
import type { PondView } from '../view/pond.ts';

const WRONG_BUSY_MS = 520;
const AFTER_DANCE_MS = 350;
const RETRY_ARMED_MS = 600;
const SINK_MS = 700;
const MISSES_BEFORE_HINT = 2;
const IDLE_MS = 8000;
/** The first world is for age 4, so its first nudge of each set comes sooner. */
const FIRST_NUDGE_MS = 3500;
const SWEEP_STEP_MS = 300;
const BUSY_RETRY_MS = 1500;
const DEMO_AFTER_MS = 900;
/** How long the hand points at the odd one at the end of a demo. */
const DEMO_POINT_MS = 1600;
const SHOWN_KEY = 'odd-one-out:shown';

export interface WinReport {
  puzzle: Puzzle;
  stars: number;
  /** Misses over every try of this level since it was last won. */
  misses: number;
}

export interface PlayScreenOptions {
  /** The try's set of puzzles. */
  puzzles: Puzzle[];
  pond: PondView;
  /** Where the retry button floats, over the pond. */
  float: HTMLElement;
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

export function startPlayScreen(options: PlayScreenOptions): PlayScreen {
  const { puzzles, pond, dock, guide, float } = options;
  let play: Play = startPlay(puzzles);
  let puzzle = puzzleOf(play);
  let busy = false;
  let stopped = false;
  let reactions = 0;
  let cheers = 0;
  let hinted = false;
  let totalMisses = options.missesBefore;
  let totalFails = options.failsBefore;
  let idleTimer = 0;
  let retry: HTMLButtonElement | null = null;
  let demoing = false;
  let lastExit: Exit | null = null;
  const surprise = surpriseFor(puzzles);
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
    body.levelMisses = String(totalMisses);
    body.go = String(puzzle.go);
    body.step = String(play.at);
    body.status = play.won ? 'won' : play.failed ? (busy ? 'busy' : 'failed') : busy ? 'busy' : 'playing';
  }

  // ---------- The dock and the retry ----------

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
    dock.replaceChildren(...(totalFails >= options.canSkipAfter && !play.won ? [skipButton()] : []));
    mark();
  }

  /** The retry button comes up at once over the empty pond, and takes a tap within a second. */
  function showRetry(): void {
    retry?.remove();
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
    float.append(made);
    retry = made;
  }

  // ---------- Hints, nudges and demos ----------

  const padAt = (index: number) => () => pond.pad(index);

  /** Two friends that keep the rule together: the first one, and the friend it would point to. */
  function pairOf(avoid: readonly number[] = []): [number, number] {
    const friends = members(puzzle);
    const first = friends.find((at) => !avoid.includes(at)) ?? friends[0];
    return [first, buddyOf(puzzle, first) ?? friends.find((at) => at !== first) ?? first];
  }

  /** The hand visits two friends, which then dance the idea together. */
  function duetSteps([a, b]: [number, number]): DemoStep[] {
    const kind = danceFor(puzzle.idea);
    return [
      { at: padAt(a), ms: 650, className: 'hop' },
      { at: padAt(b), ms: 650, className: 'hop' },
      { at: padAt(b), ms: 1500, run: () => pond.duet([a, b], kind) },
    ];
  }

  function showHint(): void {
    if (hinted || guide.busy || totalMisses < MISSES_BEFORE_HINT || play.won || play.failed || busy) return;
    hinted = true;
    hintSound();
    void say(text().hint, { queue: true });
    // On the first world, which is for age 4, every friend dances together, so the odd one stands out at once.
    if (puzzle.big) {
      pond.duet(members(puzzle), danceFor(puzzle.idea));
      return;
    }
    guide.demo(duetSteps(pairOf(play.tried)));
  }

  /**
   * The nudge after a quiet spell: the hand travels across every pad as each one hops under it, then leaves. It
   * never stops on a pad, which would look like the answer. After a lost try it points at the retry button.
   */
  function nudge(): void {
    if (play.failed) {
      guide.point(float.querySelector('[data-action="retry"]'));
      return;
    }
    guide.demo(puzzle.things.map((_, at) => ({ at: padAt(at), ms: SWEEP_STEP_MS, className: 'hop' })));
  }

  function armIdle(wait = IDLE_MS): void {
    window.clearTimeout(idleTimer);
    idleTimer = window.setTimeout(() => {
      if (stopped || play.won) return;
      // While a demo or a bounce is still going, the nudge waits a moment rather than a whole quiet spell.
      if (busy || guide.busy || demoing) {
        armIdle(BUSY_RETRY_MS);
        return;
      }
      nudge();
      armIdle();
    }, wait);
  }

  function woke(): void {
    if (!guide.busy) guide.hide();
    demoing = false;
    armIdle();
  }

  function shown(): string[] {
    const saved = store.get<unknown>(SHOWN_KEY, []);
    return Array.isArray(saved) ? saved.filter((one): one is string => typeof one === 'string') : [];
  }

  /** The first time an idea appears, two friends show it once without words. */
  /**
   * The first time an idea appears, it shows itself once without words: every friend dances the idea together while
   * the odd one stands still, puzzled, with a ❓. Then the hand points at the odd one, without tapping it, and goes.
   */
  function runDemo(): void {
    const seen = shown();
    if (seen.includes(puzzle.idea)) return;
    store.set(SHOWN_KEY, [...seen, puzzle.idea]);
    later(DEMO_AFTER_MS, () => {
      if (busy || play.won || play.failed) return;
      demoing = true;
      const shownOn = puzzle;
      const wait = Math.max(1200, pond.dance(danceFor(puzzle.idea), danceNote));
      pond.puzzled(puzzle.answer, wait + DEMO_POINT_MS);
      later(wait, () => {
        if (puzzle === shownOn && !busy && demoing) guide.point(pond.pad(puzzle.answer));
      });
      later(wait + DEMO_POINT_MS, () => {
        if (demoing && puzzle === shownOn) guide.hide();
        demoing = false;
      });
    });
  }

  // ---------- Taps ----------

  function win(): void {
    guide.hide();
    mark();
    options.onWin({ puzzle, stars: starsFor(totalMisses), misses: totalMisses });
  }

  /** The friends left behind dance their rule, and the next puzzle comes up, or the set is won. */
  function celebrate(solvedOne: boolean): void {
    const wait = pond.dance(danceFor(puzzle.idea), danceNote);
    const line = puzzle.big ? text().groups[PICS[puzzle.things[members(puzzle)[0]].pic as number].group] : text().cheers[cheers % text().cheers.length];
    cheers += 1;
    void say(line);
    pond.lights(solvedOne ? play.at : puzzles.length, puzzles.length);
    // The rare surprise comes after the set's second puzzle, while the pond is still in view.
    if (surprise && solvedOne && play.at === 2) {
      pond.surprise(surprise);
      surpriseSound(surprise);
    }
    later(wait, doneSound);
    later(wait + AFTER_DANCE_MS, solvedOne ? nextPuzzle : win);
  }

  /** Everyone tumbles into the pond, and a retry button is there at once. */
  function fail(): void {
    totalFails += 1;
    options.onFail(totalFails);
    guide.hide();
    later(300, () => {
      pond.sink();
      sinkSound(puzzle.things.length);
    });
    later(SINK_MS, () => {
      busy = false;
      drawDock();
    });
    showRetry();
    void say(text().failed, { queue: true });
    if (totalFails === options.canSkipAfter) void say(text().canSkip, { queue: true });
  }

  function nextPuzzle(): void {
    puzzle = puzzleOf(play);
    hinted = false;
    busy = false;
    pond.show(puzzle);
    pond.lights(play.at, puzzles.length);
    drawDock();
    runDemo();
  }

  function onPad(index: number): void {
    if (play.tried.includes(index) && !play.failed && !play.won) {
      // A thing that already said it belongs just shakes its head again.
      pond.protest(index);
      return;
    }
    if (busy || play.won || play.failed) return;
    const result = answer(play, index);
    if (!result) return;
    play = result.play;
    busy = true;
    guide.hide();
    if (result.right) {
      mark();
      const exit = exitFor(puzzle, lastExit);
      lastExit = exit;
      exitSound(exit);
      const wait = pond.launch(index, exit);
      later(wait, () => celebrate(result.solvedOne));
      return;
    }
    totalMisses += 1;
    options.onMiss();
    const reaction = reactions % text().oops.length;
    reactions += 1;
    protestSound(reaction);
    void say(text().oops[reaction]);
    pond.protest(index);
    pond.dim(index);
    if (result.buddy !== null) pond.link(index, result.buddy);
    mark();
    if (play.failed) {
      fail();
      return;
    }
    later(WRONG_BUSY_MS, () => {
      busy = false;
      mark();
      showHint();
    });
  }

  /** A tap on open water makes every pad hop in turn, and asks again. */
  function onWater(): void {
    if (busy || play.won || play.failed) return;
    puzzle.things.forEach((_, at) => pond.hop(at, at * 90));
    speak(text().ask);
  }

  pond.onTap(onPad);
  pond.onWater(onWater);
  pond.show(puzzle);
  pond.lights(0, puzzles.length);
  drawDock();
  document.addEventListener('pointerdown', woke, true);
  armIdle(puzzle.big ? FIRST_NUDGE_MS : IDLE_MS);
  if (options.sayIdea) void say(text().ideas[puzzle.world]);
  void say(text().ask, { queue: true });
  runDemo();
  if (totalMisses >= MISSES_BEFORE_HINT && !guide.busy) later(DEMO_AFTER_MS * 2, showHint);

  return {
    relabel() {
      pond.relabel();
      if (retry) retry.setAttribute('aria-label', text().retry);
      if (!play.won) drawDock();
    },
    sayAgain() {
      if (play.won) return;
      void say(text().ideas[puzzle.world]);
      void say(play.failed ? text().failed : text().ask, { queue: true });
    },
    stop() {
      stopped = true;
      for (const timer of timers) window.clearTimeout(timer);
      timers.clear();
      window.clearTimeout(idleTimer);
      document.removeEventListener('pointerdown', woke, true);
      retry?.remove();
      guide.hide();
      stopSounds();
      delete document.body.dataset.status;
    },
  };
}
