import { burst, playSound, say } from '@playroom/kit';
import type { Animal, Region } from '../data/types.ts';
import { CLUE_COUNT, MOST_STARS, mostStarsFor, pickRound, starsFor } from '../game/score.ts';
import type { AnimalWords, Text } from '../lang/en.ts';
import { text } from '../lang/index.ts';
import { bigButton, centerOf, el, tapSound } from './dom.ts';
import { animalPicture } from './photo.ts';
import { speakerButton } from './speech.ts';

export interface GuessOptions {
  /** Called with the stars an animal earned, 0 to 3. */
  onStars: (stars: number) => void;
}

/** A clue can't follow the last one sooner than this, so a mash doesn't spend every clue at once. */
const CLUE_GAP_MS = 700;
/**
 * A button that appears where one was just pressed waits this long, so a mash
 * can't skip a reveal, or answer the next animal before its first clue.
 */
const NEXT_SETTLE_MS = 600;
/** The finish screen ignores taps this long, so a mash can't skip it. */
const FINISH_SETTLE_MS = 700;
/** After this long with no tap in a round, the next step starts to pulse. */
const NUDGE_AFTER_MS = 8000;

interface Result {
  animal: Animal;
  stars: number;
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

/** A row of three stars, lit for the ones earned. No stars at all shows a light bulb: now you know. */
function starRow(stars: number, label: string, className: string): HTMLElement {
  const row = el('div', { className, attrs: { role: 'img', 'aria-label': label } });
  if (stars === 0) {
    row.append(el('span', { className: 'star-bulb', text: '💡' }));
    return row;
  }
  for (let index = 0; index < MOST_STARS; index++) {
    row.append(el('span', { className: index < stars ? 'star lit' : 'star', text: '⭐' }));
  }
  return row;
}

/**
 * "Who lives here?": a round of mystery animals. Clues appear one by one, and
 * the stars an animal earns depend on how many clues the family needed. The
 * game lives as long as the place is open, so switching tabs or language keeps it.
 */
export function createGuessGame(region: Region, { onStars }: GuessOptions) {
  const seen = new Set<string>();
  let round = pickRound(region.animals, seen);
  let position = 0;
  let cluesShown = 1;
  let outcome: number | null = null;
  let results: Result[] = [];
  let finished = false;
  let lastClueAt = 0;
  let container: HTMLElement | null = null;
  let nudgeTimer: ReturnType<typeof setTimeout> | undefined;

  const animal = () => round[position];
  const words = () => text();
  const said = () => words().animal(region, animal());

  function nudgeLater() {
    clearTimeout(nudgeTimer);
    container?.querySelector('.nudge')?.classList.remove('nudge');
    nudgeTimer = setTimeout(() => container?.querySelector('[data-next-step]')?.classList.add('nudge'), NUDGE_AFTER_MS);
  }

  function markNextStep(target: HTMLElement) {
    container?.querySelectorAll('[data-next-step]').forEach((node) => node.removeAttribute('data-next-step'));
    target.dataset.nextStep = '';
    nudgeLater();
  }

  /** "Who am I?" and the first clue, after whatever is already being said if queue is set. */
  function speakStart(queue: boolean) {
    void say(words().whoAmI, { queue });
    void say(said().clues[0], { queue: true });
  }

  function nextAnimal() {
    tapSound();
    if (position === round.length - 1) {
      finish();
      return;
    }
    position += 1;
    cluesShown = 1;
    outcome = null;
    draw();
    speakStart(false);
  }

  function finish() {
    finished = true;
    const total = results.reduce((sum, result) => sum + result.stars, 0);
    draw();
    playSound('tada');
    void say(words().cheer(total));
    const card = container?.querySelector('.finish');
    if (!card) return;
    const { x, y } = centerOf(card);
    [0, 220, 440, 660].forEach((delay, index) => {
      setTimeout(() => burst(x + (index % 2 ? 70 : -70), y - 40 + index * 20, 24), delay);
    });
  }

  function playAgain() {
    tapSound();
    for (const met of round) seen.add(met.id);
    round = pickRound(region.animals, seen);
    position = 0;
    cluesShown = 1;
    outcome = null;
    results = [];
    finished = false;
    draw();
    speakStart(false);
  }

  function drawFinish(host: HTMLElement) {
    const w = words();
    const total = results.reduce((sum, result) => sum + result.stars, 0);
    const most = mostStarsFor(round.length);
    const again = bigButton(w.playAgain, playAgain, 'btn-next finish-again', FINISH_SETTLE_MS);
    host.replaceChildren(
      el('div', { className: 'finish' }, [
        el('h3', { className: 'finish-title', text: w.finishTitle }),
        el('div', { className: 'finish-total', attrs: { role: 'img', 'aria-label': w.finishStars(total, most) } }, [
          el('span', { className: 'finish-star', text: '⭐', attrs: { 'aria-hidden': 'true' } }),
          el('span', { className: 'finish-count', text: String(total), attrs: { 'aria-hidden': 'true' } }),
          el('span', { className: 'finish-most', text: `/ ${most}`, attrs: { 'aria-hidden': 'true' } }),
        ]),
        el(
          'ul',
          { className: 'finish-animals' },
          results.map(({ animal: met, stars }) =>
            el('li', { className: 'finish-animal' }, [
              el('span', { className: 'finish-emoji', text: met.emoji, attrs: { 'aria-hidden': 'true' } }),
              starRow(stars, `${w.animal(region, met).name}: ${w.stars(stars)}`, 'finish-animal-stars'),
            ]),
          ),
        ),
        again,
      ]),
    );
    markNextStep(again);
  }

  function drawAnimal(host: HTMLElement) {
    const w = words();
    const current = animal();
    const lines = said();

    const { face: front, showShadow } = mysteryFace(current, w);
    const back = revealFace(current, lines, w);
    const card = el('div', { className: 'flip-card guess-card' }, [
      el('div', { className: 'flip-inner' }, [front, back]),
    ]);
    const clues = el(
      'ol',
      { className: 'clues', attrs: { 'aria-live': 'polite' } },
      lines.clues.slice(0, cluesShown).map((clue, index) => clueItem(clue, index, w)),
    );
    const actions = el('div', { className: 'guess-actions' });
    const progress = el('p', { className: 'guess-progress', text: w.progress(position + 1, round.length) });
    const guess = el('div', { className: 'guess' }, [progress, card, clues, actions]);

    const showCard = () => {
      guess.classList.add('is-revealed');
      card.classList.add('is-flipped');
      back.removeAttribute('aria-hidden');
      front.setAttribute('aria-hidden', 'true');
    };
    const showNext = (stars: number) => {
      const isLast = position === round.length - 1;
      const next = bigButton(isLast ? w.toFinish : w.nextAnimal, nextAnimal, 'btn-next', NEXT_SETTLE_MS);
      actions.replaceChildren(starRow(stars, w.outcome(stars), 'outcome-stars'), next);
      markNextStep(next);
    };

    const gotIt = bigButton('', () => reveal(true), 'btn-star', NEXT_SETTLE_MS);
    const showMe = bigButton(w.reveal, () => reveal(false), 'btn-reveal', NEXT_SETTLE_MS);
    const labelGotIt = () => {
      const worth = starsFor(cluesShown, true);
      gotIt.textContent = `${w.gotIt} ${'⭐'.repeat(worth)}`;
      gotIt.setAttribute('aria-label', w.gotItLabel(worth));
    };
    const nextClue = bigButton(w.nextClue, () => {
      if (cluesShown >= CLUE_COUNT || performance.now() - lastClueAt < CLUE_GAP_MS) return;
      lastClueAt = performance.now();
      clues.append(clueItem(lines.clues[cluesShown], cluesShown, w));
      cluesShown += 1;
      playSound('pop');
      void say(lines.clues[cluesShown - 1]);
      labelGotIt();
      if (cluesShown >= CLUE_COUNT) outOfClues();
      else markNextStep(nextClue);
    }, 'btn-clue', NEXT_SETTLE_MS);
    function outOfClues() {
      nextClue.disabled = true;
      nextClue.textContent = w.noMoreClues;
      showShadow();
      markNextStep(showMe);
    }

    function reveal(guessed: boolean) {
      if (outcome !== null) return;
      const stars = starsFor(cluesShown, guessed);
      outcome = stars;
      results.push({ animal: current, stars });
      showCard();
      showNext(stars);
      const { x, y } = centerOf(card);
      if (stars > 0) {
        playSound('ding');
        burst(x, y, 10 + stars * 8);
        onStars(stars);
      } else {
        playSound('boing');
        burst(x, y, 8);
      }
      void say(w.outcome(stars));
      void say(w.factSpoken(lines), { queue: true });
    }

    if (outcome !== null) {
      showCard();
      showNext(outcome);
    } else {
      labelGotIt();
      actions.append(nextClue, gotIt, showMe);
      if (cluesShown >= CLUE_COUNT) outOfClues();
      else markNextStep(nextClue);
    }
    host.replaceChildren(guess);
  }

  function draw() {
    if (!container) return;
    if (finished) drawFinish(container);
    else drawAnimal(container);
  }

  return {
    /** Shows the game in this element and starts watching for a quiet moment. */
    mount(host: HTMLElement) {
      container = host;
      draw();
    },
    /** Says "Who am I?" and the first clue, after the place's own line. */
    speakStart: () => speakStart(true),
    /** Draws the game again in the current language, exactly where it was. */
    redraw: draw,
    /** Any tap in the game puts off the pulse that shows the next step. */
    noticeTap: nudgeLater,
    /** Stops the pulse timer while the game is out of sight. */
    stop() {
      clearTimeout(nudgeTimer);
      container = null;
    },
  };
}

export type GuessGame = ReturnType<typeof createGuessGame>;
