// The pond at sunrise: lily pads with a thing on each, and everything they do. The odd one gets bounced off its
// pad by a springy leaf, somersaults through the air and splashes down far away; the friends left behind dance
// together in a way that shows their rule. A thing that belongs protests, a wrong guess points at one friend it
// belongs with, and a try that runs out tumbles everyone into the water.
import { text } from '../lang/index.ts';
import type { Puzzle } from '../rules/levels.ts';
import { groupsOf, members, type Dance } from '../rules/play.ts';
import { thingKey } from '../rules/things.ts';
import { calm, element } from '../ui.ts';
import { paintOf, thingArt } from './art.ts';
import { FOOT, fit, type Fit } from './fit.ts';

export interface PondView {
  show(puzzle: Puzzle): void;
  layout(): Fit | null;
  pad(index: number): HTMLElement | null;
  onTap(listener: (index: number) => void): void;
  /** A tap on open water, away from every pad. */
  onWater(listener: () => void): void;
  /** Bounces the odd one off into the pond, and says how long that takes. */
  launch(index: number): number;
  /** A thing that belongs shakes its head, with a little ✋ above it. */
  protest(index: number): void;
  /** A thing and one friend light up together, to show they belong together. */
  link(a: number, b: number): void;
  /** The friends dance together, with a note for each beat. Says how long it takes. */
  dance(kind: Dance, beat: (step: number) => void): number;
  /** A few friends do the dance on their own, to show an idea or give a hint. */
  duet(indices: readonly number[], kind: Dance): void;
  dim(index: number): void;
  hop(index: number, delay?: number): void;
  /** Every thing tumbles into the pond, for a try that ran out. */
  sink(): void;
  /** One lotus per puzzle of the set, open for each one done. */
  lights(done: number, total: number): void;
  relabel(): void;
}

const HOP_MS = 520;
const LINK_MS = 1300;
const PROTEST_MS = 800;
const FLY_MS = 620;

export function createPond(host: HTMLElement): PondView {
  let puzzle: Puzzle | null = null;
  let tap: (index: number) => void = () => {};
  let water: () => void = () => {};
  const stage = element('div', 'water');
  const buds = element('div', 'buds');
  const board = element('div', 'board');
  stage.append(buds, board);
  host.replaceChildren(stage);
  stage.addEventListener('pointerdown', (event) => {
    if (event.button === 0 && !(event.target as Element).closest('.pad')) water();
  });

  const pads = (): HTMLElement[] => [...board.querySelectorAll<HTMLElement>('.pad')];

  /** Restarts a CSS animation on something, even if it is still running. */
  function replay(target: Element | null, className: string, ms: number, delay = 0): void {
    if (!target) return;
    const run = (): void => {
      target.classList.remove(className);
      void (target as HTMLElement).offsetWidth;
      target.classList.add(className);
      window.setTimeout(() => target.classList.remove(className), ms);
    };
    if (delay > 0) window.setTimeout(run, delay);
    else run();
  }

  function padFor(index: number): HTMLButtonElement {
    const shown = puzzle as Puzzle;
    const thing = shown.things[index];
    const made = element('button', 'pad');
    made.type = 'button';
    made.dataset.index = String(index);
    made.dataset.key = thingKey(thing);
    // Each leaf floats at its own angle, with its notch pointing somewhere different.
    made.style.setProperty('--notch', `${(shown.seed * (index + 3) * 37) % 360}deg`);
    made.style.setProperty('--glow', thing.pic === null ? paintOf(thing.color)[0] : '#ffe066');
    made.style.setProperty('--turn', String(thing.turn));
    made.style.setProperty('--bob', `${(index * 0.37) % 1.4}s`);
    const leaf = element('span', 'leaf');
    const plate = element('span', 'plate');
    plate.append(thingArt(thing, { layout: shown.layout, seed: shown.seed + index * 101 }));
    made.append(leaf, plate);
    made.addEventListener('pointerdown', (event) => {
      if (event.button === 0) tap(index);
    });
    made.addEventListener('click', (event) => {
      if (event.detail === 0) tap(index);
    });
    return made;
  }

  function label(): void {
    for (const one of pads()) one.setAttribute('aria-label', text().thing(Number(one.dataset.index) + 1));
  }

  function layout(): Fit | null {
    if (!puzzle) return null;
    // The dock sits below the pond, so the pond's own height plus the dock is the room fit.ts shares out.
    const room = host.getBoundingClientRect().height + FOOT;
    const sizes = fit(window.innerWidth, room, puzzle.things.length);
    board.style.width = `${sizes.width}px`;
    board.style.height = `${sizes.height}px`;
    board.style.setProperty('--pad', `${sizes.size}px`);
    board.dataset.shape = sizes.shape;
    pads().forEach((one, at) => {
      const [x, y] = sizes.spots[at];
      one.style.left = `${x}px`;
      one.style.top = `${y}px`;
    });
    return sizes;
  }

  /** A splash where something lands: a ring of ripples and a few drops. */
  function splash(x: number, y: number): void {
    const ring = element('div', 'splash');
    ring.style.left = `${x}px`;
    ring.style.top = `${y}px`;
    for (let drop = 0; drop < 6; drop += 1) {
      const one = element('span', 'drop');
      one.style.setProperty('--angle', `${drop * 60 + 15}deg`);
      ring.append(one);
    }
    document.body.append(ring);
    window.setTimeout(() => ring.remove(), 1000);
  }

  return {
    show(next) {
      puzzle = next;
      board.replaceChildren(...next.things.map((_, at) => padFor(at)));
      board.dataset.big = String(next.big);
      label();
      layout();
      // New friends pop up out of the water one after another.
      if (!calm()) {
        pads().forEach((one, at) => {
          one.style.setProperty('--arrive', `${at * 70}ms`);
          replay(one, 'arrive', 700 + at * 70);
        });
      }
    },
    layout,
    pad: (index) => board.querySelector(`[data-index="${index}"]`),
    onTap(next) {
      tap = next;
    },
    onWater(next) {
      water = next;
    },
    launch(index) {
      const one = board.querySelector<HTMLElement>(`[data-index="${index}"]`);
      const art = one?.querySelector<HTMLElement>('.plate');
      if (!one || !art) return 0;
      one.classList.add('launched');
      if (calm()) {
        one.classList.add('gone');
        return 300;
      }
      replay(one.querySelector('.leaf'), 'spring', 500);
      const box = one.getBoundingClientRect();
      const pond = stage.getBoundingClientRect();
      // It flies to whichever side of the pond is further away, high over the others, and splashes down there.
      const left = box.left + box.width / 2 - pond.left < pond.width / 2;
      const landX = left ? pond.right - 40 : pond.left + 40;
      const landY = pond.top + pond.height * 0.82;
      const dx = landX - (box.left + box.width / 2);
      const dy = landY - (box.top + box.height / 2);
      const spin = left ? 540 : -540;
      const flight = art.animate(
        [
          { transform: 'translate(0, 0) rotate(0deg) scale(1)' },
          { transform: `translate(0, ${box.height * 0.12}px) scale(1.05, 0.8)`, offset: 0.12 },
          { transform: `translate(${dx * 0.5}px, ${-Math.max(160, box.height * 1.6)}px) rotate(${spin * 0.6}deg) scale(0.9)`, offset: 0.55 },
          { transform: `translate(${dx}px, ${dy}px) rotate(${spin}deg) scale(0.35)`, opacity: 0.9 },
        ],
        { duration: FLY_MS, easing: 'cubic-bezier(0.3, 0.7, 0.5, 1)', fill: 'forwards' },
      );
      window.setTimeout(() => {
        flight.cancel();
        one.classList.add('gone');
        splash(landX, landY);
      }, FLY_MS);
      return FLY_MS + 200;
    },
    protest(index) {
      const one = board.querySelector<HTMLElement>(`[data-index="${index}"]`);
      if (!one) return;
      replay(one, calm() ? 'flash' : 'protest', PROTEST_MS);
      one.querySelector('.bubble')?.remove();
      const bubble = element('span', 'bubble');
      bubble.textContent = '✋';
      bubble.setAttribute('aria-hidden', 'true');
      one.append(bubble);
      window.setTimeout(() => bubble.remove(), PROTEST_MS + 300);
    },
    link(a, b) {
      for (const index of [a, b]) {
        const one = board.querySelector(`[data-index="${index}"]`);
        replay(one, 'linked', LINK_MS);
        if (!calm()) replay(one, 'hop', HOP_MS, 150);
      }
    },
    dance(kind, beat) {
      if (!puzzle) return 0;
      const friends = members(puzzle);
      const padOf = (at: number) => board.querySelector<HTMLElement>(`[data-index="${at}"]`);
      const style = calm() ? 'dance-calm' : `dance-${kind}`;
      if (kind === 'wave') {
        friends.forEach((at, step) => {
          replay(padOf(at), style, 700, step * 220);
          window.setTimeout(() => beat(step), step * 220);
        });
        return friends.length * 220 + 700;
      }
      if (kind === 'groups') {
        const groups = groupsOf(puzzle);
        let wait = 0;
        for (let round = 0; round < 2; round += 1) {
          groups.forEach((group, step) => {
            for (const at of group) replay(padOf(at), style, 560, wait);
            const note = round * groups.length + step;
            window.setTimeout(() => beat(note), wait);
            wait += 520;
          });
        }
        return wait + 300;
      }
      if (kind === 'count') {
        const most = Math.max(...friends.map((at) => puzzle?.things[at].dots ?? 0));
        for (const at of friends) {
          const one = padOf(at);
          one?.style.setProperty('--beat', '260ms');
          replay(one, style, most * 260 + 500);
        }
        for (let dot = 0; dot < most; dot += 1) window.setTimeout(() => beat(dot), dot * 260);
        return most * 260 + 600;
      }
      for (const at of friends) replay(padOf(at), style, 1100);
      [0, 2, 4].forEach((step, at) => window.setTimeout(() => beat(step), at * 160));
      return kind === 'align' ? 1500 : 1200;
    },
    duet(indices, kind) {
      const style = calm() ? 'dance-calm' : kind === 'wave' || kind === 'groups' ? 'hop' : `dance-${kind}`;
      indices.forEach((index, step) => {
        const one = board.querySelector<HTMLElement>(`[data-index="${index}"]`);
        one?.style.setProperty('--beat', '260ms');
        replay(one, style, 1400, style === 'hop' ? step * 260 : 0);
      });
    },
    dim(index) {
      board.querySelector(`[data-index="${index}"]`)?.classList.add('tried');
    },
    hop(index, delay = 0) {
      replay(board.querySelector(`[data-index="${index}"]`), 'hop', HOP_MS, delay);
    },
    sink() {
      pads().forEach((one, at) => {
        one.style.setProperty('--sink', `${at * 0.12}s`);
        one.classList.add('sunk');
      });
    },
    lights(done, total) {
      const before = Number(buds.dataset.done ?? 0);
      buds.dataset.done = String(done);
      buds.replaceChildren(
        ...Array.from({ length: total }, (_, at) => {
          const bud = element('span', at < done ? 'bud bud-on' : at === done ? 'bud bud-now' : 'bud');
          if (at < done && at >= before && done > 0) bud.classList.add('bud-pop');
          return bud;
        }),
      );
    },
    relabel: label,
  };
}
