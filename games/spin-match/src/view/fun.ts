// The funny side of a wrong pick, and the rare surprises. A wrong critter blows a stream of bubbles, gets dizzy
// with stars round its head, or a crab scuttles in across the sand and pinches it. On a surprise set a fish
// swims past and does a spin each time a critter snaps into place. All of it calms down for reduced motion.
import { calm, element } from '../ui.ts';

export type Funny = 'bubbles' | 'dizzy' | 'crab';
export const FUNNIES: readonly Funny[] = ['bubbles', 'dizzy', 'crab'];

const BUBBLES = 8;

function remove(made: HTMLElement, ms: number): void {
  window.setTimeout(() => made.remove(), ms);
}

/** A stream of bubbles out of the critter, popping as they rise, sized to the critter so they read on any screen. */
function bubbles(holder: HTMLElement): void {
  const box = holder.getBoundingClientRect();
  holder.style.setProperty('--rise', `${-Math.round(box.height * 0.95)}px`);
  for (let at = 0; at < BUBBLES; at += 1) {
    const bubble = element('span', 'blub');
    bubble.style.setProperty('--x', `${18 + ((at * 37) % 64)}%`);
    bubble.style.setProperty('--size', `${Math.round(box.width * (0.09 + ((at * 7) % 9) / 100))}px`);
    bubble.style.animationDelay = `${at * 80}ms`;
    holder.append(bubble);
    remove(bubble, 1400 + at * 80);
  }
}

/** The critter spins woozily with little stars round its head. */
function dizzy(holder: HTMLElement, art: SVGSVGElement): void {
  art.classList.remove('woozy');
  void art.getBoundingClientRect();
  art.classList.add('woozy');
  window.setTimeout(() => art.classList.remove('woozy'), 1100);
  const stars = element('span', 'dizzy-stars');
  stars.textContent = '💫';
  holder.append(stars);
  remove(stars, 1200);
}

/** A crab scuttles in from the nearer side of the screen, pinches the critter and scuttles off again. */
function crab(holder: HTMLElement): void {
  const box = holder.getBoundingClientRect();
  const fromLeft = box.left + box.width / 2 < window.innerWidth / 2;
  const walker = element('span', 'crab');
  walker.textContent = '🦀';
  walker.style.left = `${box.left + box.width / 2}px`;
  walker.style.top = `${box.bottom - 34}px`;
  document.body.append(walker);
  const away = fromLeft ? -(box.left + box.width / 2 + 60) : window.innerWidth - box.left - box.width / 2 + 60;
  walker.animate(
    [
      { transform: `translateX(${away}px)` },
      { transform: 'translateX(-50%) rotate(-8deg)', offset: 0.38 },
      { transform: 'translateX(-50%) rotate(8deg) scale(1.15)', offset: 0.5 },
      { transform: 'translateX(-50%) rotate(-8deg)', offset: 0.6 },
      { transform: `translateX(${away}px)` },
    ],
    { duration: 1500, easing: 'ease-in-out' },
  );
  window.setTimeout(() => {
    holder.classList.remove('pinched');
    void holder.offsetWidth;
    holder.classList.add('pinched');
  }, 600);
  window.setTimeout(() => holder.classList.remove('pinched'), 1200);
  remove(walker, 1500);
}

/** One of the funny reactions on a wrong critter. */
export function funny(kind: Funny, holder: HTMLElement, art: SVGSVGElement): void {
  if (calm()) {
    const badge = element('span', 'dizzy-stars');
    badge.textContent = kind === 'crab' ? '🦀' : kind === 'dizzy' ? '💫' : '💧';
    holder.append(badge);
    remove(badge, 1200);
    return;
  }
  if (kind === 'bubbles') bubbles(holder);
  else if (kind === 'dizzy') dizzy(holder, art);
  else crab(holder);
}

/** A fish swims across the water at some height, doing a spin halfway. */
export function swimPast(y: number, fish: string): void {
  if (calm()) return;
  const swimmer = element('span', 'swimmer');
  swimmer.textContent = fish;
  swimmer.style.top = `${y}px`;
  document.body.append(swimmer);
  const across = window.innerWidth + 120;
  swimmer.animate(
    [
      { transform: 'translateX(0) rotate(0deg)' },
      { transform: `translateX(${-across * 0.4}px) rotate(0deg)`, offset: 0.4 },
      { transform: `translateX(${-across * 0.6}px) rotate(-360deg) scale(1.3)`, offset: 0.6 },
      { transform: `translateX(${-across}px) rotate(-360deg)` },
    ],
    { duration: 2600, easing: 'ease-in-out' },
  );
  remove(swimmer, 2600);
}
