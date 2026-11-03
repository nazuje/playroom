// Screens, languages, win cards, mashing and calm mode on the built game. Pictures land in .shots/. Run
// `npx vite build` first. It fails on any error, outside request, sideways scroll, lost progress, a pad under 64px
// (88px on the first world), a pond cut off or under the bar or dock, a wrong tap that doesn't protest or point
// at a friend, a first-world try that fails, a slow retry, an idle hand that doesn't sweep the pads or stops on
// one, a live dock under the win card, mashing the win card anywhere but the next level, or skip going anywhere
// but the next level. The fit is checked on every level at each screen size.
import { LEVELS, SET } from '../src/rules/levels.ts';
import { members } from '../src/rules/play.ts';
import { allOpen, launch, openLevel, openPage, puzzleOn, ready, screenIs, serve, SHOTS, tapCard, tapThing, touch } from './lib.mjs';

const SCREENS = [
  { name: 'phone', width: 390, height: 844 },
  { name: 'small', width: 360, height: 640 },
  { name: 'tablet', width: 1024, height: 768 },
];
const MASH_TAPS = 50;
const TRIES_BEFORE_SKIP = 5;
const RETRY_WITHIN_MS = 1200;

const shot = (page, name) => page.screenshot({ path: `${SHOTS}/${name}.png` });
const dataset = (page) => page.evaluate(() => ({ ...document.body.dataset }));

async function smallTargets(page) {
  return page.locator('#pond .pad, #pond .retry, #dock .skip').evaluateAll((items) => {
    const big = document.body.dataset.big === 'true';
    return items
      .map((item) => ({ item, box: item.getBoundingClientRect() }))
      .filter(({ item, box }) => {
        const least = big && item.classList.contains('pad') ? 88 : item.classList.contains('pad') ? 64 : 48;
        return box.width > 0 && (box.width < least - 0.5 || box.height < least - 0.5);
      })
      .map(({ item, box }) => `${item.className.split(' ')[0]} ${Math.round(box.width)}x${Math.round(box.height)}`);
  });
}

const sideways = (page) => page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);

/** Every pad shows whole inside the pond, under the bar and above the dock, with nothing to scroll. */
const fits = (page) =>
  page.evaluate(() => {
    const problems = [];
    const pond = document.getElementById('pond').getBoundingClientRect();
    const bar = document.getElementById('topbar').getBoundingClientRect();
    const dock = document.getElementById('dock').getBoundingClientRect();
    const buds = document.querySelector('#pond .buds').getBoundingClientRect();
    for (const pad of document.querySelectorAll('#pond .pad')) {
      const box = pad.getBoundingClientRect();
      if (box.top < bar.bottom - 1 || box.top < buds.bottom - 4) problems.push('a pad runs under the bar or the lotus buds');
      if (box.bottom > dock.top + 1) problems.push(`a pad reaches ${Math.round(box.bottom)}, under the dock at ${Math.round(dock.top)}`);
      if (box.left < pond.left - 1 || box.right > pond.right + 1) problems.push('a pad is off the side');
    }
    if (dock.bottom > window.innerHeight + 1) problems.push('the dock is off the bottom');
    if (document.documentElement.scrollHeight > window.innerHeight + 1) problems.push('the page scrolls');
    return [...new Set(problems)];
  });

async function everyLevelFits(page, screen, problems) {
  for (const level of LEVELS) {
    await openLevel(page, level.id);
    await page.waitForTimeout(800);
    const small = await smallTargets(page);
    if (small.length) problems.push(`${screen.name} level ${level.id}: small targets ${[...new Set(small)].join(', ')}`);
    for (const problem of await fits(page)) problems.push(`${screen.name} level ${level.id}: ${problem}`);
    if ((await sideways(page)) > 0) problems.push(`${screen.name} level ${level.id}: scrolls sideways`);
    if ([1, 6, 11, 16, 21, 24].includes(level.id)) await shot(page, `${screen.name}-fit-l${level.id}`);
    await touch(page, '[data-action="levels"]');
    await screenIs(page, 'map');
  }
}

/**
 * Watches the idle hand for a while: whether it swept over the pads, whether they hopped as it passed, and where
 * it is at the end. It must never be left resting on a pad.
 */
const watchNudge = (page, ms) =>
  page.evaluate(async (ms) => {
    const seen = { pads: new Set(), hopped: false };
    const where = () => {
      const finger = document.querySelector('.hand:not([hidden])');
      if (!finger) return 'none';
      const x = parseFloat(finger.style.left);
      const y = parseFloat(finger.style.top);
      const inside = (box) => x >= box.left && x <= box.right && y >= box.top && y <= box.bottom;
      const pad = [...document.querySelectorAll('#pond .pad')].find((one) => inside(one.getBoundingClientRect()));
      return pad ? `pad ${pad.dataset.index}` : 'elsewhere';
    };
    const end = performance.now() + ms;
    while (performance.now() < end) {
      const now = where();
      if (now.startsWith('pad')) seen.pads.add(now);
      if (document.querySelector('#pond .pad.hop')) seen.hopped = true;
      await new Promise((resolve) => setTimeout(resolve, 40));
    }
    return { pads: seen.pads.size, hopped: seen.hopped, rest: where() };
  }, ms);

function nudgeProblems(tag, nudge, count) {
  const problems = [];
  if (nudge.pads < count) problems.push(`${tag}: the idle hand visited ${nudge.pads} of ${count} pads`);
  if (!nudge.hopped) problems.push(`${tag}: the pads did not hop with the idle hand`);
  if (nudge.rest.startsWith('pad')) problems.push(`${tag}: after its sweep the idle hand rests on ${nudge.rest}`);
  return problems;
}

/** Plays the rest of a set right, from whichever puzzle is on now. */
async function finishSet(page) {
  for (;;) {
    await ready(page);
    const now = await dataset(page);
    if (now.screen === 'won') return;
    const puzzle = await puzzleOn(page);
    await tapThing(page, puzzle.answer);
    await page.waitForFunction(() => document.body.dataset.status !== 'playing');
  }
}

async function tour(browser, screen, language) {
  const tag = `${screen.name}-${language}`;
  const { page, problems } = await openPage(browser, { ...screen, language, progress: allOpen(LEVELS) });
  await shot(page, `${tag}-map`);

  // Level 1: the first demo, the idle hand, a tap on the water, wrong taps, then the bounce and the dance.
  await openLevel(page, 1);
  await page.waitForTimeout(1500);
  await shot(page, `${tag}-l1-demo`);
  // On the first world the first nudge comes after about 3.5 seconds: the hand sweeps the pads as they hop.
  await page.waitForTimeout(1900);
  problems.push(...nudgeProblems(`${tag} level 1`, await watchNudge(page, 3600), 4));
  await page.touchscreen.tap(screen.width / 2, (await page.locator('#dock').boundingBox()).y - 12);
  await page.waitForTimeout(60);
  if (!(await page.locator('#pond .pad.hop').count())) problems.push(`${tag}: tapping the water made no pad hop`);
  await ready(page);
  let puzzle = await puzzleOn(page);
  const [wrong] = members(puzzle);
  await tapThing(page, wrong);
  await page.waitForTimeout(200);
  await shot(page, `${tag}-l1-wrong`);
  if (!(await page.locator('#pond .pad.protest, #pond .pad.flash').count())) problems.push(`${tag}: a wrong tap did not protest`);
  if (!(await page.locator('#pond .bubble').count())) problems.push(`${tag}: a wrong tap showed no ✋`);
  if ((await page.locator('#pond .pad.linked').count()) !== 2) problems.push(`${tag}: a wrong tap did not light up one friend with it`);
  await ready(page);
  if ((await page.locator('#pond .pad.tried').count()) !== 1) problems.push(`${tag}: the wrong one was not dimmed`);
  // The first world never fails a try: even every wrong tap leaves the set going.
  for (const more of members(puzzle).filter((at) => at !== wrong)) {
    await tapThing(page, more);
    await ready(page);
  }
  const going = await dataset(page);
  if (going.status !== 'playing' || (await page.locator('#pond .retry').count())) problems.push(`${tag}: three misses ended a first-world try`);
  await tapThing(page, puzzle.answer);
  await page.waitForTimeout(300);
  await shot(page, `${tag}-l1-bounce`);
  await page.waitForTimeout(700);
  await shot(page, `${tag}-l1-dance`);
  await ready(page);
  const lit = await page.locator('#pond .bud-on').count();
  if (lit !== 1) problems.push(`${tag}: ${lit} lotuses open after the first puzzle`);
  await finishSet(page);
  await page.waitForTimeout(100);
  if (await page.locator('#dock > *').evaluateAll((parts) => parts.some((part) => getComputedStyle(part).visibility !== 'hidden'))) {
    problems.push(`${tag}: something in the dock still shows under the win card`);
  }
  const next = await page.locator('[data-action="next"]').boundingBox();
  if (next) await page.touchscreen.tap(next.x + next.width / 2, next.y + next.height / 2);
  if ((await dataset(page)).screen !== 'won') problems.push(`${tag}: the win card took a tap at once`);
  await page.waitForTimeout(400);
  await shot(page, `${tag}-won`);
  await tapCard(page, 'map');
  await screenIs(page, 'map');

  // Level 9: a try running out, everyone falling in, and a quick retry onto a fresh set.
  await openLevel(page, 9);
  puzzle = await puzzleOn(page);
  const failedGo = puzzle.go;
  const wrongs = members(puzzle);
  for (const [at, one] of wrongs.entries()) {
    await tapThing(page, one);
    if (at < wrongs.length - 1) await ready(page);
  }
  const tapped = Date.now();
  await page.waitForSelector('#pond .retry.armed', { timeout: 8000 });
  const waited = Date.now() - tapped;
  if (waited > RETRY_WITHIN_MS) problems.push(`${tag}: the retry took ${waited} ms to be ready`);
  await page.waitForTimeout(500);
  await shot(page, `${tag}-l9-sunk`);
  await touch(page, '#pond [data-action="retry"]');
  await page.waitForFunction(() => document.body.dataset.status === 'playing');
  if ((await puzzleOn(page)).go < failedGo + SET) problems.push(`${tag}: retry did not bring a fresh set`);
  await touch(page, '[data-action="levels"]');
  await screenIs(page, 'map');

  // Level 16: changing language keeps the dimmed one.
  await openLevel(page, 16);
  puzzle = await puzzleOn(page);
  await tapThing(page, members(puzzle)[0]);
  await ready(page);
  await touch(page, '.language-btn');
  await page.waitForTimeout(300);
  if ((await page.locator('#pond .pad.tried').count()) !== 1) problems.push(`${tag}: changing language lost the dimmed one`);
  await touch(page, '.language-btn');
  await shot(page, `${tag}-l16`);
  await touch(page, '[data-action="levels"]');
  await screenIs(page, 'map');

  // Level 19: the mirror puzzle, right, to see the friends turn upright.
  await openLevel(page, 19);
  await page.waitForTimeout(3500);
  puzzle = await puzzleOn(page);
  await tapThing(page, puzzle.answer);
  await page.waitForTimeout(1300);
  await shot(page, `${tag}-l19-align`);
  await touch(page, '[data-action="levels"]');
  await screenIs(page, 'map');

  // Level 24 left alone: after 8 seconds the hand sweeps the pads and leaves.
  await openLevel(page, 24);
  await shot(page, `${tag}-l24`);
  await page.waitForTimeout(7900);
  problems.push(...nudgeProblems(`${tag} level 24`, await watchNudge(page, 3000), 6));

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

  if ((await dataset(page)).screen !== 'map') {
    await page.waitForSelector('[data-action="levels"]:not([hidden])', { timeout: 8000 }).catch(() => undefined);
    await touch(page, '[data-action="levels"]').catch(() => undefined);
  }
  await screenIs(page, 'map');
  await everyLevelFits(page, { name: tag }, problems);
  await page.context().close();
  return problems;
}

/** Fails a try by tapping friends until it runs out, and waits for the retry button. */
async function loseTry(page) {
  for (;;) {
    await ready(page);
    if ((await dataset(page)).status === 'failed') break;
    const puzzle = await puzzleOn(page);
    const tried = await page.locator('#pond .pad.tried').evaluateAll((pads) => pads.map((pad) => Number(pad.dataset.index)));
    await tapThing(page, members(puzzle).find((at) => !tried.includes(at)));
    await page.waitForFunction(() => document.body.dataset.status !== 'playing');
  }
  await page.waitForSelector('#pond .retry.armed', { timeout: 8000 });
}

async function loseUntilSkip(page) {
  for (let tries = 1; tries <= TRIES_BEFORE_SKIP; tries += 1) {
    await loseTry(page);
    if (tries < TRIES_BEFORE_SKIP) {
      await touch(page, '#pond [data-action="retry"]');
      await page.waitForFunction(() => document.body.dataset.status === 'playing');
    }
  }
}

/** The win card after lost tries, mashing on the win card, and where skip goes. */
async function cardRun(browser) {
  const { page, problems } = await openPage(browser, { progress: allOpen(LEVELS) });

  // Level 9: five lost tries bring the skip button. Then a win: nothing in the dock, skip included, takes a tap.
  await openLevel(page, 9);
  await loseUntilSkip(page);
  const skip = await page.locator('#dock [data-action="skip"]').boundingBox();
  if (!skip) problems.push('cards: no skip button after 5 lost tries');
  await shot(page, 'cards-skip');
  await touch(page, '#pond [data-action="retry"]');
  await page.waitForFunction(() => document.body.dataset.status === 'playing');
  await finishSet(page);
  await screenIs(page, 'won');
  if (Number((await dataset(page)).stars) !== 1) problems.push('cards: a win after 15 misses did not get 1 star');
  if (skip) {
    for (const wait of [100, 800]) {
      await page.waitForTimeout(wait);
      await page.touchscreen.tap(skip.x + skip.width / 2, skip.y + skip.height / 2);
    }
    await page.waitForTimeout(400);
    const now = await dataset(page);
    if (now.screen !== 'won') problems.push(`cards: tapping where skip was left the win card for ${now.screen} level ${now.level}`);
  }
  if (await page.locator('#dock [data-action="skip"]').count()) problems.push('cards: the skip button is still in the dock under the win card');

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

  // The last level brings the finale.
  await touch(page, '[data-action="levels"]');
  await screenIs(page, 'map');
  await openLevel(page, 24);
  await finishSet(page);
  await screenIs(page, 'won');
  await page.waitForTimeout(1200);
  await shot(page, 'cards-finale');
  if ((await dataset(page)).finale !== 'true') problems.push('cards: no finale after the last level');
  await page.context().close();
  return problems;
}

async function calmRun(browser) {
  const { page, problems } = await openPage(browser, { motion: 'reduce' });
  await openLevel(page, 1);
  await finishSet(page);
  await screenIs(page, 'won');
  await shot(page, 'calm-won');
  const saved = await page.evaluate(() => localStorage.getItem('playroom:odd-one-out:progress'));
  if (!saved?.includes('"1":3')) problems.push(`calm: the win was not saved (${saved})`);
  await page.reload();
  await page.waitForSelector('body[data-screen="map"]');
  // That reload was on purpose.
  problems.splice(0, problems.length, ...problems.filter((problem) => !problem.startsWith('the page went to')));
  if ((await page.locator('[data-level="2"]').getAttribute('data-open')) !== 'true') problems.push('calm: level 2 did not stay open after a reload');
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
    console.log(`${cards.length ? '✗' : '✓'} win cards, skip and finale`);
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
