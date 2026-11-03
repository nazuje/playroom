// A pointing hand 👆, for showing a new idea once without words and for nudging towards the target after a quiet
// spell. It never catches a tap, so a child can tap straight through it.
import { calm, element } from '../ui.ts';

export interface DemoStep {
  /** What to point at, looked up when the step starts, so it finds the board as it is then. */
  at: () => Element | null;
  ms: number;
  /** Something to play on the target while the hand is there, such as a hop. */
  className?: string;
  /** Something to run as the step starts, such as pieces flying together. */
  run?: () => void;
  /**
   * Hover above a whole row instead of tapping one thing: the hand points down at the row and drifts slowly along
   * it, so it never rests on any one critter.
   */
  sway?: boolean;
}

export interface Guide {
  point(target: Element | null, sway?: boolean): void;
  hide(): void;
  /** Points at each step in turn, then hides, or with rest stays on the last step. A new call or hide() stops it. */
  demo(steps: readonly DemoStep[], rest?: boolean): void;
  readonly busy: boolean;
}

export function createGuide(): Guide {
  const hand = element('div', 'hand');
  hand.textContent = '👆';
  hand.hidden = true;
  hand.setAttribute('aria-hidden', 'true');
  document.body.append(hand);
  const timers = new Set<number>();
  let marked: Element | null = null;
  let className = '';
  let running = false;

  function unmark(): void {
    if (marked && className) marked.classList.remove(className);
    marked = null;
    className = '';
  }

  function point(target: Element | null, sway = false): void {
    if (!target) {
      hand.hidden = true;
      return;
    }
    const box = target.getBoundingClientRect();
    hand.style.left = `${box.left + box.width / 2}px`;
    hand.style.top = sway ? `${box.top - 6}px` : `${box.top + box.height / 2}px`;
    hand.style.setProperty('--sway', `${Math.max(0, box.width / 2 - 30)}px`);
    hand.textContent = sway ? '👇' : '👆';
    hand.hidden = false;
    hand.classList.remove('hand-tap', 'hand-sway');
    void hand.offsetWidth;
    if (sway) hand.classList.add('hand-sway');
    else if (!calm()) hand.classList.add('hand-tap');
  }

  function stop(): void {
    for (const timer of timers) window.clearTimeout(timer);
    timers.clear();
    unmark();
    running = false;
  }

  return {
    point(target, sway = false) {
      stop();
      point(target, sway);
    },
    hide() {
      stop();
      hand.hidden = true;
    },
    demo(steps, rest = false) {
      stop();
      running = true;
      let wait = 0;
      for (const step of steps) {
        const timer = window.setTimeout(() => {
          timers.delete(timer);
          unmark();
          const target = step.at();
          point(target, step.sway);
          step.run?.();
          if (target && step.className) {
            marked = target;
            className = step.className;
            target.classList.add(className);
          }
        }, wait);
        timers.add(timer);
        wait += step.ms;
      }
      const end = window.setTimeout(() => {
        timers.delete(end);
        unmark();
        if (!rest) hand.hidden = true;
        running = false;
      }, wait);
      timers.add(end);
    },
    get busy() {
      return running;
    },
  };
}
