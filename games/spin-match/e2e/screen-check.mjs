// Screens, languages, wrong choices, win cards, mashing and calm mode on the built game. Pictures land in .shots/.
// Run `npx vite build` first. It fails on any error, outside request, sideways scroll, lost progress, a target under
// 64px (88px on the first world), a pool or sand bed cut off or overlapping, a first-world try that fails, a slow
// retry, a backwards critter that doesn't flip, a moved tile that doesn't light up, ↻ that doesn't turn the target
// or doesn't cost the third star on the mirror world, an idle hand that doesn't sweep the sand or rests on a
// critter, a live sand bed under the win card, mashing the win card anywhere but the next level, or skip going
// anywhere but the next level. The fit is checked on every level at each screen size.
import { LEVELS, SET } from '../src/rules/levels.ts';
import { pairKey } from '../src/rules/play.ts';
import { allPairs } from '../src/rules/solve.ts';
import { allOpen, launch, openLevel, openPage, pickOption, pickPair, puzzleOn, ready, screenIs, serve, SHOTS, tapCard, touch } from './lib.mjs';

const SCREENS = [
  { name: 'phone', width: 390, height: 844 },
  { name: 'small', width: 360, height: 640 },
  { name: 'tablet', width: 1024, height: 768 },
];
const MASH_TAPS = 50;
const TRIES_BEFORE_SKIP = 5;
const RETRY_WITHIN_MS = 1200;

const shot = (page, name) => page.screenshot({ path: `${SHOTS}/${name}.png` });
const wrongOf = (puzzle) => puzzle.options.map((_, at) => at).filter((at) => at !== puzzle.answer);
const wrongPairsOf = (puzzle) => allPairs(puzzle.options.length).filter(([a, b]) => pairKey(a, b) !== pairKey(...puzzle.pair));
const dataset = (page) => page.evaluate(() => ({ ...document.body.dataset }));

async function smallTargets(page) {
  return page.locator('#dock .pebble, #dock .retry, #board .helper, #board .target, #board .slot').evaluateAll((items) => {
    const big = document.body.dataset.big === 'true';
    return items
      .map((item) => ({ item, box: item.getBoundingClientRect() }))
      .filter(({ item, box }) => {
        const least = big && (item.classList.contains('pebble') || item.classList.contains('helper')) ? 88 : 64;
        return box.width > 0 && (box.width < least - 0.5 || box.height < least - 0.5);
      })
      .map(({ item, box }) => `${item.className.split(' ')[0]} ${Math.round(box.width)}x${Math.round(box.height)}`);
  });
}

const sideways = (page) => page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);

/** The pool and the sand bed both show whole, one above the other, with nothing to scroll. */
const fits = (page) =>
  page.evaluate(() => {
    const problems = [];
    const pool = document.querySelector('#board .pond, #board .tray').getBoundingClientRect();
    const helper = document.querySelector('#board .helper')?.getBoundingClientRect();
    const bar = document.getElementById('topbar').getBoundingClientRect();
    const dock = document.getElementById('dock').getBoundingClientRect();
    const bed = document.querySelector('#dock .bed')?.getBoundingClientRect();
    const lowest = Math.max(pool.bottom, helper?.bottom ?? 0);
    if (pool.top < bar.bottom - 1) problems.push('the pool runs under the top bar');
    if (lowest > dock.top + 1) problems.push(`the pool reaches ${Math.round(lowest)}, under the sand at ${Math.round(dock.top)}`);
    if (pool.left < 0 || pool.right > window.innerWidth || (helper && helper.right > window.innerWidth)) problems.push('the pool is off the side');
    if (bed && (bed.left < 0 || bed.right > window.innerWidth)) problems.push('the sand bed is off the side');
    if (dock.bottom > window.innerHeight + 1) problems.push('the sand bed is off the bottom');
    if (document.documentElement.scrollHeight > window.innerHeight + 1) problems.push('the page scrolls');
    return problems;
  });

async function everyLevelFits(page, screen, problems) {
  for (const level of LEVELS) {
    await openLevel(page, level.id);
    await page.waitForTimeout(60);
    const small = await smallTargets(page);
    if (small.length) problems.push(`${screen.name} level ${level.id}: small targets ${[...new Set(small)].join(', ')}`);
    for (const problem of await fits(page)) problems.push(`${screen.name} level ${level.id}: ${problem}`);
    if ((await sideways(page)) > 0) problems.push(`${screen.name} level ${level.id}: scrolls sideways`);
    if ([1, 9, 14, 19, 22, 24].includes(level.id)) await shot(page, `${screen.name}-fit-l${level.id}`);
    await touch(page, '[data-action="levels"]');
    await screenIs(page, 'map');
  }
}

/**
 * Watches the idle hand for a while: whether it swept over the sand, whether the critters hopped as it passed, and
 * where it rests at the end. It must come back to the target, never stop on a critter.
 */
const watchNudge = (page, ms) =>
  page.evaluate(async (ms) => {
    const seen = { sand: false, bounced: false };
    const where = () => {
      const finger = document.querySelector('.hand:not([hidden])');
      if (!finger) return 'none';
      const x = parseFloat(finger.style.left);
      const y = parseFloat(finger.style.top);
      const inside = (box) => x >= box.left && x <= box.right && y >= box.top && y <= box.bottom;
      if ([...document.querySelectorAll('#dock .pebble')].some((one) => inside(one.getBoundingClientRect()))) return 'critter';
      return inside(document.querySelector('#board .target, #board .tray').getBoundingClientRect()) ? 'target' : 'elsewhere';
    };
    const end = performance.now() + ms;
    while (performance.now() < end) {
      if (where() === 'critter') seen.sand = true;
      if (document.querySelector('#dock .pebble.bounce')) seen.bounced = true;
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
    return { ...seen, rest: where() };
  }, ms);

function nudgeProblems(tag, nudge) {
  const problems = [];
  if (!nudge.sand) problems.push(`${tag}: the idle hand never travelled over the sand`);
  if (!nudge.bounced) problems.push(`${tag}: the critters did not hop with the idle hand`);
  if (nudge.rest !== 'target') problems.push(`${tag}: after its sweep the idle hand rests at ${nudge.rest}, not the target`);
  return problems;
}

/** Plays the rest of a set right, from whichever puzzle is on now. */
async function finishSet(page) {
  for (;;) {
    await ready(page);
    const now = await dataset(page);
    if (now.screen === 'won') return;
    const puzzle = await puzzleOn(page);
    if (puzzle.kind === 'pairs') await pickPair(page, ...puzzle.pair);
    else await pickOption(page, puzzle.answer);
    await page.waitForFunction(() => document.body.dataset.status !== 'playing');
  }
}

async function tour(browser, screen, language) {
  const tag = `${screen.name}-${language}`;
  const { page, problems } = await openPage(browser, { ...screen, language, progress: allOpen(LEVELS) });
  await shot(page, `${tag}-map`);

  // Level 1: the first demo turns the target with ↻, then the nudge, a tap on the target, ↻ by hand and a miss.
  await openLevel(page, 1);
  await page.waitForTimeout(1300);
  await shot(page, `${tag}-l1-demo`);
  await page.waitForTimeout(2300);
  await shot(page, `${tag}-l1-nudge`);
  problems.push(...nudgeProblems(`${tag} level 1`, await watchNudge(page, 2600)));
  await touch(page, '#board .target');
  await page.waitForTimeout(60);
  if ((await page.locator('#dock .pebble.bounce').count()) !== 2) problems.push(`${tag}: tapping the target did not bounce the critters`);
  const before = (await dataset(page)).turned;
  await touch(page, '#board .helper');
  await page.waitForTimeout(500);
  if ((await dataset(page)).turned === before) problems.push(`${tag}: ↻ did not turn the target`);
  await shot(page, `${tag}-l1-turned`);
  let puzzle = await puzzleOn(page);
  await pickOption(page, wrongOf(puzzle)[0]);
  await page.waitForTimeout(500);
  await shot(page, `${tag}-l1-wrong`);
  await ready(page);
  if ((await page.locator('#dock .pebble.tried').count()) !== 1) problems.push(`${tag}: the wrong critter was not dimmed`);
  await pickOption(page, puzzle.answer);
  await page.waitForTimeout(420);
  await shot(page, `${tag}-l1-spin`);
  await ready(page);
  if ((await page.locator('#board .pearl-on').count()) !== 1) problems.push(`${tag}: no pearl lit after the first puzzle`);
  // The first world never fails a try: a miss on every puzzle leaves the set going.
  puzzle = await puzzleOn(page);
  await pickOption(page, wrongOf(puzzle)[0]);
  await ready(page);
  const going = await dataset(page);
  if (going.status !== 'playing' || (await page.locator('#dock .retry').count())) problems.push(`${tag}: two misses ended a first-world try`);
  await finishSet(page);
  await page.waitForTimeout(100);
  if (await page.locator('#dock > *').evaluateAll((parts) => parts.some((part) => getComputedStyle(part).visibility !== 'hidden'))) {
    problems.push(`${tag}: something on the sand still shows under the win card`);
  }
  const next = await page.locator('[data-action="next"]').boundingBox();
  if (next) await page.touchscreen.tap(next.x + next.width / 2, next.y + next.height / 2);
  if ((await dataset(page)).screen !== 'won') problems.push(`${tag}: the win card took a tap at once`);
  await page.waitForTimeout(400);
  await shot(page, `${tag}-won`);
  await tapCard(page, 'map');
  await screenIs(page, 'map');

  // Level 9: a try running out, the dizzy critters and a quick retry onto a fresh set.
  await openLevel(page, 9);
  puzzle = await puzzleOn(page);
  const failedGo = puzzle.go;
  const wrongs = wrongOf(puzzle);
  await pickOption(page, wrongs[0]);
  await ready(page);
  await pickOption(page, wrongs[1]);
  const tapped = Date.now();
  await page.waitForSelector('#dock .retry.armed', { timeout: 8000 });
  const waited = Date.now() - tapped;
  if (waited > RETRY_WITHIN_MS) problems.push(`${tag}: the retry took ${waited} ms to be ready`);
  await page.waitForTimeout(400);
  await shot(page, `${tag}-l9-dizzy`);
  await touch(page, '#dock [data-action="retry"]');
  await page.waitForFunction(() => document.body.dataset.status === 'playing');
  if ((await puzzleOn(page)).go < failedGo + SET) problems.push(`${tag}: retry did not bring a fresh set`);
  await touch(page, '[data-action="levels"]');
  await screenIs(page, 'map');

  // Level 10: the mirror demo, then a backwards critter flips and keeps its 🪞, and changing language keeps it.
  await openLevel(page, 10);
  await page.waitForTimeout(1500);
  await shot(page, `${tag}-l10-demo`);
  await page.waitForTimeout(1800);
  puzzle = await puzzleOn(page);
  await pickOption(page, puzzle.slips.indexOf('mirror'));
  await page.waitForTimeout(450);
  if (!(await page.locator('#dock .pebble .art.flip').count())) problems.push(`${tag}: a backwards critter did not flip over`);
  await shot(page, `${tag}-l10-flip`);
  await ready(page);
  if (!(await page.locator('#dock .pebble.tried.backwards .badge').count())) problems.push(`${tag}: a backwards critter lost its mirror badge`);
  await touch(page, '.language-btn');
  await page.waitForTimeout(300);
  if ((await page.locator('#dock .pebble.tried').count()) !== 1) problems.push(`${tag}: changing language lost the tried critter`);
  await touch(page, '.language-btn');
  await touch(page, '[data-action="levels"]');
  await screenIs(page, 'map');

  // Level 12: a critter with one tile moved lights that tile up and outlines where it belongs.
  await openLevel(page, 12);
  puzzle = await puzzleOn(page);
  await pickOption(page, puzzle.slips.indexOf('moved'));
  await page.waitForTimeout(450);
  if ((await page.locator('#dock .pebble .tile.odd').count()) !== 1) problems.push(`${tag}: a moved tile did not light up`);
  if ((await page.locator('#dock .pebble .ghost-tile').count()) !== 1) problems.push(`${tag}: there is no outline where the moved tile belongs`);
  await shot(page, `${tag}-l12-moved`);
  await touch(page, '[data-action="levels"]');
  await screenIs(page, 'map');

  // Level 23: "which two are the same?": a wrong pair shows what is wrong in the second slot, then the right pair.
  await openLevel(page, 23);
  puzzle = await puzzleOn(page);
  await pickPair(page, ...wrongPairsOf(puzzle)[0]);
  await page.waitForTimeout(450);
  await shot(page, `${tag}-l23-wrong`);
  await ready(page);
  if ((await dataset(page)).selected !== '') problems.push(`${tag}: a wrong pair stayed picked`);
  await pickPair(page, ...puzzle.pair);
  await page.waitForTimeout(500);
  await shot(page, `${tag}-l23-spin`);
  await ready(page);
  if ((await page.locator('#board .pearl-on').count()) !== 1) problems.push(`${tag}: no pearl lit after the right pair`);
  await touch(page, '[data-action="levels"]');
  await screenIs(page, 'map');

  // Level 24 left alone: after 8 seconds the hand sweeps the cards and comes back to the tray.
  await openLevel(page, 24);
  await shot(page, `${tag}-l24`);
  await page.waitForTimeout(8300);
  await shot(page, `${tag}-l24-idle`);
  problems.push(...nudgeProblems(`${tag} level 24`, await watchNudge(page, 3600)));

  // A palm and a mashing hand: nothing breaks and the game stays put.
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
    if ((await dataset(page)).screen !== 'map') {
      await page.waitForSelector('[data-action="levels"]:not([hidden])', { timeout: 8000 }).catch(() => undefined);
      await touch(page, '[data-action="levels"]').catch(() => undefined);
    }
    await screenIs(page, 'map');
    await everyLevelFits(page, screen, problems);
  }
  await page.context().close();
  return problems;
}

/** Fails a try by tapping wrong critters until it runs out, and waits for the retry button. */
async function loseTry(page) {
  for (;;) {
    await ready(page);
    if ((await dataset(page)).status === 'failed') break;
    const puzzle = await puzzleOn(page);
    const tried = await page.locator('#dock .pebble.tried').evaluateAll((all) => all.map((one) => Number(one.dataset.option)));
    await pickOption(page, wrongOf(puzzle).find((at) => !tried.includes(at)));
    await page.waitForFunction(() => document.body.dataset.status !== 'playing');
  }
  await page.waitForSelector('#dock .retry.armed', { timeout: 8000 });
}

async function loseUntilSkip(page) {
  for (let tries = 1; tries <= TRIES_BEFORE_SKIP; tries += 1) {
    await loseTry(page);
    if (tries < TRIES_BEFORE_SKIP) {
      await touch(page, '#dock [data-action="retry"]');
      await page.waitForFunction(() => document.body.dataset.status === 'playing');
    }
  }
}

/** The win card after lost tries, ↻ as a hint on the mirror world, mashing on the win card, and where skip goes. */
async function cardRun(browser) {
  const { page, problems } = await openPage(browser, { progress: allOpen(LEVELS) });

  // Level 9: five lost tries bring the skip button. Then a win: nothing on the sand, skip included, takes a tap.
  await openLevel(page, 9);
  await loseUntilSkip(page);
  const skip = await page.locator('#dock [data-action="skip"]').boundingBox();
  if (!skip) problems.push('cards: no skip button after 5 lost tries');
  await touch(page, '#dock [data-action="retry"]');
  await page.waitForFunction(() => document.body.dataset.status === 'playing');
  await finishSet(page);
  await screenIs(page, 'won');
  await shot(page, 'cards-won-after-skip');
  if (skip) {
    for (const wait of [100, 800]) {
      await page.waitForTimeout(wait);
      await page.touchscreen.tap(skip.x + skip.width / 2, skip.y + skip.height / 2);
    }
    await page.waitForTimeout(400);
    const now = await dataset(page);
    if (now.screen !== 'won') problems.push(`cards: tapping where skip was left the win card for ${now.screen} level ${now.level}`);
  }
  if (await page.locator('#dock [data-action="skip"]').count()) problems.push('cards: the skip button is still on the sand under the win card');

  // Level 13: ↻ is a hint on the mirror world, so a set with no miss but one turn earns 2 stars, even after a reload.
  await tapCard(page, 'map');
  await screenIs(page, 'map');
  await openLevel(page, 13);
  await touch(page, '#board .helper');
  await page.waitForTimeout(200);
  const hints = await page.evaluate(() => localStorage.getItem('playroom:spin-match:hints'));
  if (!hints?.includes('13')) problems.push(`cards: ↻ on the mirror world was not saved as a hint (${hints})`);
  await finishSet(page);
  await screenIs(page, 'won');
  if ((await dataset(page)).stars !== '2') problems.push(`cards: a set solved with ↻ on the mirror world got ${(await dataset(page)).stars} stars, not 2`);
  await shot(page, 'cards-won-with-hint');

  // Mashing the win card from the moment it shows only ever moves on to the next level.
  await tapCard(page, 'map');
  await screenIs(page, 'map');
  await openLevel(page, 10);
  await finishSet(page);
  await screenIs(page, 'won');
  const card = await page.locator('#overlay .card').boundingBox();
  for (let tap = 0; tap < 40; tap += 1) {
    await page.touchscreen.tap(card.x + 10 + ((tap * 67) % (card.width - 20)), card.y + 10 + ((tap * 113) % (card.height - 20)));
    await page.waitForTimeout(50);
  }
  await page.waitForTimeout(300);
  const mashed = await dataset(page);
  if (mashed.screen === 'map' || (mashed.screen === 'play' && mashed.level !== '11')) {
    problems.push(`cards: mashing the win card went to ${mashed.screen} level ${mashed.level}, not level 11`);
  }
  await shot(page, 'cards-after-mash');

  // Level 12: skip moves on to level 13, the next in order.
  if ((await dataset(page)).screen !== 'map') {
    await touch(page, '[data-action="levels"]').catch(() => undefined);
    await screenIs(page, 'map');
  }
  await openLevel(page, 12);
  await loseUntilSkip(page);
  await touch(page, '#dock [data-action="skip"]');
  await page.waitForFunction(() => document.body.dataset.screen !== 'play' || document.body.dataset.level !== '12');
  const skipped = await dataset(page);
  if (skipped.level !== '13') problems.push(`cards: skip on level 12 went to ${skipped.screen} level ${skipped.level}, not 13`);
  await page.context().close();
  return problems;
}

async function calmRun(browser) {
  const { page, problems } = await openPage(browser, { motion: 'reduce' });
  await openLevel(page, 1);
  await finishSet(page);
  await screenIs(page, 'won');
  await shot(page, 'calm-won');
  const saved = await page.evaluate(() => localStorage.getItem('playroom:spin-match:progress'));
  if (!saved?.includes('"1":3')) problems.push(`calm: the win was not saved (${saved})`);
  await page.reload();
  await page.waitForSelector('body[data-screen="map"]');
  // That reload was on purpose.
  problems.splice(0, problems.length, ...problems.filter((problem) => !problem.startsWith('the page went to')));
  if ((await page.locator('[data-level="2"]').getAttribute('data-open')) !== 'true') problems.push('calm: level 2 did not stay open after a reload');
  // A replay after the reload is a fresh set.
  await openLevel(page, 1);
  if ((await puzzleOn(page)).go < SET) problems.push('calm: replaying level 1 gave the same puzzles');
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
    const cards = await cardRun(browser);
    console.log(`${cards.length ? '✗' : '✓'} win cards, ↻ as a hint and skip`);
    problems.push(...cards);
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
