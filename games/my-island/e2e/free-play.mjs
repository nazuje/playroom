// Free play on a half-finished island: every activity tried by touch, nothing asked for by a quest.
// Then a reload, to prove each thing done was saved.
import { midSave } from './fixtures.mjs';
import { body, fail, goUse, launch, openPage, panelIs, readSave, screenIs, serve, shot, touch } from './lib.mjs';

const LANGUAGE = process.env.LANG_PICK ?? 'en';
const wait = (page, ms) => page.waitForTimeout(ms);
const close = (page) => touch(page, '[data-action="close"]');

function check(problems, ok, message) {
  if (!ok) fail(problems, message);
  console.log(`  ok: ${message}`);
}

/** Waits for the fish to swim into the zone, then taps. Real timing, through the real button. */
async function fishOnce(page) {
  for (let tries = 0; tries < 400; tries += 1) {
    const inside = await page.evaluate(() => {
      const card = document.querySelector('[data-fish]');
      if (!card) return false;
      const at = Number(card.dataset.fish);
      const [from, to] = card.dataset.zone.split('-').map(Number);
      return at > from + 0.02 && at < to - 0.02;
    });
    if (inside) {
      await touch(page, '[data-action="catch"]');
      await wait(page, 300);
      if (await page.locator('[data-action="again"]').count()) return true;
    }
    await wait(page, 16);
  }
  return false;
}

async function placeOne(page, room, problems) {
  const before = (await readSave(page))?.[room === 'home' ? 'home' : 'outdoor'].length ?? 0;
  await touch(page, '[data-buy]:not(.choice-short)');
  await wait(page, 200);
  const { width, height } = page.viewportSize();
  await page.touchscreen.tap(width * 0.42, height * 0.45);
  await wait(page, 500);
  const placed = page.locator('.hit[data-target^="placed:"]:not([hidden])');
  check(problems, (await placed.count()) > 0, `something placed in the ${room}`);
  await touch(page, `.hit[data-target="${await placed.last().getAttribute('data-target')}"]`);
  await wait(page, 200);
  await touch(page, '[data-action="turn"]');
  await wait(page, 200);
  return before;
}

const server = await serve();
const browser = await launch();
try {
  const { page, problems } = await openPage(browser, { language: LANGUAGE, saves: { 0: midSave() } });
  await touch(page, '.slot[data-slot="0"]');
  await screenIs(page, 'play');
  await wait(page, 1200);
  const start = await readSave(page);

  console.log('garden');
  await goUse(page, 'plot:0');
  await wait(page, 300);
  let island = await readSave(page);
  await goUse(page, 'plot:1');
  await panelIs(page, 'seeds');
  await touch(page, '[data-crop="strawberry"]');
  await wait(page, 400);
  await goUse(page, 'plot:1');
  await wait(page, 800);

  console.log('pets');
  await goUse(page, 'place:pets');
  await panelIs(page, 'pets');
  await shot(page, 'free-pets');
  await touch(page, '[data-pet="puppy"]');
  await wait(page, 600);
  if (await body(page, 'panel')) await close(page);
  await wait(page, 600);
  await goUse(page, 'pet:0');
  await panelIs(page, 'care');
  for (const action of ['brush', 'feed', 'play']) {
    await touch(page, `[data-care="${action}"]`);
    await wait(page, 250);
  }
  await touch(page, '[data-action="follow"]');
  await wait(page, 300);
  await shot(page, 'free-care');
  await close(page);

  console.log('bakery');
  await goUse(page, 'place:bakery');
  await panelIs(page, 'bakery');
  await touch(page, '[data-ready="yes"]');
  await wait(page, 300);
  while (await page.locator('[data-action="add"]').count()) {
    await touch(page, '[data-action="add"]');
    await wait(page, 200);
  }
  await shot(page, 'free-bowl');
  await touch(page, '[data-action="oven"]');
  await wait(page, 800);
  if (await body(page, 'panel')) await close(page);

  console.log('give a treat');
  await goUse(page, 'friend:moko');
  await panelIs(page, 'give');
  await touch(page, '[data-treat]');
  await wait(page, 600);
  if (await body(page, 'panel')) await close(page);

  console.log('collect');
  const shownFind = page.locator('.hit[data-target^="find:"]').first();
  await goUse(page, await shownFind.getAttribute('data-target'));
  await wait(page, 500);

  console.log('fishing');
  await goUse(page, 'place:fishing');
  await panelIs(page, 'fishing');
  check(problems, await fishOnce(page), 'caught a fish by timing the tap');
  await shot(page, 'free-fish');
  await close(page);

  console.log('book');
  await touch(page, '#book');
  await panelIs(page, 'book');
  for (const tab of await page.locator('[data-tab]').evaluateAll((tabs) => tabs.map((each) => each.dataset.tab))) {
    await touch(page, `[data-tab="${tab}"]`);
    await wait(page, 150);
  }
  await shot(page, 'free-book');
  await close(page);

  console.log('wardrobe');
  await goUse(page, 'place:wardrobe');
  await screenIs(page, 'wardrobe');
  await touch(page, '[data-tab="hat"]');
  await touch(page, '[data-option="4"]');
  await touch(page, '[data-action="shuffle"]');
  await shot(page, 'free-wardrobe');
  await touch(page, '[data-action="done"]');
  await screenIs(page, 'play');

  console.log('home');
  await goUse(page, 'place:house');
  await screenIs(page, 'house');
  const homeBefore = await placeOne(page, 'home', problems);
  await shot(page, 'free-house');
  await touch(page, '[data-action="door"]');
  await screenIs(page, 'play');

  console.log('outdoor decorating');
  await touch(page, '#decor');
  await screenIs(page, 'decor');
  const outBefore = await placeOne(page, 'outdoor', problems);
  await shot(page, 'free-decor');
  await touch(page, '[data-action="done"]');
  await screenIs(page, 'play');

  console.log('flower hill');
  await goUse(page, 'friend:zuzu', { tries: 40 });
  await shot(page, 'free-hill');
  await wait(page, 3000);

  island = await readSave(page);
  check(problems, (island.bag.carrot ?? 0) >= (start.bag.carrot ?? 0), 'the ripe carrots were picked');
  check(problems, island.plots[0].crop === null && island.plots[1].crop === 'strawberry' && island.plots[1].watered, 'a strawberry planted and watered');
  check(problems, island.pets.length === 2 && island.pets[1].kind === 'puppy', 'a puppy adopted');
  check(problems, island.pets[0].hearts > start.pets[0].hearts && island.pets[0].following, 'the kitten was cared for and follows');
  check(problems, (island.kindness.moko ?? 0) > 0, 'Moko got a treat');
  const total = (book) => Object.values(book).reduce((sum, count) => sum + count, 0);
  const fish = Object.keys(island.book).filter((id) => id.startsWith('fish'));
  check(problems, total(island.book) >= total(start.book) + 2 && fish.length > 0, `the book gained a find and a fish: ${JSON.stringify(island.book)}`);
  check(problems, island.home.length === homeBefore + 1 && island.outdoor.length === outBefore + 1, 'one new thing at home and one outside');
  check(problems, island.home.at(-1).turn === 1 && island.outdoor.at(-1).turn === 1, 'both were turned');

  await page.reload();
  await screenIs(page, 'islands');
  await touch(page, '.slot[data-slot="0"]');
  await screenIs(page, 'play');
  const again = await readSave(page);
  const kept = (each) => JSON.stringify([each.pets, each.home, each.outdoor, each.book, each.bag, each.kindness, each.look, each.plots.map((plot) => plot.crop)]);
  check(problems, kept(again) === kept(island), 'the reload kept pets, rooms, book, bag, look and garden');
  check(problems, problems.length === 0, 'no console errors or outside requests');
  console.log('free-play bot passed');
} finally {
  await browser.close();
  server.kill();
}
