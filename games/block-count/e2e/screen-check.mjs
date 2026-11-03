// Screens, languages, mashing and calm mode on the built game. Pictures land in .shots/. Run `npx vite build`
// first. It fails on any error, outside request, sideways scroll, lost progress, tap target under 64px, or a
// stack that is cut off or covered by the answers, checked on every level at each screen size.
import { LEVELS } from '../src/rules/levels.ts';
import { goldenFor } from '../src/rules/surprise.ts';
import { afterAnswer, ALL_SHOWN, allOpen, answer, launch, openLevel, openPage, puzzleOn, ready, screenIs, serve, SHOTS, touch } from './lib.mjs';

const SCREENS = [
  { name: 'phone', width: 390, height: 844 },
  { name: 'small', width: 360, height: 640 },
  { name: 'tablet', width: 1024, height: 768 },
];
const SMALLEST_TARGET = 64;
const MASH_TAPS = 50;
/** One tap to retry within about a second of the miss that ends a try. */
const RETRY_WITHIN_MS = 1100;

const atNow = (page) => page.evaluate(() => Number(document.body.dataset.at));
const shot = (page, name) => page.screenshot({ path: `${SHOTS}/${name}.png` });

/** Wrong answers given so far, by puzzle, since the stepper has no dimmed buttons to read them from. */
const given = new Map();

/** A wrong answer that hasn't been tried on this puzzle yet. */
async function wrongFor(page, level) {
  const key = `${level.id}.${level.variant}`;
  const tried = given.get(key) ?? [];
  const picks = level.answer === 'maps' ? level.maps.map((_, at) => at) : level.numbers;
  const pick = picks.find((one) => one !== level.truth && !tried.includes(one));
  given.set(key, [...tried, pick]);
  return pick;
}

async function finishSet(page) {
  for (;;) {
    const level = await puzzleOn(page);
    const at = await atNow(page);
    await answer(page, level.truth);
    if ((await afterAnswer(page, at)) === 'won') return;
  }
}

/** Where the 👆 is, as the thing under its fingertip. */
const handOn = (page) =>
  page.evaluate(() => {
    const hand = document.querySelector('.hand:not([hidden])');
    if (!hand) return null;
    const box = hand.getBoundingClientRect();
    const under = document.elementsFromPoint(box.left + box.width * 0.3, box.top + 4).find((item) => !item.classList.contains('hand'));
    return under?.closest('[data-step], [data-action], [data-choice], canvas')?.outerHTML.slice(0, 60) ?? 'nothing';
  });

async function smallTargets(page) {
  return page
    .locator('#dock .choice, #dock .pick, #dock .map-card, #dock .step-btn, #dock .step-ok, #dock .retry, #board .turn-btn')
    .evaluateAll(
      (items, least) =>
        items
          .map((item) => ({ item, box: item.getBoundingClientRect() }))
          .filter(({ box }) => box.width > 0 && (box.width < least - 0.5 || box.height < least - 0.5))
          .map(({ item, box }) => `${item.className.split(' ')[0]} ${Math.round(box.width)}x${Math.round(box.height)}`),
      SMALLEST_TARGET,
    );
}

const sideways = (page) => page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);

/** The whole stack, with room to spread, shows inside the stage, and the answers sit under it. */
const stageFits = (page) =>
  page.evaluate(() => {
    const board = document.getElementById('board');
    const box = board.getBoundingClientRect();
    const dock = document.getElementById('dock').getBoundingClientRect();
    const problems = [];
    const fit = (board.dataset.fit ?? '').split(',').map(Number);
    if (fit.length !== 4 || fit.some(Number.isNaN)) problems.push('the stage reports no stack');
    else {
      const [left, top, right, bottom] = fit;
      if (left < -1 || right > box.width + 1) problems.push(`the stack is cut off at the side (${left} to ${right} in ${Math.round(box.width)})`);
      if (top < -1 || bottom > box.height + 1) problems.push(`the stack is cut off top or bottom (${top} to ${bottom} in ${Math.round(box.height)})`);
      if (right - left < 120) problems.push(`the stack is tiny (${right - left}px across)`);
    }
    if (box.bottom > dock.top + 1) problems.push('the answers cover the stage');
    if (dock.bottom > window.innerHeight + 1) problems.push('the answers are off the bottom');
    if (box.height < 200) problems.push(`the stage is only ${Math.round(box.height)}px tall`);
    return problems;
  });

async function everyLevelFits(page, screen, problems) {
  await touch(page, '[data-action="levels"]');
  await screenIs(page, 'map');
  for (const level of LEVELS) {
    await openLevel(page, level.id);
    await page.waitForTimeout(900);
    const small = await smallTargets(page);
    if (small.length) problems.push(`${screen.name} level ${level.id}: small targets ${[...new Set(small)].join(', ')}`);
    for (const problem of await stageFits(page)) problems.push(`${screen.name} level ${level.id}: ${problem}`);
    if ((await sideways(page)) > 0) problems.push(`${screen.name} level ${level.id}: scrolls sideways`);
    if ([5, 10, 15, 19, 21, 24].includes(level.id)) await shot(page, `${screen.name}-fit-l${level.id}`);
    await touch(page, '[data-action="levels"]');
    await screenIs(page, 'map');
  }
}

async function tour(browser, screen, language) {
  const tag = `${screen.name}-${language}`;
  const { page, problems } = await openPage(browser, { ...screen, language, progress: allOpen(LEVELS) });
  await page.waitForTimeout(800);
  await shot(page, `${tag}-map`);

  // Level 1: the first demo taps the blocks, a wrong number wobbles, the right one starts the curtain call.
  await openLevel(page, 1);
  await page.waitForTimeout(2600);
  await shot(page, `${tag}-l1-demo`);
  let level = await puzzleOn(page);
  await answer(page, await wrongFor(page, level));
  await page.waitForTimeout(300);
  await shot(page, `${tag}-l1-wrong`);
  await ready(page);
  if (!(await page.locator('#dock .tried').count())) problems.push(`${tag}: a wrong token was not dimmed`);
  // Changing language keeps the dimmed token.
  await touch(page, '.language-btn');
  await page.waitForTimeout(300);
  if (!(await page.locator('#dock .tried').count())) problems.push(`${tag}: changing language lost the tried token`);
  await touch(page, '.language-btn');
  await answer(page, level.truth);
  await page.waitForTimeout(1400);
  await shot(page, `${tag}-l1-bow`);
  await ready(page);
  await finishSet(page);
  await screenIs(page, 'won');
  await page.waitForTimeout(500);
  await shot(page, `${tag}-won`);
  await page.waitForSelector('.card-btn.armed');
  await touch(page, '[data-action="map"]');
  await screenIs(page, 'map');

  // Level 6: the "blocks never float" lesson, then the stepper or grid, and ↻ turns the turntable.
  await openLevel(page, 6).catch(() => undefined);
  await page.waitForFunction(() => document.body.dataset.status === 'playing', null, { timeout: 15000 });
  await page.waitForTimeout(400);
  await shot(page, `${tag}-l6`);
  await touch(page, '#board [data-action="turn"]');
  await page.waitForTimeout(900);
  await shot(page, `${tag}-l6-turned`);
  level = await puzzleOn(page);
  await answer(page, level.truth);
  await page.waitForTimeout(level.count * 520 + 900);
  await shot(page, `${tag}-l6-bow`);
  if (!(await page.locator('#board .label-hidden').count())) problems.push(`${tag}: the hidden block didn't come out in the curtain call`);
  await touch(page, '[data-action="levels"]');
  await screenIs(page, 'map');

  // Level 11: a try running out, how fast 🔄 is ready, and fresh stacks after it.
  await openLevel(page, 11);
  level = await puzzleOn(page);
  given.clear();
  for (let miss = 0; miss < 3; miss += 1) {
    await answer(page, await wrongFor(page, level));
    await ready(page);
  }
  await page.evaluate(() => {
    const clock = window;
    document.addEventListener('pointerdown', () => (clock.lastTapAt = performance.now()), true);
    new MutationObserver(() => {
      if (!clock.armedAt && document.querySelector('#dock .retry.armed')) clock.armedAt = performance.now();
    }).observe(document.getElementById('dock'), { subtree: true, attributes: true, childList: true });
  });
  await answer(page, await wrongFor(page, level));
  await page.waitForSelector('#dock .retry.armed', { timeout: 8000 });
  const retryMs = Math.round(await page.evaluate(() => window.armedAt - window.lastTapAt));
  if (retryMs > RETRY_WITHIN_MS) problems.push(`${tag}: 🔄 took ${retryMs}ms to be ready after the losing miss`);
  await page.waitForTimeout(500);
  await shot(page, `${tag}-l11-failed`);
  const failedVariant = level.variant;
  await touch(page, '#dock [data-action="retry"]');
  await page.waitForFunction(() => document.body.dataset.status === 'playing');
  if ((await puzzleOn(page)).variant === failedVariant) problems.push(`${tag}: retry gave the same stack`);
  await touch(page, '[data-action="levels"]');
  await screenIs(page, 'map');

  // Level 18: fill the box, and the new blocks dropping in.
  await openLevel(page, 18);
  await page.waitForTimeout(3500);
  await shot(page, `${tag}-l18-fill`);
  level = await puzzleOn(page);
  await answer(page, level.truth);
  await page.waitForTimeout(level.truth * 520 + 900);
  await shot(page, `${tag}-l18-bow`);
  await touch(page, '[data-action="levels"]');
  await screenIs(page, 'map');

  // Level 21: map cards, a wrong one, then the right one.
  await openLevel(page, 21);
  await page.waitForTimeout(4200);
  await shot(page, `${tag}-l21-maps`);
  level = await puzzleOn(page);
  await answer(page, await wrongFor(page, level));
  await ready(page);
  await answer(page, level.truth);
  await page.waitForTimeout(3000);
  await shot(page, `${tag}-l21-right`);
  await touch(page, '[data-action="levels"]');
  await screenIs(page, 'map');

  // Level 24: left alone, a hand points at the next thing to tap: + on the stepper, the stack elsewhere.
  await openLevel(page, 24);
  await shot(page, `${tag}-l24`);
  await page.waitForTimeout(9000);
  await shot(page, `${tag}-l24-idle`);
  const pointed = await handOn(page);
  const stepper = (await page.locator('#dock .stepper').count()) > 0;
  if (!pointed) problems.push(`${tag}: no hand after a quiet spell`);
  else if (stepper ? !pointed.includes('data-step="1"') : !pointed.includes('canvas')) problems.push(`${tag}: the idle hand rests on ${pointed}`);
  if (stepper) {
    await touch(page, '#dock [data-step="1"]');
    await page.waitForTimeout(9000);
    const then = await handOn(page);
    if (!then?.includes('data-action="ok"')) problems.push(`${tag}: after +, the idle hand rests on ${then}`);
  }

  // A palm and a mashing hand: nothing breaks and the game stays on the level, its win card or the map.
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
  const { page, problems } = await openPage(browser, { motion: 'reduce', shown: ALL_SHOWN });
  await openLevel(page, 1);
  await finishSet(page);
  await screenIs(page, 'won');
  await shot(page, 'calm-won');
  const saved = await page.evaluate(() => localStorage.getItem('playroom:block-count:progress'));
  if (!saved?.includes('"1":3')) problems.push(`calm: the win was not saved (${saved})`);
  await page.reload();
  await page.waitForSelector('body[data-screen="map"]');
  problems.splice(0, problems.length, ...problems.filter((problem) => !problem.startsWith('the page went to')));
  if ((await page.locator('[data-level="2"]').getAttribute('data-open')) !== 'true') problems.push('calm: level 2 did not stay open after a reload');
  await openLevel(page, 1);
  if ((await puzzleOn(page)).variant === 0) problems.push('calm: replaying level 1 gave the same stack');
  await page.context().close();
  return problems;
}

/** A go with the golden block in its first puzzle shows it twirling in the curtain call, and the answers rest meanwhile. */
async function goldenRun(browser) {
  const id = 3;
  let go = 0;
  while (goldenFor(id, go) !== 0) go += 1;
  const { page, problems } = await openPage(browser, { progress: allOpen(LEVELS), shown: ALL_SHOWN, goes: { [id]: go } });
  await openLevel(page, id);
  if ((await page.evaluate(() => document.body.dataset.golden)) !== '0') problems.push('golden: the set has no golden block');
  const level = await puzzleOn(page);
  await answer(page, level.truth);
  await page.waitForTimeout(400);
  if ((await page.evaluate(() => document.getElementById('dock').dataset.waiting)) !== 'true') problems.push('golden: the answers look tappable during the curtain call');
  await shot(page, 'golden-waiting');
  await page.waitForFunction(() => document.getElementById('board').dataset.golden === 'true', null, { timeout: 12000 }).catch(() => problems.push('golden: no block twirled'));
  await page.waitForTimeout(500);
  await shot(page, 'golden-twirl');
  await ready(page);
  if ((await page.evaluate(() => document.getElementById('dock').dataset.waiting)) !== 'false') problems.push('golden: the answers stayed dim on the next stack');
  await page.context().close();
  return problems;
}

async function main() {
  const server = await serve();
  const browser = await launch();
  const problems = [];
  const only = process.env.SCREENS?.split(',');
  try {
    for (const screen of SCREENS.filter((one) => !only || only.includes(one.name))) {
      for (const language of ['en', 'sl']) {
        const found = await tour(browser, screen, language);
        console.log(`${found.length ? '✗' : '✓'} ${screen.name} ${language}`);
        problems.push(...found);
      }
    }
    const golden = await goldenRun(browser);
    console.log(`${golden.length ? '✗' : '✓'} golden block`);
    problems.push(...golden);
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
