import { playSound } from '@playroom/kit';
import { button, el, replayClass, wait } from '../dom.ts';
import { Beaker, fillFor } from '../beaker.ts';
import { flyDrop, potButton } from '../pots.ts';
import { COLORS, mix, PAINTS, sameColor, totalParts } from '../mix.ts';
import type { ColorId, Paint, Parts } from '../mix.ts';
import { MAKE_CAPACITY, pickSurprise, recipePaints } from '../rounds.ts';
import type { Target } from '../rounds.ts';
import type { Turn } from '../round.ts';
import { say, words } from '../screen.ts';
import { text } from '../lang/index.ts';

function requestCard(signal: AbortSignal, target: Target): HTMLElement {
  const request = (): string => text().request(target.color);
  const card = button('request', '', () => say(request));
  const swatch = el('span', 'swatch');
  swatch.style.setProperty('--paint', COLORS[target.color].hex);
  const bubble = el('span', 'bubble-text');
  words(signal, () => {
    bubble.textContent = text().quote(request());
  });
  card.append(el('span', 'who', target.who), bubble, swatch);
  return card;
}

export function playMake(target: Target, turn: Turn): void {
  const { area, signal, nudge } = turn;
  let parts: Parts = {};
  let misses = 0;
  let mixed = false;
  let finished = false;
  /** What the beaker holds after the last mix, for its label. */
  let shown: ColorId | null = null;
  let messageLine = (): string => text().tapPaints;

  const beaker = new Beaker();
  const message = el('p', 'message');
  const recipe = el('p', 'small-print');
  const pots = el('div', 'pots');
  const actions = el('div', 'actions');

  const potFor = new Map<Paint, HTMLButtonElement>();
  for (const paint of PAINTS) {
    const pot = potButton(signal, paint, (tapped) => {
      addPaint(paint, tapped);
    });
    potFor.set(paint, pot);
    pots.append(pot);
  }

  const emptyBtn = button('btn btn-rinse', '', () => {
    void clearBeaker();
  });
  const mixBtn = button('btn btn-go btn-big', '', () => {
    void runMix();
  });
  const hintBtn = button('btn btn-hint', '', () => {
    void showHint();
  });
  hintBtn.hidden = true;
  actions.append(emptyBtn, hintBtn, mixBtn);

  function refresh(): void {
    const count = totalParts(parts);
    emptyBtn.disabled = count === 0;
    mixBtn.disabled = count === 0 || mixed;
    recipe.textContent = text().recipe(parts);
  }

  function showMessage(line: () => string): void {
    messageLine = line;
    message.textContent = line();
  }

  function labelBeaker(color: ColorId | null): void {
    shown = color;
    beaker.setLabel(color ? text().beakerOf(color) : text().emptyBeaker);
  }

  function addPaint(paint: Paint, pot: HTMLButtonElement): void {
    if (finished) return;
    if (totalParts(parts) >= MAKE_CAPACITY) {
      beaker.wiggle();
      say(() => text().beakerFull);
      return;
    }
    clearHints();
    const partsBelow = totalParts(parts);
    parts = { ...parts, [paint]: (parts[paint] ?? 0) + 1 };
    mixed = false;
    const hex = COLORS[paint].hex;
    flyDrop(pot, beaker.element, hex);
    beaker.addBand(hex, fillFor(partsBelow + 1), partsBelow);
    say(() => text().colorSpoken(paint));
    refresh();
    nudge.now(mixBtn);
  }

  async function clearBeaker(): Promise<void> {
    parts = {};
    mixed = false;
    clearHints();
    refresh();
    showMessage(() => text().tapPaints);
    labelBeaker(null);
    await beaker.empty();
  }

  function clearHints(): void {
    for (const pot of potFor.values()) pot.classList.remove('hinted');
  }

  async function showHint(): Promise<void> {
    await clearBeaker();
    for (const paint of recipePaints(target.recipe)) potFor.get(paint)?.classList.add('hinted');
    showMessage(() => text().hintLine(target.recipe));
    nudge.now(...recipePaints(target.recipe).flatMap((paint) => potFor.get(paint) ?? []));
    say(() => text().hintSpoken(target.recipe));
  }

  async function runMix(): Promise<void> {
    const made = mix(parts);
    if (!made) return;
    const colors = PAINTS.filter((paint) => (parts[paint] ?? 0) > 0).map((paint) => COLORS[paint].hex);
    mixed = true;
    for (const control of [mixBtn, emptyBtn, hintBtn]) control.disabled = true;
    for (const pot of potFor.values()) pot.disabled = true;
    showMessage(() => '');

    await beaker.swirl(colors, COLORS[made].hex);
    if (signal.aborted) return;

    for (const pot of potFor.values()) pot.disabled = false;
    labelBeaker(made);

    if (sameColor(made, target.color)) {
      finished = true;
      const line = (): string => text().madeIt(target.color);
      for (const pot of potFor.values()) pot.disabled = true;
      beaker.celebrate();
      playSound('ding');
      showMessage(line);
      turn.win(beaker.element);
      say(line);
      actions.replaceChildren(turn.finish());
      const surprise = pickSurprise(Math.random);
      if (surprise) {
        await wait(1400);
        if (!signal.aborted) {
          beaker.surprise(surprise);
          playSound('boing');
        }
      }
      return;
    }

    const line = (): string => text().madeOther(made);
    misses += 1;
    beaker.oops();
    playSound('burp');
    replayClass(message, 'wiggle');
    showMessage(line);
    hintBtn.hidden = false;
    hintBtn.disabled = false;
    refresh();
    say(line);
    // After a couple of misses the hint stops waiting to be noticed.
    if (misses >= 2) nudge.now(hintBtn);
    else nudge.later(hintBtn);
  }

  const layout = el('div', 'play-make');
  const left = el('div', 'bench-wrap');
  left.append(beaker.element, el('div', 'bench'));
  const right = el('div', 'panel');
  right.append(message, recipe, pots, actions);
  layout.append(requestCard(signal, target), left, right);
  area.append(layout);
  words(signal, () => {
    message.textContent = messageLine();
    emptyBtn.textContent = text().empty;
    mixBtn.textContent = text().mix;
    hintBtn.textContent = text().hint;
    labelBeaker(shown);
    refresh();
  });
  say(() => text().request(target.color));
  nudge.now(...potFor.values());
}

