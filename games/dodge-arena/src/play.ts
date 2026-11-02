import { say, speak } from '@playroom/kit';
import { createHud, type Hud } from './hud.ts';
import type { Controls } from './input.ts';
import { KIND_ART } from './screens.ts';
import { text } from './lang/index.ts';
import { dangersText } from './readout.ts';
import { inAir, leapCharge, leapHeight, moveToward, newRun, pressLeap, stepRun, STANDING, type Input, type Mode, type Run, type RunEvent, type Surprise } from './run.ts';
import { soundFor } from './sounds.ts';
import type { Stage } from './stages.ts';
import type { View } from './view.ts';
import { waveAt } from './waves.ts';
import { secondsUntilReach, type Kind } from './dangers.ts';

/** Just long enough to see the last bonk before the score card covers it. */
const END_PAUSE_SECONDS = 0.45;
const SURPRISE_ART: Record<Surprise, string> = { heart: '❤️', slow: '🐌', golden: '✨', ufo: '🛸' };
/** How early the jump arrow shows before a ring or beam reaches the player: about one leap, so pressing the moment it appears works. */
const JUMP_CUE_SECONDS = 0.6;

export interface PlayScreen {
  run(): Run;
  frame(seconds: number, clock: number): void;
  /** The line the 🔊 button repeats. */
  line(): string;
  label(): void;
  stop(): void;
}

export interface PlayOptions {
  mode: Mode;
  stage: Stage | null;
  hudHost: HTMLElement;
  readout: HTMLElement;
  view: View;
  controls: Controls;
  calm: () => boolean;
  /** Dangers this player has been taught, so the tip only comes once a session. */
  taught: Set<Kind>;
  onEnd: (run: Run) => void;
}

export const newSeed = (): number => Math.floor(Math.random() * 2 ** 31);

/** The whole game in the arena: reading the finger, moving the rules on and showing what happened. */
export function startPlay({ mode, stage, hudHost, readout, view, controls, calm, taught, onEnd }: PlayOptions): PlayScreen {
  const run = newRun(mode, stage, newSeed());
  const hud: Hud = createHud(hudHost, () => pressLeap(run));
  let lastLine = text().howTo;
  let ended = false;
  let endWait = END_PAUSE_SECONDS;
  let peak = 0;
  const bonks: Kind[] = [];
  let frames = 0;

  controls.onLeap(() => pressLeap(run));
  if (!taught.size) hud.callout('👆', lastLine);

  function teach(kind: Kind): void {
    if (taught.has(kind)) return;
    taught.add(kind);
    lastLine = text().teach[kind];
    hud.callout(KIND_ART[kind], lastLine);
    void say(lastLine, { queue: true });
  }

  function jumpSoon(): boolean {
    const { player } = run;
    if (run.phase !== 'play' || inAir(player)) return false;
    return run.dangers.some((danger) => {
      const left = secondsUntilReach(danger, player.x, player.z);
      return left !== null && left <= JUMP_CUE_SECONDS;
    });
  }

  function announce(art: string, line: string): void {
    lastLine = line;
    hud.callout(art, line);
    speak(line);
  }

  function waveChanged(index: number): void {
    const wave = waveAt(index * 12);
    if (wave.name) announce('🌟', text().waves[wave.name]);
    else if (!wave.debut && index > 0) hud.callout('⚡', text().faster);
  }

  function handle(event: RunEvent): void {
    soundFor(event);
    view.react(event, calm());
    if (event.type === 'bonk') bonks.push(event.kind);
    if (event.type === 'warn' && (event.kind === 'ring' || event.kind === 'beam')) hud.hintLeap();
    if (event.type === 'warn') teach(event.kind);
    else if (event.type === 'wave') waveChanged(event.index);
    else if (event.type === 'surprise') announce(SURPRISE_ART[event.kind], text().surprises[event.kind]);
    else if (event.type === 'bonk') {
      const held = view.screenAt(event.x, event.z);
      hud.bonk(held.x, held.y);
      if (run.player.hearts === 1) announce('❤️', text().lastHeart);
    }
  }

  function readInput(): Input {
    const held = controls.held();
    if (held) {
      const ground = view.groundAt(held.x, held.y);
      if (ground) return moveToward(run.player, ground.x, ground.z);
    }
    const keys = controls.keys();
    return keys ? { moveX: keys.x, moveZ: keys.z } : STANDING;
  }

  function publish(draws: number): void {
    const { dataset } = readout;
    const { player } = run;
    dataset.phase = run.phase;
    dataset.mode = run.mode;
    dataset.stage = String(run.stage?.id ?? 0);
    dataset.goal = String(run.stage?.goal ?? 0);
    dataset.clock = run.clock.toFixed(3);
    dataset.hearts = String(player.hearts);
    dataset.hits = String(run.hits);
    dataset.bonks = bonks.join(',');
    dataset.player = [player.x, player.z, leapHeight(player.air), player.air].map((value) => value.toFixed(3)).join(',');
    dataset.leapReady = String(leapCharge(player) >= 1);
    dataset.jumpCue = String(jumpSoon());
    dataset.dangers = dangersText(run.dangers);
    dataset.pickups = run.pickups.map(({ x, z, kind }) => `${kind}:${x.toFixed(2)}:${z.toFixed(2)}`).join(',');
    dataset.camera = view.cameraMatrix().join(',');
    dataset.draws = String(draws);
    dataset.drawsPeak = String(peak);
    dataset.dangerCount = String(run.dangers.length);
    dataset.frames = String(frames);
  }

  return {
    run: () => run,
    frame(seconds, clock) {
      frames += 1;
      if (run.phase === 'play') stepRun(run, readInput(), seconds);
      else stepRun(run, STANDING, seconds);
      for (const event of run.events) handle(event);
      run.events.length = 0;
      view.update(run, clock, seconds, calm());
      hud.update(run, seconds);
      const cue = jumpSoon();
      hud.cueJump(cue ? view.screenAt(run.player.x, run.player.z) : null);
      const draws = view.draws();
      peak = Math.max(peak, draws);
      publish(draws);
      if (run.phase !== 'play' && !ended) {
        endWait -= seconds;
        controls.onLeap(null);
        if (endWait <= 0) {
          ended = true;
          onEnd(run);
        }
      }
    },
    line: () => lastLine,
    label: () => hud.label(),
    stop() {
      controls.onLeap(null);
      hud.dispose();
    },
  };
}
