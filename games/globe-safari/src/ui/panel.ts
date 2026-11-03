import { say, stopSpeaking } from '@playroom/kit';
import type { LookupResult } from '../geo/lookup.ts';
import type { Text } from '../lang/en.ts';
import { text } from '../lang/index.ts';
import { el, tapSound } from './dom.ts';
import { renderExploreGrid } from './explore.ts';
import { createGuessGame, type GuessGame } from './guess.ts';
import { preloadPhotos } from './photo.ts';
import { speakerButton } from './speech.ts';

type Mode = 'guess' | 'explore';

export interface PanelOptions {
  /** Called with the stars a mystery animal earned, 0 to 3. */
  onStars: (stars: number) => void;
  onClose: () => void;
  /** Called after the panel opens or changes size, with the space it covers. */
  onLayout: (cover: { right: number; bottom: number }) => void;
}

const SIDE_LAYOUT = '(min-width: 760px) and (min-aspect-ratio: 1/1)';

const MODE_LABELS: Record<Mode, (words: Text) => string> = {
  guess: (words) => words.whoLivesHere,
  explore: (words) => words.meetThemAll,
};

function modeButton(mode: Mode, onPick: (mode: Mode) => void): HTMLButtonElement {
  return el('button', {
    className: 'mode-btn',
    attrs: { type: 'button', role: 'tab', 'data-mode': mode, 'aria-selected': 'false' },
    onPress: () => onPick(mode),
  });
}

/** The region panel: a side panel on wide screens, a bottom sheet on phones. */
export function createPanel(root: HTMLElement, { onStars, onClose, onLayout }: PanelOptions) {
  const title = el('h2', { attrs: { id: 'panel-title' } });
  const emoji = el('div', { className: 'region-emoji', attrs: { 'aria-hidden': 'true' } });
  const country = el('p', { className: 'region-country' });
  const description = el('p', { className: 'region-description' });
  const body = el('div', { className: 'panel-body' });
  let result: LookupResult | null = null;
  let mode: Mode = 'guess';
  // One game and one card grid per open place, so switching tabs keeps the round and the turned cards.
  let guessGame: GuessGame | null = null;
  let explore: { redraw: () => void } | null = null;

  const modes = ['guess', 'explore'] as const;
  const modeButtons = modes.map((m) =>
    modeButton(m, (picked) => {
      if (picked === mode) return;
      tapSound();
      stopSpeaking();
      showMode(picked);
    }),
  );

  const closeButton = el('button', {
    className: 'close-btn',
    text: '✕',
    attrs: { type: 'button' },
    onPress: () => onClose(),
  });
  const modeToggle = el('div', { className: 'mode-toggle', attrs: { role: 'tablist' } }, modeButtons);
  const credit = el('p', { className: 'credit' });

  root.replaceChildren(
    el('div', { className: 'panel-scroll' }, [
      el('header', { className: 'panel-head' }, [emoji, el('div', { className: 'panel-titles' }, [title, country]), closeButton]),
      description,
      modeToggle,
      body,
      credit,
    ]),
  );

  /** The panel's own labels, which don't depend on the place. */
  function drawLabels(words: Text) {
    modeButtons.forEach((button, index) => {
      button.textContent = MODE_LABELS[modes[index]](words);
    });
    closeButton.setAttribute('aria-label', words.close);
    modeToggle.setAttribute('aria-label', words.howToPlay);
    credit.textContent = words.photoCredit;
  }

  function drawPlace(next: LookupResult, words: Text) {
    const { region } = next;
    const place = words.place(region);
    emoji.textContent = region.emoji;
    title.textContent = place.name;
    country.textContent = next.country ? words.inCountry(words.country(next.country)) : words.atSea;
    const speaker = speakerButton(words.placeSpoken(place), words.readPlace);
    description.replaceChildren(el('span', { text: place.description }), ...(speaker ? [speaker] : []));
  }

  drawLabels(text());

  function showMode(next: Mode) {
    if (!result) return;
    mode = next;
    for (const button of modeButtons) {
      button.setAttribute('aria-selected', String(button.dataset.mode === mode));
    }
    guessGame?.stop();
    if (mode === 'guess') {
      guessGame ??= createGuessGame(result.region, { onStars });
      guessGame.mount(body);
    } else if (explore) {
      explore.redraw();
    } else {
      explore = renderExploreGrid(body, result.region);
    }
  }

  // Any press in the game puts off the pulse that shows what to do next.
  body.addEventListener('pointerdown', () => {
    if (mode === 'guess') guessGame?.noticeTap();
  });

  function reportLayout() {
    if (root.hidden) return onLayout({ right: 0, bottom: 0 });
    const rect = root.getBoundingClientRect();
    const side = window.matchMedia(SIDE_LAYOUT).matches;
    onLayout(side ? { right: rect.width, bottom: 0 } : { right: 0, bottom: rect.height });
  }

  new ResizeObserver(reportLayout).observe(root);
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && !root.hidden) onClose();
  });

  return {
    open(next: LookupResult) {
      guessGame?.stop();
      result = next;
      const game = createGuessGame(next.region, { onStars });
      guessGame = game;
      explore = null;
      const words = text();
      drawPlace(next, words);
      preloadPhotos(next.region.animals);
      root.hidden = false;
      root.scrollTop = 0;
      root.querySelector('.panel-scroll')?.scrollTo({ top: 0 });
      showMode('guess');
      requestAnimationFrame(reportLayout);
      // The place, then "Who am I?" and the first clue. A new place or a tap cuts it short.
      void say(words.placeSpoken(words.place(next.region)));
      game.speakStart();
    },
    close() {
      stopSpeaking();
      guessGame?.stop();
      result = null;
      guessGame = null;
      explore = null;
      root.hidden = true;
      body.replaceChildren();
      reportLayout();
    },
    /** Redraws every word in the current language, keeping the place, the mode and the round as they are. */
    redraw() {
      const words = text();
      drawLabels(words);
      if (!result) return;
      drawPlace(result, words);
      if (mode === 'guess') guessGame?.redraw();
      else explore?.redraw();
    },
    get isOpen() {
      return !root.hidden;
    },
  };
}

export type Panel = ReturnType<typeof createPanel>;
