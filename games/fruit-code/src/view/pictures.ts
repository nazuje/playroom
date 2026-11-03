// What the pictures in a row look like: fruits with googly eyes and a sticker spot, number tiles with dots, and
// the signs between them. Fruits are emoji, everything else is CSS.
import type { Fruit, Term } from '../rules/equation.ts';
import { button, element } from '../ui.ts';

export const EMOJI: Record<Fruit, string> = {
  apple: '🍎',
  banana: '🍌',
  strawberry: '🍓',
  pear: '🍐',
  orange: '🍊',
  lemon: '🍋',
  pineapple: '🍍',
  watermelon: '🍉',
};

const DOTS_IN_A_ROW = 5;

/** Dots in rows of five, with a gap after each ten, so a child who can't read numbers yet can count them. */
export function pips(value: number): HTMLElement {
  const holder = element('span', value > 10 ? 'pips pips-many' : 'pips');
  for (let at = 0; at < value; at += 1) {
    const pip = element('span', 'pip');
    if (at > 0 && at % 10 === 0) pip.classList.add('pip-ten');
    holder.append(pip);
  }
  holder.style.setProperty('--cols', String(Math.max(1, Math.min(DOTS_IN_A_ROW, value))));
  return holder;
}

export function numberFace(value: number): DocumentFragment {
  const face = document.createDocumentFragment();
  const digit = element('span', 'digit');
  digit.textContent = String(value);
  face.append(digit, pips(value));
  return face;
}

export function sign(text: string, className = ''): HTMLElement {
  const made = element('span', `op ${className}`.trim());
  made.textContent = text;
  return made;
}

function eyes(): HTMLElement {
  const pair = element('span', 'eyes');
  for (let at = 0; at < 2; at += 1) {
    const eye = element('span', 'eye');
    eye.append(element('span', 'pupil'));
    pair.append(eye);
  }
  return pair;
}

/** The fruit itself: one emoji, or a little pile of them for a bunch. */
export function fruitArt(fruit: Fruit, count = 1): HTMLElement {
  const art = element('span', count > 1 ? `art art-bunch art-${count}` : 'art');
  for (let at = 0; at < count; at += 1) {
    const one = element('span', 'emoji');
    one.textContent = EMOJI[fruit];
    art.append(one);
  }
  return art;
}

/** A picture in a row. The sticker starts hidden and slaps on when the fruit is found. */
export function termButton(term: Term, id: string): HTMLButtonElement {
  const made = button(`fruit shape-${term.shape}`);
  made.dataset.term = id;
  made.dataset.fruit = term.fruit;
  made.dataset.count = String(term.count);
  if (term.shape === 'times') {
    const times = element('span', 'times-mark');
    times.textContent = `${term.count}×`;
    made.append(times);
  }
  const holder = element('span', 'fruit-body');
  holder.append(fruitArt(term.fruit, term.shape === 'bunch' ? term.count : 1), eyes(), element('span', 'tongue'));
  const sticker = element('span', 'sticker');
  sticker.append(element('span', 'sticker-num'));
  made.append(holder, sticker);
  return made;
}

/** Shows a number on a picture's sticker, or hides it. */
export function setSticker(made: HTMLElement, value: number | null): void {
  const number = made.querySelector<HTMLElement>('.sticker-num');
  if (number) number.textContent = value === null ? '' : String(value);
}

/** A small picture of what the number buttons are setting, for the answer prompt. */
export function promptArt(terms: readonly Term[]): HTMLElement {
  const art = element('span', 'prompt-art');
  terms.forEach((term, at) => {
    if (at > 0) art.append(sign(term.sign > 0 ? '+' : '−', 'op-small'));
    const one = element('span', 'prompt-fruit');
    one.textContent = EMOJI[term.fruit];
    art.append(one);
  });
  return art;
}
