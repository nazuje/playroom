import { estimateMs, say, speak, stopSpeaking } from '@playroom/kit';
import { words } from './lang/index.ts';
import type { Say } from './rules/say.ts';

export interface Talker {
  /** Says these lines, cutting off anything before. */
  say(lines: readonly Say[]): void;
  /** Says these after whatever is already being said. */
  queue(lines: readonly Say[]): void;
  /** Says the last lines again, in the language now in use. */
  repeat(fallback?: readonly Say[]): void;
  /** Forgets the last lines, so a new screen can't repeat an old one. */
  clear(): void;
  stop(): void;
}

/** Speaks lines aloud and shows them in a bubble, for the grown-up who reads along. */
export function createTalker(bubble: HTMLElement): Talker {
  let last: Say[] = [];
  let hideAt = 0;
  let timer = 0;

  function show(text: string, append: boolean): void {
    bubble.textContent = append && bubble.textContent ? `${bubble.textContent} ${text}` : text;
    bubble.classList.add('bubble-on');
    hideAt = Math.max(hideAt, performance.now()) + estimateMs(text) + 1600;
    window.clearTimeout(timer);
    timer = window.setTimeout(() => bubble.classList.remove('bubble-on'), hideAt - performance.now());
  }

  function run(lines: readonly Say[], append: boolean): void {
    const texts = lines.map((line) => words(line)).filter(Boolean);
    if (!texts.length) return;
    last = append ? [...last, ...lines] : [...lines];
    if (!append) hideAt = 0;
    texts.forEach((text, at) => {
      if (at === 0 && !append) speak(text);
      else void say(text, { queue: true });
      show(text, append || at > 0);
    });
  }

  return {
    say: (lines) => run(lines, false),
    queue: (lines) => run(lines, true),
    repeat(fallback = []) {
      run(last.length ? last : fallback, false);
    },
    clear() {
      last = [];
    },
    stop() {
      stopSpeaking();
      bubble.classList.remove('bubble-on');
    },
  };
}
