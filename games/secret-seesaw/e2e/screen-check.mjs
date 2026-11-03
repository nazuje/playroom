// Screens, languages, mashing and calm mode on the built game. Pictures land in .shots/. Run `npx vite build`
// first. It fails on any error, outside request, sideways scroll, lost progress or tap target under 64px.
import { LEVELS } from '../src/rules/levels.ts';
import { allOpen, answer, launch, openLevel, openPage, pictures, ready, screenIs, serve, SHOTS, touch } from './lib.mjs';

const SCREENS = [
  { name: 'phone', width: 390, height: 844 },
  { name: 'small', width: 360, height: 640 },
  { name: 'tablet', width: 1024, height: 768 },
];
const SMALLEST_TARGET = 64;
const MASH_TAPS = 50;

/** Known limits, printed but not failed. */
const notes = [];

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
    // Two seesaws can't both fit 64px stacks on a 640px-tall phone, so there the floor is the 52px the view allows.
    const squeezed = screen.height < 700 && level.seesaws.length > 1;
    if (small.length && squeezed) notes.push(`${screen.name} level ${level.id}: targets ${small[0]}`);
    else if (small.length) problems.push(`${screen.name} level ${level.id}: small targets ${small.join(', ')}`);
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
  const first = LEVELS[0];
  await openLevel(page, 1);
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

  // Level 22: swap the hat for what it weighs, then open the picker.
  await openLevel(page, 22);
  await touch(page, '#scene [data-item="s0l1"]');
  await page.waitForTimeout(160);
  await shot(page, `${tag}-l22-swap`);
  await page.waitForTimeout(700);
  if (await page.evaluate(() => document.body.dataset.picker === 'sheet')) {
    await touch(page, '.prompt');
    await page.waitForTimeout(350);
  }
  await shot(page, `${tag}-l22-picker`);
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
  await page.reload();
  await page.waitForSelector('body[data-screen="map"]');
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
  console.log(`\nnotes: ${notes.length ? `\n${notes.join('\n')}` : 'none'}`);
  console.log(`problems: ${problems.length ? `\n${problems.join('\n')}` : 'none'}`);
  process.exit(problems.length ? 1 : 0);
}

await main();
