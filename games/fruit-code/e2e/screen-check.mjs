// Screens, languages, mashing and calm mode on the built game. Pictures land in .shots/. Run `npx vite build`
// first. It fails on any error, outside request, sideways scroll, lost progress, tap target under 64px, or a
// board that is covered by the numbers or needs scrolling, checked on every level at each screen size.
import { loneFruit } from '../src/rules/equation.ts';
import { ALL_VARIANTS, LEVELS } from '../src/rules/levels.ts';
import { plan } from '../src/rules/solve.ts';
import { allOpen, answer, launch, openLevel, openPage, puzzleOn, ready, screenIs, serve, SHOTS, stickers, tapFruit, touch } from './lib.mjs';

const SCREENS = [
  { name: 'phone', width: 390, height: 844 },
  { name: 'small', width: 360, height: 640 },
  { name: 'tablet', width: 1024, height: 768 },
];
const SMALLEST_TARGET = 64;
const MASH_TAPS = 50;

const shot = (page, name) => page.screenshot({ path: `${SHOTS}/${name}.png` });

async function smallTargets(page) {
  return page.locator('#board .fruit, #dock .choice, #dock .pick, #dock .step-btn, #dock .step-ok, #dock .retry').evaluateAll(
    (items, least) =>
      items
        .map((item) => ({ item, box: item.getBoundingClientRect() }))
        .filter(({ box }) => box.width > 0 && (box.width < least - 0.5 || box.height < least - 0.5))
        .map(({ item, box }) => `${item.className.split(' ')[0]} ${Math.round(box.width)}x${Math.round(box.height)}`),
    SMALLEST_TARGET,
  );
}

const sideways = (page) => page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);

/** The board's rows all show, above the dock, with nothing to scroll. */
const boardFits = (page) =>
  page.evaluate(() => {
    const board = document.getElementById('board');
    const dock = document.getElementById('dock').getBoundingClientRect();
    const rows = [...board.querySelectorAll('.row')].map((row) => row.getBoundingClientRect());
    const lowest = Math.max(...rows.map((row) => row.bottom));
    const widest = Math.max(...rows.map((row) => row.right));
    const problems = [];
    if (lowest > dock.top + 1) problems.push(`rows reach ${Math.round(lowest)} under the dock at ${Math.round(dock.top)}`);
    if (board.scrollHeight > board.clientHeight + 1) problems.push(`board scrolls (${board.scrollHeight} > ${board.clientHeight})`);
    if (widest > window.innerWidth || Math.min(...rows.map((row) => row.left)) < 0) problems.push('a row is off the side');
    if (dock.bottom > window.innerHeight + 1) problems.push('the dock is off the bottom');
    return problems;
  });

async function everyLevelFits(page, screen, problems) {
  await touch(page, '[data-action="levels"]');
  await screenIs(page, 'map');
  for (const level of LEVELS) {
    await openLevel(page, level.id);
    await page.waitForTimeout(80);
    const small = await smallTargets(page);
    if (small.length) problems.push(`${screen.name} level ${level.id}: small targets ${small.join(', ')}`);
    for (const problem of await boardFits(page)) problems.push(`${screen.name} level ${level.id}: ${problem}`);
    if ((await sideways(page)) > 0) problems.push(`${screen.name} level ${level.id}: scrolls sideways`);
    if (level.id === 24 || level.id === 14) await shot(page, `${screen.name}-fit-l${level.id}`);
    await touch(page, '[data-action="levels"]');
    await screenIs(page, 'map');
  }
}

async function tour(browser, screen, language) {
  const tag = `${screen.name}-${language}`;
  const { page, problems } = await openPage(browser, { ...screen, language, progress: allOpen(LEVELS) });
  await shot(page, `${tag}-map`);

  // Level 1: the first demo, a wrong number pulls a face, then the right one wins.
  await openLevel(page, 1);
  await page.waitForTimeout(1200);
  await shot(page, `${tag}-l1-demo`);
  let level = await puzzleOn(page, ALL_VARIANTS);
  const truth = level.values.apple;
  await answer(page, level.choices.question.find((value) => value !== truth));
  await page.waitForTimeout(420);
  await shot(page, `${tag}-l1-wrong`);
  await ready(page);
  await answer(page, truth);
  await page.waitForTimeout(260);
  await shot(page, `${tag}-l1-right`);
  await screenIs(page, 'won');
  await page.waitForTimeout(500);
  await shot(page, `${tag}-won`);
  await page.waitForSelector('.card-btn.armed');
  await touch(page, '[data-action="map"]');
  await screenIs(page, 'map');

  // Level 5: tap the fruit to work out first, pick its number, and watch the stickers slap on.
  await openLevel(page, 5);
  level = await puzzleOn(page, ALL_VARIANTS);
  const first = plan(level.puzzle).find((step) => step.kind === 'fruit' && step.fruit !== loneFruit(level.puzzle));
  await tapFruit(page, first.fruit);
  await page.waitForTimeout(300);
  await shot(page, `${tag}-l5-select`);
  await answer(page, first.value);
  await page.waitForTimeout(240);
  await shot(page, `${tag}-l5-slap`);
  await ready(page);
  await shot(page, `${tag}-l5-decoded`);
  // Changing language keeps the stickers as they are.
  const before = await stickers(page);
  await touch(page, '.language-btn');
  await page.waitForTimeout(300);
  if ((await stickers(page)).join() !== before.join()) problems.push(`${tag}: changing language lost the stickers`);
  await touch(page, '.language-btn');
  await touch(page, '[data-action="levels"]');
  await screenIs(page, 'map');

  // Level 10: the 0 to 20 numbers, then a try running out.
  await openLevel(page, 10);
  await page.waitForTimeout(2600);
  await shot(page, `${tag}-l10-picker`);
  level = await puzzleOn(page, ALL_VARIANTS);
  const answerNow = level.values[level.puzzle.question[0].fruit];
  const wrongs = [0, 1, 2, 3].filter((value) => value !== answerNow).slice(0, 2);
  await answer(page, wrongs[0]);
  await page.waitForTimeout(400);
  await shot(page, `${tag}-l10-wrong`);
  await ready(page);
  await answer(page, wrongs[1]);
  await ready(page);
  await answer(page, 20);
  await page.waitForSelector('#dock .retry.armed', { timeout: 8000 });
  await shot(page, `${tag}-l10-failed`);
  const failedVariant = level.variant;
  await touch(page, '#dock [data-action="retry"]');
  await page.waitForFunction(() => document.body.dataset.status === 'playing');
  if ((await puzzleOn(page, ALL_VARIANTS)).variant === failedVariant) problems.push(`${tag}: retry gave the same puzzle`);
  await page.waitForTimeout(800);
  await shot(page, `${tag}-l10-retry-hint`);
  await touch(page, '[data-action="levels"]');
  await screenIs(page, 'map');

  await openLevel(page, 15);
  await page.waitForTimeout(1500);
  await shot(page, `${tag}-l15-bunch`);
  await touch(page, '[data-action="levels"]');
  await screenIs(page, 'map');

  await openLevel(page, 24);
  await shot(page, `${tag}-l24`);
  // Left alone, a hand points at the next thing to tap.
  await page.waitForTimeout(9000);
  await shot(page, `${tag}-l24-idle`);
  if (!(await page.locator('.hand:not([hidden])').count())) problems.push(`${tag}: no hand after a quiet spell`);

  // A palm and a mashing hand: nothing breaks and the game stays on the level or its win card.
  const { width, height } = screen;
  for (let tap = 0; tap < MASH_TAPS; tap += 1) {
    await page.touchscreen.tap(20 + ((tap * 83) % (width - 40)), 100 + ((tap * 137) % (height - 120)));
    await page.waitForTimeout(25);
  }
  await page.waitForTimeout(1500);
  await shot(page, `${tag}-after-mash`);
  if (!page.url().startsWith('http://localhost')) problems.push(`${tag}: mashing left the game`);
  if ((await sideways(page)) > 0) problems.push(`${tag}: scrolls sideways after mashing`);

  if (language === 'en') {
    if (await page.evaluate(() => document.body.dataset.screen !== 'map')) await touch(page, '[data-action="levels"]').catch(() => undefined);
    await screenIs(page, 'map').catch(() => undefined);
    await openLevel(page, 1);
    await everyLevelFits(page, screen, problems);
  }
  await page.context().close();
  return problems;
}

async function calmRun(browser) {
  const { page, problems } = await openPage(browser, { motion: 'reduce' });
  await openLevel(page, 1);
  const level = await puzzleOn(page, ALL_VARIANTS);
  await answer(page, level.values.apple);
  await screenIs(page, 'won');
  await shot(page, 'calm-won');
  const saved = await page.evaluate(() => localStorage.getItem('playroom:fruit-code:progress'));
  if (!saved?.includes('"1":3')) problems.push(`calm: the win was not saved (${saved})`);
  await page.reload();
  await page.waitForSelector('body[data-screen="map"]');
  // That reload was on purpose.
  problems.splice(0, problems.length, ...problems.filter((problem) => !problem.startsWith('the page went to')));
  if ((await page.locator('[data-level="2"]').getAttribute('data-open')) !== 'true') problems.push('calm: level 2 did not stay open after a reload');
  // A replay after the reload is a fresh puzzle.
  await openLevel(page, 1);
  if ((await puzzleOn(page, ALL_VARIANTS)).variant === 0) problems.push('calm: replaying level 1 gave the same puzzle');
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
