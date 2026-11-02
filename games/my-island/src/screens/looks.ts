import { playSound } from '@playroom/kit';
import { HAIR_COLORS, HAIRS, HAT_EMOJI, HATS, OUTFIT_COLORS, OUTFIT_EMOJI, OUTFITS, SKINS, type Look } from '../data/looks.ts';
import { text } from '../lang/index.ts';
import { button, element, hex, onPress } from '../ui.ts';

export type LookTab = keyof Look;

const TABS: readonly { id: LookTab; emoji: string }[] = [
  { id: 'skin', emoji: '✋' },
  { id: 'hair', emoji: '💇' },
  { id: 'hairColor', emoji: '🎨' },
  { id: 'outfit', emoji: '👕' },
  { id: 'outfitColor', emoji: '🖍️' },
  { id: 'hat', emoji: '🎩' },
];

const HAIR_GLYPHS: Record<(typeof HAIRS)[number], string> = {
  short: '🧑',
  long: '💁',
  curly: '🌀',
  bun: '🍡',
  spiky: '⚡',
  braids: '🎀',
  none: '🥚',
};

interface Option {
  emoji?: string;
  color?: number;
}

function optionsFor(tab: LookTab): Option[] {
  switch (tab) {
    case 'skin':
      return SKINS.map((color) => ({ color }));
    case 'hair':
      return HAIRS.map((hair) => ({ emoji: HAIR_GLYPHS[hair] }));
    case 'hairColor':
      return HAIR_COLORS.map((color) => ({ color }));
    case 'outfit':
      return OUTFITS.map((outfit) => ({ emoji: OUTFIT_EMOJI[outfit] }));
    case 'outfitColor':
      return OUTFIT_COLORS.map((color) => ({ color }));
    default:
      return HATS.map((hat) => ({ emoji: HAT_EMOJI[hat] }));
  }
}

export interface LookState {
  look: Look;
  tab: LookTab;
}

const randomIndex = (length: number): number => Math.floor(Math.random() * length);

/** The dressing-up controls: a row of tabs and a grid of choices. Each tap shows at once on the stand. */
export function lookEditor(body: HTMLElement, state: LookState, changed: () => void): void {
  const tabs = element('div', 'tabs');
  for (const tab of TABS) {
    const pick = button(tab.id === state.tab ? 'tab tab-on' : 'tab', tab.emoji, text().tabs[tab.id]);
    pick.dataset.tab = tab.id;
    onPress(pick, () => {
      playSound('pop');
      state.tab = tab.id;
      changed();
    });
    tabs.append(pick);
  }
  const shuffle = button('tab tab-dice', '🎲');
  shuffle.dataset.action = 'shuffle';
  onPress(shuffle, () => {
    playSound('boing');
    state.look = {
      skin: randomIndex(SKINS.length),
      hair: randomIndex(HAIRS.length),
      hairColor: randomIndex(HAIR_COLORS.length),
      outfit: randomIndex(OUTFITS.length),
      outfitColor: randomIndex(OUTFIT_COLORS.length),
      hat: randomIndex(HATS.length),
    };
    changed();
  });
  tabs.append(shuffle);
  const grid = element('div', 'choice-grid look-grid');
  optionsFor(state.tab).forEach((option, index) => {
    const pick = button(state.look[state.tab] === index ? 'choice choice-on' : 'choice', option.emoji ?? '');
    pick.dataset.option = String(index);
    if (option.color !== undefined) {
      const swatch = element('span', 'swatch');
      swatch.style.background = hex(option.color);
      pick.append(swatch);
    }
    onPress(pick, () => {
      playSound('pop');
      state.look = { ...state.look, [state.tab]: index };
      changed();
    });
    grid.append(pick);
  });
  body.append(tabs, grid);
}

/**
 * The dressing-up card along the bottom. Each pick refills the same card, so it doesn't slide in
 * again and the scroll stays where the child left it.
 */
export function lookSheet(host: HTMLElement, name: string, fill: (body: HTMLElement) => void): void {
  const old = host.firstElementChild;
  const reuse = old instanceof HTMLElement && old.dataset.panel === name ? old : null;
  const card = reuse ?? element('section', 'sheet sheet-low');
  card.dataset.panel = name;
  const scroll = card.scrollTop;
  const body = element('div', 'sheet-body');
  fill(body);
  card.replaceChildren(body);
  card.scrollTop = scroll;
  if (!reuse) host.replaceChildren(card);
}
