// A pointing hand 👆, for showing a new idea once without words and for nudging after a quiet spell. It never
// catches a tap, so a child can tap straight through it.
import { calm, element } from '../ui.ts';

export interface DemoStep {
  /** What to point at, looked up when the step starts, so it finds the board as it is then. */
  at: () => Element | null;
  ms: number;
  /** Something to play on the target while the hand is there, such as reading an example. */
  className?: string;
  /**
   * Something else that lights up while the hand stays put, such as the row of answers. The hand never rests on
   * one answer, which would look like a hint.
   */
  glow?: () => Element | null;
  /** Something the step does as the hand gets there, such as lighting a block as if tapped. */
  act?: () => void;
}

export interface Guide {
  point(target: Element | null): void;
  hide(): void;
  /** Points at each step in turn, then hides. A new call or hide() stops it. */
  demo(steps: readonly DemoStep[]): void;
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
  let glowing: Element | null = null;
  let running = false;

  function unmark(): void {
    if (marked && className) marked.classList.remove(className);
    glowing?.classList.remove('demo-glow');
    marked = null;
    className = '';
    glowing = null;
  }

  function point(target: Element | null): void {
    if (!target) {
      hand.hidden = true;
      return;
    }
    const box = target.getBoundingClientRect();
    hand.style.left = `${box.left + box.width / 2}px`;
    hand.style.top = `${box.top + box.height / 2}px`;
    hand.hidden = false;
    hand.classList.remove('hand-tap');
    void hand.offsetWidth;
    if (!calm()) hand.classList.add('hand-tap');
  }

  function stop(): void {
    for (const timer of timers) window.clearTimeout(timer);
    timers.clear();
    unmark();
    running = false;
  }

  return {
    point(target) {
      stop();
      point(target);
    },
    hide() {
      stop();
      hand.hidden = true;
    },
    demo(steps) {
      stop();
      running = true;
      let wait = 0;
      for (const step of steps) {
        const timer = window.setTimeout(() => {
          timers.delete(timer);
          unmark();
          const target = step.at();
          point(target);
          if (target && step.className) {
            marked = target;
            className = step.className;
            target.classList.add(className);
          }
          step.act?.();
          glowing = step.glow?.() ?? null;
          glowing?.classList.add('demo-glow');
        }, wait);
        timers.add(timer);
        wait += step.ms;
      }
      const end = window.setTimeout(() => {
        timers.delete(end);
        unmark();
        hand.hidden = true;
        running = false;
      }, wait);
      timers.add(end);
    },
    get busy() {
      return running;
    },
  };
}
