import { describe, expect, it } from 'vitest';
import { itemNote, melody } from './notes.ts';
import { makeTrain, seededRng, type Train } from './pattern.ts';

const apple = { emoji: '🍎', name: 'apple' };
const banana = { emoji: '🍌', name: 'banana' };
const pear = { emoji: '🍐', name: 'pear' };

function train(cars: Train['cars']): Train {
  return { ...makeTrain(1, seededRng(3)), cars };
}

describe('item notes', () => {
  it('gives each item on the train its own note, the same every time', () => {
    const abab = train([apple, banana, apple, banana]);
    expect(itemNote(abab, apple)).not.toBe(itemNote(abab, banana));
    expect(melody(abab)).toEqual([itemNote(abab, apple), itemNote(abab, banana), itemNote(abab, apple), itemNote(abab, banana)]);
  });

  it('sings the pattern, so a repeat sounds like a repeat', () => {
    for (let seed = 0; seed < 30; seed++) {
      const made = makeTrain(3, seededRng(seed));
      const tune = melody(made);
      expect(tune.slice(3, 6)).toEqual(tune.slice(0, 3));
    }
  });

  it('gives an item that is not on the train a lower note of its own', () => {
    const abab = train([apple, banana, apple, banana]);
    const onTrain = [itemNote(abab, apple), itemNote(abab, banana)];
    expect(itemNote(abab, pear)).toBeLessThan(Math.min(...onTrain));
  });
});
