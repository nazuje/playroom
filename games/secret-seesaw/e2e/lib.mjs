// Shared by the bots and the screen check. Run `npx vite build` in this folder first.
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';
import { launchOptions } from '../../../scripts/playtest.mjs';

export const GAME = fileURLToPath(new URL('..', import.meta.url));
export const SHOTS = join(GAME, '.shots');
export const PORT = Number(process.env.PORT ?? 5190);
export const URL_HOME = `http://localhost:${PORT}/`;
const VITE = join(GAME, '..', '..', 'node_modules', '.bin', 'vite');
const MOST_TRIES = 100;

export async function serve() {
  if (!existsSync(join(GAME, 'dist', 'index.html'))) throw new Error('No build. Run: npx vite build');
  mkdirSync(SHOTS, { recursive: true });
  const server = spawn(VITE, ['preview', '--port', String(PORT), '--strictPort'], { cwd: GAME, stdio: 'ignore' });
  for (let tries = 0; tries < MOST_TRIES; tries += 1) {
    if (await fetch(URL_HOME).then(() => true, () => false)) return server;
    await new Promise((resolve) => setTimeout(resolve, 150));
  }
  server.kill();
  throw new Error('The preview server did not start');
}

export const launch = () => chromium.launch(launchOptions);

/** A phone-like page with touch, and any saved game already in place. */
export async function openPage(browser, { width = 390, height = 844, language = 'en', progress = null, motion = 'no-preference' } = {}) {
  const context = await browser.newContext({ viewport: { width, height }, hasTouch: true, isMobile: true, reducedMotion: motion });
  await context.addInitScript(([chosen, saved]) => {
    if (sessionStorage.getItem('seeded')) return;
    sessionStorage.setItem('seeded', 'yes');
    localStorage.setItem('playroom:language', JSON.stringify(chosen));
    if (saved) localStorage.setItem('playroom:secret-seesaw:progress', JSON.stringify(saved));
    else localStorage.removeItem('playroom:secret-seesaw:progress');
  }, [language, progress]);
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
  await page.waitForSelector('body[data-screen="map"]');
  page.on('framenavigated', (frame) => {
    if (frame === page.mainFrame()) problems.push(`the page went to ${frame.url()}`);
  });
  return { page, context, problems };
}

/** Every level open, for runs that jump straight to one. */
export function allOpen(levels) {
  const stars = {};
  for (const { id } of levels) stars[id] = 1;
  return { stars, skipped: [] };
}

export const screenIs = (page, name) => page.waitForSelector(`body[data-screen="${name}"]`, { timeout: 8000 });

/** A real touch in the middle of something on screen. */
export async function touch(page, selector) {
  const target = page.locator(selector).first();
  await target.waitFor({ state: 'visible', timeout: 8000 });
  const box = await target.boundingBox();
  if (!box) throw new Error(`Nothing to touch at ${selector}`);
  await page.touchscreen.tap(box.x + box.width / 2, box.y + box.height / 2);
}

export async function openLevel(page, id) {
  // The next tile bobs, so it is never "stable" for Playwright: scroll it in by hand instead.
  await page.locator(`[data-level="${id}"]`).evaluate((tile) => tile.scrollIntoView({ block: 'center' }));
  await touch(page, `[data-level="${id}"]`);
  await screenIs(page, 'play');
  await page.waitForFunction((level) => document.body.dataset.level === String(level) && document.body.dataset.status === 'playing', id);
}

/** Waits until the game takes answers again after a wobble or a cheer. */
export const ready = (page) =>
  page.waitForFunction(() => document.body.dataset.status === 'playing' || document.body.dataset.screen !== 'play', null, { timeout: 8000 });

/** Picks a number: straight from the row or grid, or on a phone by stepping to it and opening the box. */
export async function answer(page, value) {
  if (!(await page.locator('.stepper').count())) {
    await touch(page, `[data-choice="${value}"]`);
    return;
  }
  for (let steps = 0; steps < 50; steps += 1) {
    const shown = Number(await page.locator('.step-shown').getAttribute('data-stepped'));
    if (shown === value) break;
    await touch(page, shown < value ? '.step-more' : '.step-less');
    await page.waitForFunction((was) => document.querySelector('.step-shown')?.dataset.stepped !== String(was), shown);
  }
  await touch(page, '[data-action="open"]');
}

/** The puzzle this try really shows: the first try is the level as designed, later ones are fresh. */
export const variant = (page) => page.evaluate(() => Number(document.body.dataset.variant ?? 0));

/** What each seesaw shows, as the rules write it: "box+box+3=7". */
export const pictures = (page) => page.locator('.rig').evaluateAll((rigs) => rigs.map((rig) => rig.dataset.picture));
