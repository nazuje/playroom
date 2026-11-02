import { burst, speak } from '@playroom/kit';
import { ghostPath, type Demo } from './demo.ts';
import { text } from './lang/index.ts';
import type { HintId } from './lang/en.ts';
import { lavaAt, type Level } from './level.ts';
import { createPad } from './pad.ts';
import { gemsFound, gemsWanted, rate, seconds as runSeconds, type Stars } from './rating.ts';
import { SKIP_AFTER } from './save.ts';
import { FX_BOUNCE, FX_CRUMBLE, FX_DASH, FX_GEM, FX_JUMP, FX_LAND, FX_SECRET, FX_WALL, newRun, step, type Run } from './sim.ts';
import * as sound from './sounds.ts';
import { HERO_H, HERO_W, TICKS_PER_SECOND } from './tuning.ts';
import { button, element } from './ui.ts';
import { createView, type Flourish } from './view.ts';
import type { World } from './worlds.ts';

/** The singe plays this long, then the climb starts over by itself. */
const SINGE_SECONDS = 0.72;
/** A fresh press cuts the singe short, after a moment to see the funny face. */
const SINGE_SKIP_AFTER = 0.22;
const RESULT_AFTER = 0.55;
/** The result buttons sleep this long, so mashing can't skip past the stars. */
const RESULT_WAKES_AFTER = 800;
const SKIP_HOLD_MS = 900;
/** Failing this long also brings the skip button, since a mashed try can last a long time. */
const SKIP_AFTER_SECONDS = 45;
const GHOST_TICKS_PER_SECOND = 90;
const GHOST_PAUSE_TICKS = 50;
const GHOST_ALPHA = 0.6;
const GHOST_FADE_SECONDS = 0.6;
const FISH_CHANCE = 0.4;
const FISH_SECONDS = 2.4;
const MAX_FRAME_SECONDS = 0.05;
/** A longer stall than this is lost time, not time to make up. */
const MAX_CATCH_UP_MS = 500;
const TICK_MS = 1000 / TICKS_PER_SECOND;
const SAY_OUCH_EVERY = 4;

export interface PlayScreen {
  stop: () => void;
  redraw: () => void;
  line: () => string;
}

export interface PlayOptions {
  number: number;
  level: Level;
  world: World;
  hint: HintId | null;
  demo: Demo | null;
  worldIntro: boolean;
  hasNext: boolean;
  finished: boolean;
  slots: HTMLElement[];
  singes: () => number;
  onSinge: () => void;
  onWin: (stars: Stars, seconds: number, secret: boolean) => void;
  onNext: () => void;
  onAgain: () => void;
  onMap: () => void;
  onSkip: () => void;
  onFailedView: () => void;
}

const calmWanted = (): boolean => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const clock = (seconds: number): string => seconds.toFixed(1);

let ouchTurn = 0;
let fishSeen = false;

export function startPlay(host: HTMLElement, options: PlayOptions): PlayScreen {
  const { level, world, number } = options;
  const root = element('div', 'play');
  root.dataset.world = world.id;
  const barLeft = element('div', 'hud hud-left');
  const barRight = element('div', 'hud hud-right');
  const mapButton = button('bar-btn');
  mapButton.textContent = '🗺️';
  const statLevel = element('span', 'stat stat-level');
  const statGems = element('span', 'stat');
  const statTime = element('span', 'stat stat-time');
  const statSinges = element('span', 'stat stat-singes');
  barLeft.append(mapButton, statLevel, statGems, statTime, statSinges);
  barRight.append(...options.slots);
  const field = element('canvas', 'field');
  field.id = 'tower';
  field.setAttribute('role', 'img');
  const fieldBox = element('div', 'field-box');
  const hintChip = element('div', 'hint');
  const skipButton = button('skip-btn');
  skipButton.hidden = true;
  fieldBox.append(field, hintChip, skipButton);
  const moveBox = element('div', 'pad pad-move');
  const actBox = element('div', 'pad pad-act');
  const result = element('div', 'result');
  result.hidden = true;
  root.append(barLeft, barRight, fieldBox, moveBox, actBox, result);
  host.replaceChildren(root);

  const made = createView(field, level, world, calmWanted());
  const pad = createPad(root, field, moveBox, actBox, level.dash);
  let run: Run = newRun(level);
  let tries = 1;
  let last = performance.now();
  let tickClock = last;
  let time = 0;
  let singedFor = 0;
  let wonFor = 0;
  let wrapped = false;
  let frameId = 0;
  let shake = 0;
  let fishAge: number | null = null;
  let fishX = 0;
  let fishComes = false;
  let skipTimer: ReturnType<typeof setTimeout> | undefined;
  let failingFor = 0;
  const ghost = options.demo ? ghostPath(level, options.demo) : [];
  let ghostClock = 0;
  let ghostFade = 0;
  let stuckSaid = false;
  let shownTime = '';
  let line = options.hint ? text().hints[options.hint] : text().go;

  const say = (words: string): void => {
    line = words;
    speak(words);
  };

  function labels(): void {
    const words = text();
    mapButton.setAttribute('aria-label', words.levels);
    statLevel.textContent = `${number}`;
    statLevel.setAttribute('aria-label', words.level(number));
    statGems.setAttribute('aria-label', words.gems);
    statTime.setAttribute('aria-label', words.time);
    statSinges.setAttribute('aria-label', words.singes);
    field.setAttribute('aria-label', words.title);
    skipButton.setAttribute('aria-label', words.skip);
    moveBox.querySelector('.zone-left')?.setAttribute('aria-label', words.left);
    moveBox.querySelector('.zone-right')?.setAttribute('aria-label', words.right);
    actBox.querySelector('.zone-jump')?.setAttribute('aria-label', words.jump);
    actBox.querySelector('.zone-dash')?.setAttribute('aria-label', words.dash);
    drawHint();
  }

  function drawHint(): void {
    const words = text();
    hintChip.textContent = options.hint ? words.hints[options.hint] : options.worldIntro ? words.worlds[world.id] : words.ready;
    hintChip.hidden = run.phase !== 'ready';
  }

  function drawStats(): void {
    statGems.textContent = `💎${gemsFound(level, run)}/${gemsWanted(level)}`;
    statSinges.textContent = `🔥${options.singes()}`;
  }

  function showSkip(): void {
    if (options.finished || skipButton.hidden === false) return;
    if (tries <= SKIP_AFTER && (tries === 1 || failingFor < SKIP_AFTER_SECONDS)) return;
    skipButton.hidden = false;
    skipButton.textContent = '⏭️';
    if (!stuckSaid) say(text().stuck);
    stuckSaid = true;
    labels();
  }

  // Skipping is a long press, so mashing can't do it by accident.
  const letGoOfSkip = (): void => {
    clearTimeout(skipTimer);
    skipButton.classList.remove('armed');
  };
  skipButton.addEventListener('pointerdown', (event) => {
    event.preventDefault();
    skipButton.classList.add('armed');
    skipTimer = setTimeout(options.onSkip, SKIP_HOLD_MS);
  });
  skipButton.addEventListener('pointerup', letGoOfSkip);
  skipButton.addEventListener('pointercancel', letGoOfSkip);
  skipButton.addEventListener('pointerleave', letGoOfSkip);

  mapButton.addEventListener('click', options.onMap);

  function restart(): void {
    run = newRun(level);
    tickClock = last;
    tries += 1;
    singedFor = 0;
    shake = 0;
    fishAge = null;
    fishComes = level.fish && Math.random() < FISH_CHANCE;
    sound.resetGems();
    made?.snap(run);
    field.dataset.phase = 'ready';
    field.dataset.try = String(tries);
    drawHint();
    drawStats();
    showSkip();
  }

  function react(bits: number): void {
    if (!made) return;
    const feet = { x: run.x + HERO_W / 2, y: run.y + HERO_H };
    if (bits & FX_JUMP) {
      sound.jumpSound();
      made.bits.spray(feet.x, feet.y, 4, '#d8c8b8', 34, 0, 1.4);
    }
    if (bits & FX_WALL) {
      sound.wallSound();
      made.bits.spray(run.vx > 0 ? run.x : run.x + HERO_W, run.y + HERO_H / 2, 6, world.accent, 60, 0, 1.4);
    }
    if (bits & FX_DASH) sound.dashSound();
    if (bits & FX_LAND) {
      sound.landSound();
      made.bits.spray(feet.x, feet.y, 3, '#d8c8b8', 26, 0, 1.2);
    }
    if (bits & FX_BOUNCE) sound.bounceSound();
    if (bits & FX_CRUMBLE) sound.crumbleSound();
    if (bits & FX_GEM) {
      sound.gemSound();
      made.bits.spray(feet.x, run.y, 8, '#ff9bea', 70, 0, 1.5);
      drawStats();
    }
    if (bits & FX_SECRET) {
      sound.secretSound();
      made.bits.spray(feet.x, run.y, 18, '#ffd23f', 110, 0, 1.8);
      say(text().secret);
    }
  }

  function singe(): void {
    field.dataset.phase = 'singed';
    options.onSinge();
    drawStats();
    shake = 1.4;
    const bonked = run.cause === 'rock';
    if (bonked) sound.bonkSound();
    else sound.singeSound();
    for (let puff = 0; puff < 6; puff += 1) made?.bits.smoke(run.x + HERO_W / 2, run.y);
    made?.bits.spray(run.x + HERO_W / 2, run.y + HERO_H / 2, 10, '#ffb33c', 90, 240, 1.5);
    ouchTurn += 1;
    if (bonked) {
      if (ouchTurn % SAY_OUCH_EVERY === 1) say(text().bonk);
    } else if (ouchTurn % SAY_OUCH_EVERY === 1) {
      const words = text().ouch;
      say(words[Math.floor(ouchTurn / SAY_OUCH_EVERY) % words.length]!);
    }
  }

  function win(): void {
    field.dataset.phase = 'won';
    const stars = rate(level, run);
    options.onWin(stars, runSeconds(run), run.secret);
    sound.winSound();
    field.dataset.stars = String(stars.count);
    field.dataset.seconds = runSeconds(run).toFixed(2);
    field.dataset.gems = String(gemsFound(level, run));
    const box = field.getBoundingClientRect();
    burst(box.left + box.width / 2, box.top + box.height / 3, 24);
  }

  function showResult(): void {
    const words = text();
    const stars = rate(level, run);
    say(words.win[stars.count - 1]!);
    const row = element('div', 'result-stars');
    for (let at = 0; at < 3; at += 1) {
      const star = element('span', at < stars.count ? 'star got' : 'star');
      star.textContent = '★';
      star.style.setProperty('--at', String(at));
      row.append(star);
      if (at < stars.count) setTimeout(() => sound.starSound(at), 200 + at * 260);
    }
    row.setAttribute('aria-label', words.starsLabel(stars.count));
    const facts = element('div', 'result-facts');
    const fact = (mark: string, value: string, label: string, good: boolean): void => {
      const item = element('span', good ? 'fact good' : 'fact');
      item.textContent = `${mark} ${value}`;
      item.setAttribute('aria-label', label);
      facts.append(item);
    };
    fact('⏱️', clock(runSeconds(run)), words.time, stars.fast);
    fact('💎', `${gemsFound(level, run)}/${gemsWanted(level)}`, words.gems, stars.allGems);
    fact('🔥', String(tries - 1), words.singes, tries === 1);
    const next = button('big-btn');
    next.textContent = options.hasNext ? `${words.next} ▶` : '🌋';
    next.setAttribute('aria-label', words.next);
    const again = button('small-btn');
    again.textContent = '🔁';
    again.setAttribute('aria-label', words.again);
    next.addEventListener('click', options.onNext);
    again.addEventListener('click', options.onAgain);
    result.replaceChildren(row, facts, next, again);
    result.hidden = false;
    field.dataset.phase = 'result';
    setTimeout(() => result.classList.add('awake'), RESULT_WAKES_AFTER);
    if (!calmWanted()) burst(window.innerWidth / 2, window.innerHeight * 0.34, 18);
  }

  /**
   * Plays the ticks up to this frame. Each tick stands for its own moment, with the buttons as they were
   * then, so every press lands on the same tick on a slow screen as on a fast one.
   */
  function advance(to: number): void {
    tickClock = Math.max(tickClock, to - MAX_CATCH_UP_MS);
    const wasReady = run.phase === 'ready';
    let bits = 0;
    while (tickClock + TICK_MS <= to) {
      tickClock += TICK_MS;
      step(level, run, pad.inputAt(tickClock));
      bits |= run.fx;
      if (run.phase === 'singed' || run.phase === 'won') {
        pad.inputAt(to);
        break;
      }
    }
    react(bits);
    if (wasReady && run.phase === 'climbing') {
      field.dataset.phase = 'climbing';
      drawHint();
    }
    if (run.phase === 'singed') singe();
    if (run.phase === 'won') win();
  }

  function updateFish(seconds: number): void {
    if (fishAge !== null) {
      fishAge += seconds / FISH_SECONDS;
      if (fishAge >= 1) fishAge = null;
      return;
    }
    if (!fishComes || !made?.lavaVisible(run) || run.phase !== 'climbing') return;
    fishComes = false;
    fishAge = 0;
    fishX = Math.max(50, Math.min(270, run.x + (run.x < 160 ? 60 : -60)));
    if (!fishSeen) say(text().fish);
    fishSeen = true;
  }

  /** The ghost plays its move on a loop until the first press, then fades away. */
  function ghostAt(seconds: number): Flourish['ghost'] {
    if (ghost.length === 0) return null;
    ghostFade = run.phase === 'ready' ? 1 : Math.max(0, ghostFade - seconds / GHOST_FADE_SECONDS);
    if (ghostFade === 0) {
      ghostClock = 0;
      return null;
    }
    ghostClock += seconds;
    const at = Math.floor(ghostClock * GHOST_TICKS_PER_SECOND) % (ghost.length + GHOST_PAUSE_TICKS);
    return { path: ghost, at, alpha: GHOST_ALPHA * ghostFade };
  }

  function publish(): void {
    field.dataset.run = `${run.tick} ${run.x.toFixed(1)} ${run.y.toFixed(1)} ${run.vx.toFixed(0)} ${run.vy.toFixed(0)} ${run.ground ? 1 : 0} ${lavaAt(level, run.tick).toFixed(1)}`;
    const shown = clock(runSeconds(run));
    if (shown !== shownTime) {
      shownTime = shown;
      statTime.textContent = `⏱️${shown}`;
    }
  }

  function frame(now: number): void {
    frameId = requestAnimationFrame(frame);
    const seconds = Math.min((now - last) / 1000, MAX_FRAME_SECONDS);
    last = now;
    time += seconds;
    if (run.phase === 'ready' || run.phase === 'climbing') advance(now);
    else if (run.phase === 'singed') {
      singedFor += seconds;
      if (Math.random() < seconds * 18) made?.bits.smoke(run.x + HERO_W / 2, run.y - singedFor * 22);
      if (singedFor >= SINGE_SECONDS) restart();
    } else if (!wrapped) {
      wonFor += seconds;
      if (wonFor >= RESULT_AFTER) {
        wrapped = true;
        showResult();
      }
    }
    if (run.phase !== 'won' && !wrapped) {
      failingFor += seconds;
      if (failingFor >= SKIP_AFTER_SECONDS) showSkip();
    }
    updateFish(seconds);
    shake = Math.max(0, shake - seconds * 5);
    publish();
    const flourish: Flourish = { fishAge, fishX, singedFor, shake, ghost: ghostAt(seconds) };
    made?.draw(run, flourish, seconds, time);
  }

  pad.onPress(() => {
    if (run.phase === 'singed' && singedFor >= SINGE_SKIP_AFTER) restart();
  });

  const onResize = (): void => made?.resize();
  const onVisible = (): void => {
    last = performance.now();
    tickClock = last;
    pad.held.releaseAll();
  };
  window.addEventListener('resize', onResize);
  document.addEventListener('visibilitychange', onVisible);

  field.dataset.phase = 'ready';
  field.dataset.level = String(number);
  field.dataset.try = '1';
  fishComes = level.fish && Math.random() < FISH_CHANCE;
  labels();
  drawStats();
  if (made) {
    made.resize();
    made.snap(run);
  } else options.onFailedView();
  say(options.hint ? text().hints[options.hint] : options.worldIntro ? text().worlds[world.id] : text().go);
  sound.resetGems();
  frameId = requestAnimationFrame((now) => {
    last = now;
    tickClock = now;
    frame(now);
  });

  return {
    stop() {
      cancelAnimationFrame(frameId);
      clearTimeout(skipTimer);
      pad.stop();
      window.removeEventListener('resize', onResize);
      document.removeEventListener('visibilitychange', onVisible);
    },
    redraw() {
      labels();
      if (wrapped) showResult();
    },
    line: () => line,
  };
}
