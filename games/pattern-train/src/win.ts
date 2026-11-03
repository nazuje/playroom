import type { Item } from './pattern.ts';
import type { Stars } from './stars.ts';

/** The level-done scene: the last train rolling along its track under the sky, cargo and all. */
export function drawWinTrain(world: HTMLElement, cars: readonly Item[]): void {
  const track = document.createElement('div');
  track.className = 'win-track';
  const rolling = document.createElement('div');
  rolling.className = 'win-train';
  const engine = document.createElement('span');
  engine.className = 'win-car win-engine';
  engine.textContent = '🚂';
  rolling.append(
    engine,
    ...cars.map((car) => {
      const wagon = document.createElement('span');
      wagon.className = 'win-car';
      wagon.textContent = car.emoji;
      return wagon;
    }),
  );
  track.append(rolling);
  world.replaceChildren(track);
}

/** Three stars, the earned ones lit and popping in one after another. */
export function drawStars(row: HTMLElement, stars: Stars, label: string): void {
  row.setAttribute('aria-label', label);
  row.replaceChildren(
    ...[1, 2, 3].map((n) => {
      const star = document.createElement('span');
      star.className = `win-star${n <= stars ? ' on' : ''}`;
      star.style.animationDelay = `${300 + n * 280}ms`;
      star.textContent = '⭐';
      star.setAttribute('aria-hidden', 'true');
      return star;
    }),
  );
}
