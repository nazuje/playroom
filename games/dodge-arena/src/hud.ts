import { formatTime } from './clock.ts';
import { text } from './lang/index.ts';
import { leapCharge, type Run } from './run.ts';
import { HEARTS } from './tuning.ts';
import { element, button } from './ui.ts';

const CALLOUT_SECONDS = 2.6;
const BONK_MS = 700;

export interface Hud {
  /** Shows the numbers for this frame. */
  update(run: Run, seconds: number): void;
  /** A big banner, with art and words. */
  callout(art: string, words: string): void;
  /** Makes the leap button pulse, whenever a danger you can jump turns up. */
  hintLeap(): void;
  /** Shows a bouncing arrow over the player and on the button while a ring or beam is about to reach them, or hides it. */
  cueJump(at: { x: number; y: number } | null): void;
  /** Comic text at the player. */
  bonk(x: number, y: number): void;
  /** Redraws words after a language switch. */
  label(): void;
  dispose(): void;
}

/** Hearts, the big clock and the leap button: all that sits over the arena during play. */
export function createHud(host: HTMLElement, onLeap: () => void): Hud {
  const top = element('div', 'hud-top');
  const time = element('div', 'hud-time');
  const goal = element('div', 'hud-goal');
  const fill = element('div', 'hud-goal-fill');
  goal.append(fill);
  const hearts = element('div', 'hud-hearts');
  const heartIcons = Array.from({ length: HEARTS }, () => {
    const heart = element('span', 'hud-heart');
    heart.textContent = '❤️';
    hearts.append(heart);
    return heart;
  });
  top.append(time, goal, hearts);
  const banner = element('div', 'hud-banner');
  banner.hidden = true;
  const leap = button('leap-btn');
  const rocket = element('span', 'leap-rocket');
  rocket.textContent = '🚀';
  leap.append(element('span', 'up-arrow leap-arrow'), rocket);
  leap.dataset.ready = 'true';
  leap.dataset.cue = 'false';
  const cue = element('div', 'up-arrow jump-cue');
  cue.hidden = true;
  host.replaceChildren(top, banner, cue, leap);

  let bannerLeft = 0;
  let shownHearts = -1;

  function press(event: PointerEvent): void {
    event.preventDefault();
    onLeap();
  }

  leap.addEventListener('pointerdown', press);

  function label(): void {
    leap.setAttribute('aria-label', text().leap);
  }

  label();

  return {
    update(run, seconds) {
      const stageGoal = run.stage?.goal ?? 0;
      time.textContent = formatTime(stageGoal ? Math.max(0, stageGoal - run.clock) : run.clock);
      goal.hidden = !stageGoal;
      if (stageGoal) fill.style.transform = `scaleX(${Math.min(1, run.clock / stageGoal)})`;
      if (run.player.hearts !== shownHearts) {
        shownHearts = run.player.hearts;
        heartIcons.forEach((heart, at) => heart.classList.toggle('hud-heart-lost', at >= shownHearts));
      }
      const charge = leapCharge(run.player);
      leap.style.setProperty('--charge', `${Math.round(charge * 360)}deg`);
      leap.dataset.ready = String(charge >= 1);
      if (bannerLeft > 0) {
        bannerLeft -= seconds;
        if (bannerLeft <= 0) banner.hidden = true;
      }
    },
    callout(art, words) {
      banner.hidden = false;
      banner.textContent = `${art} ${words}`;
      banner.classList.remove('hud-banner-in');
      void banner.offsetWidth;
      banner.classList.add('hud-banner-in');
      bannerLeft = CALLOUT_SECONDS;
    },
    hintLeap() {
      leap.classList.remove('leap-hint');
      void leap.offsetWidth;
      leap.classList.add('leap-hint');
    },
    cueJump(at) {
      cue.hidden = !at;
      leap.dataset.cue = String(Boolean(at));
      if (!at) return;
      cue.style.left = `${at.x}px`;
      cue.style.top = `${at.y}px`;
    },
    bonk(x, y) {
      const word = element('div', 'bonk');
      word.textContent = text().bonk;
      word.style.left = `${x}px`;
      word.style.top = `${y}px`;
      host.append(word);
      setTimeout(() => word.remove(), BONK_MS);
    },
    label,
    dispose() {
      leap.removeEventListener('pointerdown', press);
      host.replaceChildren();
    },
  };
}
