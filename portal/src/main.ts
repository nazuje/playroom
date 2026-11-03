import '@playroom/kit/kit.css';
import './style.css';
import { LANGUAGES, getLanguage, languageButton, onLanguageChange, setLanguage, store, type Language } from '@playroom/kit';
import { button, redraw, text } from './dom.ts';
import { AGES, NO_FILTERS, applyFilter, isFiltered, languagesIn, restoreFilter, skillsIn, type Filters } from './filter.ts';
import { GAMES, MODE_LABELS, type Mode } from './games.ts';
import { EVERYONE, gamesFor, restoreChosen, restoreProfiles, type Profile } from './profiles.ts';
import { recentGames, recordPlay, restoreRecent, type RecentPlays } from './recent.ts';
import { grownUpSheet } from './sheet.ts';
import { SHELF_EMOJI, buildShelves, type Shelf } from './shelves.ts';
import { guardTaps, tile } from './tiles.ts';
import { text as words } from './words.ts';

const FILTER_KEYS: Record<keyof Filters, string> = {
  mode: 'portal-mode',
  age: 'portal-age',
  skill: 'portal-filter',
  language: 'portal-language',
};
const PROFILES_KEY = 'portal-profiles';
const PLAYER_KEY = 'portal-player';
const RECENT_KEY = 'portal-recent';

function byId<T extends HTMLElement = HTMLElement>(id: string): T {
  const found = document.getElementById(id);
  if (!found) throw new Error(`Missing #${id} in index.html`);
  return found as T;
}

const corner = byId('corner');
const players = byId('players');
const games = byId('games');
const dialog = byId<HTMLDialogElement>('grownups');
const skills = skillsIn(GAMES);
const languages = languagesIn(GAMES);
const modes = Object.keys(MODE_LABELS) as Mode[];

interface State {
  profiles: Profile[];
  /** A profile id, or EVERYONE. */
  chosen: string;
  recent: RecentPlays;
  filters: Filters;
}

const profiles = restoreProfiles(store.get<unknown>(PROFILES_KEY, null));
const state: State = {
  profiles,
  chosen: restoreChosen(store.get<unknown>(PLAYER_KEY, null), profiles),
  recent: restoreRecent(store.get<unknown>(RECENT_KEY, null)),
  filters: {
    mode: restoreFilter(store.get<unknown>(FILTER_KEYS.mode, null), modes),
    age: restoreFilter(store.get<unknown>(FILTER_KEYS.age, null), AGES),
    skill: restoreFilter(store.get<unknown>(FILTER_KEYS.skill, null), skills),
    language: restoreFilter(store.get<unknown>(FILTER_KEYS.language, null), languages),
  },
};

const chosenProfile = (): Profile | undefined => state.profiles.find((profile) => profile.id === state.chosen);

function choosePlayer(id: string): void {
  state.chosen = id;
  store.set(PLAYER_KEY, id);
  render();
}

function setProfiles(next: Profile[]): void {
  state.profiles = next;
  // A removed profile takes its played-lately list with it.
  for (const id of Object.keys(state.recent)) {
    if (id !== EVERYONE && !next.some((profile) => profile.id === id)) delete state.recent[id];
  }
  state.chosen = restoreChosen(state.chosen, next);
  store.set(PROFILES_KEY, next);
  store.set(RECENT_KEY, state.recent);
  store.set(PLAYER_KEY, state.chosen);
  render();
}

function setFilters(next: Filters, changed?: keyof Filters): void {
  state.filters = next;
  for (const key of Object.keys(FILTER_KEYS) as (keyof Filters)[]) store.set(FILTER_KEYS[key], next[key]);
  // A game opened after choosing a language starts in it. "All" leaves the choice alone.
  if (changed === 'language' && next.language !== 'all') setLanguage(next.language);
  render();
}

function recordOpen(slug: string): void {
  state.recent = { ...state.recent, [state.chosen]: recordPlay(state.recent[state.chosen] ?? [], slug) };
  store.set(RECENT_KEY, state.recent);
}

const drawSheet = grownUpSheet(dialog, { modes, skills, languages, onProfiles: setProfiles, onFilters: setFilters });

function openSheet(): void {
  // Fast taps would otherwise ask an open sheet to open again.
  if (!dialog.open) dialog.showModal();
}

function playerButton(id: string, avatar: string, label: string, age?: number): HTMLButtonElement {
  const chip = button('player', '', () => choosePlayer(id), `player-${id}`);
  chip.append(text('span', 'player-avatar', avatar));
  if (age !== undefined) chip.append(text('span', 'player-age', String(age)));
  chip.setAttribute('aria-label', label);
  chip.setAttribute('aria-pressed', String(state.chosen === id));
  return chip;
}

function renderPlayers(): void {
  const w = words();
  players.setAttribute('aria-label', w.whoIsPlaying);
  players.classList.toggle('has-choice', state.chosen !== EVERYONE);
  redraw(
    players,
    ...state.profiles.map((profile) => playerButton(profile.id, profile.avatar, `${profile.avatar} ${w.age(profile.age)}`, profile.age)),
    playerButton(EVERYONE, '🌈', w.everyone),
  );
}

function shelfSection({ id, games: shelved }: Shelf): HTMLElement {
  const section = document.createElement('section');
  section.className = 'shelf';
  section.dataset.shelf = id;
  const heading = document.createElement('h2');
  heading.className = 'shelf-head';
  const emoji = text('span', 'shelf-emoji', SHELF_EMOJI[id]);
  emoji.setAttribute('aria-hidden', 'true');
  heading.append(emoji, text('span', 'shelf-name', words().shelves[id]));
  const track = document.createElement('ul');
  track.className = 'shelf-track';
  track.append(...shelved.map(tile));
  section.append(heading, track);
  return section;
}

/** The chosen filters as short labels, so a grown-up can see why the list is shorter. */
function filterTags(filters: Filters): string[] {
  const w = words();
  const tags: string[] = [];
  if (filters.mode !== 'all') tags.push(`${MODE_LABELS[filters.mode].emoji} ${w.modes[filters.mode]}`);
  if (filters.age !== 'all') tags.push(w.age(filters.age));
  if (filters.skill !== 'all') tags.push(w.skills[filters.skill]);
  if (filters.language !== 'all') tags.push(`${LANGUAGES[filters.language].flag} ${LANGUAGES[filters.language].name}`);
  return tags;
}

function filteredGrid(shown: readonly HTMLLIElement[]): HTMLElement[] {
  const w = words();
  const bar = document.createElement('div');
  bar.className = 'filter-bar';
  const settings = button('filter-summary', `⚙️ ${w.filtered}`, openSheet);
  bar.append(
    settings,
    ...filterTags(state.filters).map((tag) => text('span', 'filter-tag', tag)),
    button('filter show-all-chip', `✖ ${w.showAllChip}`, () => setFilters(NO_FILTERS), 'show-all-chip'),
  );
  if (shown.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'empty';
    const note = text('p', 'empty-note', ` ${w.noMatch}`);
    note.prepend(text('span', '', '🙈'));
    empty.append(note, button('btn btn-sun', w.showAllGames, () => setFilters(NO_FILTERS)));
    return [bar, empty];
  }
  const grid = document.createElement('ul');
  grid.className = 'grid';
  grid.append(...shown);
  return [bar, grid];
}

function renderGames(): void {
  const forPlayer = gamesFor(GAMES, chosenProfile());
  if (isFiltered(state.filters)) {
    redraw(games, ...filteredGrid(applyFilter(forPlayer, state.filters).map(tile)));
  } else {
    const recent = recentGames(state.recent[state.chosen] ?? [], forPlayer);
    redraw(games, ...buildShelves(forPlayer, recent).map(shelfSection));
  }
}

function renderWords(): void {
  const w = words();
  document.documentElement.lang = getLanguage();
  for (const node of document.querySelectorAll<HTMLElement>('[data-word]')) {
    const key = node.dataset.word as 'creditVoice' | 'creditDataset';
    node.textContent = w[key];
  }
}

function renderCorner(): void {
  const gear = button('gear-btn', '⚙️', openSheet);
  gear.setAttribute('aria-label', words().grownUps);
  gear.title = words().grownUps;
  gear.setAttribute('aria-haspopup', 'dialog');
  corner.replaceChildren(languageButton(languages), gear);
}

function render(): void {
  renderPlayers();
  renderGames();
  drawSheet({ profiles: state.profiles, filters: state.filters });
}

guardTaps(games, recordOpen);
onLanguageChange(() => {
  renderWords();
  renderCorner();
  render();
});

// Back from a game, the page may come back as it was left, while the game changed the language.
window.addEventListener('pageshow', (event) => {
  if (!event.persisted) return;
  // Kit keeps the site's language under this one key, shared by every page.
  const saved = store.get<unknown>('language', null);
  if (typeof saved === 'string' && saved in LANGUAGES) setLanguage(saved as Language);
  state.recent = restoreRecent(store.get<unknown>(RECENT_KEY, null));
  render();
});

renderWords();
renderCorner();
render();
