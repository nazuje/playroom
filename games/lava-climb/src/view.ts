import { drawFish, makeLava, type LavaArt } from './art/lava.ts';
import { Bits } from './art/fx.ts';
import { drawHero } from './art/hero.ts';
import { backdropSprite, rockLip, tileSprites } from './art/sprites.ts';
import { cameraStep, cameraTarget } from './camera.ts';
import { cell, lavaAt, moverAt, rockAt, ROCK_SIZE, type Level } from './level.ts';
import { type Run } from './sim.ts';
import { AIR, BELT_LEFT, BELT_RIGHT, CRUMBLE, ROCK } from './tiles.ts';
import { COLS, HERO_H, HERO_W, RULES, TILE } from './tuning.ts';
import type { World } from './worlds.ts';

/** The tower always shows at least this many rows, so a phone on its side can still see ahead. */
const MIN_ROWS = 18;
const MAX_PIXEL_RATIO = 2;
const SHIMMER_BAND = 140;
const SHIMMER_STRIP = 6;
const BACKDROP_HEIGHT = 400;

export interface Flourish {
  fishAge: number | null;
  fishX: number;
  singedFor: number;
  shake: number;
}

export interface View {
  bits: Bits;
  resize: () => void;
  snap: (run: Run) => void;
  draw: (run: Run, flourish: Flourish, seconds: number, time: number) => void;
  lavaVisible: (run: Run) => boolean;
}

export function createView(canvas: HTMLCanvasElement, level: Level, world: World, calm: boolean): View | null {
  const context = canvas.getContext('2d', { alpha: false });
  if (!context) return null;
  const c = context;
  const bits = new Bits();
  const worldHeight = level.rows * TILE;
  let width = 1;
  let height = 1;
  let tile = 20;
  let scale = 1;
  let left = 0;
  let top = 0;
  let tiles = tileSprites(tile, world);
  let lip = rockLip(tile, world);
  let backdrop = backdropSprite(16, 16, world);
  let outside = backdropSprite(16, 16, world);
  let lava: LavaArt = makeLava(1, 1, 1, calm, () => true);
  let ratio = Math.min(window.devicePixelRatio || 1, MAX_PIXEL_RATIO);
  let slowFrames = 0;
  let lively = true;

  function resize(): void {
    const box = canvas.getBoundingClientRect();
    width = Math.max(1, Math.round(box.width * ratio));
    height = Math.max(1, Math.round(box.height * ratio));
    canvas.width = width;
    canvas.height = height;
    tile = Math.max(8, Math.floor(Math.min(width / COLS, height / MIN_ROWS)));
    scale = tile / TILE;
    left = Math.round((width - COLS * tile) / 2);
    tiles = tileSprites(tile, world);
    lip = rockLip(tile, world);
    backdrop = backdropSprite(COLS * tile, BACKDROP_HEIGHT * scale, world);
    outside = backdropSprite(left > 0 ? left + 8 : 8, BACKDROP_HEIGHT * scale, { ...world, brick: world.rockDark, brickLine: world.skyTop });
    lava = makeLava(COLS * tile, height, scale, calm, () => lively);
  }

  const viewHeight = (): number => height / scale;

  function snap(run: Run): void {
    top = cameraTarget(run.y, viewHeight(), worldHeight);
    bits.clear();
  }

  function drawBackdrop(lavaY: number, time: number): void {
    const size = backdrop.height;
    const shift = -((top * 0.6 * scale) % size);
    for (let y = shift; y < height; y += size) c.drawImage(backdrop, left, Math.round(y));
    if (calm || !lively) return;
    // Heat shimmer: the wall just above the lava is redrawn in thin strips, each nudged sideways.
    const band = SHIMMER_BAND * scale;
    const bottom = Math.min(height, Math.round(lavaY));
    const first = Math.max(0, Math.round(lavaY - band));
    const strip = Math.max(2, Math.round(SHIMMER_STRIP * scale));
    for (let y = first; y < bottom; y += strip) {
      const near = 1 - (lavaY - y) / band;
      const nudge = Math.round(Math.sin(y * 0.09 / scale + time * 7) * near * 2.4 * scale);
      const from = ((y - shift) % size + size) % size;
      const piece = Math.min(strip, size - from);
      c.drawImage(backdrop, 0, from, COLS * tile, piece, left + nudge, y, COLS * tile, piece);
    }
  }

  function drawOutside(): void {
    if (left <= 0) return;
    c.fillStyle = world.rockDark;
    c.fillRect(0, 0, left, height);
    c.fillRect(left + COLS * tile, 0, width - left - COLS * tile, height);
    const size = outside.height;
    const shift = -((top * scale) % size);
    for (let y = shift; y < height; y += size) {
      c.drawImage(outside, left - outside.width, Math.round(y));
      c.drawImage(outside, left + COLS * tile, Math.round(y));
    }
  }

  function crumbleOffset(run: Run, col: number, row: number): number | null {
    const index = level.crumbleIndex[row * COLS + col]!;
    const stepped = run.crumbled[index]!;
    if (stepped === 0) return 0;
    const age = run.tick - stepped;
    if (age >= RULES.crumbleHold + RULES.crumbleBack) return 0;
    if (age >= RULES.crumbleHold) return null;
    return Math.sin(age * 1.4) * 1.2 * scale;
  }

  function drawTiles(run: Run, time: number): void {
    const firstRow = Math.max(0, Math.floor(top / TILE));
    const lastRow = Math.min(level.rows - 1, Math.floor((top + viewHeight()) / TILE));
    const offsetY = Math.round(-top * scale);
    for (let row = firstRow; row <= lastRow; row += 1) {
      for (let col = 0; col < COLS; col += 1) {
        const kind = cell(level, col, row);
        if (kind === AIR) continue;
        const x = left + col * tile;
        const y = row * tile + offsetY;
        if (kind === CRUMBLE) {
          const shake = crumbleOffset(run, col, row);
          if (shake === null) continue;
          c.drawImage(tiles.get(kind)!, Math.round(x + shake), y);
          continue;
        }
        const art = tiles.get(kind);
        if (art) c.drawImage(art, x, y);
        if ((kind === ROCK) && cell(level, col, row - 1) === AIR) c.drawImage(lip, x, y);
        if (kind === BELT_LEFT || kind === BELT_RIGHT) drawBelt(x, y, kind === BELT_RIGHT ? 1 : -1, time);
      }
    }
  }

  function drawBelt(x: number, y: number, way: number, time: number): void {
    c.fillStyle = '#ffd25a';
    const gap = tile / 2;
    const shift = calm ? 0 : ((time * way * tile * 1.6) % gap + gap) % gap;
    for (let at = -gap; at < tile; at += gap) {
      const from = Math.max(0, at + shift);
      const to = Math.min(tile, at + shift + tile * 0.2);
      if (to > from) c.fillRect(x + from, y + tile * 0.14, to - from, tile * 0.16);
    }
  }

  function inWorld(): void {
    c.setTransform(scale, 0, 0, scale, left, -top * scale);
  }

  function inPixels(): void {
    c.setTransform(1, 0, 0, 1, 0, 0);
  }

  function drawMovers(run: Run): void {
    for (const mover of level.movers) {
      const { x, y } = moverAt(mover, run.tick);
      c.fillStyle = world.rockDark;
      c.fillRect(x, y + 3, mover.w, 6);
      c.fillStyle = world.accent;
      c.fillRect(x, y, mover.w, 4);
      c.fillStyle = '#10131a';
      for (let at = 6; at < mover.w; at += 12) c.fillRect(x + at, y + 5, 3, 3);
    }
  }

  function drawRocks(run: Run, time: number): void {
    for (const dropper of level.droppers) {
      const rock = rockAt(dropper, run.tick);
      const mid = dropper.x + ROCK_SIZE / 2;
      if (rock.warning > 0 || rock.falling) {
        const size = rock.falling ? 1 : 0.4 + rock.warning * 0.6;
        c.fillStyle = 'rgba(10, 4, 12, 0.6)';
        c.beginPath();
        c.ellipse(mid, dropper.floor + 1, 10 * size, 3 * size, 0, 0, Math.PI * 2);
        c.fill();
        c.strokeStyle = '#ff3b57';
        c.lineWidth = 1.4;
        c.beginPath();
        c.ellipse(mid, dropper.floor + 1, 11, 3.6, 0, 0, Math.PI * 2);
        c.stroke();
      }
      if (rock.landed) bits.add({ x: mid, y: dropper.floor - 2, color: world.rockTop, vx: (Math.random() - 0.5) * 80, vy: -50, gravity: 300, size: 1.6, life: 0.3 });
      const quiver = rock.warning > 0 ? Math.sin(time * 50) * rock.warning * 1.4 : 0;
      if (rock.landed) continue;
      c.fillStyle = '#20151a';
      c.beginPath();
      c.arc(mid + quiver, rock.y + ROCK_SIZE / 2, ROCK_SIZE / 2 + 1, 0, Math.PI * 2);
      c.fill();
      c.fillStyle = '#7d6a66';
      c.beginPath();
      c.arc(mid + quiver, rock.y + ROCK_SIZE / 2, ROCK_SIZE / 2 - 0.4, 0, Math.PI * 2);
      c.fill();
      c.fillStyle = '#a89490';
      c.beginPath();
      c.arc(mid + quiver - 2.5, rock.y + ROCK_SIZE / 2 - 3, 2.6, 0, Math.PI * 2);
      c.fill();
    }
  }

  function drawGems(run: Run, time: number): void {
    level.gems.forEach((gem, index) => {
      if (run.gems & (1 << index)) return;
      const bob = calm ? 0 : Math.sin(time * 4 + index) * 1.5;
      const wide = calm ? 6 : 3 + Math.abs(Math.cos(time * 3 + index)) * 3.4;
      c.fillStyle = gem.secret ? '#ffd23f' : '#ff4fd0';
      c.beginPath();
      c.moveTo(gem.x, gem.y - 7 + bob);
      c.lineTo(gem.x + wide, gem.y - 1 + bob);
      c.lineTo(gem.x, gem.y + 7 + bob);
      c.lineTo(gem.x - wide, gem.y - 1 + bob);
      c.closePath();
      c.fill();
      c.fillStyle = '#ffffff';
      c.fillRect(gem.x - 1.2, gem.y - 3.6 + bob, 2.4, 2.4);
    });
  }

  function drawExit(time: number): void {
    const { x, y, w, h } = level.exit;
    c.fillStyle = '#0e2436';
    c.fillRect(x - 3, y - 3, w + 6, h + 3);
    const pulse = calm ? 0.8 : 0.72 + Math.sin(time * 4) * 0.18;
    c.fillStyle = `rgba(90, 240, 255, ${pulse})`;
    c.fillRect(x, y, w, h);
    c.fillStyle = '#eaffff';
    c.fillRect(x + 6, y + 5, w - 12, 4);
    c.fillStyle = '#ffffff';
    c.beginPath();
    c.moveTo(x + w / 2, y + 12);
    c.lineTo(x + w / 2 + 8, y + 22);
    c.lineTo(x + w / 2 - 8, y + 22);
    c.fill();
  }

  /** Where the lava is against the whole climb, down the edge of the screen. */
  function drawGauge(run: Run): void {
    const barHeight = height * 0.5;
    const x = Math.max(4, left + COLS * tile - 8 * Math.max(1, scale));
    const y = height * 0.22;
    const barWidth = Math.max(5, 4 * scale);
    c.fillStyle = 'rgba(0, 0, 0, 0.5)';
    c.fillRect(x, y, barWidth, barHeight);
    const share = (at: number): number => Math.max(0, Math.min(1, at / worldHeight));
    const lavaShare = share(lavaAt(level, run.tick));
    c.fillStyle = '#ff6a12';
    c.fillRect(x, y + lavaShare * barHeight, barWidth, barHeight * (1 - lavaShare));
    c.fillStyle = '#4ff0c8';
    c.fillRect(x - 2, y + share(run.y) * barHeight - 2, barWidth + 4, 4);
  }

  function heroPose(run: Run, flourish: Flourish, time: number): void {
    drawHero(c, {
      x: run.x + HERO_W / 2,
      y: run.y + HERO_H + (flourish.singedFor > 0 ? -flourish.singedFor * 22 : 0),
      facing: run.facing,
      vx: run.vx,
      vy: run.vy,
      ground: run.ground,
      sliding: run.sliding,
      dashing: run.dashLeft > 0,
      singed: flourish.singedFor > 0 || run.phase === 'singed' ? Math.max(0.01, flourish.singedFor) : 0,
      bonked: run.cause === 'rock',
      time,
    });
  }

  function trackPerformance(seconds: number): void {
    if (seconds > 1 / 32) slowFrames += 1;
    else slowFrames = Math.max(0, slowFrames - 0.25);
    if (slowFrames <= 45) return;
    slowFrames = 0;
    // Old tablets: first drop the costly extras, then sharpness.
    if (lively) lively = false;
    else if (ratio > 1) {
      ratio = 1;
      resize();
    }
  }

  function draw(run: Run, flourish: Flourish, seconds: number, time: number): void {
    trackPerformance(seconds);
    top = cameraStep(top, cameraTarget(run.y, viewHeight(), worldHeight), seconds);
    bits.update(seconds);
    const lavaWorld = lavaAt(level, run.tick);
    const lavaY = (lavaWorld - top) * scale;
    const shakeY = flourish.shake > 0 && !calm ? Math.sin(time * 70) * flourish.shake * scale : 0;
    inPixels();
    c.globalCompositeOperation = 'source-over';
    c.fillStyle = world.skyTop;
    c.fillRect(0, 0, width, height);
    c.setTransform(1, 0, 0, 1, 0, Math.round(shakeY));
    drawBackdrop(lavaY, time);
    drawOutside();
    drawTiles(run, time);
    inWorld();
    drawExit(time);
    drawMovers(run);
    drawRocks(run, time);
    drawGems(run, time);
    if (flourish.singedFor === 0 && run.phase !== 'singed') heroPose(run, flourish, time);
    if (flourish.fishAge !== null) drawFish(c, flourish.fishX, lavaWorld, flourish.fishAge, time);
    inPixels();
    if (lavaY < height + 140 * scale) {
      c.save();
      c.beginPath();
      c.rect(left, 0, COLS * tile, height);
      c.clip();
      c.translate(left, 0);
      lava.draw(c, lavaY, time);
      c.restore();
    }
    inWorld();
    bits.draw(c);
    if (flourish.singedFor > 0 || run.phase === 'singed') heroPose(run, flourish, time);
    inPixels();
    drawGauge(run);
  }

  resize();
  snap({ y: level.start.y } as Run);
  return {
    bits,
    resize,
    snap,
    draw,
    lavaVisible: (run) => (lavaAt(level, run.tick) - top) * scale < height,
  };
}

