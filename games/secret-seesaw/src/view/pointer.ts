// A bobbing 👆 under something worth tapping, for a child who can't read the hint. Any tap clears it.
import { element } from '../ui.ts';

let hand: HTMLElement | null = null;
let glowing: Element | null = null;

export function clearPointer(): void {
  hand?.remove();
  hand = null;
  glowing?.classList.remove('nudge');
  glowing = null;
}

/** Makes one thing pulse until the next tap, with the hand under it or under a second thing. */
export function pointAt(target: Element | null, handUnder: Element | null = target): void {
  clearPointer();
  if (!target || !handUnder) return;
  const box = handUnder.getBoundingClientRect();
  if (!box.width) return;
  hand = element('span', 'pointer');
  hand.textContent = '👆';
  hand.setAttribute('aria-hidden', 'true');
  hand.style.left = `${box.left + box.width / 2}px`;
  hand.style.top = `${box.bottom - box.height * 0.25}px`;
  document.body.append(hand);
  glowing = target;
  target.classList.add('nudge');
}
