// The shared parts of the real-game bots: a built game served by `vite preview`, real touches sent
// through Chrome's own input channel, and the game's state read from ordinary data attributes.
import { spawn, spawnSync } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';
import { launchOptions } from '../../../scripts/playtest.mjs';

export const GAME = fileURLToPath(new URL('..', import.meta.url));
export const PORT = 5352;
export const BASE = `http://localhost:${PORT}/`;
export const SHOTS = join(GAME, 'e2e', 'shots');
const VITE = join(GAME, '..', '..', 'node_modules', '.bin', 'vite');

export function buildGame() {
  const built = spawnSync(VITE, ['build'], { cwd: GAME, stdio: 'pipe', encoding: 'utf8' });
  if (built.status !== 0) throw new Error(`vite build failed:\n${built.stdout}${built.stderr}`);
}

export async function serveGame() {
  const server = spawn(VITE, ['preview', '--port', String(PORT), '--strictPort'], { cwd: GAME, stdio: 'ignore' });
  for (let tries = 0; tries < 100; tries += 1) {
    if (await fetch(BASE).then(() => true, () => false)) return server;
    await new Promise((resolve) => setTimeout(resolve, 150));
  }
  server.kill();
  throw new Error(`preview did not start on ${PORT}`);
}

export async function openBrowser() {
  mkdirSync(SHOTS, { recursive: true });
  // With no graphics card a software-emulated GPU canvas crawls, so canvases are drawn the plain way here.
  return chromium.launch({ ...launchOptions, args: [...launchOptions.args, '--disable-accelerated-2d-canvas'] });
}

/** A fresh phone with this progress already saved, or a blank one. */
export async function openPhone(browser, { width = 390, height = 844, language = 'en', progress = null, reducedMotion = 'no-preference' } = {}) {
  const context = await browser.newContext({ viewport: { width, height }, hasTouch: true, isMobile: true, reducedMotion });
  await context.addInitScript(([chosen, saved]) => {
    if (sessionStorage.getItem('seeded')) return;
    sessionStorage.setItem('seeded', '1');
    localStorage.setItem('playroom:language', JSON.stringify(chosen));
    if (saved) localStorage.setItem('playroom:lava-climb:progress', JSON.stringify(saved));
  }, [language, progress]);
  const page = await context.newPage();
  const problems = [];
  page.on('console', (message) => {
    if (message.type() === 'error') problems.push(`console: ${message.text()}`);
  });
  page.on('pageerror', (error) => problems.push(`crash: ${error.message}`));
  page.on('request', (request) => {
    const { hostname, protocol } = new URL(request.url());
    if (protocol.startsWith('http') && !['localhost', 'fonts.googleapis.com', 'fonts.gstatic.com'].includes(hostname)) problems.push(`outside request: ${request.url()}`);
  });
  await page.goto(BASE);
  return { context, page, problems };
}

/** Everything is open, so one level can be played on its own. */
export const allOpen = (levels = 24) => ({ stars: new Array(levels).fill(0), best: new Array(levels).fill(0), open: levels, singes: 0, secrets: [] });

/** Fingers on the glass. One thumb moves, one jumps, one dashes, and each stays down while held. */
export class Fingers {
  constructor(session, zones) {
    this.session = session;
    this.zones = zones;
    this.held = { dir: 0, jump: false, dash: false };
    this.down = 0;
  }

  static async on(page) {
    const session = await page.context().newCDPSession(page);
    return new Fingers(session, await Fingers.readZones(page));
  }

  static readZones(page) {
    return page.evaluate(() => Object.fromEntries([...document.querySelectorAll('[data-zone]')].map((zone) => {
      const box = zone.getBoundingClientRect();
      return [zone.dataset.zone, { x: box.x + box.width / 2, y: box.y + box.height / 2 }];
    })));
  }

  points({ dir, jump, dash }) {
    const points = [];
    if (dir !== 0) points.push({ id: 1, ...this.zones[dir < 0 ? 'left' : 'right'] });
    if (jump) points.push({ id: 2, ...this.zones.jump });
    if (dash && this.zones.dash) points.push({ id: 3, ...this.zones.dash });
    return points;
  }

  set(wanted) {
    const { held } = this;
    if (held.dir === wanted.dir && held.jump === wanted.jump && held.dash === wanted.dash) return;
    const lifted = (held.jump && !wanted.jump) || (held.dash && !wanted.dash) || (held.dir !== 0 && wanted.dir === 0);
    this.held = { ...wanted };
    const touchPoints = this.points(wanted);
    // Chrome's input channel only lifts fingers all at once, so the ones staying down touch again at once.
    if (lifted) {
      this.send('touchEnd', []);
      this.down = 0;
    }
    if (touchPoints.length === 0) return;
    const type = touchPoints.length > this.down ? 'touchStart' : 'touchMove';
    this.down = touchPoints.length;
    this.send(type, touchPoints);
  }

  // Chrome answers a touch only once a frame has handled it, so the bot sends and keeps watching.
  send(type, touchPoints) {
    this.session.send('Input.dispatchTouchEvent', { type, touchPoints }).catch((e) => console.log('TOUCH', type, JSON.stringify(touchPoints), e.message));
  }

  lift() {
    return this.set({ dir: 0, jump: false, dash: false });
  }

  /** The game's state, as fast as Chrome will answer. */
  /** Lifts everything and touches down what's wanted, stamped with the moment it happens, in seconds. */
  at(stamp, wanted) {
    const touchPoints = this.points(wanted);
    if (this.down > 0) this.session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [], timestamp: stamp }).catch(() => {});
    if (touchPoints.length > 0) this.session.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints, timestamp: stamp }).catch(() => {});
    this.down = touchPoints.length;
    this.held = { ...wanted };
  }

  async state() {
    const { result } = await this.session.send('Runtime.evaluate', {
      expression: `(()=>{const t=document.getElementById('tower');return t?[t.dataset.phase,t.dataset.try,t.dataset.run,t.dataset.stars,t.dataset.seconds,t.dataset.gems].join('|'):''})()`,
      returnByValue: true,
    });
    const [phase, tryNumber, run, stars, seconds, gems] = String(result.value).split('|');
    const [tick, x, y, vx, vy, ground, lava] = (run ?? '').split(' ').map(Number);
    return { phase, tryNumber: Number(tryNumber), tick, x, y, vx, vy, ground: ground === 1, lava, stars: Number(stars), seconds: Number(seconds), gems: Number(gems) };
  }
}

const TICK_SECONDS = 1 / 120;
/** Touches are sent this far ahead, stamped for their moment, so a busy page can't make one late. */
const SEND_AHEAD_MS = 500;

/**
 * Plays a recorded route with real touches at real speed. Each touch carries the moment it happens, as a
 * real screen's do, and the game plays it on that tick. Answers once the try is over.
 */
export async function replay(fingers, route, onState = () => {}) {
  const { steps } = route;
  const begin = Date.now() + SEND_AHEAD_MS + 40;
  let next = 0;
  for (;;) {
    while (next < steps.length && begin + steps[next].t * TICK_SECONDS * 1000 - Date.now() < SEND_AHEAD_MS) {
      fingers.at(begin / 1000 + steps[next].t * TICK_SECONDS, steps[next]);
      next += 1;
    }
    const state = await fingers.state();
    onState(state);
    if (state.phase !== 'climbing' && state.phase !== 'ready') {
      fingers.down = 0;
      fingers.at(Date.now() / 1000, { dir: 0, jump: false, dash: false });
      await fingers.session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }).catch(() => {});
      return { won: state.phase === 'won' || state.phase === 'result', state };
    }
    await new Promise((resolve) => setTimeout(resolve, 3));
  }
}

/** A real tap on the level's button on the map. */
export async function enterLevel(page, number) {
  const button = page.locator('.level-btn', { has: page.locator(`.level-number:text-is("${number}")`) });
  await button.evaluate((element) => element.scrollIntoView({ block: 'center' }));
  await page.waitForTimeout(120);
  const box = await button.boundingBox();
  await page.touchscreen.tap(box.x + box.width / 2, box.y + box.height / 2);
  await page.waitForSelector('#tower');
  await page.waitForTimeout(150);
}
