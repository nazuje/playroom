import './style.css';
import { getLanguage, homeButton, languageButton, onLanguageChange, playSound, say, useClips } from '@playroom/kit';
import { REGIONS } from './data/regions.ts';
import type { Region } from './data/types.ts';
import { loadBorderShapes, loadCountryLookup } from './geo/loadCountries.ts';
import { lookupRegion } from './geo/lookup.ts';
import { createGlobeView } from './globe/view.ts';
import { text } from './lang/index.ts';
import clips from './lang/sl.clips.json';
import { onPress } from './ui/dom.ts';
import { createPanel } from './ui/panel.ts';
import { createStarCounter } from './ui/stars.ts';

useClips(clips);

function byId<T extends HTMLElement = HTMLElement>(id: string): T {
  const found = document.getElementById(id);
  if (!found) throw new Error(`Missing #${id} in index.html`);
  return found as T;
}

const home = homeButton();
// On the left with the home button, because the side panel covers the right of the top bar on tablets.
byId('brand').prepend(home, languageButton(['en', 'sl']));

const hint = byId('hint');
const loading = byId('loading');
const tapCue = byId('tap-cue');
/** "Surprise me!" waits this long between trips, so a mash flies to one place, not fifty. */
const SURPRISE_GAP_MS = 1200;
let lastSurpriseAt = -Infinity;
const stars = createStarCounter(byId('stars'), byId('star-count'));
const countryLookup = loadCountryLookup();
let currentRegion: Region | null = null;
let mapFailed = false;

const view = createGlobeView(byId('globe'), {
  onPick: (lat, lng) => void visit(lat, lng),
  onReady: () => {
    loading.classList.add('is-done');
    showStart();
  },
});

const panel = createPanel(byId('panel'), {
  onStars: (count) => stars.add(count),
  onClose: () => goHome(),
  onLayout: ({ right, bottom }) => view.setOffset(-right / 2, -bottom / 2),
});

/** Every word outside the panel, in the current language. */
function drawPage() {
  const words = text();
  document.documentElement.lang = getLanguage();
  document.title = words.title;
  document.querySelector('meta[name="description"]')?.setAttribute('content', words.description);
  byId('title').textContent = words.title;
  byId('globe').setAttribute('aria-label', words.globeLabel);
  byId('loading-text').textContent = words.loading;
  byId('actions').setAttribute('aria-label', words.travelLabel);
  byId('surprise').textContent = words.surprise;
  byId('home').textContent = words.backToSpace;
  home.setAttribute('aria-label', words.homeLabel);
  hint.textContent = mapFailed ? words.loadError : words.hint;
  stars.redraw();
}

function hideHint() {
  hint.classList.add('is-hidden');
  tapCue.hidden = true;
}

/** The start: a pulsing finger on the Earth and the hint, which says itself after a first tap. */
function showStart() {
  hint.classList.remove('is-hidden');
  tapCue.hidden = mapFailed;
}

function showLoadError() {
  mapFailed = true;
  hint.textContent = text().loadError;
  hint.classList.remove('is-hidden');
}

async function visit(lat: number, lng: number) {
  hideHint();
  playSound('whoosh');
  view.visit(lat, lng);
  try {
    const result = lookupRegion(lat, lng, await countryLookup);
    currentRegion = result.region;
    panel.open(result);
  } catch {
    showLoadError();
  }
}

function goHome() {
  const wasOpen = panel.isOpen;
  currentRegion = null;
  panel.close();
  view.goHome();
  if (!wasOpen) return;
  playSound('whoosh');
  showStart();
  void say(text().hint);
}

function surprise() {
  const now = performance.now();
  if (now - lastSurpriseAt < SURPRISE_GAP_MS) return;
  lastSurpriseAt = now;
  const choices = REGIONS.filter((region) => region !== currentRegion);
  const region = choices[Math.floor(Math.random() * choices.length)];
  void visit(region.anchor.lat, region.anchor.lng);
}

countryLookup.catch(showLoadError);
onPress(byId('surprise'), surprise);
onPress(byId('home'), goHome);

// Browsers only let sound start from a tap, so the start instruction waits for the first one.
// A tap that opens a place speaks the place instead, which cuts this short.
function sayHintOnce() {
  document.removeEventListener('click', sayHintOnce, true);
  document.removeEventListener('touchend', sayHintOnce, true);
  // After the tap has done its own work, so a tap that switches language or opens a place wins.
  setTimeout(() => {
    if (!panel.isOpen && !mapFailed) void say(text().hint);
  }, 0);
}
document.addEventListener('click', sayHintOnce, true);
document.addEventListener('touchend', sayHintOnce, true);

onLanguageChange(() => {
  drawPage();
  panel.redraw();
});
drawPage();

loadBorderShapes()
  .then((countries) => view.showBorders(countries))
  .catch(() => {
    // Borders are a nice extra; the game still works without them.
  });
