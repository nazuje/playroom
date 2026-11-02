import type { Level } from './level.ts';
import { newRun, step, type Input } from './sim.ts';
import { HERO_H, TILE } from './tuning.ts';

/** One held set of buttons in a demonstration, for this many ticks. */
export interface DemoMove {
  ticks: number;
  dir: Input['dir'];
  jump?: boolean;
  dash?: boolean;
}

/**
 * A move shown without words: a see-through hero plays it on the real tower before the first press.
 * The ghost starts standing on the ledge this many rows above the floor.
 */
export interface Demo {
  from: { x: number; rowsUp: number };
  moves: DemoMove[];
}

export interface GhostFrame {
  x: number;
  y: number;
  facing: 1 | -1;
  vx: number;
  vy: number;
  ground: boolean;
  sliding: boolean;
  dashing: boolean;
  kicked: boolean;
}

/** The ghost's path, tick by tick, played by the game's own rules so it can never show a move that fails. */
export function ghostPath(level: Level, demo: Demo): GhostFrame[] {
  const run = newRun(level);
  run.x = demo.from.x;
  run.y = (level.rows - 1 - demo.from.rowsUp) * TILE - HERO_H;
  const frames: GhostFrame[] = [];
  for (const move of demo.moves) {
    for (let tick = 0; tick < move.ticks; tick += 1) {
      const wallBefore = run.lastWall;
      step(level, run, { dir: move.dir, jump: move.jump ?? false, dash: move.dash ?? false });
      frames.push({
        x: run.x,
        y: run.y,
        facing: run.facing,
        vx: run.vx,
        vy: run.vy,
        ground: run.ground,
        sliding: run.sliding,
        dashing: run.dashLeft > 0,
        kicked: run.lastWall !== 0 && run.lastWall !== wallBefore,
      });
      if (run.phase === 'singed' || run.phase === 'won') return frames;
    }
  }
  return frames;
}
