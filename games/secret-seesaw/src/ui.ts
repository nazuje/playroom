export function element<K extends keyof HTMLElementTagNameMap>(tag: K, className: string): HTMLElementTagNameMap[K] {
  const made = document.createElement(tag);
  made.className = className;
  return made;
}

export function button(className: string): HTMLButtonElement {
  const made = element('button', className);
  made.type = 'button';
  return made;
}

/**
 * A press counts on pointerdown, so a tap answers within a frame and two fingers both work. A keyboard
 * press arrives as a click with no pointer behind it.
 */
export function onPress(target: HTMLButtonElement, listener: () => void): void {
  target.addEventListener('pointerdown', (event) => {
    if (event.button === 0) listener();
  });
  target.addEventListener('click', (event) => {
    if (event.detail === 0) listener();
  });
}

export const calm = (): boolean => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
