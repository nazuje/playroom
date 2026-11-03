import { getLanguage, slCount, type Language } from '@playroom/kit';
import { MODE_LABELS, SKILL_LABELS, type Mode, type Skill } from './games.ts';
import type { ShelfId } from './shelves.ts';

// The portal is silent, so these words are for the grown-up and for screen readers. Nothing here is spoken.
export const en = {
  whoIsPlaying: "Who's playing?",
  everyone: 'Everyone',
  age: (age: number) => `Age ${age}`,
  shelves: {
    new: 'New',
    recent: 'Played lately',
    brain: 'Brain games',
    fun: 'Just for fun',
    action: 'Action and 3D',
    challenge: 'Challenge',
    explore: 'Explore',
  } satisfies Record<ShelfId, string>,
  soon: 'Soon!',
  grownUps: 'For grown-ups',
  done: 'Done',
  profilesNote: 'Each profile shows only the games that suit its age. Saved on this device only.',
  changeAnimal: 'Change animal',
  younger: 'One year younger',
  older: 'One year older',
  remove: 'Remove',
  addProfile: 'Add a profile',
  filtersTitle: 'Find games',
  modeRow: 'Play mode',
  ageRow: 'Age',
  skillRow: 'Kind of game',
  languageRow: 'Language',
  all: 'All',
  allAges: 'All ages',
  allSkills: '🌈 All',
  modes: { solo: MODE_LABELS.solo.label, together: MODE_LABELS.together.label } satisfies Record<Mode, string>,
  skills: SKILL_LABELS as Record<Skill, string>,
  filtered: 'Filtered games',
  showAllChip: 'Show all',
  noMatch: 'No games match all of those.',
  showAllGames: 'Show all games',
  creditVoice: 'Slovenian voice:',
  creditDataset: 'dataset by',
};

export type Text = typeof en;

const YEARS = { one: 'leto', two: 'leti', few: 'leta', many: 'let' };

export const sl: Text = {
  whoIsPlaying: 'Kdo se igra?',
  everyone: 'Vsi',
  age: (age) => `${age} ${slCount(age, YEARS)}`,
  shelves: {
    new: 'Novo',
    recent: 'Nazadnje igrano',
    brain: 'Miselne igre',
    fun: 'Za zabavo',
    action: 'Akcija in 3D',
    challenge: 'Izziv',
    explore: 'Raziskuj',
  },
  soon: 'Kmalu!',
  grownUps: 'Za odrasle',
  done: 'Končano',
  profilesNote: 'Vsak profil pokaže le igre, primerne za njegovo starost. Shrani se samo na tej napravi.',
  changeAnimal: 'Zamenjaj živalco',
  younger: 'Leto manj',
  older: 'Leto več',
  remove: 'Odstrani',
  addProfile: 'Dodaj profil',
  filtersTitle: 'Iskanje iger',
  modeRow: 'Način igre',
  ageRow: 'Starost',
  skillRow: 'Vrsta igre',
  languageRow: 'Jezik',
  all: 'Vse',
  allAges: 'Vse starosti',
  allSkills: '🌈 Vse',
  modes: { solo: 'Samostojno', together: 'Skupaj' },
  skills: {
    fun: '🎉 Za zabavo',
    challenge: '🔥 Izziv',
    action: '⚡ Akcija',
    '3d': '🧊 3D',
    world: '🌍 Svet',
    memory: '🧠 Spomin',
    logic: '🧩 Logika',
    colors: '🎨 Barve',
    reading: '🔤 Branje',
    numbers: '🔢 Števila',
    moving: '🤸 Gibanje',
  },
  filtered: 'Izbrane igre',
  showAllChip: 'Pokaži vse',
  noMatch: 'Nobena igra ne ustreza vsem izbiram.',
  showAllGames: 'Pokaži vse igre',
  creditVoice: 'Slovenski glas:',
  creditDataset: 'podatki:',
};

const WORDS: Record<Language, Text> = { en, sl };

/** The portal's words in the language in use. Read it each time you draw. */
export const text = (): Text => WORDS[getLanguage()];
