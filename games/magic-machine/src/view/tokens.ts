// Number tokens and rule faces. A token is a round enamel disc with its digit and dots in rows of five, so a child
// who can't read numbers yet can count them. A rule face is the symbol and its number with a small picture:
// green dots added, red dots crossed out, copies for times, and a cut disc for half.
import type { Rule } from '../rules/machine.ts';
import { SYMBOL } from '../rules/machine.ts';
import { element } from '../ui.ts';

const DOTS_IN_A_ROW = 5;

/** Dots in rows of five, with a gap after each ten. */
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

/** What a token shows: the digit and its dots, or a "?" for the number being asked about. */
export function fillToken(token: HTMLElement, value: number | null): void {
  token.dataset.value = value === null ? '' : String(value);
  token.classList.toggle('token-ask', value === null);
  const digit = element('span', 'digit');
  digit.textContent = value === null ? '?' : String(value);
  token.replaceChildren(digit);
  // Past 20 the dots would be too many to count, so only the digit shows.
  if (value !== null && value > 0 && value <= 20) token.append(pips(value));
}

export function token(className: string, value: number | null): HTMLElement {
  const made = element('span', `token ${className}`.trim());
  fillToken(made, value);
  return made;
}

/** The little picture under a rule's symbol. */
function rulePicture(rule: Rule): HTMLElement {
  const art = element('span', `rule-art rule-art-${rule.op}`);
  if (rule.op === 'add' || rule.op === 'sub') {
    const count = Math.min(rule.n, 10);
    for (let at = 0; at < count; at += 1) art.append(element('span', 'rule-dot'));
    art.style.setProperty('--cols', String(Math.min(5, count)));
  } else if (rule.op === 'mul') {
    for (let at = 0; at < rule.n; at += 1) art.append(element('span', 'rule-copy'));
  } else {
    art.append(element('span', 'rule-half'), element('span', 'rule-half'));
  }
  return art;
}

/** A rule as it shows on a card or an open plate: "+2" with two green dots, "×2" with two copies. */
export function ruleFace(rule: Rule): HTMLElement {
  const face = element('span', `rule-face rule-${rule.op}`);
  const sign = element('span', 'rule-sign');
  sign.textContent = SYMBOL[rule.op];
  const number = element('span', 'rule-number');
  number.textContent = String(rule.n);
  const top = element('span', 'rule-top');
  top.append(sign, number);
  face.append(top, rulePicture(rule));
  return face;
}
