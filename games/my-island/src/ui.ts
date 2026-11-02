import { playNote } from '@playroom/kit';

/** How long a new screen ignores taps, so a tap meant for the last screen can't land on this one. */
const SETTLE_MS = 450;
/** How long the buttons that leave an island or make a new one must be held. */
export const HOLD_MS = 900;
let settledAt = 0;
let settleTimer = 0;

/** A new screen has just appeared: taps on its buttons wait a moment. The bots read data-settling. */
export function settle(): void {
  settledAt = performance.now() + SETTLE_MS;
  document.body.dataset.settling = 'yes';
  window.clearTimeout(settleTimer);
  settleTimer = window.setTimeout(() => delete document.body.dataset.settling, SETTLE_MS);
}

const settling = (): boolean => performance.now() < settledAt;

export function element<K extends keyof HTMLElementTagNameMap>(tag: K, className: string, content = ''): HTMLElementTagNameMap[K] {
  const made = document.createElement(tag);
  made.className = className;
  if (content) made.textContent = content;
  return made;
}

export function button(className: string, content = '', label = ''): HTMLButtonElement {
  const made = element('button', className, content);
  made.type = 'button';
  if (label) made.setAttribute('aria-label', label);
  return made;
}

/**
 * A press counts on pointerdown, so a tap answers within a frame and two fingers both work. A keyboard
 * press arrives as a click with no pointer behind it.
 */
export function onPress(target: HTMLElement, listener: () => void): void {
  target.addEventListener('pointerdown', (event) => {
    if (event.button !== 0) return;
    event.preventDefault();
    if (!settling()) listener();
  });
  target.addEventListener('click', (event) => {
    if (event.detail === 0) listener();
  });
}

/**
 * A press that counts only once held still for a moment, while a ring fills around the button. It
 * guards the few buttons that leave an island or make a new one: a mash is all quick taps.
 */
export function onHold(target: HTMLElement, listener: () => void): void {
  let finger: number | null = null;
  let timer = 0;
  target.classList.add('hold-btn');
  target.style.setProperty('--hold-ms', `${HOLD_MS}ms`);
  const letGo = (): void => {
    window.clearTimeout(timer);
    finger = null;
    target.classList.remove('holding');
  };
  target.addEventListener('pointerdown', (event) => {
    if (event.button !== 0 || finger !== null) return;
    event.preventDefault();
    if (settling()) return;
    finger = event.pointerId;
    playNote(440, { seconds: 0.08, gain: 0.2 });
    target.classList.add('holding');
    timer = window.setTimeout(() => {
      letGo();
      listener();
    }, HOLD_MS);
  });
  for (const name of ['pointerup', 'pointercancel', 'pointerleave'] as const) {
    target.addEventListener(name, (event) => {
      if (event.pointerId === finger) letGo();
    });
  }
  target.addEventListener('contextmenu', (event) => event.preventDefault());
  target.addEventListener('click', (event) => {
    if (event.detail === 0) listener();
  });
}

export const calm = (): boolean => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export function byId(id: string): HTMLElement {
  const found = document.getElementById(id);
  if (!found) throw new Error(`Missing #${id} in index.html`);
  return found;
}

export const hex = (color: number): string => `#${color.toString(16).padStart(6, '0')}`;
