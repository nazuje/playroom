import { burst, playNote, playSound } from '@playroom/kit';
import { collectibleById } from '../data/collection.ts';
import { FRIENDS, type FriendId } from '../data/friends.ts';
import type { Room } from '../data/furniture.ts';
import { petById } from '../data/pets.ts';
import { text } from '../lang/index.ts';
import { guide, type Guide } from '../rules/guide.ts';
import { pickSpot } from '../rules/picking.ts';
import {
  arrive,
  dressUp,
  goTo,
  leaveHouse,
  moveNear,
  nearestUse,
  nudge,
  putNear,
  removePlaced,
  setDecorating,
  startPlay,
  targetSpot,
  tick,
  turnPlaced,
  type Play,
} from '../rules/play.ts';
import { islandLevel } from '../rules/quests.ts';
import type { IslandSaver } from '../rules/save.ts';
import type { Outcome, Panel } from '../rules/say.ts';
import type { Island } from '../rules/state.ts';
import { sameTarget, targetId, type Target } from '../rules/target.ts';
import { theWorld } from '../rules/island.ts';
import type { Talker } from '../talk.ts';
import { button, calm, element, onPress } from '../ui.ts';
import type { Spot, View } from '../view/view.ts';
import { decorTray, type DecorState } from './decor.ts';
import { lookEditor, lookSheet, type LookState } from './looks.ts';
import {
  bakeryPanel,
  bookPanel,
  carePanel,
  fishingPanel,
  givePanel,
  petsPanel,
  resetBakery,
  resetFishing,
  seedsPanel,
  type PanelContext,
  type PanelDrawing,
} from './panels.ts';

const SAVE_EVERY = 2.5;
const GUIDE_EVERY = 0.2;

export interface GameHosts {
  stage: HTMLElement;
  hits: HTMLElement;
  panel: HTMLElement;
  tray: HTMLElement;
  hud: HTMLElement;
  arrow: HTMLButtonElement;
  banner: HTMLElement;
  fade: HTMLElement;
  floaters: HTMLElement;
  book: HTMLButtonElement;
  decor: HTMLButtonElement;
}

export interface GameOptions {
  island: Island;
  fresh: boolean;
  view: View;
  talk: Talker;
  saver: IslandSaver;
  hosts: GameHosts;
  setScreen(name: string): void;
}

export interface Game {
  frame(seconds: number): void;
  key(event: KeyboardEvent): boolean;
  relabel(): void;
  repeat(): void;
  openBook(): void;
  decorate(): void;
  save(): void;
  stop(): void;
}

type SheetKind = Panel | 'book';

const SHEET_ICONS: Record<SheetKind, string> = {
  seeds: '🌱',
  bakery: '🧁',
  pets: '🐾',
  care: '💛',
  fishing: '🎣',
  give: '🎁',
  wardrobe: '👕',
  house: '🏠',
  book: '📖',
};

const PLACE_ICONS: Record<string, string> = {
  bakery: '🧁',
  house: '🏠',
  pets: '🐾',
  fishing: '🎣',
  wardrobe: '👕',
  bridge: '🌉',
  boat: '⛵',
  boatBack: '⛵',
};

function iconFor(play: Play, target: Target | null): string {
  if (!target) return '✨';
  switch (target.kind) {
    case 'friend':
      return FRIENDS.find((friend) => friend.id === target.id)?.emoji ?? '🙂';
    case 'place':
      return PLACE_ICONS[target.id] ?? '📍';
    case 'plot':
      return '🌱';
    case 'find': {
      const found = play.finds.list.find((each) => each.uid === target.uid);
      return (found && collectibleById(found.item)?.emoji) || '✨';
    }
    case 'pet': {
      const pet = play.island.pets[target.index];
      return pet ? petById(pet.kind).emoji : '🐾';
    }
    default:
      return '🎨';
  }
}

export function startGame(options: GameOptions): Game {
  const { view, talk, saver, hosts } = options;
  const play = startPlay(options.island, theWorld());
  let sheet: { kind: SheetKind; draw: (body: HTMLElement) => PanelDrawing; drawing: PanelDrawing; root: HTMLElement; body: HTMLElement } | null = null;
  let decor: DecorState | null = null;
  let dressing: LookState | null = null;
  let screen = 'play';
  let sinceSave = 0;
  let sinceGuide = GUIDE_EVERY;
  let hint: Guide | null = null;
  const hits = new Map<string, HTMLButtonElement>();
  let stopped = false;

  view.show(play);
  view.setCamera('follow');

  function setScreen(name: string): void {
    screen = name;
    options.setScreen(name);
    hosts.tray.hidden = name !== 'house' && name !== 'decor';
  }

  function save(): void {
    sinceSave = 0;
    saver.save(play.island);
  }

  function updateHud(): void {
    const level = islandLevel(play.island);
    hosts.hud.replaceChildren(element('span', 'chip chip-shells', `🐚 ${play.island.shells}`), element('span', 'chip chip-level', `⭐ ${level}`));
    hosts.hud.setAttribute('aria-label', `${text().shellCount(play.island.shells)}, ${text().level(level)}`);
    const { dataset } = document.body;
    dataset.level = String(level);
    dataset.shells = String(play.island.shells);
    dataset.quests = String(play.island.quests.done);
    dataset.questStage = play.island.quests.stage;
    dataset.pets = String(play.island.pets.length);
  }

  function floatText(content: string, x: number, y: number): void {
    const float = element('div', 'floater', content);
    float.style.left = `${x}px`;
    float.style.top = `${y}px`;
    hosts.floaters.append(float);
    window.setTimeout(() => float.remove(), 1400);
  }

  function showBanner(level: number): void {
    hosts.banner.replaceChildren(element('span', 'banner-star', '⭐'), element('span', 'banner-text', text().level(level)));
    hosts.banner.classList.remove('banner-on');
    void hosts.banner.offsetWidth;
    hosts.banner.classList.add('banner-on');
    window.setTimeout(() => hosts.banner.classList.remove('banner-on'), 3800);
  }

  function sailFade(): void {
    hosts.fade.classList.remove('fade-on');
    void hosts.fade.offsetWidth;
    hosts.fade.classList.add('fade-on');
  }

  const panelContext: PanelContext = {
    play,
    talk,
    handle: (result) => handle(result, null),
    redraw: () => redrawSheet(),
    close: () => closeSheet(),
  };

  function closeSheet(): void {
    if (!sheet) return;
    sheet.drawing.stop?.();
    sheet.root.remove();
    sheet = null;
    document.body.dataset.panel = '';
  }

  function redrawSheet(): void {
    if (!sheet) return;
    sheet.drawing.stop?.();
    sheet.body.replaceChildren();
    sheet.drawing = sheet.draw(sheet.body);
  }

  function openSheet(kind: SheetKind, draw: (body: HTMLElement) => PanelDrawing): void {
    closeSheet();
    const root = element('div', 'sheet-backdrop');
    const card = element('section', 'sheet');
    card.dataset.panel = kind;
    const head = element('header', 'sheet-head');
    const close = button('sheet-close', '✖', text().close);
    close.dataset.action = 'close';
    onPress(close, () => {
      playSound('pop');
      closeSheet();
    });
    head.append(element('span', 'sheet-icon', SHEET_ICONS[kind]), close);
    const body = element('div', 'sheet-body');
    card.append(head, body);
    root.append(card);
    hosts.panel.append(root);
    sheet = { kind, draw, drawing: {}, root, body };
    document.body.dataset.panel = kind;
    sheet.drawing = draw(body);
  }

  function openPanel(kind: Panel, target: Target | null): void {
    switch (kind) {
      case 'house':
        enterDecor('home');
        return;
      case 'wardrobe':
        openWardrobe();
        return;
      case 'seeds':
        if (target?.kind === 'plot') openSheet('seeds', (body) => seedsPanel(panelContext, body, target.index));
        return;
      case 'give': {
        if (target?.kind !== 'friend') return;
        const friend: FriendId = target.id;
        openSheet('give', (body) => givePanel(panelContext, body, friend));
        return;
      }
      case 'care':
        if (target?.kind === 'pet') openSheet('care', (body) => carePanel(panelContext, body, target.index));
        return;
      case 'fishing':
        resetFishing();
        openSheet('fishing', (body) => fishingPanel(panelContext, body));
        return;
      case 'bakery':
        resetBakery();
        openSheet('bakery', (body) => bakeryPanel(panelContext, body));
        return;
      default:
        openSheet('pets', (body) => petsPanel(panelContext, body));
    }
  }

  function handle(result: Outcome, target: Target | null): void {
    if (stopped) return;
    if (result.sound) playSound(result.sound);
    if (result.say.length) talk.say(result.say);
    const spot = view.playerOnScreen();
    if (result.cheer && !calm()) burst(spot.x, spot.y);
    if (result.shells) floatText(`+${result.shells} 🐚`, spot.x, spot.y - 30);
    if (result.level) showBanner(result.level);
    if (result.first) {
      hosts.book.classList.remove('pulse');
      void hosts.book.offsetWidth;
      hosts.book.classList.add('pulse');
    }
    if (result.say.some((line) => 'line' in line && (line.line === 'sail' || line.line === 'sailHome'))) sailFade();
    if (result.quest === 'finished') {
      const next = guide(play.island, play.finds.list, play.walker);
      const then = result.then ?? (next && 'needs' in next.say ? [next.say] : []);
      if (then.length) talk.later(then);
    }
    if (result.open) openPanel(result.open, target);
    updateHud();
    save();
  }

  function act(target: Target): void {
    if (screen !== 'play') return;
    if (target.kind === 'button') {
      enterDecor('outdoor');
      return;
    }
    const go = goTo(play, target);
    if (go.blocked) {
      playSound('bonk');
      talk.say([{ line: go.blocked === 'bridge' ? 'bridgeShut' : 'boatShut' }]);
    } else {
      playNote(target.kind === 'ground' ? 520 : 700, { seconds: 0.1, gain: 0.25 });
    }
  }

  // ---------- Dressing up ----------

  function drawWardrobe(): void {
    if (!dressing) return;
    const state = dressing;
    view.dressStand(state.look);
    lookSheet(hosts.panel, 'wardrobe', (body) => {
      lookEditor(body, state, drawWardrobe);
      const done = button('go-btn', `✔️ ${text().done}`);
      done.dataset.action = 'done';
      onPress(done, closeWardrobe);
      body.append(done);
    });
  }

  function openWardrobe(): void {
    closeSheet();
    dressing = { look: { ...play.island.look }, tab: 'outfit' };
    setScreen('wardrobe');
    document.body.dataset.panel = 'wardrobe';
    view.setCamera('studio');
    drawWardrobe();
  }

  function closeWardrobe(): void {
    if (!dressing) return;
    const look = dressing.look;
    dressing = null;
    hosts.panel.replaceChildren();
    document.body.dataset.panel = '';
    view.setCamera('follow');
    setScreen('play');
    const changed = JSON.stringify(look) !== JSON.stringify(play.island.look);
    const result = dressUp(play, look);
    if (changed) result.say.unshift({ line: 'looksGreat' });
    handle(result, null);
  }

  // ---------- Decorating ----------

  function drawTray(): void {
    if (!decor) return;
    const state = decor;
    view.select(state.room, state.placed);
    decorTray(hosts.tray, state, {
      play,
      handle: (result) => handle(result, null),
      turn() {
        if (state.placed !== null && turnPlaced(play, state.room, state.placed)) playSound('whoosh');
        else playSound('bonk');
        save();
        drawTray();
      },
      remove() {
        if (state.placed !== null && removePlaced(play, state.room, state.placed)) playSound('pop');
        state.placed = null;
        save();
        drawTray();
      },
      exit: leaveDecor,
      changed: drawTray,
    });
  }

  function enterDecor(room: Room): void {
    closeSheet();
    decor = { room, picked: null, placed: null };
    if (room === 'home') {
      setScreen('house');
      view.setCamera('house');
    } else {
      setDecorating(play, true);
      setScreen('decor');
      talk.say([{ line: 'decorOut' }]);
      playSound('pop');
    }
    drawTray();
  }

  function leaveDecor(): void {
    if (!decor) return;
    const room = decor.room;
    decor = null;
    view.select(room, null);
    if (room === 'home') leaveHouse(play);
    else setDecorating(play, false);
    view.setCamera('follow');
    setScreen('play');
    playSound('pop');
    save();
  }

  function decorTap(x: number, y: number): void {
    if (!decor) return;
    const state = decor;
    const tile = state.room === 'home' ? view.floorAt(x, y) : view.groundAt(x, y);
    const hit = pickSpot(view.decorSpots(state.room), x, y) as Spot | null;
    if (state.picked) {
      if (!tile) return;
      const { uid, outcome } = putNear(play, state.room, state.picked, Math.floor(tile.x), Math.floor(tile.z));
      handle(outcome, null);
      if (uid !== null) {
        state.placed = uid;
        state.picked = null;
      }
    } else if (hit?.uid !== undefined && hit.uid !== state.placed) {
      state.placed = hit.uid;
      playSound('pop');
    } else if (state.placed !== null && tile) {
      if (moveNear(play, state.room, state.placed, Math.floor(tile.x), Math.floor(tile.z))) playSound('pop');
      else handle({ say: [{ line: 'noRoom' }], sound: 'bonk' }, null);
      save();
    } else {
      playSound('boing');
      talk.say([{ line: state.room === 'home' ? 'house' : 'decorOut' }]);
    }
    drawTray();
  }

  // ---------- Taps on the world ----------

  function worldTap(event: PointerEvent): void {
    if (stopped || sheet) return;
    if (screen === 'house' || screen === 'decor') {
      decorTap(event.clientX, event.clientY);
      return;
    }
    if (screen !== 'play') return;
    const spot = pickSpot(view.spots().filter((each) => each.on), event.clientX, event.clientY) as Spot | null;
    if (spot?.target) {
      act(spot.target);
      return;
    }
    const tile = view.groundAt(event.clientX, event.clientY);
    if (!tile) return;
    view.tapRing(Math.floor(tile.x), Math.floor(tile.z));
    act({ kind: 'ground', x: Math.floor(tile.x), z: Math.floor(tile.z) });
  }

  function onStagePress(event: PointerEvent): void {
    if (event.button === 0) worldTap(event);
  }
  hosts.stage.addEventListener('pointerdown', onStagePress);

  onPress(hosts.arrow, () => {
    if (hint) act(hint.target);
  });

  // ---------- Hit buttons over the world, for the keyboard and for anyone reading the page ----------

  function hitButton(id: string): HTMLButtonElement {
    let hit = hits.get(id);
    if (!hit) {
      hit = button('hit');
      hit.dataset.target = id;
      const target = id.startsWith('placed:') ? null : parseTargetId(id);
      onPress(hit, () => {
        if (target) act(target);
      });
      hosts.hits.append(hit);
      hits.set(id, hit);
    }
    return hit;
  }

  function parseTargetId(id: string): Target | null {
    const all = view.spots().find((spot) => spot.id === id);
    return all?.target ?? null;
  }

  function updateHits(): void {
    const spots = screen === 'play' ? view.spots() : screen === 'house' || screen === 'decor' ? view.decorSpots(decor?.room ?? 'home') : [];
    const seen = new Set<string>();
    const marked = hint ? targetId(hint.target) : '';
    let onScreen = false;
    for (const spot of spots) {
      seen.add(spot.id);
      const hit = hitButton(spot.id);
      hit.dataset.tile = `${spot.tileX},${spot.tileZ}`;
      hit.hidden = !spot.on;
      if (spot.id === marked && spot.on) onScreen = true;
      if (!spot.on) continue;
      const size = Math.max(64, Math.min(160, spot.reach * 1.6));
      hit.style.transform = `translate(${Math.round(spot.x - size / 2)}px, ${Math.round(spot.y - size / 2)}px)`;
      hit.style.width = `${Math.round(size)}px`;
      hit.style.height = `${Math.round(size)}px`;
      hit.setAttribute('aria-label', spot.target ? iconFor(play, spot.target) : '🪑');
      if (spot.id === marked) hit.dataset.quest = 'yes';
      else delete hit.dataset.quest;
    }
    for (const [id, hit] of hits) {
      if (seen.has(id)) continue;
      if (id.startsWith('find:') && !play.finds.list.some((each) => `find:${each.uid}` === id)) {
        hit.remove();
        hits.delete(id);
      } else {
        hit.hidden = true;
      }
    }
    updateArrow(onScreen);
    const at = view.playerOnScreen();
    document.body.dataset.player = `${Math.round(play.walker.x)},${Math.round(play.walker.z)}`;
    document.body.dataset.playerAt = `${Math.round(at.x)},${Math.round(at.y)}`;
  }

  function updateArrow(onScreen: boolean): void {
    const target = hint?.target ?? null;
    hosts.decor.classList.toggle('pulse-on', target?.kind === 'button' && screen === 'play');
    const show = Boolean(target) && target?.kind !== 'button' && screen === 'play' && !onScreen && !sheet;
    hosts.arrow.hidden = !show;
    if (!show || !target) return;
    const where = targetSpot(play, target);
    if (!where) {
      hosts.arrow.hidden = true;
      return;
    }
    const point = view.screenOf(where.x, where.z);
    const box = hosts.stage.getBoundingClientRect();
    const middleX = box.left + box.width / 2;
    const middleY = box.top + box.height / 2;
    let dx = point.x - middleX;
    let dy = point.y - middleY;
    if (!point.on && Math.hypot(dx, dy) < 1) dy = 1;
    const angle = Math.atan2(dy, dx);
    const margin = 56;
    const halfW = box.width / 2 - margin;
    const halfH = box.height / 2 - margin - 40;
    const scale = Math.min(halfW / Math.max(Math.abs(Math.cos(angle)), 0.001), halfH / Math.max(Math.abs(Math.sin(angle)), 0.001));
    dx = Math.cos(angle) * scale;
    dy = Math.sin(angle) * scale + 20;
    hosts.arrow.style.transform = `translate(${Math.round(middleX + dx - 40)}px, ${Math.round(middleY + dy - 40)}px)`;
    const pointer = hosts.arrow.querySelector<HTMLElement>('.arrow-point');
    if (pointer) pointer.style.transform = `rotate(${angle}rad)`;
    const icon = hosts.arrow.querySelector<HTMLElement>('.arrow-icon');
    if (icon) icon.textContent = iconFor(play, target);
  }

  function updateGuide(): Guide | null {
    const next = guide(play.island, play.finds.list, play.walker);
    if (!sameTarget(next?.target ?? null, hint?.target ?? null)) document.body.dataset.questTarget = next ? targetId(next.target) : '';
    document.body.dataset.questCrop = next?.crop ?? '';
    hint = next;
    view.setMarker(next?.target ?? null);
    return next;
  }

  // ---------- The frame ----------

  let drawPeak = 0;

  function frame(seconds: number): void {
    if (stopped) return;
    const result = tick(play, seconds);
    if (result.arrived) handle(arrive(play, result.arrived), result.arrived);
    for (const sky of result.outcomes) handle(sky, null);
    if (result.newArea && !sheet && screen === 'play') talk.queue([{ area: result.newArea }]);
    for (const index of result.tricks) {
      const body = play.bodies[index];
      if (!body || screen !== 'play') continue;
      const at = view.screenOf(body.x, body.z, 0.9);
      if (at.on) floatText('✨', at.x, at.y);
    }
    const walking = play.walker.route.length > 0 ? 'yes' : 'no';
    if (document.body.dataset.walking !== walking) document.body.dataset.walking = walking;
    countDraws();
    sinceGuide += seconds;
    if (sinceGuide >= GUIDE_EVERY) {
      sinceGuide = 0;
      updateGuide();
    }
    updateHits();
    sinceSave += seconds;
    if (sinceSave >= SAVE_EVERY) save();
  }

  /** The bots read these to keep the scene inside its draw-call budget. */
  function countDraws(): void {
    const calls = view.drawCalls();
    drawPeak = Math.max(drawPeak, calls);
    document.body.dataset.draws = String(calls);
    document.body.dataset.drawPeak = String(drawPeak);
  }

  function useNearest(): void {
    const target = nearestUse(play) ?? hint?.target ?? null;
    if (target) act(target);
  }

  function key(event: KeyboardEvent): boolean {
    if (event.key === 'Escape') {
      if (sheet) closeSheet();
      else if (dressing) closeWardrobe();
      else if (decor) leaveDecor();
      else return false;
      return true;
    }
    if (screen !== 'play' || sheet) return false;
    const moves: Record<string, [number, number]> = {
      ArrowUp: [0, -1],
      ArrowDown: [0, 1],
      ArrowLeft: [-1, 0],
      ArrowRight: [1, 0],
      w: [0, -1],
      s: [0, 1],
      a: [-1, 0],
      d: [1, 0],
    };
    const move = moves[event.key.length === 1 ? event.key.toLowerCase() : event.key];
    if (move) {
      nudge(play, move[0], move[1]);
      return true;
    }
    const focused = document.activeElement;
    if ((event.key === 'Enter' || event.key === ' ') && !(focused instanceof HTMLButtonElement)) {
      useNearest();
      return true;
    }
    return false;
  }

  setScreen('play');
  updateHud();
  // Whatever the picker last said would hang over the island otherwise.
  talk.stop();
  talk.clear();
  const opening = updateGuide();
  if (options.fresh) talk.say([{ line: 'welcome' }]);
  if (opening) talk.queue([opening.say]);
  save();

  return {
    frame,
    key,
    relabel() {
      redrawSheet();
      if (dressing) drawWardrobe();
      if (decor) drawTray();
      updateHud();
    },
    repeat() {
      talk.repeat(hint ? [hint.say] : []);
    },
    decorate() {
      if (!stopped && screen === 'play') enterDecor('outdoor');
    },
    openBook() {
      if (stopped || dressing) return;
      playSound('pop');
      talk.say([{ line: 'book' }]);
      openSheet('book', (body) => bookPanel(panelContext, body));
    },
    save,
    stop() {
      if (stopped) return;
      save();
      stopped = true;
      closeSheet();
      hosts.panel.replaceChildren();
      hosts.tray.replaceChildren();
      hosts.tray.hidden = true;
      hosts.arrow.hidden = true;
      hosts.hits.replaceChildren();
      hits.clear();
      hosts.hud.replaceChildren();
      hosts.stage.removeEventListener('pointerdown', onStagePress);
      view.setMarker(null);
      view.select('home', null);
      document.body.dataset.panel = '';
    },
  };
}
