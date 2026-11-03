import './style.css';
import { getLanguage, homeButton, languageButton, onLanguageChange, useClips } from '@playroom/kit';
import { REGIONS } from './data/regions.ts';
import type { Region } from './data/types.ts';
import { loadBorderShapes, loadCountryLookup } from './geo/loadCountries.ts';
import { lookupRegion } from './geo/lookup.ts';
import { createGlobeView } from './globe/view.ts';
import { text } from './lang/index.ts';
import clips from './lang/sl.clips.json';
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
const stars = createStarCounter(byId('stars'), byId('star-count'));
const countryLookup = loadCountryLookup();
let currentRegion: Region | null = null;
let mapFailed = false;

const view = createGlobeView(byId('globe'), {
  onPick: (lat, lng) => void visit(lat, lng),
  onReady: () => loading.classList.add('is-done'),
});

const panel = createPanel(byId('panel'), {
  onStar: () => stars.add(),
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
}

function showLoadError() {
  mapFailed = true;
  hint.textContent = text().loadError;
  hint.classList.remove('is-hidden');
}

async function visit(lat: number, lng: number) {
  hideHint();
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
  currentRegion = null;
  panel.close();
  view.goHome();
}

function surprise() {
  const choices = REGIONS.filter((region) => region !== currentRegion);
  const region = choices[Math.floor(Math.random() * choices.length)];
  void visit(region.anchor.lat, region.anchor.lng);
}

countryLookup.catch(showLoadError);
byId('surprise').addEventListener('click', surprise);
byId('home').addEventListener('click', goHome);

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
