import { getLanguage } from '@playroom/kit';
import { text } from './dom.ts';
import { tileWords } from './filter.ts';
import type { Game } from './games.ts';
import { isTap, type Gesture } from './tap.ts';
import { text as words } from './words.ts';

/** A tile that is mostly picture: the game's emoji on its colour, with its name underneath. */
export function tile(game: Game): HTMLLIElement {
  const ready = game.status === 'ready';
  const { title, tagline } = tileWords(game, getLanguage());
  const card = document.createElement(ready ? 'a' : 'div');
  card.className = ready ? 'tile' : 'tile is-soon';
  card.style.setProperty('--accent', game.color);
  card.title = tagline;
  if (card instanceof HTMLAnchorElement) {
    card.href = `./${game.slug}/`;
    card.dataset.slug = game.slug;
  }

  const art = text('span', 'tile-art', game.emoji);
  art.setAttribute('aria-hidden', 'true');
  card.append(art, text('span', 'tile-title', title));
  if (!ready) card.append(text('span', 'tile-ribbon', words().soon));

  const item = document.createElement('li');
  item.append(card);
  return item;
}

interface Tracked extends Gesture {
  x: number;
  y: number;
  shelf: Element | null;
  scrollStart: number;
}

// Long enough for any game page to start loading, short enough that a stuck tap doesn't freeze the shelves.
const LEAVING_MS = 5000;

/**
 * Opens a game only for a real tap. A swipe along a shelf, a palm, or a burst
 * of fast taps opens nothing, or exactly one game. `onOpen` runs just before
 * the browser follows the tile's link.
 */
export function guardTaps(area: HTMLElement, onOpen: (slug: string) => void): void {
  const down = new Set<number>();
  let gesture: Tracked | null = null;
  let leaving = false;
  let leavingTimer = 0;

  document.addEventListener('pointerdown', (event) => {
    if (down.size === 0) {
      const shelf = event.target instanceof Element ? event.target.closest('.shelf-track') : null;
      gesture = { x: event.clientX, y: event.clientY, shelf, scrollStart: shelf?.scrollLeft ?? 0, moved: 0, scrolled: 0, pointers: 0, cancelled: false };
    }
    down.add(event.pointerId);
    if (gesture) gesture.pointers = Math.max(gesture.pointers, down.size);
  });
  document.addEventListener('pointermove', (event) => {
    if (gesture && down.has(event.pointerId)) {
      gesture.moved = Math.max(gesture.moved, Math.hypot(event.clientX - gesture.x, event.clientY - gesture.y));
    }
  });
  document.addEventListener('pointerup', (event) => down.delete(event.pointerId));
  document.addEventListener('pointercancel', (event) => {
    down.delete(event.pointerId);
    if (gesture) gesture.cancelled = true;
  });

  area.addEventListener('click', (event) => {
    const link = event.target instanceof Element ? event.target.closest<HTMLAnchorElement>('a.tile') : null;
    if (!link?.dataset.slug) return;
    if (leaving) {
      event.preventDefault();
      return;
    }
    // A keyboard press has no pointer behind it, so only pointer clicks are checked for swipes.
    if (event.detail > 0 && gesture) {
      gesture.scrolled = (gesture.shelf?.scrollLeft ?? 0) - gesture.scrollStart;
      if (!isTap(gesture)) {
        event.preventDefault();
        return;
      }
    }
    onOpen(link.dataset.slug);
    // A grown-up opening a game in a new tab stays here, so the shelves stay live.
    if (event.ctrlKey || event.metaKey || event.shiftKey || event.button !== 0) return;
    leaving = true;
    leavingTimer = window.setTimeout(() => (leaving = false), LEAVING_MS);
  });

  // Coming back with the browser's back button can restore this page as it was left.
  window.addEventListener('pageshow', () => {
    window.clearTimeout(leavingTimer);
    leaving = false;
    down.clear();
    gesture = null;
  });
}
