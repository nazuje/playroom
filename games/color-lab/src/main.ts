import '@playroom/kit/kit.css';
import './style.css';
import { canSpeak, getLanguage, homeButton, languageButton, onLanguageChange, useClips } from '@playroom/kit';
import { button, byId, el } from './dom.ts';
import { Beaker } from './beaker.ts';
import { COLORS } from './mix.ts';
import { tin } from './pots.ts';
import { playGuess } from './modes/guess.ts';
import { playMake } from './modes/make.ts';
import { showFree } from './modes/free.ts';
import { runRound } from './round.ts';
import { Nudge } from './nudge.ts';
import { QUESTIONS, sideSwapped, TARGETS } from './rounds.ts';
import { hush, loadProgress, redrawStars, say, sayAgain, showStars, words } from './screen.ts';
import { text } from './lang/index.ts';
import type { Text } from './lang/en.ts';
import clips from './lang/sl.clips.json';

useClips(clips);

const screen = byId('screen');
const back = byId('back');
const title = byId('title');
const repeat = byId('repeat');
const home = homeButton();

let leaving = new AbortController();

/** Opens a screen. The heading is read from the words each time, so it follows the language. */
function enter(heading: (words: Text) => string, atStart = false): AbortSignal {
  leaving.abort();
  leaving = new AbortController();
  hush();
  screen.replaceChildren();
  words(leaving.signal, () => {
    title.textContent = heading(text());
  });
  document.body.classList.toggle('at-start', atStart);
  back.hidden = atStart;
  repeat.hidden = !canSpeak() || atStart;
  window.scrollTo(0, 0);
  return leaving.signal;
}

function startGuess(): void {
  const signal = enter((w) => w.modes.guess);
  showStars(loadProgress().stars.guess);
  runRound({
    mode: 'guess',
    root: screen,
    signal,
    pool: (level) => QUESTIONS[level],
    vary: sideSwapped,
    play: playGuess,
    onExit: showStart,
  });
}

function startMake(): void {
  const signal = enter((w) => w.modes.make);
  showStars(loadProgress().stars.make);
  runRound({
    mode: 'make',
    root: screen,
    signal,
    pool: (level) => TARGETS[level],
    play: playMake,
    onExit: showStart,
  });
}

function startFree(): void {
  const signal = enter((w) => w.modes.free);
  showStars(null);
  showFree(screen, signal);
}

function guessArt(): HTMLElement {
  const art = el('span', 'mode-art');
  art.append(tin('red'), el('span', 'art-plus', '+'), tin('yellow'), el('span', 'art-plus', '= ?'));
  return art;
}

function makeArt(): HTMLElement {
  const art = el('span', 'mode-art');
  const swatch = el('span', 'swatch');
  swatch.style.setProperty('--paint', COLORS.green.hex);
  art.append(el('span', 'who', '🐸'), swatch);
  return art;
}

function freeArt(): HTMLElement {
  const art = el('span', 'mode-art');
  art.append(el('span', 'who', '🦋'), el('span', 'who', '🖌️'));
  return art;
}

function modeCard(
  signal: AbortSignal,
  label: (words: Text) => string,
  art: HTMLElement,
  stars: number | null,
  onTap: () => void,
): HTMLButtonElement {
  const card = button('mode-card', '', () => {
    onTap();
  });
  const name = el('span', 'mode-name');
  words(signal, () => {
    name.textContent = label(text());
  });
  card.append(art, name);
  if (stars !== null) card.append(el('span', 'mode-stars', `⭐ ${stars}`));
  return card;
}

function showStart(): void {
  const signal = enter((w) => w.title, true);
  showStars(null);
  const { stars } = loadProgress();

  const hero = new Beaker();
  words(signal, () => hero.setLabel(text().heroLabel));
  hero.show(COLORS.purple.hex, 68);
  hero.setBubbling(true);
  const heroWrap = el('div', 'hero');
  heroWrap.append(hero.element, el('div', 'bench'));

  const modes = el('div', 'modes');
  const cards = [
    modeCard(signal, (w) => w.modes.guess, guessArt(), stars.guess, startGuess),
    modeCard(signal, (w) => w.modes.make, makeArt(), stars.make, startMake),
    modeCard(signal, (w) => w.modes.free, freeArt(), null, startFree),
  ];
  modes.append(...cards);
  new Nudge(signal).later(...cards);
  const listen = button('btn listen', '', () => {
    say(() => text().welcome);
  });
  words(signal, () => {
    listen.textContent = text().listen;
  });
  listen.hidden = !canSpeak();
  screen.append(heroWrap, modes, listen);
}

/** Everything outside the screens that carries words. */
function drawPage(): void {
  const page = text();
  document.documentElement.lang = getLanguage();
  document.title = page.title;
  document.querySelector('meta[name="description"]')?.setAttribute('content', page.description);
  home.setAttribute('aria-label', page.homeLabel);
  back.setAttribute('aria-label', page.backLabel);
  repeat.setAttribute('aria-label', page.repeatLabel);
  redrawStars();
}

byId('topbar').prepend(home);
repeat.after(languageButton(['en', 'sl']));
back.addEventListener('click', showStart);
repeat.addEventListener('click', sayAgain);
onLanguageChange(drawPage);
showStart();
drawPage();
