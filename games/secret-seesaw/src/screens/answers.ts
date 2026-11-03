// The answer dock under the seesaws. Three big numbers early on. Later every number from 0 to 20: a grid on a
// tablet, and on a phone a big − / + stepper with an open button, so nothing ever covers the board.
import { text } from '../lang/index.ts';
import type { Mystery } from '../rules/board.ts';
import type { Level } from '../rules/levels.ts';
import { button, element, onPress } from '../ui.ts';
import { mysteryIcon, pips } from '../view/items.ts';

export type PickerPlace = 'inline' | 'stepper';

export interface AnswerOptions {
  level: Level;
  mystery: Mystery;
  tried: readonly number[];
  place: PickerPlace;
  /** The number the stepper shows. */
  stepped: number;
  onChoice: (value: number) => void;
  onStep: (by: number) => void;
}

function choiceButton(value: number, big: boolean, { tried, onChoice }: AnswerOptions): HTMLButtonElement {
  const made = button(big ? 'choice' : 'pick');
  made.dataset.choice = String(value);
  const digit = element('span', 'digit');
  digit.textContent = String(value);
  made.append(digit);
  if (big) made.append(pips(value));
  if (tried.includes(value)) {
    made.classList.add('tried');
    made.setAttribute('aria-disabled', 'true');
  }
  made.setAttribute('aria-label', String(value));
  onPress(made, () => onChoice(value));
  return made;
}

function prompt(mystery: Mystery): HTMLElement {
  const made = element('div', 'prompt');
  const equals = element('span', 'prompt-equals');
  equals.textContent = '= ?';
  made.append(mysteryIcon(mystery), equals);
  made.setAttribute('aria-label', text().answer(mystery));
  return made;
}

function stepper(options: AnswerOptions): HTMLElement {
  const { mystery, stepped, tried, onStep, onChoice } = options;
  const row = element('div', 'stepper');
  const less = button('step step-less');
  less.textContent = '−';
  less.dataset.step = '-1';
  less.setAttribute('aria-label', text().less);
  onPress(less, () => onStep(-1));
  const more = button('step step-more');
  more.textContent = '+';
  more.dataset.step = '1';
  more.setAttribute('aria-label', text().more);
  onPress(more, () => onStep(1));
  const shown = element('div', 'step-shown');
  shown.dataset.stepped = String(stepped);
  const number = element('span', 'step-number');
  number.textContent = String(stepped);
  shown.append(mysteryIcon(mystery), number);
  shown.classList.toggle('tried', tried.includes(stepped));
  shown.setAttribute('aria-live', 'polite');
  const open = button('step-open');
  open.dataset.action = 'open';
  open.append(mysteryIcon(mystery));
  const label = element('span', 'step-open-label');
  label.textContent = text().open;
  open.append(label);
  open.setAttribute('aria-label', text().openFor(mystery, stepped));
  onPress(open, () => onChoice(stepped));
  row.append(less, shown, more, open);
  return row;
}

export function answerRow(options: AnswerOptions): HTMLElement {
  const { level, mystery, place } = options;
  const row = element('div', 'answer');
  if (level.answer === 'three') {
    const choices = element('div', 'choices');
    choices.append(...level.choices.map((value) => choiceButton(value, true, options)));
    row.append(prompt(mystery), choices);
  } else if (place === 'stepper') {
    row.append(stepper(options));
  } else {
    const grid = element('div', 'picker-grid');
    grid.append(...level.choices.map((value) => choiceButton(value, false, options)));
    row.append(prompt(mystery), grid);
  }
  return row;
}

/**
 * What to pulse to show the answers, and where the hand goes. The hand never sits on one number, so it can't
 * give an answer away: it points at the "= ?" of the choices and grid, or at the stepper's +.
 */
export function answerTarget(dock: HTMLElement): { pulse: HTMLElement | null; hand: HTMLElement | null } {
  const stepper = dock.querySelector<HTMLElement>('.step-more');
  if (stepper) return { pulse: dock.querySelector('.stepper'), hand: stepper };
  return { pulse: dock.querySelector('.choices, .picker-grid'), hand: dock.querySelector('.prompt-equals') };
}
