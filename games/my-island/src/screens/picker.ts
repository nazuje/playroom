import { playSound } from '@playroom/kit';
import { AVATARS } from '../data/looks.ts';
import { text } from '../lang/index.ts';
import { islandLevel } from '../rules/quests.ts';
import type { SlotRead } from '../rules/save.ts';
import { button, element, onPress } from '../ui.ts';

export interface PickerOptions {
  slots: readonly SlotRead[];
  storageWorks: boolean;
  grownUpsOpen: boolean;
  armed: number | null;
  onPlay(slot: number): void;
  onNew(slot: number): void;
  onGrownUps(): void;
  onReset(slot: number): void;
}

/** Up to four islands, each shown by its picture. */
export function showPicker(host: HTMLElement, options: PickerOptions): void {
  const t = text();
  const card = element('section', 'picker');
  const grid = element('div', 'slot-grid');
  options.slots.forEach((read, slot) => {
    const pick = button('slot');
    pick.dataset.slot = String(slot);
    pick.dataset.state = read.status;
    if (read.status === 'ok') {
      pick.append(element('span', 'slot-avatar', AVATARS[read.island.avatar] ?? '🏝️'), element('span', 'slot-info', `⭐${islandLevel(read.island)}  🐚${read.island.shells}`));
      pick.setAttribute('aria-label', t.island(slot + 1));
      onPress(pick, () => options.onPlay(slot));
    } else if (read.status === 'empty') {
      pick.append(element('span', 'slot-avatar slot-new', '➕'));
      pick.setAttribute('aria-label', t.newIsland);
      onPress(pick, () => options.onNew(slot));
    } else {
      pick.append(element('span', 'slot-avatar', '📦'), element('span', 'slot-note', t.unreadable));
      pick.disabled = true;
    }
    grid.append(pick);
  });
  card.append(grid);
  if (!options.storageWorks) card.append(element('p', 'picker-note', t.noStorage));
  const grown = button('grown-btn', `🔧 ${t.grownUps}`);
  grown.dataset.action = 'grown-ups';
  onPress(grown, options.onGrownUps);
  card.append(grown);
  if (options.grownUpsOpen) {
    const box = element('div', 'grown-box');
    box.append(element('p', 'picker-note', t.grownUpsNote));
    options.slots.forEach((read, slot) => {
      if (read.status === 'empty') return;
      const armed = options.armed === slot;
      const reset = button(armed ? 'reset-btn reset-armed' : 'reset-btn', armed ? t.resetAgain(slot + 1) : t.reset(slot + 1));
      reset.dataset.reset = String(slot);
      onPress(reset, () => options.onReset(slot));
      box.append(reset);
    });
    card.append(box);
  }
  host.replaceChildren(card);
}

/** The picture that stands for a new island. */
export function showAvatars(host: HTMLElement, onPick: (avatar: number) => void, onBack: () => void): void {
  const card = element('section', 'picker');
  const grid = element('div', 'avatar-grid');
  AVATARS.forEach((avatar, index) => {
    const pick = button('avatar', avatar);
    pick.dataset.avatar = String(index);
    onPress(pick, () => {
      playSound('pop');
      onPick(index);
    });
    grid.append(pick);
  });
  const back = button('small-btn', '↩', text().back);
  back.dataset.action = 'back';
  onPress(back, onBack);
  card.append(grid, back);
  host.replaceChildren(card);
}
