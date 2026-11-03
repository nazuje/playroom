import { burst, stopSpeaking } from '@playroom/kit';
import type { Animal, Region } from '../data/types.ts';
import type { AnimalWords, Text } from '../lang/en.ts';
import { text } from '../lang/index.ts';
import { bigButton, el, shuffle } from './dom.ts';
import { animalPicture } from './photo.ts';
import { speakerButton } from './speech.ts';

export interface GuessOptions {
  /** Called when the family says they guessed right. */
  onStar: () => void;
}

function mysteryFace(animal: Animal, words: Text): { face: HTMLElement; showShadow: () => void } {
  const shadow = el('span', { className: 'mystery-shadow', text: animal.emoji, attrs: { 'aria-hidden': 'true' } });
  const face = el('div', { className: 'flip-face flip-front mystery' }, [
    el('span', { className: 'mystery-mark', text: '?', attrs: { 'aria-hidden': 'true' } }),
    shadow,
    el('span', { className: 'mystery-caption', text: words.whoAmI }),
  ]);
  return { face, showShadow: () => face.classList.add('show-shadow') };
}

function revealFace(animal: Animal, said: AnimalWords, words: Text): HTMLElement {
  return el('div', { className: 'flip-face flip-back', attrs: { 'aria-hidden': 'true' } }, [
    animalPicture(animal, said.name),
    el('h3', { className: 'animal-name', text: `${animal.emoji} ${said.name}` }),
    el('p', { className: 'fun-fact' }, [
      el('span', { text: said.funFact }),
      speakerButton(words.factSpoken(said), words.readFact),
    ]),
  ]);
}

function clueItem(clue: string, index: number, words: Text): HTMLLIElement {
  return el('li', { className: 'clue' }, [
    el('span', { className: 'clue-number', text: String(index + 1), attrs: { 'aria-hidden': 'true' } }),
    el('span', { className: 'clue-text', text: clue }),
    speakerButton(clue, words.readClue(index + 1)),
  ]);
}

/**
 * "Who lives here?": one mystery animal at a time. Clues appear one by one,
 * then a big reveal flips the card. Parents award a star with "We got it!".
 * Returns a redraw that shows the same animal, clues and reveal in the current language.
 */
export function renderGuessGame(container: HTMLElement, region: Region, { onStar }: GuessOptions): { redraw: () => void } {
  let order = shuffle(region.animals);
  let position = 0;
  let cluesShown = 1;
  let revealed = false;

  function nextAnimal() {
    if (position === order.length - 1) {
      order = shuffle(region.animals);
      position = 0;
    } else {
      position += 1;
    }
    cluesShown = 1;
    revealed = false;
    stopSpeaking();
    draw();
  }

  function draw() {
    const words = text();
    const animal = order[position];
    const said = words.animal(region, animal);

    const { face: front, showShadow } = mysteryFace(animal, words);
    const back = revealFace(animal, said, words);
    const card = el('div', { className: 'flip-card guess-card' }, [
      el('div', { className: 'flip-inner' }, [front, back]),
    ]);
    const clues = el(
      'ol',
      { className: 'clues', attrs: { 'aria-live': 'polite' } },
      said.clues.slice(0, cluesShown).map((clue, index) => clueItem(clue, index, words)),
    );
    const actions = el('div', { className: 'guess-actions' });
    const progress = el('p', { className: 'guess-progress', text: words.progress(position + 1, order.length) });

    const showCard = () => {
      card.classList.add('is-flipped');
      back.removeAttribute('aria-hidden');
      front.setAttribute('aria-hidden', 'true');
    };
    const showNextButton = () => {
      const isLast = position === order.length - 1;
      actions.replaceChildren(bigButton(isLast ? words.playAgain : words.nextAnimal, nextAnimal, 'btn-next'));
    };

    const nextClue = bigButton(words.nextClue, () => {
      if (cluesShown >= said.clues.length) return;
      clues.append(clueItem(said.clues[cluesShown], cluesShown, words));
      cluesShown += 1;
      if (cluesShown >= said.clues.length) outOfClues();
    }, 'btn-clue');
    function outOfClues() {
      nextClue.disabled = true;
      nextClue.textContent = words.noMoreClues;
      showShadow();
    }

    const reveal = (gotIt: boolean) => {
      if (revealed) return;
      revealed = true;
      if (gotIt) onStar();
      showCard();
      const box = card.getBoundingClientRect();
      burst(box.left + box.width / 2, box.top + box.height / 2, gotIt ? 26 : 14);
      showNextButton();
    };

    if (revealed) {
      showCard();
      showNextButton();
    } else {
      if (cluesShown >= said.clues.length) outOfClues();
      actions.append(
        nextClue,
        bigButton(words.reveal, () => reveal(false), 'btn-reveal'),
        bigButton(words.gotIt, () => reveal(true), 'btn-star'),
      );
    }

    container.replaceChildren(el('div', { className: 'guess' }, [progress, card, clues, actions]));
  }

  stopSpeaking();
  draw();
  return { redraw: draw };
}
