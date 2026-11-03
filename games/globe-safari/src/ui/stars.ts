import { text } from '../lang/index.ts';

/** The session's star count in the top bar. Stars live only as long as the page. */
export function createStarCounter(badge: HTMLElement, countEl: HTMLElement) {
  let stars = 0;
  const label = () => badge.setAttribute('aria-label', text().stars(stars));
  label();
  return {
    add() {
      stars += 1;
      countEl.textContent = String(stars);
      label();
      badge.classList.remove('pop');
      void badge.offsetWidth; // restart the pop animation
      badge.classList.add('pop');
    },
    /** Relabels the badge in the current language. */
    redraw: label,
  };
}
