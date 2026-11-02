import { expect, it } from 'vitest';
import { addBest, addFail, addFinish, addSkip, canSkip, cleanProgress, emptyProgress, FAILS_BEFORE_SKIP, isOpen, nextStage, totalStars } from './progress.ts';
import { STAGES } from './stages.ts';

it('opens stages in order', () => {
  const fresh = emptyProgress();
  expect(isOpen(fresh, 1)).toBe(true);
  expect(isOpen(fresh, 2)).toBe(false);
  const one = addFinish(fresh, 1, 1);
  expect(isOpen(one, 2)).toBe(true);
  expect(isOpen(one, 3)).toBe(false);
  expect(nextStage(one)).toBe(2);
});

it('keeps your best stars and best time', () => {
  const twice = addFinish(addFinish(emptyProgress(), 1, 3), 1, 1);
  expect(twice.stars[0]).toBe(3);
  expect(totalStars(twice)).toBe(3);
  expect(addBest(addBest(emptyProgress(), 50), 20).best).toBe(50);
});

it('offers a skip after five failed tries, and the skip opens the next stage', () => {
  let progress = emptyProgress();
  for (let tries = 0; tries < FAILS_BEFORE_SKIP - 1; tries += 1) progress = addFail(progress, 1);
  expect(canSkip(progress, 1)).toBe(false);
  progress = addFail(progress, 1);
  expect(canSkip(progress, 1)).toBe(true);
  progress = addSkip(progress, 1);
  expect(isOpen(progress, 2)).toBe(true);
  expect(canSkip(progress, 1)).toBe(false);
});

it('forgets failed tries once the stage is finished', () => {
  const progress = addFinish(addFail(emptyProgress(), 2), 2, 1);
  expect(progress.fails[1]).toBe(0);
});

it('has nothing left to play when everything is done', () => {
  let progress = emptyProgress();
  for (const { id } of STAGES) progress = addFinish(progress, id, 1);
  expect(nextStage(progress)).toBeNull();
});

it('survives broken saved data', () => {
  for (const saved of [null, 3, 'x', {}, { best: 'a', stars: 'no', fails: [null], skipped: [99, 'a'] }]) {
    expect(cleanProgress(saved)).toEqual(emptyProgress());
  }
  expect(cleanProgress({ best: 12, stars: [9, 1], fails: [2], skipped: [1] })).toMatchObject({ best: 12, skipped: [1] });
  expect(cleanProgress({ stars: [9] }).stars[0]).toBe(3);
});

it('moves stars saved before beams and rings moved to stages 5 and 6', () => {
  const old = cleanProgress({ best: 30, stars: [3, 2, 1, 2, 3, 1, 0], fails: [0, 0, 0, 0, 0, 0, 4], skipped: [4] });
  expect(old.stars.slice(0, 7)).toEqual([3, 2, 3, 1, 1, 2, 0]);
  expect(old.fails[6]).toBe(4);
  expect(old.skipped).toEqual([6]);
  expect(cleanProgress(old)).toEqual(old);
});
