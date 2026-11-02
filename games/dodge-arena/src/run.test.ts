import { describe, expect, it } from 'vitest';
import type { Danger } from './dangers.ts';
import { inAir, lateLeapAt, leapCharge, leapHeight, moveToward, newRun, pressLeap, STANDING, starsOf, stepRun, type Run } from './run.ts';
import { STAGES } from './stages.ts';
import { ARENA_RADIUS, BLINK_SECONDS, HEARTS, LEAP_RECHARGE, LEAP_SECONDS, LOW_CLEARANCE, PLAYER_SPEED, STEP } from './tuning.ts';

const quiet = (run: Run): Run => {
  run.director.wait = 1e9;
  run.surpriseIn = 1e9;
  return run;
};

const meteorAt = (x: number, z: number): Danger => ({ id: 99, kind: 'meteor', phase: 'live', t: 0, warn: 1, live: 0, x, z, dx: 0, dz: 0, angle: 0, spin: 0, size: 2, speed: 0 });
const ringAt = (size: number): Danger => ({ id: 98, kind: 'ring', phase: 'live', t: 0, warn: 1, live: 0, x: 0, z: 0, dx: 0, dz: 0, angle: 0, spin: 0, size, speed: 7 });

describe('moving', () => {
  it('runs towards a held finger at full speed', () => {
    const run = quiet(newRun('endless', null, 1));
    const input = moveToward(run.player, 10, 0);
    stepRun(run, input, 1);
    expect(run.player.x).toBeGreaterThan(PLAYER_SPEED * 0.8);
    expect(run.player.z).toBeCloseTo(0, 3);
  });

  it('stops under the finger instead of jittering', () => {
    expect(moveToward({ x: 2, z: 2 }, 2.05, 2)).toEqual(STANDING);
  });

  it('stays on the arena', () => {
    const run = quiet(newRun('endless', null, 1));
    stepRun(run, { moveX: 1, moveZ: 0 }, 5);
    expect(Math.hypot(run.player.x, run.player.z)).toBeLessThanOrEqual(ARENA_RADIUS);
  });

  it('gives the same run at any frame rate', () => {
    const play = (frame: number): Run => {
      const run = newRun('endless', null, 12);
      for (let time = 0; time < 30; time += frame) stepRun(run, { moveX: 0.6, moveZ: -0.8 }, frame);
      return run;
    };
    const fast = play(1 / 120);
    const slow = play(1 / 24);
    expect(Math.abs(fast.clock - slow.clock)).toBeLessThan(0.05);
    expect(fast.dangers.map(({ id }) => id).slice(0, 3)).toEqual(slow.dangers.map(({ id }) => id).slice(0, 3));
  });
});

describe('the leap', () => {
  it('goes up, comes down and then recharges', () => {
    const run = quiet(newRun('endless', null, 1));
    pressLeap(run);
    stepRun(run, STANDING, 0.3);
    expect(inAir(run.player)).toBe(true);
    expect(leapHeight(run.player.air)).toBeGreaterThan(1);
    stepRun(run, STANDING, 0.4);
    expect(inAir(run.player)).toBe(false);
    expect(leapCharge(run.player)).toBeLessThan(0.1);
    pressLeap(run);
    stepRun(run, STANDING, 0.1);
    expect(inAir(run.player)).toBe(false);
    stepRun(run, STANDING, LEAP_RECHARGE);
    expect(leapCharge(run.player)).toBe(1);
  });

  it('throws you further than running', () => {
    const run = quiet(newRun('endless', null, 1));
    pressLeap(run);
    stepRun(run, { moveX: 1, moveZ: 0 }, LEAP_SECONDS);
    expect(run.player.x).toBeGreaterThan(PLAYER_SPEED * LEAP_SECONDS * 1.4);
  });

  it('counts a press a moment before it is ready', () => {
    const run = quiet(newRun('endless', null, 1));
    run.player.recharge = 0.08;
    pressLeap(run);
    stepRun(run, STANDING, 0.1);
    expect(inAir(run.player)).toBe(true);
  });

  it('clears a low danger for most of the jump', () => {
    const clear = Array.from({ length: 60 }, (_, at) => leapHeight((at / 60) * LEAP_SECONDS)).filter((height) => height > LOW_CLEARANCE);
    expect(clear.length / 60).toBeGreaterThan(0.8);
  });

  it('carries you over a ring when the timing is right, and not when it is wrong', () => {
    const timed = quiet(newRun('endless', null, 1));
    timed.dangers.push(ringAt(-1.7));
    stepRun(timed, STANDING, 0.1);
    pressLeap(timed);
    stepRun(timed, STANDING, 0.9);
    expect(timed.hits).toBe(0);
    const late = quiet(newRun('endless', null, 1));
    late.dangers.push(ringAt(-1.7));
    stepRun(late, STANDING, 0.9);
    expect(late.hits).toBe(1);
  });

  it('forgives a leap a moment late in the early stages, and not in the last one', () => {
    const touchedThenLeap = (stage: number): Run => {
      const run = quiet(newRun('stage', STAGES[stage] ?? null, 1));
      // The ring's edge reaches the player's feet after about 0.03 seconds.
      run.dangers.push(ringAt(-0.9));
      stepRun(run, STANDING, 0.1);
      pressLeap(run);
      stepRun(run, STANDING, 0.9);
      return run;
    };
    expect(touchedThenLeap(4).hits).toBe(0);
    expect(touchedThenLeap(11).hits).toBe(1);
    expect(lateLeapAt(1)).toBe(0);
    expect(lateLeapAt(0)).toBeLessThan(0.2);
  });
});

describe('hearts', () => {
  it('loses one with a bonk, with blink protection after it', () => {
    const run = quiet(newRun('endless', null, 1));
    run.dangers.push(meteorAt(0, 0));
    stepRun(run, STANDING, 0.05);
    expect(run.player.hearts).toBe(HEARTS - 1);
    run.dangers.push({ ...meteorAt(0, 0), id: 2 });
    stepRun(run, STANDING, 0.05);
    expect(run.player.hearts).toBe(HEARTS - 1);
    run.player.blink = 0;
    run.dangers.push({ ...meteorAt(0, 0), id: 3 });
    stepRun(run, STANDING, 0.05);
    expect(run.player.hearts).toBe(HEARTS - 2);
    expect(BLINK_SECONDS).toBeGreaterThan(1);
  });

  it('ends the run at zero hearts and stops the clock', () => {
    const run = quiet(newRun('endless', null, 1));
    run.player.hearts = 1;
    run.dangers.push(meteorAt(0, 0));
    stepRun(run, STANDING, 0.1);
    expect(run.phase).toBe('lost');
    const stopped = run.clock;
    stepRun(run, STANDING, 1);
    expect(run.clock).toBe(stopped);
  });
});

describe('stages', () => {
  const first = STAGES[0];

  it('ends when the time is up, with three stars for no bonks', () => {
    const run = quiet(newRun('stage', first ?? null, 1));
    stepRun(run, STANDING, (first?.goal ?? 0) + 0.1);
    expect(run.phase).toBe('won');
    expect(starsOf(run)).toBe(3);
  });

  it('gives fewer stars for more bonks, and none for losing', () => {
    const run = quiet(newRun('stage', first ?? null, 1));
    run.hits = 2;
    stepRun(run, STANDING, (first?.goal ?? 0) + 0.1);
    expect(starsOf(run)).toBe(1);
    const lost = quiet(newRun('stage', first ?? null, 1));
    lost.player.hearts = 1;
    lost.dangers.push(meteorAt(0, 0));
    stepRun(lost, STANDING, 0.1);
    expect(starsOf(lost)).toBe(0);
  });

  it('has twelve stages that get longer and harder', () => {
    expect(STAGES).toHaveLength(12);
    for (const [at, stage] of STAGES.entries()) {
      const before = STAGES[at - 1];
      if (!before) continue;
      expect(stage.goal).toBeGreaterThanOrEqual(before.goal);
      expect(stage.difficulty).toBeGreaterThan(before.difficulty);
    }
  });
});

describe('surprises', () => {
  function waitFor(run: Run, kinds: string[]): void {
    while (run.ufo === null && !run.pickups.length && run.golden === 0 && run.clock < 300) {
      run.player.blink = 99;
      stepRun(run, STANDING, 0.5);
      if (kinds.length === 0) break;
    }
  }

  it('turn up in an endless run, but not in a stage', () => {
    const run = newRun('endless', null, 3);
    run.player.blink = 99;
    waitFor(run, ['any']);
    expect(run.ufo !== null || run.pickups.length > 0 || run.golden > 0 || run.slow > 0).toBe(true);
    const stage = newRun('stage', STAGES[11] ?? null, 3);
    stage.player.blink = 99;
    stepRun(stage, STANDING, 59);
    expect(stage.ufo === null && stage.pickups.length === 0 && stage.golden === 0).toBe(true);
  });

  it('a heart heals one bonk but never past full', () => {
    const run = quiet(newRun('endless', null, 1));
    run.player.hearts = 2;
    run.pickups.push({ kind: 'heart', x: 0, z: 0, left: 5 });
    run.pickups.push({ kind: 'heart', x: 0, z: 0, left: 5 });
    stepRun(run, STANDING, 0.1);
    expect(run.player.hearts).toBe(3);
  });

  it('the slow orb slows the world but not the player', () => {
    const run = quiet(newRun('endless', null, 1));
    run.pickups.push({ kind: 'slow', x: 0, z: 0, left: 5 });
    run.dangers.push({ ...ringAt(20), speed: 10, x: 0 });
    stepRun(run, STANDING, 0.1);
    const size = run.dangers[0]?.size ?? 0;
    stepRun(run, { moveX: 1, moveZ: 0 }, 0.5);
    expect((run.dangers[0]?.size ?? 0) - size).toBeLessThan(3);
    expect(run.player.x).toBeGreaterThan(2.5);
  });

  it('a golden wave turns bonks into sparkles', () => {
    const run = quiet(newRun('endless', null, 1));
    run.golden = 3;
    run.dangers.push(meteorAt(0, 0));
    stepRun(run, STANDING, 0.1);
    expect(run.player.hearts).toBe(HEARTS);
  });

  it('the UFO arrives, shields the player, then leaves', () => {
    const run = quiet(newRun('endless', null, 1));
    run.ufo = { x: 15, z: 0, t: 0, shielded: false };
    stepRun(run, STANDING, 2);
    expect(run.player.shield).toBeGreaterThan(0);
    run.dangers.push(meteorAt(0, 0));
    stepRun(run, STANDING, 0.1);
    expect(run.player.hearts).toBe(HEARTS);
    stepRun(run, STANDING, 2);
    expect(run.ufo).toBeNull();
  });
});

it('a demo run never loses hearts', () => {
  const run = newRun('demo', STAGES[11] ?? null, 1);
  stepRun(run, STANDING, 30);
  expect(run.player.hearts).toBe(HEARTS);
  expect(STEP).toBeLessThan(0.02);
});
