import { playSound } from '@playroom/kit';
import { FURNITURE, type Room } from '../data/furniture.ts';
import { text } from '../lang/index.ts';
import { buyItem, type Play } from '../rules/play.ts';
import { islandLevel } from '../rules/quests.ts';
import type { Outcome } from '../rules/say.ts';
import { button, element, onPress } from '../ui.ts';

export interface DecorState {
  room: Room;
  /** A kind of thing chosen from the cupboard, waiting for a tap on the floor. */
  picked: string | null;
  /** A placed thing chosen to turn, move or put away. */
  placed: number | null;
}

export interface DecorActions {
  play: Play;
  handle(result: Outcome): void;
  turn(): void;
  remove(): void;
  exit(): void;
  changed(): void;
}

/** The strip of furniture along the bottom, with what's yours first and the shop after it. */
export function decorTray(host: HTMLElement, state: DecorState, actions: DecorActions): void {
  const { island } = actions.play;
  const level = islandLevel(island);
  host.replaceChildren();
  const strip = element('div', 'tray-strip');
  const items = FURNITURE.filter((item) => item.room === state.room && item.level <= level);
  for (const item of items) {
    const owned = island.stock[item.id] ?? 0;
    if (owned <= 0) continue;
    const pick = button(state.picked === item.id ? 'choice choice-on' : 'choice choice-ready', item.emoji);
    pick.dataset.item = item.id;
    pick.append(element('span', 'count', `×${owned}`));
    onPress(pick, () => {
      playSound('pop');
      state.picked = item.id;
      state.placed = null;
      actions.changed();
    });
    strip.append(pick);
  }
  for (const item of items) {
    const pick = button(island.shells >= item.price ? 'choice choice-shop' : 'choice choice-shop choice-short', item.emoji);
    pick.dataset.buy = item.id;
    pick.append(element('span', 'price', `🐚${item.price}`));
    onPress(pick, () => {
      const { result, outcome } = buyItem(actions.play, item.id);
      actions.handle(outcome);
      if (result === 'bought') {
        state.picked = item.id;
        state.placed = null;
      }
      actions.changed();
    });
    strip.append(pick);
  }
  const tools = element('div', 'tray-tools');
  const turn = button('tool-btn', '🔄', text().turn);
  turn.dataset.action = 'turn';
  turn.disabled = state.placed === null;
  onPress(turn, () => {
    if (state.placed !== null) actions.turn();
  });
  const remove = button('tool-btn', '📦', text().remove);
  remove.dataset.action = 'remove';
  remove.disabled = state.placed === null;
  onPress(remove, () => {
    if (state.placed !== null) actions.remove();
  });
  const leave = button('tool-btn tool-go', state.room === 'home' ? '🚪' : '✔️', state.room === 'home' ? text().door : text().done);
  leave.dataset.action = state.room === 'home' ? 'door' : 'done';
  onPress(leave, actions.exit);
  tools.append(turn, remove, leave);
  host.append(strip, tools);
}
