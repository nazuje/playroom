// Shared by the bots and the screen check. Run `npx vite build` in this folder first.
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';
import { launchOptions } from '../../../scripts/playtest.mjs';
import { levelFor } from '../src/rules/levels.ts';

export const GAME = fileURLToPath(new URL('..', import.meta.url));
export const SHOTS = join(GAME, '.shots');
export const PORT = Number(process.env.PORT ?? 5199);
export const URL_HOME = `http://localhost:${PORT}/`;
/** The build to serve, relative to this game: dist unless DIST says otherwise. */
const DIST = process.env.DIST ?? 'dist';
const VITE = join(GAME, '..', '..', 'node_modules', '.bin', 'vite');
const MOST_TRIES = 100;

export async function serve() {
  if (!existsSync(join(GAME, DIST, 'index.html'))) throw new Error('No build. Run: npx vite build');
  mkdirSync(SHOTS, { recursive: true });
  const server = spawn(VITE, ['preview', '--outDir', DIST, '--port', String(PORT), '--strictPort'], { cwd: GAME, stdio: 'ignore' });
  let exited = false;
  server.on('exit', () => (exited = true));
  for (let tries = 0; tries < MOST_TRIES && !exited; tries += 1) {
    const page = await fetch(URL_HOME).then((response) => response.text(), () => '');
    // Another game's server on the same port would answer too, so check it is this one.
    if (page.includes('<title>Block Count</title>')) return server;
    await new Promise((resolve) => setTimeout(resolve, 150));
  }
  if (exited) throw new Error(`Port ${PORT} is taken. Run with PORT=<another port>`);
  server.kill();
  throw new Error('The preview server did not start');
}

/** Headless and muted, with the launch options every playtest shares: software 3D and --mute-audio. */
export const launch = () => chromium.launch(launchOptions);

/** A phone-like page with touch, and any saved game already in place. */
export async function openPage(browser, { width = 390, height = 844, language = 'en', progress = null, motion = 'no-preference', shown = null, goes = null } = {}) {
  const context = await browser.newContext({ viewport: { width, height }, hasTouch: true, isMobile: true, reducedMotion: motion });
  await context.addInitScript(([chosen, saved, demos, played]) => {
    if (sessionStorage.getItem('seeded')) return;
    sessionStorage.setItem('seeded', 'yes');
    localStorage.setItem('playroom:language', JSON.stringify(chosen));
    if (saved) localStorage.setItem('playroom:block-count:progress', JSON.stringify(saved));
    else localStorage.removeItem('playroom:block-count:progress');
    if (demos) localStorage.setItem('playroom:block-count:shown', JSON.stringify(demos));
    if (played) localStorage.setItem('playroom:block-count:goes', JSON.stringify(played));
  }, [language, progress, shown, goes]);
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

/** Every demo already seen, for runs that shouldn't wait for them. */
export const ALL_SHOWN = ['count', 'turn', 'lesson', 'stepper', 'fill', 'map'];

/** Every level open, for runs that jump straight to one. */
export function allOpen(levels) {
  const stars = {};
  for (const { id } of levels) stars[id] = 1;
  return { stars, skipped: [] };
}

export const screenIs = (page, name) => page.waitForSelector(`body[data-screen="${name}"]`, { timeout: 15000 });

/** A real touch in the middle of something on screen. */
export async function touch(page, selector) {
  const target = page.locator(selector).first();
  await target.waitFor({ state: 'visible', timeout: 10000 });
  const box = await target.boundingBox();
  if (!box) throw new Error(`Nothing to touch at ${selector}`);
  await page.touchscreen.tap(box.x + box.width / 2, box.y + box.height / 2);
}

export async function openLevel(page, id) {
  await page.waitForSelector('.map.armed', { timeout: 8000 });
  // The next ticket bobs, so it is never "stable" for Playwright: scroll it in by hand instead.
  await page.locator(`[data-level="${id}"]`).evaluate((tile) => tile.scrollIntoView({ block: 'center' }));
  await touch(page, `[data-level="${id}"]`);
  await screenIs(page, 'play');
  await page.waitForFunction((level) => document.body.dataset.level === String(level) && document.body.dataset.status === 'playing', id, { timeout: 15000 });
}

/** Waits until the game takes answers again, or a try has run out, or the level is over. */
export const ready = (page) =>
  page.waitForFunction(
    () => ['playing', 'failed'].includes(document.body.dataset.status ?? '') || document.body.dataset.screen !== 'play',
    null,
    { timeout: 20000 },
  );

/** Picks an answer: a number token or grid number, the −/+ stepper and ✓ on a phone, or a map card's place. */
export async function answer(page, pick) {
  if (await page.locator('#dock .stepper').count()) {
    const now = Number(await page.locator('#dock .step-show').getAttribute('data-value'));
    const step = pick > now ? 1 : -1;
    for (let at = now; at !== pick; at += step) {
      await touch(page, `#dock [data-step="${step}"]`);
      await page.waitForTimeout(10);
    }
    await page.waitForFunction((wanted) => document.querySelector('#dock .step-show')?.dataset.value === String(wanted), pick);
    await touch(page, '#dock [data-action="ok"]');
    return;
  }
  await touch(page, `#dock [data-choice="${pick}"]`);
}

/** After an answer: the set moved on to its next stack, the level is won, the try ran out, or try again. */
export async function afterAnswer(page, atBefore) {
  await page.waitForFunction(
    (at) => {
      const { screen, status } = document.body.dataset;
      if (screen !== 'play') return true;
      if (status === 'failed') return true;
      return status === 'playing';
    },
    atBefore,
    { timeout: 25000 },
  );
  const { screen, status, at } = await page.evaluate(() => ({ ...document.body.dataset }));
  if (screen === 'won') return 'won';
  if (status === 'failed') return 'failed';
  return at !== String(atBefore) ? 'next' : 'again';
}

/** The puzzle on screen: the level and which of its fresh puzzles this is. */
export async function puzzleOn(page) {
  const { level, variant } = await page.evaluate(() => ({ ...document.body.dataset }));
  return levelFor(Number(level), Number(variant));
}

/** The stack the stage shows, as the rules write it. */
export const stageShows = (page) => page.evaluate(() => document.getElementById('board')?.dataset.stack ?? '');
