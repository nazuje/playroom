import { say, stopSpeaking } from '@playroom/kit';
import type { Animal, Region } from '../data/types.ts';
import { text } from '../lang/index.ts';
import { el, tapSound } from './dom.ts';
import { animalPicture } from './photo.ts';
import { speakerButton } from './speech.ts';

function exploreCard(region: Region, animal: Animal, index: number, flipped: Set<number>): HTMLElement {
  const words = text();
  const said = words.animal(region, animal);
  const isFlipped = flipped.has(index);
  const back = el('div', { className: 'flip-face flip-back', attrs: { 'aria-hidden': String(!isFlipped) } }, [
    el('h3', { className: 'animal-name', text: `${animal.emoji} ${said.name}` }),
    el('p', { className: 'fun-fact' }, [el('span', { text: said.funFact })]),
    speakerButton(words.factSpoken(said), words.readAbout(said.name)),
  ]);
  const front = el('div', { className: 'flip-face flip-front', attrs: { 'aria-hidden': String(isFlipped) } }, [
    animalPicture(animal, said.name),
    el('span', { className: 'tap-hint', text: words.tapMe }),
  ]);
  const card = el(
    'div',
    {
      className: isFlipped ? 'flip-card explore-card is-flipped' : 'flip-card explore-card',
      attrs: { role: 'button', tabindex: '0', 'aria-pressed': String(isFlipped), 'aria-label': words.animalCard(index + 1) },
    },
    [el('div', { className: 'flip-inner' }, [front, back])],
  );

  const flip = () => {
    const nowFlipped = card.classList.toggle('is-flipped');
    if (nowFlipped) flipped.add(index);
    else flipped.delete(index);
    card.setAttribute('aria-pressed', String(nowFlipped));
    back.setAttribute('aria-hidden', String(!nowFlipped));
    front.setAttribute('aria-hidden', String(nowFlipped));
    tapSound();
    if (nowFlipped) void say(words.factSpoken(said));
    else stopSpeaking();
  };
  // A click, not a press: this grid scrolls, and a finger starting a scroll mustn't turn a card.
  card.addEventListener('click', flip);
  card.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      flip();
    }
  });
  return card;
}

/** "Meet them all": a grid of flip cards, one for every animal in the region. */
export function renderExploreGrid(container: HTMLElement, region: Region): { redraw: () => void } {
  // Which cards are turned over, so a change of language redraws them as they were.
  const flipped = new Set<number>();
  const draw = () => {
    container.replaceChildren(
      el(
        'div',
        { className: 'explore-grid' },
        region.animals.map((animal, index) => exploreCard(region, animal, index, flipped)),
      ),
    );
  };
  draw();
  return { redraw: draw };
}
