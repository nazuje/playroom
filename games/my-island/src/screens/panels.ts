import { playNote, playSound } from '@playroom/kit';
import { COLLECTION, SURPRISES, type Category, type Collectible } from '../data/collection.ts';
import { CROPS, cropById } from '../data/crops.ts';
import type { FriendId } from '../data/friends.ts';
import { CARE_ACTIONS, PETS, petById } from '../data/pets.ts';
import { RECIPES, recipeById, type TreatId } from '../data/recipes.ts';
import { text } from '../lang/index.ts';
import { canBake, missingFor, recipeOpen, treatsHeld } from '../rules/bakery.ts';
import { fishAt, inZone, zoneFor } from '../rules/fishing.ts';
import { heartsShown, petLock } from '../rules/pets.ts';
import { adoptPet, bakeTreat, carePet, catchFish, followMe, give, missFish, plantSeed, type Play } from '../rules/play.ts';
import { islandLevel } from '../rules/quests.ts';
import type { Outcome } from '../rules/say.ts';
import type { Talker } from '../talk.ts';
import { button, calm, element, onPress } from '../ui.ts';

export interface PanelContext {
  play: Play;
  talk: Talker;
  handle(result: Outcome): void;
  /** Draws the open panel again, after something in it changed. */
  redraw(): void;
  close(): void;
}

export interface PanelDrawing {
  /** Called when the panel closes, to stop anything it runs. */
  stop?: () => void;
}

export function choice(content: string, className = ''): HTMLButtonElement {
  const made = button(`choice ${className}`.trim(), content);
  return made;
}

/** An emoji tinted to tell apart finds that share a picture. */
export function findIcon(item: Collectible, found: boolean): HTMLSpanElement {
  const icon = element('span', found ? 'find-icon' : 'find-icon find-shadow', item.emoji);
  if (found && item.hue) icon.style.filter = `hue-rotate(${item.hue}deg) saturate(1.3)`;
  return icon;
}

export function seedsPanel(ctx: PanelContext, body: HTMLElement, plot: number): PanelDrawing {
  const grid = element('div', 'choice-grid');
  const level = islandLevel(ctx.play.island);
  for (const crop of CROPS) {
    const open = crop.level <= level;
    const pick = choice(open ? crop.emoji : `${crop.emoji}`, open ? '' : 'choice-locked');
    pick.dataset.crop = crop.id;
    if (!open) pick.append(element('span', 'lock', '🔒'));
    onPress(pick, () => {
      if (!open) {
        playSound('bonk');
        ctx.talk.say([{ line: 'locked' }]);
        return;
      }
      ctx.close();
      ctx.handle(plantSeed(ctx.play, plot, crop.id));
    });
    grid.append(pick);
  }
  body.append(grid);
  return {};
}

interface BakeState {
  recipe: TreatId | null;
  added: number;
}

const bakeState: BakeState = { recipe: null, added: 0 };

function heldRow(play: Play): HTMLElement {
  const row = element('div', 'held-row');
  const counts = new Map<string, number>();
  for (const id of treatsHeld(play.island)) counts.set(id, play.island.bag[id] ?? 0);
  for (const [id, count] of counts) row.append(element('span', 'held', `${recipeById(id as TreatId).emoji}×${count}`));
  return row;
}

function cropRow(needs: readonly string[], bag: Readonly<Record<string, number>>): HTMLElement {
  const row = element('span', 'needs');
  const left = { ...bag };
  for (const need of needs) {
    const have = (left[need] ?? 0) > 0;
    if (have) left[need] = (left[need] ?? 0) - 1;
    row.append(element('span', have ? 'need' : 'need need-missing', cropById(need as never).emoji));
  }
  return row;
}

export function resetBakery(): void {
  bakeState.recipe = null;
  bakeState.added = 0;
}

export function bakeryPanel(ctx: PanelContext, body: HTMLElement): PanelDrawing {
  const { island } = ctx.play;
  body.append(heldRow(ctx.play));
  if (!bakeState.recipe) {
    const grid = element('div', 'choice-grid');
    for (const recipe of RECIPES) {
      const open = recipeOpen(island, recipe);
      const ready = canBake(island, recipe);
      const pick = choice(recipe.emoji, open ? (ready ? 'choice-ready' : 'choice-short') : 'choice-locked');
      pick.dataset.recipe = recipe.id;
      if (ready) pick.dataset.ready = 'yes';
      if (open) pick.append(cropRow(recipe.needs, island.bag));
      else pick.append(element('span', 'lock', '🔒'));
      onPress(pick, () => {
        if (!open) {
          playSound('bonk');
          ctx.talk.say([{ line: 'locked' }]);
        } else if (!ready) {
          playSound('bonk');
          ctx.talk.say([{ line: 'needCrops' }]);
        } else {
          playSound('pop');
          bakeState.recipe = recipe.id;
          bakeState.added = 0;
          ctx.talk.say([{ line: 'bowl' }]);
          ctx.redraw();
        }
      });
      grid.append(pick);
    }
    body.append(grid);
    return {};
  }
  const recipe = recipeById(bakeState.recipe);
  if (missingFor(island.bag, recipe).length) {
    resetBakery();
    ctx.redraw();
    return {};
  }
  const bench = element('div', 'bench');
  const bowl = element('div', 'bowl', '🥣');
  for (let at = 0; at < bakeState.added; at += 1) bowl.append(element('span', 'in-bowl', cropById(recipe.needs[at] as never).emoji));
  bench.append(element('div', 'bench-goal', recipe.emoji), bowl);
  const row = element('div', 'choice-row');
  if (bakeState.added < recipe.needs.length) {
    const next = recipe.needs[bakeState.added];
    const add = choice(cropById(next as never).emoji, 'choice-ready');
    add.dataset.action = 'add';
    onPress(add, () => {
      playSound('pop');
      bakeState.added += 1;
      if (bakeState.added === recipe.needs.length) ctx.talk.say([{ line: 'oven' }]);
      ctx.redraw();
    });
    row.append(add);
  } else {
    const oven = choice('🔥', 'choice-ready choice-pulse');
    oven.setAttribute('aria-label', text().oven);
    oven.dataset.action = 'oven';
    onPress(oven, () => {
      const id = bakeState.recipe;
      resetBakery();
      if (id) ctx.handle(bakeTreat(ctx.play, id));
      ctx.redraw();
    });
    row.append(oven);
  }
  const back = button('small-btn', '↩', text().back);
  back.dataset.action = 'back';
  onPress(back, () => {
    resetBakery();
    ctx.redraw();
  });
  body.append(bench, row, back);
  return {};
}

export function petsPanel(ctx: PanelContext, body: HTMLElement): PanelDrawing {
  const grid = element('div', 'choice-grid');
  for (const pet of PETS) {
    const lock = petLock(ctx.play.island, pet);
    const pick = choice(pet.emoji, lock === 'open' ? 'choice-ready' : lock === 'home' ? 'choice-home' : 'choice-locked');
    pick.dataset.pet = pet.id;
    pick.dataset.lock = lock;
    if (lock === 'home') pick.append(element('span', 'lock', '🏠'));
    if (lock === 'later') pick.append(element('span', 'lock', '🔒'));
    onPress(pick, () => {
      if (lock === 'later') {
        playSound('bonk');
        ctx.talk.say([{ line: 'locked' }]);
      } else if (lock === 'home') {
        playSound('boing');
      } else {
        ctx.close();
        ctx.handle(adoptPet(ctx.play, pet.id));
      }
    });
    grid.append(pick);
  }
  body.append(grid);
  return {};
}

export function carePanel(ctx: PanelContext, body: HTMLElement, index: number): PanelDrawing {
  const pet = ctx.play.island.pets[index];
  if (!pet) {
    ctx.close();
    return {};
  }
  const face = element('div', 'pet-face', petById(pet.kind).emoji);
  const hearts = element('div', 'hearts');
  const shown = heartsShown(pet.hearts);
  hearts.textContent = '❤️'.repeat(shown) + '🤍'.repeat(5 - shown);
  hearts.dataset.hearts = String(pet.hearts);
  const row = element('div', 'choice-row');
  for (const action of CARE_ACTIONS) {
    const pick = choice(action.emoji, 'choice-ready');
    pick.dataset.care = action.id;
    pick.setAttribute('aria-label', text().care[action.id]);
    onPress(pick, () => {
      ctx.handle(carePet(ctx.play, index, action.id));
      ctx.redraw();
    });
    row.append(pick);
  }
  const follow = button(pet.following ? 'btn-wide btn-stay' : 'btn-wide btn-follow', pet.following ? `🏠 ${text().stay}` : `👣 ${text().follow}`);
  follow.dataset.action = pet.following ? 'stay' : 'follow';
  onPress(follow, () => {
    ctx.handle(followMe(ctx.play, index, !pet.following));
    ctx.redraw();
  });
  body.append(face, hearts, row, follow);
  return {};
}

export function givePanel(ctx: PanelContext, body: HTMLElement, friend: FriendId): PanelDrawing {
  const grid = element('div', 'choice-grid');
  const seen = new Set<string>();
  for (const treat of treatsHeld(ctx.play.island)) {
    if (seen.has(treat)) continue;
    seen.add(treat);
    const pick = choice(recipeById(treat).emoji, 'choice-ready');
    pick.append(element('span', 'count', `×${ctx.play.island.bag[treat] ?? 0}`));
    pick.dataset.treat = treat;
    onPress(pick, () => {
      ctx.close();
      ctx.handle(give(ctx.play, friend, treat));
    });
    grid.append(pick);
  }
  const hello = button('btn-wide btn-follow', `👋 ${text().hello}`);
  hello.dataset.action = 'hello';
  onPress(hello, () => {
    ctx.close();
    playSound('pop');
    ctx.talk.say([{ chat: friend }]);
  });
  body.append(grid, hello);
  return {};
}

interface FishState {
  misses: number;
  caught: string | null;
  startedAt: number;
}

const fishState: FishState = { misses: 0, caught: null, startedAt: 0 };

export function resetFishing(): void {
  fishState.misses = 0;
  fishState.caught = null;
  fishState.startedAt = performance.now();
}

const SLOW_SWIM = 4.2;

export function fishingPanel(ctx: PanelContext, body: HTMLElement): PanelDrawing {
  if (fishState.caught) {
    const item = COLLECTION.find((entry) => entry.id === fishState.caught);
    const show = element('div', 'caught');
    if (item) show.append(findIcon(item, true));
    const again = choice('🎣', 'choice-ready');
    again.dataset.action = 'again';
    again.setAttribute('aria-label', text().again);
    onPress(again, () => {
      playSound('pop');
      resetFishing();
      ctx.talk.say([{ line: 'fishStart' }]);
      ctx.redraw();
    });
    body.append(show, again);
    return {};
  }
  const swim = calm() ? SLOW_SWIM : undefined;
  const pond = element('div', 'fish-pond');
  const zone = element('div', 'fish-zone');
  const fish = element('div', 'fish', '🐟');
  pond.append(zone, fish);
  const go = choice(`🎣 ${text().fishButton}`, 'choice-ready choice-wide');
  go.dataset.action = 'catch';
  body.append(pond, go);
  const place = (): number => {
    const at = fishAt((performance.now() - fishState.startedAt) / 1000, swim);
    const range = zoneFor(fishState.misses, calm());
    zone.style.left = `${range.from * 100}%`;
    zone.style.width = `${(range.to - range.from) * 100}%`;
    fish.style.left = `${at * 100}%`;
    fish.classList.toggle('fish-in', inZone(range, at));
    body.dataset.fish = at.toFixed(3);
    body.dataset.zone = `${range.from.toFixed(3)}-${range.to.toFixed(3)}`;
    return at;
  };
  let frame = 0;
  const loop = (): void => {
    place();
    frame = requestAnimationFrame(loop);
  };
  loop();
  onPress(go, () => {
    const at = place();
    if (inZone(zoneFor(fishState.misses, calm()), at)) {
      const before = { ...ctx.play.island.book };
      const result = catchFish(ctx.play);
      const landed = COLLECTION.find((entry) => entry.category === 'fish' && (ctx.play.island.book[entry.id] ?? 0) > (before[entry.id] ?? 0));
      fishState.caught = landed?.id ?? 'fish-little';
      fishState.misses = 0;
      ctx.handle(result);
      ctx.redraw();
    } else {
      fishState.misses += 1;
      ctx.handle(missFish());
    }
  });
  return { stop: () => cancelAnimationFrame(frame) };
}

export type BookTab = Category | 'surprise';
const TABS: readonly { id: BookTab; emoji: string }[] = [
  { id: 'shell', emoji: '🐚' },
  { id: 'bug', emoji: '🐞' },
  { id: 'flower', emoji: '🌸' },
  { id: 'fish', emoji: '🐟' },
  { id: 'surprise', emoji: '🌈' },
];

const bookState: { tab: BookTab } = { tab: 'shell' };

export function bookPanel(ctx: PanelContext, body: HTMLElement): PanelDrawing {
  const { book } = ctx.play.island;
  const tabs = element('div', 'tabs');
  for (const tab of TABS) {
    const pick = button(tab.id === bookState.tab ? 'tab tab-on' : 'tab', tab.emoji, text().book[tab.id]);
    pick.dataset.tab = tab.id;
    onPress(pick, () => {
      playSound('pop');
      bookState.tab = tab.id;
      ctx.redraw();
    });
    tabs.append(pick);
  }
  const grid = element('div', 'book-grid');
  const entries =
    bookState.tab === 'surprise'
      ? SURPRISES.map((surprise) => ({ key: `surprise:${surprise.id}`, icon: element('span', 'find-icon', surprise.emoji) }))
      : COLLECTION.filter((item) => item.category === bookState.tab).map((item) => ({ key: item.id, icon: findIcon(item, Boolean(book[item.id])) }));
  entries.forEach((entry, at) => {
    const count = book[entry.key] ?? 0;
    if (!count) entry.icon.classList.add('find-shadow');
    const cell = button(count ? 'book-cell book-found' : 'book-cell');
    cell.dataset.entry = entry.key;
    cell.append(entry.icon, element('span', 'count', count ? `×${count}` : '?'));
    onPress(cell, () => {
      if (count) playNote(523 + at * 40, { seconds: 0.2, gain: 0.4 });
      else playSound('boing');
      cell.classList.remove('book-wiggle');
      void cell.offsetWidth;
      cell.classList.add('book-wiggle');
    });
    grid.append(cell);
  });
  const found = Object.keys(book).filter((key) => (book[key] ?? 0) > 0).length;
  const score = element('div', 'book-score', `${found} / ${COLLECTION.length + SURPRISES.length}`);
  body.append(tabs, grid, score);
  return {};
}
