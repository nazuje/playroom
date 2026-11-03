// What a weight, a box and a hat look like. Weights carry dots in rows of five as well as the digit, so a
// child who can't read numbers yet can count them.
import { text } from '../lang/index.ts';
import type { Item, Mystery } from '../rules/board.ts';
import { button, element } from '../ui.ts';

const PIPS_IN_A_ROW = 5;

export function pips(value: number): HTMLElement {
  const holder = element('span', value > 10 ? 'pips pips-many' : 'pips');
  for (let at = 0; at < value; at += 1) {
    const pip = element('span', 'pip');
    // A little gap after each ten, so 14 reads as ten and four.
    if (at > 0 && at % 10 === 0) pip.classList.add('pip-ten');
    holder.append(pip);
  }
  holder.style.setProperty('--cols', String(Math.max(1, Math.min(PIPS_IN_A_ROW, value))));
  return holder;
}

/** The face of a weight: digit and dots. Also used by the answer buttons and the tray. */
export function weightFace(value: number): DocumentFragment {
  const face = document.createDocumentFragment();
  const digit = element('span', 'digit');
  digit.textContent = String(value);
  face.append(digit, pips(value));
  return face;
}

function mysteryParts(mystery: Mystery): HTMLElement[] {
  const parts =
    mystery === 'box'
      ? [element('span', 'box-body'), element('span', 'box-lid'), element('span', 'box-bow')]
      : [element('span', 'hat-brim'), element('span', 'hat-crown'), element('span', 'hat-band')];
  const tag = element('span', 'mystery-tag');
  tag.textContent = '?';
  const spring = element('span', 'spring');
  spring.append(element('span', 'spring-coil'), element('span', 'spring-num'));
  return [...parts, tag, spring];
}

/** A small picture of the mystery, for the answer prompt. */
export function mysteryIcon(mystery: Mystery): HTMLElement {
  const icon = element('span', `mystery-icon mystery-${mystery}`);
  icon.append(...mysteryParts(mystery));
  return icon;
}

export function itemButton(item: Item): HTMLButtonElement {
  const made = button('item');
  made.dataset.item = item.id;
  if (item.kind === 'mystery') {
    made.classList.add('mystery', `mystery-${item.mystery}`);
    made.dataset.mystery = item.mystery;
    made.append(...mysteryParts(item.mystery));
    made.setAttribute('aria-label', text().mystery[item.mystery]);
    return made;
  }
  made.classList.add('weight');
  made.dataset.value = String(item.value);
  if (item.loose) made.classList.add('loose');
  if (item.opened) {
    made.classList.add('opened', `opened-${item.opened}`);
    made.dataset.opened = item.opened;
    made.append(element('span', 'opened-mark'));
  }
  made.append(element('span', 'knob'), weightFace(item.value));
  made.setAttribute('aria-label', item.opened ? text().opened(item.opened, item.value) : text().weight(item.value));
  return made;
}

/** The box springs open to show a number: the real one, or a guess for a moment. */
export function peek(target: HTMLElement, value: number): void {
  const number = target.querySelector<HTMLElement>('.spring-num');
  if (number) number.textContent = String(value);
  target.classList.add('peek');
}

export function unpeek(target: HTMLElement): void {
  target.classList.remove('peek');
}
