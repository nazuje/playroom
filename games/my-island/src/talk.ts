import { estimateMs, say, speak, stopSpeaking } from '@playroom/kit';
import { words } from './lang/index.ts';
import type { Say } from './rules/say.ts';

/** A moment says this many lines at most, so a child can take them in. */
const MOST_LINES = 2;
/** The breath between one moment and the next. */
const PAUSE_MS = 900;
/** How long the bubble stays up after the last line is said. */
const LINGER_MS = 1600;

export interface Talker {
  /** Says these lines, cutting off anything before. */
  say(lines: readonly Say[]): void;
  /** Says these after whatever is already being said, in the same moment if there's room. */
  queue(lines: readonly Say[]): void;
  /** Says these as a moment of their own, after a pause. Anything said before then calls it off. */
  later(lines: readonly Say[]): void;
  /** Says the last lines again, in the language now in use. */
  repeat(fallback?: readonly Say[]): void;
  /** Forgets the last lines, so a new screen can't repeat an old one. */
  clear(): void;
  /** Goes quiet and empties the bubble. */
  stop(): void;
}

type Mode = 'cut' | 'fresh' | 'append';

/** Speaks lines aloud and shows them in a bubble, for the grown-up who reads along. */
export function createTalker(bubble: HTMLElement): Talker {
  let last: Say[] = [];
  let shown = false;
  let inMoment = 0;
  let quietAt = 0;
  let hideTimer = 0;
  let laterTimer = 0;
  let pending: Say[] = [];

  function hide(): void {
    shown = false;
    inMoment = 0;
    bubble.classList.remove('bubble-on');
  }

  function show(text: string, append: boolean): void {
    const now = performance.now();
    bubble.textContent = append && shown ? `${bubble.textContent} ${text}` : text;
    shown = true;
    inMoment = append ? inMoment + 1 : 1;
    quietAt = Math.max(quietAt, now) + estimateMs(text);
    bubble.classList.add('bubble-on');
    window.clearTimeout(hideTimer);
    hideTimer = window.setTimeout(hide, quietAt + LINGER_MS - now);
  }

  function run(lines: readonly Say[], mode: Mode): void {
    const texts = lines.map((line) => words(line)).filter(Boolean);
    if (!texts.length) return;
    last = mode === 'append' ? [...last, ...lines] : [...lines];
    if (mode === 'cut') quietAt = 0;
    texts.forEach((text, at) => {
      if (at === 0 && mode === 'cut') speak(text);
      else void say(text, { queue: true });
      show(text, mode === 'append' || at > 0);
    });
  }

  function callOff(): void {
    window.clearTimeout(laterTimer);
    pending = [];
  }

  function later(lines: readonly Say[]): void {
    pending = [...pending, ...lines].slice(0, MOST_LINES);
    window.clearTimeout(laterTimer);
    laterTimer = window.setTimeout(
      () => {
        const next = pending;
        pending = [];
        run(next, 'fresh');
      },
      Math.max(0, quietAt - performance.now()) + PAUSE_MS,
    );
  }

  return {
    say(lines) {
      callOff();
      run(lines, 'cut');
    },
    queue(lines) {
      if (!shown) run(lines, 'fresh');
      else if (inMoment + lines.length <= MOST_LINES) run(lines, 'append');
      else later(lines);
    },
    later,
    repeat(fallback = []) {
      callOff();
      run(last.length ? last : fallback, 'cut');
    },
    clear() {
      last = [];
      callOff();
    },
    stop() {
      stopSpeaking();
      callOff();
      window.clearTimeout(hideTimer);
      quietAt = 0;
      bubble.textContent = '';
      hide();
    },
  };
}
