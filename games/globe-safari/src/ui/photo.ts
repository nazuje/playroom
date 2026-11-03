import type { Animal } from '../data/types.ts';
import { findPhoto } from '../photos.ts';
import { el } from './dom.ts';

/**
 * A picture frame that shows the animal's big emoji right away, then swaps in
 * the Wikipedia photo if one loads. If it never does, the emoji stays.
 */
export function animalPicture(animal: Animal, name: string): HTMLElement {
  const frame = el('div', { className: 'animal-picture' }, [
    el('span', { className: 'animal-picture-emoji', text: animal.emoji, attrs: { 'aria-hidden': 'true' } }),
  ]);

  void findPhoto(animal.wikiTitle).then((src) => {
    if (!src) return;
    const img = el('img', { attrs: { alt: name, decoding: 'async', referrerpolicy: 'no-referrer' } });
    img.addEventListener('load', () => frame.classList.add('has-photo'));
    img.addEventListener('error', () => img.remove());
    img.src = src;
    frame.append(img);
  });

  return frame;
}

/** Starts fetching every photo for a region so they are ready when needed. */
export function preloadPhotos(animals: readonly Animal[]): void {
  for (const animal of animals) void findPhoto(animal.wikiTitle);
}
