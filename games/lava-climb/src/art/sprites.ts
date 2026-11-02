import { BELT_LEFT, BELT_RIGHT, CRUMBLE, FAKE, GRIP, ICE, LEDGE, PAD, ROCK, SPIKE_DOWN, SPIKE_LEFT, SPIKE_RIGHT, SPIKE_UP } from '../tiles.ts';
import type { World } from '../worlds.ts';

export type Painter = (c: CanvasRenderingContext2D, size: number) => void;

export function sprite(width: number, height: number, paint: (c: CanvasRenderingContext2D) => void): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.ceil(width));
  canvas.height = Math.max(1, Math.ceil(height));
  const c = canvas.getContext('2d');
  if (c) paint(c);
  return canvas;
}

function speckle(c: CanvasRenderingContext2D, size: number, color: string, seed: number): void {
  c.fillStyle = color;
  for (let at = 0; at < 5; at += 1) {
    const x = ((at * 37 + seed * 13) % 17) / 17;
    const y = ((at * 23 + seed * 7) % 19) / 19;
    c.fillRect(x * size, y * size, size * 0.14, size * 0.08);
  }
}

function rock(c: CanvasRenderingContext2D, size: number, world: World, seed: number): void {
  c.fillStyle = world.rock;
  c.fillRect(0, 0, size, size);
  speckle(c, size, world.rockDark, seed);
  c.fillStyle = world.rockDark;
  c.fillRect(0, size * 0.92, size, size * 0.08);
  c.fillRect(size * 0.94, 0, size * 0.06, size);
}

/** The same bright lime in every world, a colour no ledge, belt or spike uses, so rough walls stand out. */
const GRIP_RUNG = '#b6ff3b';
const GRIP_SHADE = '#3d6b00';

/** Handholds: thick lime rungs with a glowing edge, unmistakable next to plain rock. */
function grip(c: CanvasRenderingContext2D, size: number, world: World): void {
  rock(c, size, world, 3);
  c.fillStyle = 'rgba(182, 255, 59, 0.22)';
  c.fillRect(0, 0, size, size);
  for (const y of [0.08, 0.42, 0.76]) {
    c.fillStyle = GRIP_SHADE;
    c.fillRect(0, size * (y + 0.04), size, size * 0.16);
    c.fillStyle = GRIP_RUNG;
    c.fillRect(0, size * y, size, size * 0.13);
  }
  c.fillStyle = GRIP_RUNG;
  c.fillRect(0, 0, size * 0.1, size);
  c.fillRect(size * 0.9, 0, size * 0.1, size);
}

function ledge(c: CanvasRenderingContext2D, size: number, world: World): void {
  c.fillStyle = world.ledge;
  c.fillRect(0, 0, size, size * 0.42);
  c.fillStyle = world.ledgeTop;
  c.fillRect(0, 0, size, size * 0.14);
  c.fillStyle = world.rockDark;
  c.fillRect(0, size * 0.42, size, size * 0.06);
  c.fillRect(size * 0.48, size * 0.14, size * 0.05, size * 0.28);
}

function crumble(c: CanvasRenderingContext2D, size: number, world: World): void {
  ledge(c, size, world);
  c.strokeStyle = '#120808';
  c.lineWidth = Math.max(1, size * 0.07);
  c.beginPath();
  c.moveTo(size * 0.1, 0);
  c.lineTo(size * 0.32, size * 0.22);
  c.lineTo(size * 0.2, size * 0.46);
  c.moveTo(size * 0.72, 0);
  c.lineTo(size * 0.62, size * 0.2);
  c.lineTo(size * 0.84, size * 0.46);
  c.stroke();
}

function ice(c: CanvasRenderingContext2D, size: number): void {
  c.fillStyle = '#9fe9ff';
  c.fillRect(0, 0, size, size * 0.42);
  c.fillStyle = '#ffffff';
  c.fillRect(0, 0, size, size * 0.16);
  c.fillRect(size * 0.2, size * 0.2, size * 0.34, size * 0.06);
  c.fillStyle = '#4fb6dc';
  c.fillRect(0, size * 0.42, size, size * 0.06);
  c.beginPath();
  c.moveTo(size * 0.3, size * 0.46);
  c.lineTo(size * 0.42, size * 0.8);
  c.lineTo(size * 0.54, size * 0.46);
  c.fill();
}

function belt(c: CanvasRenderingContext2D, size: number): void {
  c.fillStyle = '#23262e';
  c.fillRect(0, 0, size, size * 0.46);
  c.fillStyle = '#8c93a3';
  c.fillRect(0, size * 0.42, size, size * 0.06);
}

function pad(c: CanvasRenderingContext2D, size: number): void {
  c.fillStyle = '#20c46b';
  c.fillRect(size * 0.04, size * 0.32, size * 0.92, size * 0.3);
  c.fillStyle = '#9dffbf';
  c.fillRect(size * 0.04, size * 0.22, size * 0.92, size * 0.14);
  c.fillStyle = '#0f6a3a';
  c.fillRect(size * 0.2, size * 0.62, size * 0.1, size * 0.24);
  c.fillRect(size * 0.7, size * 0.62, size * 0.1, size * 0.24);
}

function spike(c: CanvasRenderingContext2D, size: number): void {
  const blade = (from: number, to: number): void => {
    const gradient = c.createLinearGradient(0, 0, 0, size);
    gradient.addColorStop(0, '#ffffff');
    gradient.addColorStop(0.5, '#ffd0d8');
    gradient.addColorStop(1, '#d4214a');
    c.fillStyle = gradient;
    c.beginPath();
    c.moveTo(size * from, size);
    c.lineTo(size * ((from + to) / 2), size * 0.14);
    c.lineTo(size * to, size);
    c.fill();
  };
  blade(0.02, 0.5);
  blade(0.5, 0.98);
}

function turned(c: CanvasRenderingContext2D, size: number, quarterTurns: number): void {
  c.translate(size / 2, size / 2);
  c.rotate((quarterTurns * Math.PI) / 2);
  c.translate(-size / 2, -size / 2);
  spike(c, size);
}

/** A tile for every kind, at this size in device pixels. Tiles are copied each frame, never redrawn. */
export function tileSprites(size: number, world: World): Map<number, HTMLCanvasElement> {
  const make = (paint: (c: CanvasRenderingContext2D) => void): HTMLCanvasElement => sprite(size, size, paint);
  return new Map<number, HTMLCanvasElement>([
    [ROCK, make((c) => rock(c, size, world, 1))],
    [GRIP, make((c) => grip(c, size, world))],
    [LEDGE, make((c) => ledge(c, size, world))],
    [CRUMBLE, make((c) => crumble(c, size, world))],
    [ICE, make((c) => ice(c, size))],
    [BELT_LEFT, make((c) => belt(c, size))],
    [BELT_RIGHT, make((c) => belt(c, size))],
    [PAD, make((c) => pad(c, size))],
    [SPIKE_UP, make((c) => spike(c, size))],
    [SPIKE_DOWN, make((c) => turned(c, size, 2))],
    [SPIKE_RIGHT, make((c) => turned(c, size, 1))],
    [SPIKE_LEFT, make((c) => turned(c, size, 3))],
    [FAKE, make((c) => {
      rock(c, size, world, 1);
      c.fillStyle = 'rgba(255, 255, 255, 0.14)';
      c.fillRect(size * 0.3, size * 0.1, size * 0.08, size * 0.8);
    })],
  ]);
}

/** The lit lip along the top of any rock with air above it. */
export function rockLip(size: number, world: World): HTMLCanvasElement {
  return sprite(size, size * 0.2, (c) => {
    c.fillStyle = world.rockTop;
    c.fillRect(0, 0, size, size * 0.12);
  });
}

function gear(c: CanvasRenderingContext2D, x: number, y: number, radius: number, color: string): void {
  c.fillStyle = color;
  c.beginPath();
  for (let tooth = 0; tooth < 24; tooth += 1) {
    const angle = (tooth / 24) * Math.PI * 2;
    const reach = tooth % 2 === 0 ? radius : radius * 0.82;
    c.lineTo(x + Math.cos(angle) * reach, y + Math.sin(angle) * reach);
  }
  c.closePath();
  c.arc(x, y, radius * 0.4, 0, Math.PI * 2, true);
  c.fill('evenodd');
}

function windowsOf(c: CanvasRenderingContext2D, world: World, width: number, height: number): void {
  if (world.id === 'clock') {
    gear(c, width * 0.25, height * 0.3, width * 0.2, world.brickLine);
    gear(c, width * 0.75, height * 0.72, width * 0.26, world.brickLine);
  } else if (world.id === 'top') {
    c.fillStyle = '#ffffff';
    for (let star = 0; star < 46; star += 1) {
      const size = 1 + (star % 3) * (width / 320);
      c.fillRect(((star * 137) % 311) / 311 * width, ((star * 89) % 397) / 397 * height, size, size);
    }
  } else if (world.id === 'ice') {
    c.strokeStyle = 'rgba(160, 230, 255, 0.28)';
    c.lineWidth = Math.max(1, width / 200);
    for (const [x, y] of [[0.2, 0.2], [0.72, 0.5], [0.36, 0.82]] as const) {
      c.beginPath();
      c.moveTo(x * width, y * height);
      c.lineTo((x + 0.08) * width, (y + 0.1) * height);
      c.lineTo((x + 0.03) * width, (y + 0.17) * height);
      c.stroke();
    }
  }
}

/** The tower's inside wall, seamless top to bottom. */
export function backdropSprite(width: number, height: number, world: World): HTMLCanvasElement {
  return sprite(width, height, (c) => {
    c.fillStyle = world.brick;
    c.fillRect(0, 0, width, height);
    c.fillStyle = world.brickLine;
    const brickH = height / 12;
    const brickW = width / 5;
    for (let row = 0; row < 12; row += 1) {
      c.fillRect(0, row * brickH, width, Math.max(1, brickH * 0.07));
      for (let col = 0; col < 6; col += 1) c.fillRect((col + (row % 2) / 2) * brickW, row * brickH, Math.max(1, brickW * 0.035), brickH);
    }
    windowsOf(c, world, width, height);
  });
}
