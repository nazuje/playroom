import { COLORS } from './mix.ts';
import type { ColorId } from './mix.ts';
import { playNote } from '@playroom/kit';
import { el, onPress, prefersCalm, replayClass } from './dom.ts';
import { text } from './lang/index.ts';
import { words } from './screen.ts';

/** A tin of paint with a dribble down the side. Art only, with no button around it. */
export function tin(color: ColorId): HTMLElement {
  const can = el('span', 'tin');
  can.style.setProperty('--paint', COLORS[color].hex);
  can.setAttribute('aria-hidden', 'true');
  can.append(el('span', 'tin-paint'), el('span', 'tin-drip'));
  return can;
}

/** Each paint plinks its own note, low for black up to high for white. */
const NOTES: Partial<Record<ColorId, number>> = { black: 262, blue: 330, red: 392, yellow: 494, white: 587 };

export function potButton(
  signal: AbortSignal,
  color: ColorId,
  onTap: (pot: HTMLButtonElement) => void,
): HTMLButtonElement {
  const pot = el('button', 'pot');
  pot.type = 'button';
  const label = el('span', 'pot-label');
  words(signal, () => {
    pot.setAttribute('aria-label', text().paintLabel(color));
    label.textContent = text().colorLabel(color);
  });
  pot.append(tin(color), label);
  onPress(pot, () => {
    if (pot.disabled) return;
    replayClass(pot, 'pot-tap');
    playNote(NOTES[color] ?? 440, { seconds: 0.25, gain: 0.5 });
    onTap(pot);
  });
  return pot;
}

/** A blob of paint jumps from a pot to the beaker. */
export function flyDrop(from: HTMLElement, to: HTMLElement, hex: string): void {
  if (prefersCalm()) return;
  const start = from.getBoundingClientRect();
  const end = to.getBoundingClientRect();
  const drop = el('div', 'drop');
  drop.style.background = hex;
  drop.style.left = `${start.left + start.width / 2}px`;
  drop.style.top = `${start.top + 16}px`;
  document.body.append(drop);
  const dx = end.left + end.width / 2 - (start.left + start.width / 2);
  const dy = end.top + end.height * 0.3 - (start.top + 16);
  const flight = drop.animate(
    [
      { transform: 'translate(-50%, -50%) scale(0.6)' },
      { transform: `translate(calc(-50% + ${dx * 0.5}px), calc(-50% + ${dy * 0.5 - 50}px)) scale(1.15)`, offset: 0.55 },
      { transform: `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px)) scale(0.7)` },
    ],
    { duration: 340, easing: 'ease-in', fill: 'forwards' },
  );
  void flight.finished.finally(() => drop.remove());
}
