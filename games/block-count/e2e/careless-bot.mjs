// A careless player: a child in a hurry who counts only the blocks they can see, or on "fill the box" only the
// empty spots on top, and on a map question reads the stack in a mirror. After a miss it nudges the number one
// up, one down, two up, and so on, or grabs any other map. It never gives up: when a try runs out it taps 🔄 and
// goes again at the fresh stacks. A level counts as lost once 5 tries have failed, which is when the game offers
// to skip it. The random choices are seeded, so a run can be repeated. Run `npx vite build` first.
//
// It passes when it wins every level of the first world, loses the last three levels of every later world, and
// never earns 3 stars after the first world, because misses count across every try.
import { carelessOrder } from '../src/rules/careless.ts';
import { LEVELS, seeded, WORLDS } from '../src/rules/levels.ts';
import { afterAnswer, ALL_SHOWN, allOpen, answer, launch, openLevel, openPage, puzzleOn, screenIs, serve, touch } from './lib.mjs';

const TRIES_BEFORE_SKIP = 5;

async function oneTry(page, random) {
  for (;;) {
    const level = await puzzleOn(page);
    const at = Number(await page.evaluate(() => document.body.dataset.at));
    const order = carelessOrder(level, random);
    for (const pick of order) {
      await answer(page, pick);
      const outcome = await afterAnswer(page, at);
      if (outcome === 'won' || outcome === 'failed') return outcome;
      if (outcome === 'next') break;
    }
  }
}

async function playLevel(page, random) {
  for (let tries = 1; ; tries += 1) {
    if ((await oneTry(page, random)) === 'won') return { won: true, tries };
    await page.waitForSelector('#dock .retry.armed', { timeout: 8000 });
    if (tries >= TRIES_BEFORE_SKIP) {
      if (!(await page.locator('[data-action="skip"]').count())) throw new Error('No skip button after 5 failed tries');
      return { won: false, tries };
    }
    await touch(page, '#dock [data-action="retry"]');
    await page.waitForFunction(() => document.body.dataset.status === 'playing');
  }
}

async function main() {
  const server = await serve();
  const browser = await launch();
  const { page, problems } = await openPage(browser, { progress: allOpen(LEVELS), shown: ALL_SHOWN });
  const random = seeded(20261105);
  const byWorld = new Map();
  const results = new Map();
  const tooGood = [];
  try {
    for (const { id, world, ask } of LEVELS) {
      await openLevel(page, id);
      const { won, tries } = await playLevel(page, random);
      results.set(id, won);
      const tally = byWorld.get(world) ?? { won: 0, levels: 0 };
      byWorld.set(world, { won: tally.won + (won ? 1 : 0), levels: tally.levels + 1 });
      let stars = 0;
      if (won) {
        await screenIs(page, 'won');
        stars = Number(await page.evaluate(() => document.body.dataset.stars));
        if (world !== 'see' && stars === 3) tooGood.push(id);
        await page.waitForSelector('.card-btn.armed');
        await touch(page, '[data-action="map"]');
      } else {
        await touch(page, '[data-action="levels"]');
      }
      console.log(`level ${String(id).padStart(2)} ${world.padEnd(6)} ${ask.padEnd(5)} ${won ? `won  on try ${tries} ${'★'.repeat(stars)}` : `lost after ${tries} tries`}`);
      await screenIs(page, 'map');
    }
  } finally {
    await browser.close();
    server.kill();
  }
  console.log('');
  for (const [world, { won, levels }] of byWorld) console.log(`${world.padEnd(6)} won ${won} of ${levels}`);
  console.log(`problems: ${problems.length ? problems.join('\n') : 'none'}`);
  const early = LEVELS.filter((level) => level.world === 'see');
  const late = WORLDS.slice(1).flatMap((world) => LEVELS.filter((level) => level.world === world).slice(-3));
  const fair = early.every((level) => results.get(level.id)) && late.every((level) => !results.get(level.id));
  console.log(`first world all won and late levels all lost: ${fair ? 'yes' : 'no'}`);
  console.log(`3 stars after world 1: ${tooGood.length ? `levels ${tooGood.join(', ')}` : 'never'}`);
  process.exit(fair && !tooGood.length && !problems.length ? 0 : 1);
}

await main();
