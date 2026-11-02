import '@playroom/kit/kit.css';
import './style.css';
import { canSpeak, getLanguage, homeButton, languageButton, onLanguageChange, playSound, useClips } from '@playroom/kit';
import { createStage } from '@playroom/stage3d';
import { startingLook, type Look } from './data/looks.ts';
import { text } from './lang/index.ts';
import clips from './lang/sl.clips.json';
import { theWorld } from './rules/island.ts';
import { clearSlot, IslandSaver, readSlot, SLOTS, storageWorks, type SlotRead } from './rules/save.ts';
import { newIsland, type Island } from './rules/state.ts';
import { startGame, type Game } from './screens/game.ts';
import { lookEditor, lookSheet, type LookState } from './screens/looks.ts';
import { showAvatars, showPicker } from './screens/picker.ts';
import { deviceStorage } from './storage.ts';
import { createTalker } from './talk.ts';
import { button, byId, calm, element, onHold, onPress, settle } from './ui.ts';
import { createView, type View } from './view/view.ts';

const CAMERA = { fov: 40, near: 0.5, far: 700 };
const DISARM_MS = 4000;
/** A second press sooner than this is a mash, not a grown-up making sure. */
const CONFIRM_AFTER_MS = 700;

useClips(clips);

const bar = byId('topbar');
const overlay = byId('overlay');
const panelHost = byId('panel');
const talk = createTalker(byId('bubble'));
const heading = element('h1', 'title');
const hud = element('div', 'hud');
const home = homeButton();
const language = languageButton(['en', 'sl']);
const repeat = button('bar-btn', '🔊');
repeat.dataset.action = 'repeat';
repeat.hidden = !canSpeak();
const islands = button('bar-btn', '🏝️');
islands.dataset.action = 'islands';
bar.append(home, heading, hud, language, repeat, islands);
const book = byId('book') as HTMLButtonElement;
const decorButton = byId('decor') as HTMLButtonElement;
const arrow = byId('arrow') as HTMLButtonElement;

function setScreen(name: string): void {
  if (document.body.dataset.screen !== name) settle();
  document.body.dataset.screen = name;
  const playing = name === 'play' || name === 'house' || name === 'decor' || name === 'wardrobe';
  islands.hidden = !playing;
  heading.hidden = playing;
  hud.hidden = !playing;
  book.hidden = !playing || name === 'wardrobe';
  decorButton.hidden = name !== 'play';
  if (!playing) arrow.hidden = true;
}

function labelPage(): void {
  const t = text();
  document.documentElement.lang = getLanguage();
  document.title = t.title;
  document.querySelector('meta[name="description"]')?.setAttribute('content', t.description);
  heading.textContent = t.title;
  home.setAttribute('aria-label', t.home);
  repeat.setAttribute('aria-label', t.sayAgain);
  islands.setAttribute('aria-label', t.islands);
  book.setAttribute('aria-label', t.bookButton);
  decorButton.setAttribute('aria-label', t.decorButton);
}

function showNo3d(): void {
  const note = element('p', 'no-3d', text().no3d);
  overlay.replaceChildren(note);
  repeat.hidden = true;
  islands.hidden = true;
  book.hidden = true;
  decorButton.hidden = true;
  document.body.dataset.screen = 'no-3d';
}

function runGame(view: View): (seconds: number) => void {
  const works = storageWorks(deviceStorage);
  let slots: SlotRead[] = [];
  let game: Game | null = null;
  let grownUpsOpen = false;
  let armed: number | null = null;
  let disarmTimer = 0;
  let armedAt = 0;
  let redraw: () => void = () => {};
  let creating: { slot: number; avatar: number; state: LookState } | null = null;

  const readAll = (): void => {
    slots = Array.from({ length: SLOTS }, (_, slot) => readSlot(deviceStorage, slot));
  };

  function leaveGame(): void {
    game?.stop();
    game = null;
    creating = null;
    panelHost.replaceChildren();
    document.body.dataset.panel = '';
  }

  function showIslands(): void {
    leaveGame();
    readAll();
    view.show(null);
    view.setCamera('backdrop');
    setScreen('islands');
    const draw = (): void =>
      showPicker(overlay, {
        slots,
        storageWorks: works,
        grownUpsOpen,
        armed,
        onPlay: openIsland,
        onNew: pickAvatar,
        onGrownUps() {
          playSound('pop');
          grownUpsOpen = !grownUpsOpen;
          armed = null;
          draw();
        },
        onReset(slot) {
          window.clearTimeout(disarmTimer);
          if (armed === slot && performance.now() - armedAt < CONFIRM_AFTER_MS) return;
          if (armed === slot) {
            clearSlot(deviceStorage, slot);
            armed = null;
            readAll();
            playSound('whoosh');
          } else {
            armed = slot;
            armedAt = performance.now();
            playSound('bonk');
            disarmTimer = window.setTimeout(() => {
              armed = null;
              if (document.body.dataset.screen === 'islands') draw();
            }, DISARM_MS);
          }
          draw();
        },
      });
    draw();
    redraw = draw;
    talk.clear();
    talk.say([{ line: 'pickIsland' }]);
  }

  function pickAvatar(slot: number): void {
    playSound('pop');
    setScreen('avatar');
    const draw = (): void => showAvatars(overlay, (avatar) => createLook(slot, avatar), showIslands);
    draw();
    redraw = draw;
    talk.say([{ line: 'pickAvatar' }]);
  }

  function drawCreator(): void {
    if (!creating) return;
    const current = creating;
    view.dressStand(current.state.look);
    lookSheet(panelHost, 'creator', (body) => {
      lookEditor(body, current.state, drawCreator);
      const go = button('go-btn', `🏝️ ${text().go}`);
      go.dataset.action = 'go';
      onHold(go, () => finishCreator(current.slot, current.avatar, current.state.look));
      body.append(go);
    });
  }

  function createLook(slot: number, avatar: number): void {
    overlay.replaceChildren();
    setScreen('creator');
    view.setCamera('studio');
    creating = { slot, avatar, state: { look: startingLook(avatar), tab: 'skin' } };
    drawCreator();
    redraw = drawCreator;
    talk.say([{ line: 'makeYou' }]);
  }

  function finishCreator(slot: number, avatar: number, look: Look): void {
    creating = null;
    panelHost.replaceChildren();
    playSound('tada');
    const island = newIsland(avatar, look, 1 + Math.floor(Math.random() * 999983));
    const read = readSlot(deviceStorage, slot);
    if (read.status !== 'empty') {
      showIslands();
      return;
    }
    play(slot, island, read, true);
  }

  function openIsland(slot: number): void {
    const read = readSlot(deviceStorage, slot);
    if (read.status !== 'ok') {
      showIslands();
      return;
    }
    playSound('pop');
    play(slot, read.island, read, false);
  }

  function play(slot: number, island: Island, read: SlotRead, fresh: boolean): void {
    leaveGame();
    overlay.replaceChildren();
    document.body.dataset.slot = String(slot);
    game = startGame({
      island,
      fresh,
      view,
      talk,
      saver: new IslandSaver(deviceStorage, slot, read, works),
      setScreen,
      hosts: {
        stage: byId('stage'),
        hits: byId('hits'),
        panel: panelHost,
        tray: byId('tray'),
        hud,
        arrow,
        banner: byId('banner'),
        fade: byId('fade'),
        floaters: byId('floaters'),
        book,
        decor: decorButton,
      },
    });
    redraw = () => {};
  }

  // Any press anywhere but the armed reset button disarms it, so only a deliberate second press erases.
  document.addEventListener(
    'pointerdown',
    (event) => {
      if (armed === null) return;
      const pressed = event.target instanceof Element ? event.target.closest('[data-reset]') : null;
      if (pressed instanceof HTMLElement && pressed.dataset.reset === String(armed)) return;
      armed = null;
      if (document.body.dataset.screen === 'islands') redraw();
    },
    true,
  );

  onHold(islands, () => {
    playSound('pop');
    showIslands();
  });
  onPress(repeat, () => {
    if (game) game.repeat();
    else talk.repeat();
  });
  onPress(book, () => game?.openBook());
  onPress(decorButton, () => game?.decorate());

  onLanguageChange(() => {
    labelPage();
    redraw();
    game?.relabel();
  });

  window.addEventListener('keydown', (event) => {
    if (game?.key(event)) event.preventDefault();
  });
  const saveNow = (): void => game?.save();
  window.addEventListener('pagehide', saveNow);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) saveNow();
  });

  labelPage();
  showIslands();
  return (seconds) => {
    game?.frame(seconds);
    view.update(seconds);
  };
}

const stage = createStage(byId('stage'), CAMERA);
if (stage) {
  stage.onFrame(runGame(createView(stage, theWorld(), calm)));
  stage.start();
} else {
  labelPage();
  showNo3d();
}
