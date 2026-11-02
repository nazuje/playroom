// Every screen at four sizes and in both languages, with a 50-tap mash on each, then the checks no
// single bot covers: a language switch mid-quest, keyboard and mouse, reduced motion and the
// draw-call budget on a heavily decorated island.
import { freshSave, heavySave, midSave } from './fixtures.mjs';
import { body, fail, goUse, hold, islandCount, launch, mash, openPage, panelIs, readSave, screenIs, serve, shot, touch } from './lib.mjs';
import { followQuests } from './quest-bot.mjs';

const SIZES = [
  [390, 844],
  [768, 1024],
  [844, 390],
  [1280, 800],
];
const MOST_DRAWS = 100;
const SCREENS = new Set(['islands', 'avatar', 'creator', 'play', 'house', 'decor', 'wardrobe']);
const wait = (page, ms) => page.waitForTimeout(ms);
let drawPeak = 0;

function check(problems, ok, message) {
  if (!ok) fail(problems, message);
  console.log(`  ok: ${message}`);
}

/** Nothing off the edge, nothing on top of anything else in the top bar, and no sideways scroll. */
async function layoutProblems(page) {
  return page.evaluate(() => {
    const out = [];
    const { innerWidth: width, innerHeight: height } = window;
    if (document.documentElement.scrollWidth > width + 1) out.push('the page scrolls sideways');
    const boxes = [...document.querySelectorAll('#topbar > *, #topbar .chip')]
      .filter((each) => !each.hidden && each.getClientRects().length && !each.classList.contains('hud') && !each.classList.contains('title'))
      .map((each) => ({ name: each.className || each.id, box: each.getBoundingClientRect() }));
    for (const [index, { name, box }] of boxes.entries()) {
      if (box.left < -1 || box.right > width + 1 || box.top < -1 || box.bottom > height + 1) out.push(`${name} is off screen`);
      for (const other of boxes.slice(index + 1)) {
        const overlap = Math.min(box.right, other.box.right) - Math.max(box.left, other.box.left) > 2 && Math.min(box.bottom, other.box.bottom) - Math.max(box.top, other.box.top) > 2;
        if (overlap) out.push(`${name} overlaps ${other.name}`);
      }
    }
    return out;
  });
}

async function look(page, problems, name) {
  await wait(page, 450);
  await shot(page, name);
  const bad = await layoutProblems(page);
  if (bad.length) fail(problems, `${name}: ${bad.join(', ')}`);
  drawPeak = Math.max(drawPeak, Number((await body(page, 'drawPeak')) || 0));
}

/** Fifty taps anywhere, then the game must still be in one piece and still answer. */
async function mashed(page, problems, name, seed, language) {
  await mash(page, 50, seed);
  await wait(page, 700);
  const screen = await body(page, 'screen');
  if (!SCREENS.has(screen)) fail(problems, `${name}: after the mash the screen is "${screen}"`);
  if (problems.length) fail(problems, `${name}: problems after the mash`);
  drawPeak = Math.max(drawPeak, Number((await body(page, 'drawPeak')) || 0));
  // The mash may well have pressed the flag, and the next screen should be in the language under test.
  await page.evaluate((chosen) => localStorage.setItem('playroom:language', JSON.stringify(chosen)), language);
  await page.reload();
  await screenIs(page, 'islands');
  const kept = await readSave(page, 0);
  if (!kept || kept.quests.done !== 30) fail(problems, `${name}: the mash hurt the saved island`);
}

const PICK_ISLAND = { en: 'Pick your island!', sl: 'Izberi svoj otok!' };
const PLAYING = new Set(['play', 'house', 'decor', 'wardrobe']);

/**
 * Fifty taps on a new island, the way the tester's mash once left it and made another. Nothing may
 * switch islands or make one. The home link leaves the game for the portal, so a mash that hits it
 * stops there.
 */
async function playMash(page, problems, tag, language) {
  const { width, height } = page.viewportSize();
  let left = false;
  page.on('framenavigated', (frame) => {
    if (frame === page.mainFrame()) left = true;
  });
  for (const seed of [3, 19, 23]) {
    await page.reload();
    await screenIs(page, 'islands');
    const before = await islandCount(page);
    await touch(page, '.slot[data-slot="0"]');
    await screenIs(page, 'play');
    await wait(page, 300);
    const said = await page.locator('#bubble').textContent();
    if (said.includes(PICK_ISLAND[language])) fail(problems, `${tag}: the picker's line is still in the bubble: "${said}"`);
    if (seed === 3) await shot(page, `enter-${tag}`);
    left = false;
    let value = seed;
    const random = () => {
      value = (value * 16807) % 2147483647;
      return value / 2147483647;
    };
    const guarded = [];
    for (let tap = 0; tap < 50 && !left; tap += 1) {
      const [x, y] = [Math.floor(random() * width), Math.floor(random() * height)];
      const on = await page.evaluate(([px, py]) => document.elementFromPoint(px, py)?.closest('.hold-btn')?.dataset.action ?? '', [x, y]).catch(() => '');
      if (on) guarded.push(on);
      await page.touchscreen.tap(x, y).catch(() => {});
    }
    await wait(page, 700);
    if (left) {
      await screenIs(page, 'islands');
    } else {
      const screen = await body(page, 'screen');
      if (!PLAYING.has(screen) || (await body(page, 'slot')) !== '0') fail(problems, `${tag} seed ${seed}: the mash left the island for "${screen}", slot ${await body(page, 'slot')}`);
    }
    const after = await islandCount(page);
    if (after !== before) fail(problems, `${tag} seed ${seed}: the mash changed the islands from ${before} to ${after}`);
    check(problems, true, `${tag} seed ${seed}: 50 taps in play kept island 0 and ${after} islands${guarded.length ? ` (held buttons tapped: ${guarded.join(', ')})` : ''}${left ? ', then left by the home link' : ''}`);
  }
}

async function mashInPlay(browser, [width, height], language) {
  const tag = `${width}x${height}-${language}`;
  const { page, context, problems } = await openPage(browser, { width, height, language, saves: { 0: freshSave(), 1: midSave() } });
  await playMash(page, problems, tag, language);
  if (problems.length) fail(problems, `${tag}: problems in the play mash`);
  await context.close();
}

async function openHeavy(page) {
  await touch(page, '.slot[data-slot="0"]');
  await screenIs(page, 'play');
  await wait(page, 600);
}

/** The screens every size gets, mashed once each. */
async function tour(browser, [width, height], language, full) {
  const tag = `${width}x${height}-${language}`;
  console.log(tag);
  const { page, context, problems } = await openPage(browser, { width, height, language, saves: { 0: heavySave().save } });
  const steps = [
    ['islands', async () => {}],
    ['avatar', async () => {
      await touch(page, '.slot[data-state="empty"]');
      await screenIs(page, 'avatar');
    }],
    ['creator', async () => {
      await touch(page, '.slot[data-state="empty"]');
      await screenIs(page, 'avatar');
      await touch(page, '[data-avatar="3"]');
      await screenIs(page, 'creator');
      await touch(page, '[data-tab="hat"]');
    }],
    ['play', () => openHeavy(page)],
    ['house', async () => {
      await openHeavy(page);
      await goUse(page, 'place:house', { expect: 'body[data-screen="house"]' });
      await screenIs(page, 'house');
    }],
    ['decor', async () => {
      await openHeavy(page);
      await touch(page, '#decor');
      await screenIs(page, 'decor');
      await touch(page, '[data-item], [data-buy]');
    }],
    ['wardrobe', async () => {
      await openHeavy(page);
      await goUse(page, 'place:wardrobe', { expect: 'body[data-screen="wardrobe"]' });
      await screenIs(page, 'wardrobe');
    }],
  ];
  const panels = [
    ['seeds', 'plot:11'],
    ['bakery', 'place:bakery'],
    ['pets', 'place:pets'],
    ['care', 'pet:4'],
    ['give', 'friend:moko'],
    ['fishing', 'place:fishing'],
  ];
  if (full) {
    for (const [panel, target] of panels) {
      steps.push([panel, async () => {
        await openHeavy(page);
        await goUse(page, target, { expect: `body[data-panel="${panel}"]` });
        await panelIs(page, panel);
      }]);
    }
    steps.push(['book', async () => {
      await openHeavy(page);
      await touch(page, '#book');
      await panelIs(page, 'book');
    }]);
  }
  for (const [index, [name, reach]] of steps.entries()) {
    await reach();
    await look(page, problems, `screen-${tag}-${name}`);
    await mashed(page, problems, `${tag} ${name}`, index * 31 + width, language);
  }
  check(problems, problems.length === 0, `${tag}: ${steps.length} screens, each mashed with 50 taps`);
  await context.close();
}

async function languageMidQuest(browser) {
  console.log('language switch mid-quest');
  const { page, context, problems } = await openPage(browser, { language: 'en' });
  await touch(page, '.slot[data-state="empty"]');
  await touch(page, '[data-avatar="0"]');
  await hold(page, '[data-action="go"]');
  await screenIs(page, 'play');
  await wait(page, 1500);
  await goUse(page, 'friend:tobi');
  check(problems, (await body(page, 'questStage')) === 'active', 'Tobi gave the first quest');
  const english = await page.locator('#bubble').textContent();
  await touch(page, '.language-btn');
  await wait(page, 300);
  await touch(page, '[data-action="repeat"]');
  await wait(page, 400);
  const slovene = await page.locator('#bubble').textContent();
  check(problems, slovene.includes('Poišči tri školjke'), `the quest is repeated in Slovenian: "${slovene}" (was "${english}")`);
  check(problems, (await body(page, 'questStage')) === 'active', 'the quest carried on through the switch');
  await followQuests(page, 1);
  check(problems, (await readSave(page, 0)).quests.done === 1, 'and was finished in Slovenian');
  await wait(page, 300);
  const thanks = await page.locator('#bubble').textContent();
  await shot(page, 'language-mid-quest');
  check(problems, !thanks.includes('Moko'), `the thanks comes on its own: "${thanks}"`);
  await page.waitForFunction(() => document.querySelector('#bubble')?.textContent?.includes('Moko'), null, { timeout: 12000 });
  check(problems, true, `then, after a pause, the next friend: "${await page.locator('#bubble').textContent()}"`);
  await shot(page, 'quest-next-prompt');
  check(problems, problems.length === 0, 'no problems while switching');
  await context.close();
}

async function keyboardAndMouse(browser) {
  console.log('keyboard and mouse');
  const { page, context, problems } = await openPage(browser, { width: 1280, height: 800, touch: false, saves: { 0: heavySave().save } });
  await page.keyboard.press('Tab');
  const focused = await page.evaluate(() => document.activeElement?.className ?? '');
  for (let presses = 0; presses < 12 && !(await page.evaluate(() => document.activeElement?.matches('.slot[data-slot="0"]'))); presses += 1) await page.keyboard.press('Tab');
  await page.keyboard.press('Enter');
  await screenIs(page, 'play');
  check(problems, true, `Tab and Enter open an island (first focus: ${focused})`);
  await wait(page, 600);
  const before = await body(page, 'player');
  for (let step = 0; step < 6; step += 1) {
    await page.keyboard.press('ArrowLeft');
    await wait(page, 250);
  }
  await page.keyboard.down('KeyS');
  await wait(page, 600);
  await page.keyboard.up('KeyS');
  await wait(page, 1200);
  check(problems, (await body(page, 'player')) !== before, `the arrow keys walk (${before} to ${await body(page, 'player')})`);
  await goUse(page, 'place:bakery', { mouse: true });
  await panelIs(page, 'bakery');
  check(problems, true, 'a mouse click walks to the bakery and opens it');
  await page.keyboard.press('Escape');
  await wait(page, 300);
  check(problems, (await body(page, 'panel')) === '', 'Escape closes it');
  await page.mouse.click(640, 520);
  await wait(page, 400);
  await page.keyboard.press('Enter');
  await wait(page, 4000);
  const opened = (await body(page, 'panel')) || (await body(page, 'screen'));
  await page.keyboard.press('Escape');
  await screenIs(page, 'play');
  check(problems, (await body(page, 'panel')) === '', `Enter used the nearest thing (${opened}) and Escape came back`);
  await shot(page, 'keyboard');
  check(problems, problems.length === 0, 'no problems with keyboard and mouse');
  await context.close();
}

async function reducedMotion(browser) {
  console.log('reduced motion');
  const { page, context, problems } = await openPage(browser, { motion: 'reduce', saves: { 0: heavySave().save } });
  await openHeavy(page);
  await goUse(page, 'place:fishing');
  await panelIs(page, 'fishing');
  const still = await page.evaluate(() => getComputedStyle(document.querySelector('.sheet')).animationName);
  check(problems, still === 'none', 'panels appear without sliding');
  const swim = await page.evaluate(async () => {
    const card = document.querySelector('[data-fish]');
    const first = Number(card.dataset.fish);
    await new Promise((resolve) => setTimeout(resolve, 500));
    return Math.abs(Number(card.dataset.fish) - first);
  });
  check(problems, swim < 0.25, `the fish swims slowly (${swim.toFixed(3)} in half a second)`);
  await shot(page, 'reduced-motion');
  check(problems, problems.length === 0, 'no problems with reduced motion');
  await context.close();
}

const server = await serve();
const browser = await launch();
const started = Date.now();
try {
  const { save, home, outside } = heavySave();
  console.log(`heavy island: ${home} things at home, ${outside} outside, ${save.island.pets.length} pets, 12 plots`);
  // SIZE=390x844 checks one size, SIZE=extras only the rest, and no SIZE does everything.
  const only = process.env.SIZE;
  const sizes = SIZES.map((size, index) => ({ size, index })).filter(({ size }) => !only || only === size.join('x'));
  for (const { size, index } of sizes) {
    await tour(browser, size, index % 2 ? 'sl' : 'en', index === 0);
    await tour(browser, size, index % 2 ? 'en' : 'sl', false);
    for (const language of ['en', 'sl']) await mashInPlay(browser, size, language);
  }
  if (sizes.length) check([], drawPeak <= MOST_DRAWS, `the most draw calls in any frame was ${drawPeak} (budget ${MOST_DRAWS})`);
  if (!only || only === 'extras') {
    await languageMidQuest(browser);
    await keyboardAndMouse(browser);
    await reducedMotion(browser);
  }
  console.log(`screen check passed in ${((Date.now() - started) / 1000).toFixed(0)}s, draw peak ${drawPeak}`);
} finally {
  await browser.close();
  server.kill();
}
