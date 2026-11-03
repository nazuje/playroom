import { burst } from '@playroom/kit';
import { button, centerOf, el } from './dom.ts';
import { awardStar, loadProgress, saveLevel, say, words } from './screen.ts';
import { text } from './lang/index.ts';
import { LEVELS } from './rounds.ts';
import type { Level } from './rounds.ts';
import type { ScoredMode } from './progress.ts';

/** What the round gives each game mode while it plays one question. */
export interface Turn {
  area: HTMLElement;
  /** Aborted when the child leaves or changes level, so late animation steps stop. */
  signal: AbortSignal;
  win(from: HTMLElement): void;
  /** Call once the turn is over. Returns the Next button to place on the page. */
  finish(): HTMLButtonElement;
}

interface RoundOptions<T> {
  mode: ScoredMode;
  root: HTMLElement;
  signal: AbortSignal;
  deal(level: Level): T[];
  play(item: T, turn: Turn): void;
  onExit(): void;
}

function levelButton(
  signal: AbortSignal,
  option: (typeof LEVELS)[number],
  current: Level,
  onPick: () => void,
): HTMLButtonElement {
  const pick = button('level-btn', '', onPick);
  words(signal, () => {
    pick.textContent = `${option.emoji} ${text().levels[option.level]}`;
  });
  pick.setAttribute('aria-pressed', String(option.level === current));
  return pick;
}

interface RoundEnd {
  level: Level;
  won: number;
  restart(level: Level): void;
  onExit(): void;
}

function roundEnd(signal: AbortSignal, { level, won, restart, onExit }: RoundEnd): HTMLElement {
  const card = el('section', 'round-end');
  const line = el('h2', 'round-line');
  card.append(el('div', 'round-stars', won > 0 ? '⭐'.repeat(won) : '🧪'), line);
  const actions = el('div', 'actions');
  const again = button('btn btn-sun', '', () => restart(level));
  const harder = button('btn btn-leaf', '', () => restart((level + 1) as Level));
  const back = button('btn', '', onExit);
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
  requestAnimationFrame(() => {
    const { x, y } = centerOf(card);
    if (won > 0) burst(x, y, 28);
  });
  return card;
}

/** Plays a round of a few questions, with the level picker and progress dots around it. */
export function runRound<T>(options: RoundOptions<T>): void {
  const { mode, root, signal, deal, play } = options;
  let itemControl: AbortController | null = null;
  let levelControl: AbortController | null = null;
  signal.addEventListener('abort', () => {
    itemControl?.abort();
    levelControl?.abort();
  });

  function start(level: Level): void {
    itemControl?.abort();
    levelControl?.abort();
    const thisLevel = new AbortController();
    levelControl = thisLevel;
    saveLevel(mode, level);
    const deck = deal(level);
    let index = 0;
    let won = 0;

    const levels = el('div', 'levels');
    for (const option of LEVELS) {
      levels.append(levelButton(thisLevel.signal, option, level, () => start(option.level)));
    }
    const dots = el('div', 'dots');
    dots.setAttribute('aria-hidden', 'true');
    const marks = deck.map(() => el('span', 'dot'));
    dots.append(...marks);
    const area = el('div', 'turn');
    root.replaceChildren(levels, dots, area);

    function next(): void {
      itemControl?.abort();
      if (index >= deck.length) {
        dots.remove();
        area.replaceChildren(roundEnd(thisLevel.signal, { level, won, restart: start, onExit: options.onExit }));
        return;
      }
      marks[index]?.classList.add('dot-now');
      const item = deck[index] as T;
      index += 1;
      const control = new AbortController();
      itemControl = control;
      area.replaceChildren();
      play(item, {
        area,
        signal: control.signal,
        win(from) {
          won += 1;
          awardStar(mode, from);
        },
        finish() {
          const mark = marks[index - 1];
          mark?.classList.replace('dot-now', 'dot-done');
          const last = index >= deck.length;
          const onward = button('btn btn-sun btn-big', '', next);
          words(control.signal, () => {
            onward.textContent = last ? text().finish : text().next;
          });
          return onward;
        },
      });
    }
    next();
  }

  start(loadProgress().level[mode]);
}
