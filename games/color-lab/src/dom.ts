export function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className = '',
  text = '',
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text) node.textContent = text;
  return node;
}

/**
 * A press counts on pointerdown, so a tap answers within a frame and two fingers
 * both work. A keyboard press arrives as a click with no pointer behind it.
 */
export function onPress(target: HTMLElement, listener: () => void): void {
  target.addEventListener('pointerdown', (event) => {
    if (event.button !== 0 || (target instanceof HTMLButtonElement && target.disabled)) return;
    listener();
  });
  target.addEventListener('click', (event) => {
    if (event.detail === 0) listener();
  });
}

export function button(className: string, text: string, onTap: () => void): HTMLButtonElement {
  const node = el('button', className, text);
  node.type = 'button';
  onPress(node, onTap);
  return node;
}

export function byId(id: string): HTMLElement {
  const found = document.getElementById(id);
  if (!found) throw new Error(`Missing #${id} in index.html`);
  return found;
}

export function prefersCalm(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/** Waits for an animation step. People who prefer calm get a near-instant version. */
export function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, prefersCalm() ? ms * 0.1 : ms));
}

/** Plays a one-shot CSS animation class again, even if it just ran. */
export function replayClass(node: Element, className: string): void {
  node.classList.remove(className);
  void node.getBoundingClientRect();
  node.classList.add(className);
}

/** The middle of an element on screen, for burst(). */
export function centerOf(node: HTMLElement): { x: number; y: number } {
  const box = node.getBoundingClientRect();
  return { x: box.left + box.width / 2, y: box.top + box.height / 2 };
}
