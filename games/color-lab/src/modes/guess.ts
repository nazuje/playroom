import { button, el, wait } from '../dom.ts';
import { Beaker, SWIRL_MS } from '../beaker.ts';
import { tin } from '../pots.ts';
import { COLORS } from '../mix.ts';
import type { ColorId } from '../mix.ts';
import { guessChoices, questionAnswer } from '../rounds.ts';
import type { Question } from '../rounds.ts';
import type { Turn } from '../round.ts';
import { say, words } from '../screen.ts';
import { text } from '../lang/index.ts';

const TILT_MS = 420;
/** The second paint starts while the first is still running, so the pour feels like one event. */
const SECOND_POUR_MS = 750;
const POUR_MS = 1050;

interface Side {
  pot: HTMLElement;
  stream: HTMLElement;
}

function colorLabel(signal: AbortSignal, className: string, color: ColorId): HTMLElement {
  const label = el('span', className);
  words(signal, () => {
    label.textContent = text().colorLabel(color);
  });
  return label;
}

function pourSide(signal: AbortSignal, color: ColorId, side: 'left' | 'right', stage: HTMLElement): Side {
  const pot = el('div', `stage-pot stage-pot-${side}`);
  pot.append(tin(color), colorLabel(signal, 'pot-label', color));
  const stream = el('div', `stream stream-${side}`);
  stream.style.background = COLORS[color].hex;
  stage.append(stream, pot);
  return { pot, stream };
}

function blob(signal: AbortSignal, color: ColorId, onTap: (choice: HTMLButtonElement) => void): HTMLButtonElement {
  const choice = el('button', 'choice');
  choice.type = 'button';
  const paint = el('span', 'blob');
  paint.style.setProperty('--paint', COLORS[color].hex);
  choice.append(paint, colorLabel(signal, 'choice-label', color));
  choice.addEventListener('click', () => onTap(choice));
  return choice;
}

/** Tilt, pour one, pour the other, right the pots, then stir. */
async function pourAndSwirl(left: Side, right: Side, beaker: Beaker, question: Question): Promise<void> {
  const hexA = COLORS[question.a].hex;
  const hexB = COLORS[question.b].hex;
  left.pot.classList.add('tipped');
  right.pot.classList.add('tipped');
  await wait(TILT_MS);

  beaker.setBubbling(true);
  left.stream.classList.add('flowing');
  beaker.addBand(hexA, 38);
  await wait(SECOND_POUR_MS);
  right.stream.classList.add('flowing');
  beaker.addBand(hexB, 76);
  await wait(POUR_MS - SECOND_POUR_MS);
  left.stream.classList.remove('flowing');
  await wait(SECOND_POUR_MS);
  right.stream.classList.remove('flowing');
  left.pot.classList.remove('tipped');
  right.pot.classList.remove('tipped');
  await wait(250);

  await beaker.swirl([hexA, hexB], COLORS[questionAnswer(question)].hex, SWIRL_MS);
  beaker.setBubbling(false);
}

export function playGuess(question: Question, turn: Turn): void {
  const { area, signal } = turn;
  const answer = questionAnswer(question);
  let picked: ColorId | null = null;
  let poured = false;
  let messageLine = (): string => text().guessSum(question);

  const stage = el('div', 'stage');
  const left = pourSide(signal, question.a, 'left', stage);
  const right = pourSide(signal, question.b, 'right', stage);
  const beaker = new Beaker();
  stage.append(el('div', 'bench'), beaker.element);

  const panel = el('div', 'panel');
  const message = el('p', 'message');
  const choices = el('div', 'choices');
  const actions = el('div', 'actions');

  const options = guessChoices(question, Math.random).map((color) => {
    const choice = blob(signal, color, (tapped) => {
      picked = color;
      for (const option of options) option.choice.classList.toggle('picked', option.choice === tapped);
      pour.disabled = false;
      say(() => text().colorSpoken(color));
    });
    return { color, choice };
  });
  choices.append(...options.map((option) => option.choice));

  const pour = button('btn btn-coral btn-big', '', () => {
    void runPour();
  });
  pour.disabled = true;
  words(signal, () => {
    message.textContent = messageLine();
    pour.textContent = text().pour;
    beaker.setLabel(poured ? text().beakerOf(answer) : text().emptyBeaker);
  });
  actions.append(pour);
  panel.append(message, choices, actions);
  const layout = el('div', 'play-guess');
  layout.append(stage, panel);
  area.append(layout);

  async function runPour(): Promise<void> {
    pour.disabled = true;
    pour.hidden = true;
    for (const option of options) option.choice.disabled = true;
    messageLine = () => '';
    message.textContent = '';

    await pourAndSwirl(left, right, beaker, question);
    if (signal.aborted) return;

    const guessedRight = picked === answer;
    const line = (): string => text().guessReveal(question, guessedRight);
    poured = true;
    beaker.setLabel(text().beakerOf(answer));
    beaker.celebrate();
    messageLine = line;
    message.textContent = line();
    message.classList.add('message-big');
    for (const option of options) {
      option.choice.classList.toggle('correct', option.color === answer);
    }
    if (guessedRight) turn.win(beaker.element);
    say(line);
    actions.append(turn.finish());
  }

  say(() => text().guessAsk(question));
}
