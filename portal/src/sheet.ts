import { LANGUAGES, type Language } from '@playroom/kit';
import { button, redraw, text } from './dom.ts';
import { AGES, NO_FILTERS, type Filters } from './filter.ts';
import { MODE_LABELS, type Mode, type Skill } from './games.ts';
import { AVATARS, MAX_PROFILES, addProfile, editProfile, removeProfile, type Profile } from './profiles.ts';
import { text as words } from './words.ts';

export interface SheetState {
  profiles: readonly Profile[];
  filters: Filters;
}

export interface SheetOptions {
  modes: readonly Mode[];
  skills: readonly Skill[];
  languages: readonly Language[];
  onProfiles: (profiles: Profile[]) => void;
  /** `changed` names the filter just tapped, if any. */
  onFilters: (filters: Filters, changed?: keyof Filters) => void;
}

/**
 * The grown-up corner: who plays on this device and the filters that used to
 * fill the first screen. Returns a redraw for when the state or language changes.
 */
export function grownUpSheet(dialog: HTMLDialogElement, options: SheetOptions): (state: SheetState) => void {
  let picking: string | null = null;
  let state: SheetState = { profiles: [], filters: NO_FILTERS };

  // A tap on the dimmed page around the sheet closes it.
  dialog.addEventListener('click', (event) => {
    if (event.target === dialog) dialog.close();
  });
  dialog.addEventListener('close', () => {
    picking = null;
  });

  function profileRow(profile: Profile): HTMLLIElement {
    const w = words();
    const row = document.createElement('li');
    row.className = 'profile-edit';
    const avatar = button('profile-avatar', profile.avatar, () => {
      picking = picking === profile.id ? null : profile.id;
      draw(state);
    }, `avatar-${profile.id}`);
    avatar.setAttribute('aria-label', w.changeAnimal);
    avatar.setAttribute('aria-expanded', String(picking === profile.id));
    const setAge = (age: number) => options.onProfiles(editProfile(state.profiles, profile.id, { age }));
    const younger = button('step-btn', '−', () => setAge(profile.age - 1), `younger-${profile.id}`);
    younger.setAttribute('aria-label', w.younger);
    const older = button('step-btn', '+', () => setAge(profile.age + 1), `older-${profile.id}`);
    older.setAttribute('aria-label', w.older);
    const remove = button('step-btn remove-btn', '✖', () => options.onProfiles(removeProfile(state.profiles, profile.id)));
    remove.setAttribute('aria-label', w.remove);
    remove.title = w.remove;
    const stepper = document.createElement('span');
    stepper.className = 'stepper';
    stepper.append(younger, text('span', 'stepper-age', w.age(profile.age)), older);
    row.append(avatar, stepper, remove);

    if (picking === profile.id) {
      const picker = document.createElement('div');
      picker.className = 'avatar-picker';
      picker.append(
        ...AVATARS.map((animal) => {
          const choice = button('avatar-choice', animal, () => {
            picking = null;
            options.onProfiles(editProfile(state.profiles, profile.id, { avatar: animal }));
          }, `pick-${profile.id}-${animal}`);
          choice.setAttribute('aria-pressed', String(animal === profile.avatar));
          return choice;
        }),
      );
      row.append(picker);
    }
    return row;
  }

  function filterRow<K extends keyof Filters>(key: K, label: string, choices: [Filters[K], string][]): HTMLElement {
    const group = document.createElement('div');
    group.className = 'filter-group';
    const row = document.createElement('div');
    row.className = 'filter-row';
    row.setAttribute('role', 'group');
    row.setAttribute('aria-label', label);
    row.append(
      ...choices.map(([value, chipLabel]) => {
        const chip = button('filter', chipLabel, () => options.onFilters({ ...state.filters, [key]: value }, key), `${key}-${String(value)}`);
        chip.setAttribute('aria-pressed', String(state.filters[key] === value));
        return chip;
      }),
    );
    group.append(text('h4', 'filter-label', label), row);
    return group;
  }

  function filterRows(): HTMLElement[] {
    const w = words();
    const rows = [
      filterRow('mode', w.modeRow, [['all', w.all], ...options.modes.map((mode): [Mode, string] => [mode, `${MODE_LABELS[mode].emoji} ${w.modes[mode]}`])]),
      filterRow('age', w.ageRow, [['all', w.allAges], ...AGES.map((age): [Filters['age'], string] => [age, w.age(age)])]),
      filterRow('skill', w.skillRow, [['all', w.allSkills], ...options.skills.map((skill): [Skill, string] => [skill, w.skills[skill]])]),
    ];
    // One language is nothing to choose between, so the row waits for a second one.
    if (options.languages.length > 1) {
      rows.push(
        filterRow(
          'language',
          w.languageRow,
          [['all', w.all], ...options.languages.map((language): [Language, string] => [language, `${LANGUAGES[language].flag} ${LANGUAGES[language].name}`])],
        ),
      );
    }
    return rows;
  }

  function draw(next: SheetState): void {
    state = next;
    const w = words();
    const head = document.createElement('header');
    head.className = 'sheet-head';
    head.append(text('h2', 'sheet-title', w.grownUps), button('btn btn-leaf', w.done, () => dialog.close(), 'done'));

    const people = document.createElement('section');
    people.className = 'sheet-section';
    const list = document.createElement('ul');
    list.className = 'profile-list';
    list.append(...state.profiles.map(profileRow));
    people.append(text('h3', 'sheet-heading', w.whoIsPlaying), text('p', 'sheet-note', w.profilesNote), list);
    if (state.profiles.length < MAX_PROFILES) {
      people.append(button('btn btn-sun add-btn', `➕ ${w.addProfile}`, () => options.onProfiles(addProfile(state.profiles)), 'add'));
    }

    const finding = document.createElement('section');
    finding.className = 'sheet-section';
    finding.append(
      text('h3', 'sheet-heading', w.filtersTitle),
      ...filterRows(),
      button('btn btn-sun', w.showAllGames, () => options.onFilters(NO_FILTERS), 'show-all'),
    );

    redraw(dialog, head, people, finding);
  }

  return draw;
}
