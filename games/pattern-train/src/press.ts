/** How long a panel has to be up before its buttons listen, so a child still mashing from the last screen can't skip it. */
const PANEL_SETTLE_MS = 900;

/**
 * Runs on the press, not the release: a tap answers within a frame, and two
 * fingers on two buttons both count, where a click would be cancelled. A keyboard
 * press arrives as a click with detail 0 and works too, and a tap's own click is
 * ignored so it can't count twice.
 */
export function onPress(target: HTMLElement, run: () => void): void {
  target.addEventListener('pointerdown', (event) => {
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    run();
  });
  target.addEventListener('click', (event) => {
    if (event.detail === 0) run();
  });
}

/** Shows a panel and starts the wait before its buttons listen. */
export function openPanel(panel: HTMLElement): void {
  panel.dataset.openedAt = String(performance.now());
  panel.hidden = false;
}

/**
 * A button on a panel, which only counts once the panel has settled. Panel
 * buttons wait for the click, not the press, because the level list can scroll
 * and a finger starting a scroll mustn't start a level. Two at once isn't needed
 * here: one choice ends the panel.
 */
export function onPanelPress(target: HTMLElement, panel: HTMLElement, run: () => void): void {
  target.addEventListener('click', () => {
    if (performance.now() - Number(panel.dataset.openedAt ?? 0) >= PANEL_SETTLE_MS) run();
  });
}
