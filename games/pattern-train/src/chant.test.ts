import { afterEach, describe, expect, it, vi } from 'vitest';
import { BEAT_MS, MAX_WORD_MS, planChant, playChant, REST_MS, type Beat } from './chant.ts';
import { en } from './lang/en.ts';
import { makeTrain, seededRng, type Train } from './pattern.ts';

function train(overrides: Partial<Train>): Train {
  return { ...makeTrain(1, seededRng(3)), ...overrides };
}

const apple = { emoji: '🍎', name: 'apple' };
const banana = { emoji: '🍌', name: 'banana' };
const blankAt = (index: number) => ({ index, answer: apple, options: [apple, banana] });
const steps = [
  { start: 0, end: 2 },
  { start: 2, end: 4 },
  { start: 4, end: 5 },
];

afterEach(() => {
  vi.useRealTimers();
});

describe('planChant', () => {
  const nextTrain = train({ cars: [apple, banana, apple, banana, apple], blanks: [blankAt(4)], steps, question: 'next' });

  it('reads each car, then asks what comes next on the empty car', () => {
    const beats = planChant(nextTrain, new Set(), en);
    expect(beats.map((beat) => beat.word)).toEqual(['apple', 'banana', 'apple', 'banana', 'What comes next?']);
    expect(beats.at(-1)?.car).toBe(4);
  });

  it('rests a little longer at the end of each repeat', () => {
    const beats = planChant(nextTrain, new Set(), en);
    expect(beats[0].ms).toBe(BEAT_MS);
    expect(beats[1].ms).toBe(BEAT_MS + REST_MS);
    expect(beats[3].ms).toBe(BEAT_MS + REST_MS);
  });

  it('gives the same item the same note, and different items different notes', () => {
    const beats = planChant(nextTrain, new Set(), en);
    expect(beats[0].pitch).toBe(beats[2].pitch);
    expect(beats[1].pitch).toBe(beats[3].pitch);
    expect(beats[0].pitch).not.toBe(beats[1].pitch);
  });

  it('leaves a silent beat for a gap in the middle, then asks what is missing', () => {
    const gappy = train({ cars: [apple, banana, apple, banana], blanks: [blankAt(1)], steps: steps.slice(0, 2), question: 'missing' });
    const beats = planChant(gappy, new Set(), en);
    expect(beats.map((beat) => beat.word)).toEqual(['apple', null, 'apple', 'banana', "What's missing?"]);
    expect(beats.at(-1)?.car).toBe(1);
  });

  it('stops at the first of two empty cars, and reads the filled one after an answer', () => {
    const twoBlanks = train({ cars: [apple, banana, apple, banana, apple], blanks: [blankAt(3), blankAt(4)], steps });
    expect(planChant(twoBlanks, new Set(), en).map((beat) => beat.car)).toEqual([0, 1, 2, 3]);
    expect(planChant(twoBlanks, new Set([3]), en).map((beat) => beat.word)).toEqual([
      'apple',
      'banana',
      'apple',
      'banana',
      'What comes next?',
    ]);
  });

  it('just reads a full train, with no question', () => {
    const words = planChant(nextTrain, new Set([4]), en).map((beat) => beat.word);
    expect(words).toEqual(['apple', 'banana', 'apple', 'banana', 'apple']);
  });
});

describe('playChant', () => {
  const beats: Beat[] = [
    { car: 0, word: 'apple', pitch: 1, ms: 500 },
    { car: 1, word: null, pitch: 1, ms: 500 },
    { car: 2, word: 'pear', pitch: 1, ms: 500 },
  ];

  function start(say: (word: string, pitch: number, done: () => void) => void) {
    vi.useFakeTimers();
    const lit: number[] = [];
    const onEnd = vi.fn();
    const stop = playChant(beats, { say, onBeat: (beat) => lit.push(beat.car), onEnd });
    return { lit, onEnd, stop };
  }

  it('moves on the beat when words finish early', () => {
    const { lit, onEnd } = start((_word, _pitch, done) => done());
    expect(lit).toEqual([0]);
    vi.advanceTimersByTime(499);
    expect(lit).toEqual([0]);
    vi.advanceTimersByTime(1);
    expect(lit).toEqual([0, 1]);
    vi.advanceTimersByTime(1000);
    expect(lit).toEqual([0, 1, 2]);
    expect(onEnd).toHaveBeenCalledOnce();
  });

  it('waits for a slow word instead of talking over it', () => {
    const finish: (() => void)[] = [];
    const { lit } = start((_word, _pitch, done) => finish.push(done));
    vi.advanceTimersByTime(900);
    expect(lit).toEqual([0]);
    finish[0]();
    expect(lit).toEqual([0, 1]);
  });

  it('keeps going if speech never reports back', () => {
    const { lit, onEnd } = start(() => undefined);
    vi.advanceTimersByTime(MAX_WORD_MS * 3);
    expect(lit).toEqual([0, 1, 2]);
    expect(onEnd).toHaveBeenCalledOnce();
  });

  it('stays quiet once stopped, even if a late word reports back', () => {
    const finish: (() => void)[] = [];
    const { lit, onEnd, stop } = start((_word, _pitch, done) => finish.push(done));
    vi.advanceTimersByTime(500);
    stop();
    finish[0]();
    vi.advanceTimersByTime(MAX_WORD_MS * 3);
    expect(lit).toEqual([0]);
    expect(onEnd).not.toHaveBeenCalled();
  });
});
