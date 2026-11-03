// The board: wooden crates of fruit rows with the question on a chalk sign at the bottom. It sizes the pictures
// to fit the screen, puts stickers on found fruits, and plays the slap, the wrong-number faces and the hint.
import { text } from '../lang/index.ts';
import { loneFruit, picture, rowPicture, type Fruit, type Term } from '../rules/equation.ts';
import type { Level } from '../rules/levels.ts';
import type { Check, Play } from '../rules/play.ts';
import { slapSound } from '../sounds.ts';
import { button, calm, element } from '../ui.ts';
import { numberFace, setSticker, sign, termButton } from './pictures.ts';

/** A clue row by its index, or the question. */
export type RowId = number | 'q';

const LARGEST = 96;
const SMALLEST = 64;
const BOARD_PADDING = 36;
const SLAP_GAP_MS = 110;
const SLAP_MS = 420;
const SPEAKING_MS = 900;
const REACTIONS = ['raspberry', 'squish', 'roll'] as const;

/** How wide a row is, in fruit widths, so the biggest fruit that fits can be chosen. */
function rowUnits(terms: readonly Term[]): number {
  const pictures = terms.reduce((sum, term) => sum + (term.shape === 'one' ? 1 : term.shape === 'bunch' ? 1.3 : 1.4), 0);
  return pictures + terms.length * 0.3 + 0.95 + 0.3;
}

export interface BoardView {
  show(level: Level): void;
  /** Stickers, the selected fruit and finished rows, with no animation. */
  update(play: Play): void;
  /** Slaps the found fruit's sticker onto every copy, top to bottom. Returns how long that takes. */
  slap(play: Play, fruit: Fruit): number;
  /** A wrong number: the fruit pulls a face, and rows that can be checked show they don't add up. */
  wrong(play: Play, value: number, checks: readonly Check[], reaction: number): void;
  hint(rows: readonly RowId[], fruit: Fruit | null): void;
  /** A try ran out: every fruit squishes and the stickers fall off. */
  scramble(): void;
  layout(): void;
  onFruit(listener: (fruit: Fruit, row: RowId) => void): void;
  onRow(listener: (row: RowId) => void): void;
}

export function createBoard(host: HTMLElement): BoardView {
  let level: Level | null = null;
  let fruitListener: (fruit: Fruit, row: RowId) => void = () => {};
  let rowListener: (row: RowId) => void = () => {};
  const timers = new Set<number>();

  function later(ms: number, run: () => void): void {
    const timer = window.setTimeout(() => {
      timers.delete(timer);
      run();
    }, ms);
    timers.add(timer);
  }

  const rowEl = (id: RowId): HTMLElement | null => host.querySelector(`[data-row="${id}"]`);
  const copies = (fruit: Fruit): HTMLElement[] => [...host.querySelectorAll<HTMLElement>(`.fruit[data-fruit="${fruit}"]`)];

  function makeRow(terms: readonly Term[], id: RowId, total: number | null): HTMLElement {
    const row = element('div', id === 'q' ? 'row row-question' : 'row');
    row.dataset.row = String(id);
    row.dataset.picture = total === null ? `${picture(terms)}=?` : rowPicture({ terms: [...terms], total });
    terms.forEach((term, at) => {
      if (at > 0) row.append(term.sign > 0 ? sign('+') : sign('−', 'op-minus'));
      row.append(termButton(term, `${id}t${at}`));
    });
    row.append(sign('=', 'op-equals'));
    const tile = button(total === null ? 'total total-ask' : 'total');
    if (total === null) {
      const mark = element('span', 'digit');
      mark.textContent = '?';
      tile.append(mark);
    } else {
      tile.append(numberFace(total));
    }
    row.append(tile);
    const bubble = element('span', 'off-sum');
    row.append(bubble);
    row.addEventListener('pointerdown', (event) => {
      if (event.button !== 0) return;
      speaking(row);
      const fruit = (event.target as HTMLElement).closest<HTMLElement>('.fruit');
      if (fruit) fruitListener(fruit.dataset.fruit as Fruit, id);
      else rowListener(id);
    });
    // A keyboard press arrives as a click with no pointer behind it.
    row.addEventListener('click', (event) => {
      if (event.detail !== 0) return;
      const fruit = (event.target as HTMLElement).closest<HTMLElement>('.fruit');
      if (fruit) fruitListener(fruit.dataset.fruit as Fruit, id);
      else if ((event.target as HTMLElement).closest('.total')) rowListener(id);
    });
    return row;
  }

  /** A row being read out lights up and its fruits hop, so a tap shows even with the sound off. */
  function speaking(row: HTMLElement): void {
    row.classList.remove('speaking');
    void row.offsetWidth;
    row.classList.add('speaking');
    later(SPEAKING_MS, () => row.classList.remove('speaking'));
  }

  function label(play: Play): void {
    if (!level) return;
    const rows = [...level.puzzle.clues.map((row) => row.terms), level.puzzle.question];
    rows.forEach((terms, at) => {
      const id: RowId = at === level!.puzzle.clues.length ? 'q' : at;
      terms.forEach((term, index) => {
        host.querySelector(`[data-term="${id}t${index}"]`)?.setAttribute('aria-label', text().termLabel(term, play.known[term.fruit]));
      });
      rowEl(id)?.querySelector('.total')?.setAttribute('aria-label', text().sayRow);
    });
  }

  function update(play: Play): void {
    if (!level) return;
    const lone = loneFruit(level.puzzle);
    for (const made of host.querySelectorAll<HTMLElement>('.fruit')) {
      const fruit = made.dataset.fruit as Fruit;
      const value = play.known[fruit];
      made.dataset.known = String(value !== undefined);
      setSticker(made, value === undefined ? null : Number(made.dataset.count) * value);
      const selected = !play.won && (play.target === fruit || (play.target === 'question' && lone === fruit));
      made.classList.toggle('selected', selected);
    }
    level.puzzle.clues.forEach((row, at) => {
      const solved = row.terms.every((term) => play.known[term.fruit] !== undefined);
      rowEl(at)?.setAttribute('data-solved', String(solved));
    });
    const question = rowEl('q');
    if (question) {
      question.dataset.selected = String(!play.won && play.target === 'question');
      question.dataset.solved = String(play.won);
      const mark = question.querySelector<HTMLElement>('.total .digit');
      if (mark) mark.textContent = play.won ? String(sumKnown(level.puzzle.question, play)) : '?';
    }
    label(play);
  }

  const sumKnown = (terms: readonly Term[], play: Play): number =>
    terms.reduce((sum, term) => sum + term.sign * term.count * (play.known[term.fruit] ?? level!.values[term.fruit] ?? 0), 0);

  function clearWrong(): void {
    for (const made of host.querySelectorAll('.fruit')) {
      made.classList.remove(...REACTIONS.map((kind) => `react-${kind}`), 'guess');
    }
    for (const row of host.querySelectorAll<HTMLElement>('.row')) {
      row.dataset.off = 'false';
      const equals = row.querySelector('.op-equals');
      if (equals) equals.textContent = '=';
    }
    host.querySelector('.row-question .total')?.classList.remove('off');
  }

  function clearHint(): void {
    for (const made of host.querySelectorAll('.hint')) made.classList.remove('hint');
  }

  return {
    show(next) {
      for (const timer of timers) window.clearTimeout(timer);
      timers.clear();
      level = next;
      host.replaceChildren(
        ...next.puzzle.clues.map((row, at) => makeRow(row.terms, at, row.total)),
        makeRow(next.puzzle.question, 'q', null),
      );
      host.dataset.rows = String(next.puzzle.clues.length + 1);
      host.dataset.scrambled = 'false';
      this.layout();
    },
    update(play) {
      clearWrong();
      update(play);
    },
    slap(play, fruit) {
      clearHint();
      const targets = copies(fruit);
      if (calm()) {
        update(play);
        return 0;
      }
      targets.forEach((made, at) => {
        later(at * SLAP_GAP_MS, () => {
          const value = play.known[fruit];
          if (value === undefined) return;
          setSticker(made, Number(made.dataset.count) * value);
          made.dataset.known = 'true';
          made.classList.remove('slap');
          void made.offsetWidth;
          made.classList.add('slap');
          slapSound(at);
        });
      });
      const total = targets.length * SLAP_GAP_MS + SLAP_MS;
      later(total, () => {
        for (const made of targets) made.classList.remove('slap');
        update(play);
      });
      return total;
    },
    wrong(play, value, checks, reaction) {
      if (!level) return;
      clearWrong();
      clearHint();
      const kind = REACTIONS[reaction % REACTIONS.length];
      const fruit = play.target === 'question' ? loneFruit(level.puzzle) : play.target;
      if (fruit) {
        for (const made of copies(fruit)) {
          made.classList.add(`react-${kind}`, 'guess');
          setSticker(made, Number(made.dataset.count) * value);
        }
      } else {
        const ask = host.querySelector<HTMLElement>('.row-question .total');
        const mark = ask?.querySelector<HTMLElement>('.digit');
        if (mark) mark.textContent = String(value);
        ask?.classList.add('off');
        for (const made of host.querySelectorAll<HTMLElement>('.row-question .fruit')) made.classList.add(`react-${kind}`);
      }
      for (const check of checks) {
        const row = rowEl(check.row);
        if (!row) continue;
        row.dataset.off = 'true';
        const equals = row.querySelector('.op-equals');
        if (equals) equals.textContent = '≠';
        const bubble = row.querySelector<HTMLElement>('.off-sum');
        if (bubble) bubble.textContent = String(check.sum);
      }
    },
    hint(rows, fruit) {
      clearHint();
      for (const id of rows) {
        const row = rowEl(id);
        row?.classList.add('hint');
        if (fruit) for (const made of row?.querySelectorAll(`.fruit[data-fruit="${fruit}"]`) ?? []) made.classList.add('hint');
      }
    },
    scramble() {
      clearWrong();
      clearHint();
      for (const made of host.querySelectorAll<HTMLElement>('.fruit')) made.classList.add('react-squish');
      host.dataset.scrambled = 'true';
    },
    layout() {
      if (!level) return;
      const rows = [...level.puzzle.clues.map((row) => row.terms), level.puzzle.question];
      const widest = Math.max(...rows.map(rowUnits));
      const { width, height } = host.getBoundingClientRect();
      if (!width || !height) return;
      const byWidth = (width - 20) / widest;
      // Matches the CSS: each row is the fruit plus a tenth above and below and a 3px border, the question has a
      // 6px border and a small gap above it, rows sit 0.16 of a fruit apart, and the board has 36px of padding.
      const fixed = BOARD_PADDING + 6 * rows.length + 6;
      const perFruit = 1.2 * rows.length + 0.08 + 0.16 * (rows.length - 1);
      const byHeight = (height - fixed) / perFruit;
      const size = Math.max(SMALLEST, Math.min(LARGEST, byWidth, byHeight));
      host.style.setProperty('--fruit', `${Math.floor(size)}px`);
    },
    onFruit(listener) {
      fruitListener = listener;
    },
    onRow(listener) {
      rowListener = listener;
    },
  };
}
