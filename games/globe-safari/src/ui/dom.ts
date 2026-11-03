import { playNote } from '@playroom/kit';

type Child = Node | string | null | undefined | false;

interface ElementOptions {
  className?: string;
  text?: string;
  attrs?: Record<string, string>;
  /** Runs on the press, see onPress. */
  onPress?: (event: Event) => void;
}

/**
 * Runs on pointerdown, so a tap answers within a frame and two fingers on two
 * buttons both count. A keyboard press arrives as a click with no pointer behind
 * it (detail 0) and works too, while a tap's own click is ignored so it can't
 * count twice. A disabled button stays quiet.
 */
export function onPress(target: HTMLElement, run: (event: Event) => void): void {
  const enabled = () => !(target instanceof HTMLButtonElement && target.disabled);
  target.addEventListener('pointerdown', (event) => {
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    if (enabled()) run(event);
  });
  target.addEventListener('click', (event) => {
    if (event.detail === 0 && enabled()) run(event);
  });
}

/** Creates an element with optional class, text, attributes, press handler and children. */
export function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  options: ElementOptions = {},
  children: Child[] = [],
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (options.className) node.className = options.className;
  if (options.text !== undefined) node.textContent = options.text;
  for (const [name, value] of Object.entries(options.attrs ?? {})) node.setAttribute(name, value);
  if (options.onPress) onPress(node, options.onPress);
  for (const child of children) {
    if (child) node.append(child);
  }
  return node;
}

/**
 * A big, chunky button. With settleMs it ignores presses for that long after it
 * appears, so a child still mashing the button that was there before can't skip it.
 */
export function bigButton(label: string, onTap: () => void, className = '', settleMs = 0): HTMLButtonElement {
  const shownAt = performance.now();
  return el('button', {
    className: `big-btn ${className}`.trim(),
    text: label,
    attrs: { type: 'button' },
    onPress: () => {
      if (performance.now() - shownAt >= settleMs) onTap();
    },
  });
}

/** A soft blip for taps that do something small, such as switching tabs or turning a card. */
export function tapSound(): void {
  playNote(660, { wave: 'sine', seconds: 0.07, gain: 0.25 });
}

/** The middle of an element on screen, for burst(). */
export function centerOf(node: Element): { x: number; y: number } {
  const box = node.getBoundingClientRect();
  return { x: box.left + box.width / 2, y: box.top + box.height / 2 };
}
