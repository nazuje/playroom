// The ways the odd one leaves the pond, so a right tap stays a surprise: the springy leaf bounces it far away, a
// frog pops up and gulps it, a flamingo swoops down and carries it off, or it dives straight in with a big splash.
// And the rare surprises: a rainbow fish leaps over the pond, or a duck leads her ducklings across. Each returns how
// long it takes. With reduced motion the odd one simply fades and the surprises are skipped.
import type { Exit, Surprise } from '../rules/play.ts';
import { calm, element } from '../ui.ts';

/** A big emoji floating over everything, at a viewport position. */
function sprite(glyph: string, x: number, y: number, size: number): HTMLElement {
  const made = element('div', 'sprite');
  made.textContent = glyph;
  made.style.left = `${x}px`;
  made.style.top = `${y}px`;
  made.style.fontSize = `${size}px`;
  made.setAttribute('aria-hidden', 'true');
  document.body.append(made);
  return made;
}

const gone = (target: Element, ms: number): void => {
  window.setTimeout(() => target.remove(), ms);
};

/** A splash where something lands: a ring of ripples and a few drops, or a big one with more of everything. */
export function splash(x: number, y: number, big = false): void {
  const ring = element('div', big ? 'splash splash-big' : 'splash');
  ring.style.left = `${x}px`;
  ring.style.top = `${y}px`;
  const drops = big ? 10 : 6;
  for (let drop = 0; drop < drops; drop += 1) {
    const one = element('span', 'drop');
    one.style.setProperty('--angle', `${(drop * 360) / drops + 15}deg`);
    ring.append(one);
  }
  document.body.append(ring);
  gone(ring, 1100);
}

interface Spot {
  pad: HTMLElement;
  plate: HTMLElement;
  box: DOMRect;
  pond: DOMRect;
  /** The middle of the pad. */
  x: number;
  y: number;
  /** The pad is on the left half of the pond. */
  left: boolean;
}

function bounce({ pad, plate, box, pond, x, y, left }: Spot): number {
  const fly = 620;
  pad.querySelector('.leaf')?.classList.add('spring');
  const landX = left ? pond.right - 40 : pond.left + 40;
  const landY = pond.top + pond.height * 0.82;
  const spin = left ? 540 : -540;
  plate.animate(
    [
      { transform: 'translate(0, 0) rotate(0deg) scale(1)' },
      { transform: `translate(0, ${box.height * 0.12}px) scale(1.05, 0.8)`, offset: 0.12 },
      { transform: `translate(${(landX - x) * 0.5}px, ${-Math.max(160, box.height * 1.6)}px) rotate(${spin * 0.6}deg) scale(0.9)`, offset: 0.55 },
      { transform: `translate(${landX - x}px, ${landY - y}px) rotate(${spin}deg) scale(0.35)`, opacity: 0.9 },
    ],
    { duration: fly, easing: 'cubic-bezier(0.3, 0.7, 0.5, 1)', fill: 'forwards' },
  );
  window.setTimeout(() => splash(landX, landY), fly);
  return fly + 200;
}

function frog({ plate, box, x, y, left }: Spot): number {
  const size = Math.max(56, box.width * 0.62);
  const frogX = x + (left ? 1 : -1) * box.width * 0.78;
  const one = sprite('🐸', frogX, y + box.height * 0.1, size);
  one.animate(
    [
      { transform: 'translate(-50%, 40%) scale(0.4)', opacity: 0 },
      { transform: 'translate(-50%, -50%) scale(1)', opacity: 1, offset: 0.18 },
      { transform: 'translate(-50%, -50%) scale(1)', offset: 0.45 },
      { transform: 'translate(-50%, -50%) scale(1.35, 0.8)', offset: 0.55 },
      { transform: 'translate(-50%, -50%) scale(1)', offset: 0.7 },
      { transform: 'translate(-50%, 40%) scale(0.5)', opacity: 0 },
    ],
    { duration: 1300, easing: 'ease-in-out', fill: 'forwards' },
  );
  gone(one, 1300);
  // Slurped in, tumbling, as the frog opens wide.
  plate.animate(
    [
      { transform: 'translate(0, 0) scale(1)' },
      { transform: 'translate(0, 0) scale(1)', offset: 0.3 },
      { transform: `translate(${frogX - x}px, ${box.height * 0.05}px) scale(0.12) rotate(${left ? 200 : -200}deg)`, opacity: 0.6 },
    ],
    { duration: 650, easing: 'ease-in', fill: 'forwards' },
  );
  window.setTimeout(() => splash(frogX, y + box.height * 0.35), 1150);
  return 1300;
}

function bird({ plate, box, pond, x, y, left }: Spot): number {
  const size = Math.max(60, box.width * 0.7);
  const fromX = left ? pond.right + 40 : pond.left - 40;
  const awayX = left ? pond.left - 80 : pond.right + 80;
  const top = y - box.height * 0.55;
  const one = sprite('🦩', fromX, pond.top - 40, size);
  // The flamingo faces right as most tablets draw it, so it turns round when it flies to the left.
  const face = awayX > x ? 'scaleX(1)' : 'scaleX(-1)';
  one.animate(
    [
      { left: `${fromX}px`, top: `${pond.top - 40}px`, transform: `translate(-50%, -50%) ${face}` },
      { left: `${x}px`, top: `${top}px`, transform: `translate(-50%, -50%) ${face}`, offset: 0.4 },
      { left: `${x}px`, top: `${top + 10}px`, transform: `translate(-50%, -50%) ${face}`, offset: 0.5 },
      { left: `${awayX}px`, top: `${pond.top - 80}px`, transform: `translate(-50%, -50%) ${face} scale(0.7)` },
    ],
    { duration: 1300, easing: 'ease-in-out', fill: 'forwards' },
  );
  gone(one, 1300);
  plate.animate(
    [
      { transform: 'translate(0, 0) scale(1)' },
      { transform: 'translate(0, 0) scale(1)', offset: 0.48 },
      { transform: `translate(0, ${-box.height * 0.2}px) scale(0.8)`, offset: 0.58 },
      { transform: `translate(${awayX - x}px, ${pond.top - 40 - y}px) scale(0.45) rotate(${left ? -30 : 30}deg)` },
    ],
    { duration: 1300, easing: 'ease-in-out', fill: 'forwards' },
  );
  return 1350;
}

function dive({ plate, box, x, y }: Spot): number {
  plate.animate(
    [
      { transform: 'translate(0, 0) scale(1)' },
      { transform: `translate(0, ${-box.height * 0.45}px) scale(1.05) rotate(-10deg)`, offset: 0.35 },
      { transform: `translate(0, ${-box.height * 0.5}px) rotate(180deg)`, offset: 0.5 },
      { transform: `translate(0, ${box.height * 0.25}px) scale(0.2) rotate(180deg)`, opacity: 0 },
    ],
    { duration: 700, easing: 'ease-in', fill: 'forwards' },
  );
  window.setTimeout(() => splash(x, y, true), 600);
  return 950;
}

const EXITS: Record<Exit, (spot: Spot) => number> = { bounce, frog, bird, dive };

/** Sends the odd one off its pad one of the four ways, and says how long it takes. */
export function playExit(exit: Exit, pad: HTMLElement, stage: HTMLElement): number {
  const plate = pad.querySelector<HTMLElement>('.plate');
  if (!plate) return 0;
  if (calm()) {
    plate.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 300, fill: 'forwards' });
    return 300;
  }
  const box = pad.getBoundingClientRect();
  const pond = stage.getBoundingClientRect();
  const x = box.left + box.width / 2;
  const y = box.top + box.height / 2;
  return EXITS[exit]({ pad, plate, box, pond, x, y, left: x - pond.left < pond.width / 2 });
}

/** A rare surprise across the pond. It doesn't hold up play. */
export function playSurprise(kind: Surprise, stage: HTMLElement): void {
  if (calm()) return;
  const pond = stage.getBoundingClientRect();
  if (kind === 'fish') {
    const arc = element('div', 'rainbow');
    arc.style.left = `${pond.left + pond.width * 0.12}px`;
    arc.style.top = `${pond.top + pond.height * 0.3}px`;
    arc.style.width = `${pond.width * 0.76}px`;
    arc.style.height = `${pond.width * 0.38}px`;
    document.body.append(arc);
    gone(arc, 2200);
    const one = sprite('🐠', pond.left + pond.width * 0.12, pond.top + pond.height * 0.72, 54);
    const steps = 8;
    one.animate(
      Array.from({ length: steps + 1 }, (_, at) => {
        const t = at / steps;
        return {
          left: `${pond.left + pond.width * (0.12 + 0.76 * t)}px`,
          top: `${pond.top + pond.height * 0.72 - Math.sin(Math.PI * t) * pond.height * 0.45}px`,
          transform: `translate(-50%, -50%) rotate(${-50 + 100 * t}deg)`,
        };
      }),
      { duration: 1600, easing: 'linear', fill: 'forwards' },
    );
    window.setTimeout(() => splash(pond.left + pond.width * 0.12, pond.top + pond.height * 0.72), 20);
    window.setTimeout(() => splash(pond.left + pond.width * 0.88, pond.top + pond.height * 0.72), 1600);
    gone(one, 1650);
    return;
  }
  // The duck leads her ducklings from right to left, the way they face.
  const row = sprite('🦆 🐤 🐤 🐤', pond.right + 10, pond.bottom - 34, 34);
  row.classList.add('ducks');
  row.animate([{ transform: 'translate(0, -50%)' }, { transform: `translate(calc(-100% - ${pond.width + 30}px), -50%)` }], { duration: 4200, easing: 'linear', fill: 'forwards' });
  gone(row, 4250);
}
