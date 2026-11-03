/** An element with a class and some text. */
export function text<K extends keyof HTMLElementTagNameMap>(tag: K, className: string, content: string): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  node.className = className;
  node.textContent = content;
  return node;
}

/** A plain button that runs `onTap` when pressed. `focus` names it, so it keeps focus when its panel is redrawn. */
export function button(className: string, content: string, onTap: () => void, focus?: string): HTMLButtonElement {
  const node = text('button', className, content);
  node.type = 'button';
  if (focus) node.dataset.focus = focus;
  node.addEventListener('click', onTap);
  return node;
}

/** Redraws a panel in place, putting focus back on the same control if it had it. */
export function redraw(panel: HTMLElement, ...children: Node[]): void {
  const focused = document.activeElement instanceof HTMLElement && panel.contains(document.activeElement)
    ? document.activeElement.dataset.focus
    : undefined;
  panel.replaceChildren(...children);
  if (focused) panel.querySelector<HTMLElement>(`[data-focus="${CSS.escape(focused)}"]`)?.focus();
}
