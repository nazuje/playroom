// Screens, languages, mashing and calm mode on the built game. Pictures land in .shots/. Run `npx vite build`
// first. It fails on any error, outside request, sideways scroll, lost progress, tap target under 64px or an
// answer dock covering the board, on every level at both phone sizes.
import { LEVELS, levelFor } from '../src/rules/levels.ts';
import { allOpen, answer, launch, openLevel, openPage, pictures, ready, screenIs, serve, SHOTS, touch, variant } from './lib.mjs';

const SCREENS = [
  { name: 'phone', width: 390, height: 844 },
  { name: 'small', width: 360, height: 640 },
  { name: 'tablet', width: 1024, height: 768 },
];
const SMALLEST_TARGET = 64;
const MASH_TAPS = 50;

const shot = (page, name) => page.screenshot({ path: `${SHOTS}/${name}.png` });

async function smallTargets(page) {
  return page.locator('#scene .item, #dock .choice, #dock .pick, #dock .tray-weight, #dock .prompt').evaluateAll(
    (items, least) =>
      items
        .map((item) => item.getBoundingClientRect())
        .filter((box) => box.width > 0 && (box.width < least - 0.5 || box.height < least - 0.5))
        .map((box) => `${Math.round(box.width)}x${Math.round(box.height)}`),
    SMALLEST_TARGET,
  );
}

/** The hand's fingertip sits on a single number or tray weight, which would give an answer away. */
const handOnOneAnswer = (page) =>
  page.evaluate(() => {
    const hand = document.querySelector('.pointer')?.getBoundingClientRect();
    if (!hand) return false;
    const x = hand.left + hand.width / 2;
    const y = hand.top + hand.height * 0.2;
    return [...document.querySelectorAll('[data-choice], .tray-weight')].some((one) => {
      const box = one.getBoundingClientRect();
      return x >= box.left && x <= box.right && y >= box.top && y <= box.bottom;
    });
  });

async function sideways(page) {
  return page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
}

/** Every level fits the screen with big enough targets and nothing scrolling sideways. */
async function everyLevelFits(page, screen, problems) {
  await touch(page, '[data-action="levels"]');
  await screenIs(page, 'map');
  for (const level of LEVELS) {
    await openLevel(page, level.id);
    const small = await smallTargets(page);
    if (small.length) problems.push(`${screen.name} level ${level.id}: small targets ${small.join(', ')}`);
    // The answers never cover the board: every item sits above the dock.
    const covered = await page.evaluate(() => {
      const dock = document.getElementById('dock').getBoundingClientRect().top;
      return [...document.querySelectorAll('#scene .item')].filter((item) => item.getBoundingClientRect().bottom > dock + 1).length;
    });
    if (covered) problems.push(`${screen.name} level ${level.id}: the dock covers ${covered} item(s)`);
    const off = await page.locator('#scene .item').evaluateAll((items) =>
      items.filter((item) => {
        const box = item.getBoundingClientRect();
        const scene = document.getElementById('scene').getBoundingClientRect();
        return box.left < 0 || box.right > window.innerWidth || box.top < scene.top - 40;
      }).length,
    );
    if (off) problems.push(`${screen.name} level ${level.id}: ${off} item(s) off the screen`);
    if ((await sideways(page)) > 0) problems.push(`${screen.name} level ${level.id}: scrolls sideways`);
    await touch(page, '[data-action="levels"]');
    await screenIs(page, 'map');
  }
}

async function tour(browser, screen, language) {
  const tag = `${screen.name}-${language}`;
  const { page, problems } = await openPage(browser, { ...screen, language, progress: allOpen(LEVELS) });
  await shot(page, `${tag}-map`);

  // Level 1: a wrong number tips the seesaw, then the same comes off both sides, then the right number.
  await openLevel(page, 1);
  const first = levelFor(1, await variant(page));
  await shot(page, `${tag}-l1`);
  const wrong = first.choices.find((value) => value !== first.values.box);
  await answer(page, wrong);
  await page.waitForTimeout(420);
  await shot(page, `${tag}-l1-wrong`);
  await ready(page);
  await touch(page, '#scene [data-item="s0l1"]');
  await page.waitForTimeout(180);
  await shot(page, `${tag}-l1-take`);
  await page.waitForTimeout(600);
  await answer(page, first.values.box);
  await page.waitForTimeout(450);
  await shot(page, `${tag}-l1-right`);
  await screenIs(page, 'won');
  await page.waitForTimeout(500);
  await shot(page, `${tag}-won`);
  await page.waitForSelector('.card-btn.armed');
  await touch(page, '[data-action="map"]');
  await screenIs(page, 'map');

  // Level 8: the tray.
  await openLevel(page, 8);
  await touch(page, '[data-tray="t3"]');
  await page.waitForTimeout(700);
  await shot(page, `${tag}-l8-tray`);
  await touch(page, '[data-action="levels"]');
  await screenIs(page, 'map');

  // Level 22: swap the hat for what it weighs. The answers stay under the board.
  await openLevel(page, 22);
  await touch(page, '#scene [data-item="s0l1"]');
  await page.waitForTimeout(160);
  await shot(page, `${tag}-l22-swap`);
  await page.waitForTimeout(700);
  await shot(page, `${tag}-l22-answer`);
  await touch(page, '[data-action="levels"]');
  await screenIs(page, 'map');

  // Level 12: tapping the lone box points at the answers. Three misses tumble everything, and the retry is fresh.
  await openLevel(page, 12);
  const twelve = levelFor(12, await variant(page));
  await touch(page, '#scene [data-item="s0l0"]');
  await page.waitForTimeout(300);
  await shot(page, `${tag}-l12-box-tap`);
  if (!(await page.locator('.pointer').count())) problems.push(`${tag}: tapping the box pointed at nothing`);
  const misses = [0, 1, 19, 20].filter((value) => value !== twelve.values.box).slice(0, 3);
  for (const [at, value] of misses.entries()) {
    await answer(page, value);
    if (at < misses.length - 1) await ready(page);
  }
  await page.waitForTimeout(1350);
  await shot(page, `${tag}-l12-tumble`);
  await screenIs(page, 'lost');
  await page.waitForTimeout(400);
  await shot(page, `${tag}-l12-lost`);
  await touch(page, '[data-action="try-again"]');
  await page.waitForFunction(() => document.body.dataset.screen === 'play' && document.body.dataset.status === 'playing');
  const retried = levelFor(12, await variant(page));
  if (retried.variant === twelve.variant) problems.push(`${tag}: the retry was the same try`);
  await shot(page, `${tag}-l12-retry`);
  await touch(page, '[data-action="levels"]');
  await screenIs(page, 'map');

  // Level 15: before any miss, a hand shows the first pair to take off both sides.
  await openLevel(page, 15);
  await page.waitForTimeout(2900);
  await shot(page, `${tag}-l15-pair-hand`);
  if (!(await page.locator('.pointer').count())) problems.push(`${tag}: no hand showed the first pair`);
  await touch(page, '[data-action="levels"]');
  await screenIs(page, 'map');

  // Level 7, left alone: a hand points at the tray, under the open side, not at one weight.
  await openLevel(page, 7);
  await page.waitForTimeout(8600);
  await shot(page, `${tag}-l7-idle-hand`);
  if (!(await page.locator('.pointer').count())) problems.push(`${tag}: no hand on the tray level`);
  if (await handOnOneAnswer(page)) problems.push(`${tag}: the tray hand rests on one weight`);
  await touch(page, '[data-action="levels"]');
  await screenIs(page, 'map');

  // Level 2, left alone: a hand points at the answers.
  await openLevel(page, 2);
  await page.waitForTimeout(8600);
  await shot(page, `${tag}-l2-idle-hand`);
  if (!(await page.locator('.pointer').count())) problems.push(`${tag}: no hand after sitting still`);
  if (await handOnOneAnswer(page)) problems.push(`${tag}: the idle hand rests on one answer`);
  await touch(page, '[data-action="levels"]');
  await screenIs(page, 'map');

  await openLevel(page, 24);
  await shot(page, `${tag}-l24`);

  // A palm and a mashing hand: nothing breaks and the game stays on the level or its win card.
  const { width, height } = screen;
  for (let tap = 0; tap < MASH_TAPS; tap += 1) {
    await page.touchscreen.tap(20 + ((tap * 83) % (width - 40)), 100 + ((tap * 137) % (height - 120)));
    await page.waitForTimeout(25);
  }
  await page.waitForTimeout(1200);
  await shot(page, `${tag}-after-mash`);
  if (!page.url().startsWith('http://localhost')) problems.push(`${tag}: mashing left the game`);
  if ((await sideways(page)) > 0) problems.push(`${tag}: scrolls sideways after mashing`);

  // Changing language keeps the board as it is.
  await touch(page, '[data-action="levels"]').catch(() => undefined);
  await screenIs(page, 'map').catch(() => undefined);
  await openLevel(page, 17);
  await touch(page, '#scene [data-item="s0r0"]');
  await page.waitForTimeout(300);
  const before = await pictures(page);
  await touch(page, '.language-btn');
  await page.waitForTimeout(300);
  const after = await pictures(page);
  if (before.join() !== after.join()) problems.push(`${tag}: changing language changed the board`);

  if (language === 'en' && screen.name !== 'tablet') await everyLevelFits(page, screen, problems);
  await page.context().close();
  return problems;
}

async function calmRun(browser) {
  const { page, problems } = await openPage(browser, { motion: 'reduce' });
  await openLevel(page, 1);
  await touch(page, '#scene [data-item="s0l1"]');
  await page.waitForTimeout(100);
  await answer(page, LEVELS[0].values.box);
  await screenIs(page, 'won');
  await shot(page, 'calm-won');
  const saved = await page.evaluate(() => localStorage.getItem('playroom:secret-seesaw:progress'));
  if (!saved?.includes('"1":3')) problems.push(`calm: the win was not saved (${saved})`);
  // A miss on level 2 is still counted after a reload, so a fresh try can't wash it away.
  await page.waitForSelector('.card-btn.armed');
  await touch(page, '[data-action="next"]');
  await page.waitForFunction(() => document.body.dataset.screen === 'play' && document.body.dataset.status === 'playing');
  const two = levelFor(2, await variant(page));
  await answer(page, two.choices.find((value) => value !== two.values.box));
  await page.waitForTimeout(200);
  await page.reload();
  await page.waitForSelector('body[data-screen="map"]');
  await openLevel(page, 2);
  const carried = await page.evaluate(() => document.body.dataset.missesTotal);
  if (carried !== '1') problems.push(`calm: misses were not kept over a reload (${carried})`);
  await touch(page, '[data-action="levels"]');
  await screenIs(page, 'map');
  // That reload was on purpose.
  problems.splice(0, problems.length, ...problems.filter((problem) => !problem.startsWith('the page went to')));
  if ((await page.locator('[data-level="2"]').getAttribute('data-open')) !== 'true') problems.push('calm: level 2 did not stay open after a reload');
  await page.context().close();
  return problems;
}

async function main() {
  const server = await serve();
  const browser = await launch();
  const problems = [];
  try {
    for (const screen of SCREENS) {
      for (const language of ['en', 'sl']) {
        const found = await tour(browser, screen, language);
        console.log(`${found.length ? '✗' : '✓'} ${screen.name} ${language}`);
        problems.push(...found);
      }
    }
    const calm = await calmRun(browser);
    console.log(`${calm.length ? '✗' : '✓'} calm mode`);
    problems.push(...calm);
  } finally {
    await browser.close();
    server.kill();
  }
  console.log(`problems: ${problems.length ? `\n${problems.join('\n')}` : 'none'}`);
  process.exit(problems.length ? 1 : 0);
}

await main();
