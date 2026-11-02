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
    if (event.button === 0) {
      event.preventDefault();
      listener();
    }
  });
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
