// Shared by the bots and the screen check. Run `npx vite build` in this folder first.
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';
import { launchOptions } from '../../../scripts/playtest.mjs';

export const GAME = fileURLToPath(new URL('..', import.meta.url));
export const SHOTS = join(GAME, '.shots');
export const PORT = 5371;
export const URL_HOME = `http://localhost:${PORT}/`;
const VITE = join(GAME, '..', '..', 'node_modules', '.bin', 'vite');
const MOST_TRIES = 100;

export async function serve() {
  if (!existsSync(join(GAME, 'dist', 'index.html'))) throw new Error('No build. Run: npx vite build');
  mkdirSync(SHOTS, { recursive: true });
  // The runner starts one server for every bot, so a bot finding one already up just uses it.
  if (await fetch(URL_HOME).then(() => true, () => false)) return { kill() {} };
  const server = spawn(VITE, ['preview', '--port', String(PORT), '--strictPort'], { cwd: GAME, stdio: 'ignore' });
  for (let tries = 0; tries < MOST_TRIES; tries += 1) {
    if (await fetch(URL_HOME).then(() => true, () => false)) return server;
    await new Promise((resolve) => setTimeout(resolve, 150));
  }
  server.kill();
  throw new Error('The preview server did not start');
}

export const launch = () => chromium.launch(launchOptions);

/**
 * A phone-like page with touch. `saves` maps a slot number to a save file, written once before the
 * first load so a reload keeps whatever the game wrote since.
 */
export async function openPage(browser, { width = 390, height = 844, language = 'en', saves = null, motion = 'no-preference', touch: hasTouch = true } = {}) {
  const context = await browser.newContext({ viewport: { width, height }, hasTouch, isMobile: hasTouch, reducedMotion: motion });
  await context.addInitScript(([chosen, seeded]) => {
    if (sessionStorage.getItem('seeded')) return;
    sessionStorage.setItem('seeded', 'yes');
    localStorage.setItem('playroom:language', JSON.stringify(chosen));
    if (seeded) {
      for (const [slot, file] of Object.entries(seeded)) localStorage.setItem(`playroom:my-island:slot-${slot}:a`, JSON.stringify(file));
    }
  }, [language, saves]);
  const page = await context.newPage();
  const problems = [];
  page.on('console', (message) => {
    if (message.type() === 'error') problems.push(`console: ${message.text()}`);
  });
  page.on('pageerror', (error) => problems.push(`crash: ${error.message}`));
  page.on('request', (request) => {
    const { hostname, protocol } = new URL(request.url());
    const allowed = ['localhost', 'fonts.googleapis.com', 'fonts.gstatic.com'];
    if (protocol.startsWith('http') && !allowed.includes(hostname)) problems.push(`outside request: ${request.url()}`);
  });
  await page.goto(URL_HOME);
  await screenIs(page, 'islands');
  return { page, context, problems };
}

export const screenIs = (page, name, timeout = 10000) => page.waitForSelector(`body[data-screen="${name}"]`, { timeout });
export const panelIs = (page, name, timeout = 10000) => page.waitForSelector(`body[data-panel="${name}"]`, { timeout });

/** A new screen ignores taps for a moment. A child waits that long without noticing, so the bots do too. */
export const settled = (page) => page.waitForSelector('body:not([data-settling])', { timeout: 5000 });

async function middleOf(page, selector) {
  const found = page.locator(selector).first();
  if (!selector.startsWith('.hit')) await found.scrollIntoViewIfNeeded({ timeout: 3000 }).catch(() => {});
  const box = await found.boundingBox();
  if (!box) throw new Error(`Nothing to touch at ${selector}`);
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
}

/** A real touch in the middle of something on screen. */
export async function touch(page, selector) {
  await settled(page);
  const { x, y } = await middleOf(page, selector);
  await page.touchscreen.tap(x, y);
}

/** A finger held still on a button, for the ones that leave an island or make a new one. */
export async function hold(page, selector, ms = 1300) {
  await settled(page);
  const { x, y } = await middleOf(page, selector);
  if (await page.evaluate(() => navigator.maxTouchPoints > 0)) {
    const cdp = await page.context().newCDPSession(page);
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] });
    await page.waitForTimeout(ms);
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await cdp.detach();
  } else {
    await page.mouse.move(x, y);
    await page.mouse.down();
    await page.waitForTimeout(ms);
    await page.mouse.up();
  }
}

/** How many islands are saved, read from storage the way the picker counts them. */
export const islandCount = (page) =>
  page.evaluate(() => new Set(Object.keys(localStorage).filter((key) => key.startsWith('playroom:my-island:slot-')).map((key) => key.split(':')[2])).size);

export async function tapAt(page, x, y) {
  await page.touchscreen.tap(x, y);
}

/** Taps everywhere at once, the way a palm or a very excited child does. */
export async function mash(page, taps = 50, seed = 7) {
  const { width, height } = page.viewportSize();
  let value = seed;
  const random = () => {
    value = (value * 16807) % 2147483647;
    return value / 2147483647;
  };
  for (let tap = 0; tap < taps; tap += 1) await page.touchscreen.tap(Math.floor(random() * width), Math.floor(random() * height));
}

export const body = (page, key) => page.evaluate((name) => document.body.dataset[name] ?? '', key);

/** A new island from the picker: the first empty slot, a picture, a look, and off we go. */
export async function makeIsland(page, { avatar = 0, picks = [] } = {}) {
  await touch(page, '.slot[data-state="empty"]');
  await screenIs(page, 'avatar');
  await touch(page, `[data-avatar="${avatar}"]`);
  await screenIs(page, 'creator');
  for (const [tab, option] of picks) {
    await touch(page, `[data-tab="${tab}"]`);
    await touch(page, `[data-option="${option}"]`);
  }
  await hold(page, '[data-action="go"]');
  await screenIs(page, 'play');
}

export async function shot(page, name) {
  await page.screenshot({ path: join(SHOTS, `${name}.png`) });
}

export function fail(problems, message) {
  throw new Error(`${message}${problems.length ? `\n${problems.join('\n')}` : ''}`);
}

/** The newer of a slot's two saved copies, read the way the game reads it. */
export const readSave = (page, slot = 0) =>
  page.evaluate((n) => {
    const copies = ['a', 'b'].map((copy) => {
      try {
        return JSON.parse(localStorage.getItem(`playroom:my-island:slot-${n}:${copy}`) ?? 'null');
      } catch {
        return null;
      }
    });
    const good = copies.filter((file) => file && file.island);
    good.sort((first, second) => second.revision - first.revision);
    return good[0]?.island ?? null;
  }, slot);

const playerTile = async (page) => (await body(page, 'player')).split(',').map(Number);
const playerScreen = async (page) => (await body(page, 'playerAt')).split(',').map(Number);

export async function stopWalking(page, timeout = 20000) {
  await page.waitForFunction(() => document.body.dataset.walking !== 'yes', null, { timeout });
}

/**
 * A point on a tappable thing, nearest its middle, where no button lies over the world and no other
 * tappable thing overlaps, or null. The hit buttons only carry keyboard focus: a tap goes to the
 * canvas, and the game picks what is under it.
 */
export const uncovered = (page, id) =>
  page.evaluate((wanted) => {
    const hit = document.querySelector(`.hit[data-target="${wanted}"]:not([hidden])`);
    if (!hit) return null;
    const box = hit.getBoundingClientRect();
    const points = [];
    for (let row = 1; row < 6; row += 1) for (let column = 1; column < 6; column += 1) points.push([box.left + (box.width * column) / 6, box.top + (box.height * row) / 6]);
    const middle = [box.left + box.width / 2, box.top + box.height / 2];
    points.sort((a, b) => Math.hypot(a[0] - middle[0], a[1] - middle[1]) - Math.hypot(b[0] - middle[0], b[1] - middle[1]));
    const others = [...document.querySelectorAll('.hit:not([hidden])')].filter((each) => each !== hit).map((each) => each.getBoundingClientRect());
    const inside = (rect, x, y) => x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom;
    const onWorld = (x, y) => document.elementFromPoint(x, y)?.tagName === 'CANVAS';
    const free = points.find(([x, y]) => onWorld(x, y) && !others.some((rect) => inside(rect, x, y))) ?? points.find(([x, y]) => onWorld(x, y));
    return free ? { x: free[0], y: free[1] } : null;
  }, id);

/** A tap on the way can land on a shop or a door. Close whatever opened and carry on. */
export async function backToIsland(page) {
  const screen = await body(page, 'screen');
  if (screen === 'wardrobe') await touch(page, '[data-action="done"]');
  else if (await body(page, 'panel')) await touch(page, '[data-action="close"]');
  else if (screen === 'house') await touch(page, '[data-action="door"]');
  else return;
  await screenIs(page, 'play');
  await page.waitForTimeout(300);
}

/**
 * Walks to something and uses it, the way a child would: tap it if it's on screen, otherwise tap
 * the ground a little way towards it and look again.
 */
export async function goUse(page, id, { tries = 25, mouse = false, expect = null } = {}) {
  const { width, height } = page.viewportSize();
  const press = (x, y) => (mouse ? page.mouse.click(x, y) : page.touchscreen.tap(x, y));
  for (let attempt = 0; attempt < tries; attempt += 1) {
    const shown = page.locator(`.hit[data-target="${id}"]:not([hidden])`);
    const open = (await shown.count()) ? await uncovered(page, id) : null;
    if (open) {
      await press(open.x, open.y);
      await page.waitForTimeout(200);
      await stopWalking(page);
      await page.waitForTimeout(400);
      // A pet wandering under the finger can take the tap. Then, like a child, close it and tap again.
      if (!expect || (await page.locator(expect).count())) return;
      await page.waitForTimeout(1200);
      if (await page.locator(expect).count()) return;
      await backToIsland(page);
      continue;
    }
    const tile = await page.locator(`.hit[data-target="${id}"]`).first().getAttribute('data-tile').catch(() => null);
    if (!tile) throw new Error(`No ${id} on this island`);
    const [tx, tz] = tile.split(',').map(Number);
    const [px, pz] = await playerTile(page);
    const [sx, sy] = await playerScreen(page);
    const length = Math.hypot(tx - px, tz - pz) || 1;
    const reach = Math.min(width, height) * 0.32;
    const x = Math.max(30, Math.min(width - 30, sx + ((tx - px) / length) * reach));
    const y = Math.max(height * 0.2, Math.min(height * 0.8, sy + ((tz - pz) / length) * reach));
    if (process.env.DEBUG_WALK) console.log(id, tile, [px, pz], [sx, sy], [Math.round(x), Math.round(y)]);
    await press(x, y);
    await page.waitForTimeout(200);
    await stopWalking(page);
    await page.waitForTimeout(300);
    await backToIsland(page);
  }
  await shot(page, `stuck-${id.replace(':', '-')}`);
  const why = await page.evaluate((wanted) => {
    const hit = document.querySelector(`.hit[data-target="${wanted}"]`);
    if (!hit) return 'no hit button';
    const box = hit.getBoundingClientRect();
    const top = document.elementFromPoint(box.left + box.width / 2, box.top + box.height / 2);
    return `hidden=${hit.hidden} box=${Math.round(box.left)},${Math.round(box.top)} ${Math.round(box.width)}x${Math.round(box.height)} on top: ${top?.tagName}.${top?.className} ${top?.dataset?.target ?? top?.id ?? ''}`;
  }, id);
  console.log(`stuck at ${id}: ${why}`);
  throw new Error(`Could not reach ${id}`);
}
