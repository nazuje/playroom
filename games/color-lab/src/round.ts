import { burst, playSound } from '@playroom/kit';
import { button, centerOf, el } from './dom.ts';
import { Nudge } from './nudge.ts';
import { awardStar, loadProgress, saveLevel, say, words } from './screen.ts';
import { text } from './lang/index.ts';
import { LEVELS, pickRound } from './rounds.ts';
import type { Level, Rng } from './rounds.ts';
import type { ScoredMode } from './progress.ts';

/** What the round gives each game mode while it plays one question. */
export interface Turn {
  area: HTMLElement;
  /** Aborted when the child leaves or the question ends, so late animation steps stop. */
  signal: AbortSignal;
  /** Points at the next thing to tap. */
  nudge: Nudge;
  win(from: HTMLElement): void;
  /** Call once the turn is over. Returns the Next button to place on the page. */
  finish(): HTMLButtonElement;
}

interface RoundOptions<T> {
  mode: ScoredMode;
  root: HTMLElement;
  signal: AbortSignal;
  /** Everything a round at this level can ask. */
  pool(level: Level): readonly T[];
  /** Dresses up a question for this showing, such as swapping its pots round. */
  vary?(item: T, rng: Rng): T;
  play(item: T, turn: Turn): void;
  onExit(): void;
}

/** A button that ignores taps for a moment after it appears, so a mash can't skip the screen it sits on. */
function armedButton(className: string, onTap: () => void): HTMLButtonElement {
  const shownAt = performance.now();
  return button(className, '', () => {
    if (performance.now() - shownAt >= ARM_MS) onTap();
  });
}

/** How long a Next or round-end button waits before it listens. */
const ARM_MS = 700;

/** Last round's questions in each mode, so the next round starts with different ones. */
const lastRound = new Map<ScoredMode, readonly unknown[]>();

interface RoundEnd {
  level: Level;
  won: number;
  nudge: Nudge;
  restart(level: Level): void;
  onExit(): void;
}

function roundEnd(signal: AbortSignal, { level, won, nudge, restart, onExit }: RoundEnd): HTMLElement {
  const card = el('section', 'round-end');
  const line = el('h2', 'round-line');
  card.append(el('div', 'round-stars', won > 0 ? '⭐'.repeat(won) : '🧪'), line);
  const actions = el('div', 'actions');
  const again = armedButton('btn btn-go btn-big', () => restart(level));
  const harder = armedButton('btn btn-leaf', () => restart((level + 1) as Level));
  const back = armedButton('btn btn-small', onExit);
  actions.append(again);
  if (level < 2) actions.append(harder);
  actions.append(back);
  card.append(actions);
  words(signal, () => {
    const page = text();
    line.textContent = page.roundLine(won);
    again.textContent = page.again;
    harder.textContent = page.harder;
    back.textContent = page.backToLab;
  });
  say(() => text().roundLine(won));
  playSound('tada');
  nudge.later(again);
  requestAnimationFrame(() => {
    const { x, y } = centerOf(card);
    if (won > 0) burst(x, y, 28);
  });
  return card;
}

/**
 * Plays a round of a few questions, with progress dots above and the level picker
 * tucked below. Changing level mid-round keeps the questions already played and
 * the stars already won: only the questions still to come change.
 */
export function runRound<T>(options: RoundOptions<T>): void {
  const { mode, root, signal, pool, play } = options;
  const vary = options.vary ?? ((item: T) => item);
  let itemControl: AbortController | null = null;
  let roundControl: AbortController | null = null;
  signal.addEventListener('abort', () => {
    itemControl?.abort();
    roundControl?.abort();
  });

  function start(startLevel: Level): void {
    itemControl?.abort();
    roundControl?.abort();
    const thisRound = new AbortController();
    roundControl = thisRound;
    let level = startLevel;
    saveLevel(mode, level);
    const avoid = (lastRound.get(mode) ?? []) as readonly T[];
    /** The pool items this round plays, in order. */
    let picked = pickRound(pool(level), Math.random, avoid);
    let deck = picked.map((item) => vary(item, Math.random));
    let index = 0;
    let won = 0;
    lastRound.set(mode, picked);

    const dots = el('div', 'dots');
    dots.setAttribute('aria-hidden', 'true');
    let marks: HTMLElement[] = [];
    const area = el('div', 'turn');
    const levels = el('div', 'levels');
    const levelPicks = LEVELS.map((option) => {
      const pick = button('level-btn', '', () => changeLevel(option.level));
      words(thisRound.signal, () => {
        pick.textContent = `${option.emoji} ${text().levels[option.level]}`;
      });
      return { option, pick };
    });
    levels.append(...levelPicks.map(({ pick }) => pick));
    root.replaceChildren(dots, area, levels);

    function drawLevels(): void {
      for (const { option, pick } of levelPicks) pick.setAttribute('aria-pressed', String(option.level === level));
    }

    function drawDots(): void {
      marks = deck.map((_, at) => {
        const mark = el('span', 'dot');
        if (at < index - 1) mark.classList.add('dot-done');
        return mark;
      });
      dots.replaceChildren(...marks);
    }

    /** The questions still to come switch level. The one on screen, and the score, stay. */
    function changeLevel(chosen: Level): void {
      if (chosen === level) return;
      level = chosen;
      saveLevel(mode, level);
      drawLevels();
      const played = picked.slice(0, index);
      const wanted = picked.length - index;
      const coming = pickRound(pool(level), Math.random, [...played, ...avoid])
        .filter((item) => !played.includes(item))
        .slice(0, wanted);
      picked = [...played, ...coming];
      deck = [...deck.slice(0, index), ...coming.map((item) => vary(item, Math.random))];
      lastRound.set(mode, picked);
      const current = marks[index - 1]?.className;
      drawDots();
      if (current) marks[index - 1]?.setAttribute('class', current);
    }

    function next(): void {
      itemControl?.abort();
      const control = new AbortController();
      itemControl = control;
      const nudge = new Nudge(control.signal);
      if (index >= deck.length) {
        dots.remove();
        levels.hidden = true;
        area.replaceChildren(roundEnd(control.signal, { level, won, nudge, restart: start, onExit: options.onExit }));
        return;
      }
      const item = deck[index] as T;
      index += 1;
      marks[index - 1]?.classList.add('dot-now');
      area.replaceChildren();
      play(item, {
        area,
        signal: control.signal,
        nudge,
        win(from) {
          won += 1;
          awardStar(mode, from);
        },
        finish() {
          marks[index - 1]?.classList.replace('dot-now', 'dot-done');
          const last = index >= deck.length;
          const onward = armedButton('btn btn-go btn-big', next);
          words(control.signal, () => {
            onward.textContent = last ? text().finish : text().next;
          });
          setTimeout(() => nudge.now(onward), ARM_MS);
          return onward;
        },
      });
    }

    drawLevels();
    drawDots();
    next();
  }

  start(loadProgress().level[mode]);
}
