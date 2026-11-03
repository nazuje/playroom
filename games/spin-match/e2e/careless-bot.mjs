// A careless player: a child in a hurry who doesn't turn anything in their head. They glance at the target and grab
// whichever critter looks most like it as it lies, then the next most alike (careless.ts); in "which two are the
// same?" they grab the two cards that look most alike. On the first world they mash ↻ once on every puzzle and
// glance at the target as it then lies, which caps those levels at 2 stars. They never give up: when a try runs out
// they tap 🔄 and go again at a fresh set. A level counts as lost once 5 tries have failed, which is when the game
// offers to skip it. Ties go by a seeded random source, so a run can be repeated. Run `npx vite build` first.
//
// It passes when it wins every level up to 12, every first-world level on its first try (those tries can't fail),
// loses every level from 13 on, never earns 3 stars past world 1, since copying how the target lies costs a miss
// in every set there and misses add up over every try, and never earns 3 stars on a level where it used ↻.
import { carelessPairs, carelessOrder } from '../src/rules/careless.ts';
import { carelessGoal, LEVELS, seeded } from '../src/rules/levels.ts';
import { turn } from '../src/rules/shapes.ts';
import { pairKey } from '../src/rules/play.ts';
import { allOpen, launch, openLevel, openPage, pickOption, pickPair, puzzleOn, ready, screenIs, serve, SHOTS, tapCard, touch } from './lib.mjs';

const TRIES_BEFORE_SKIP = 5;

const status = (page) => page.evaluate(() => ({ ...document.body.dataset }));

/** One try: every puzzle of the set in the careless order, until the set is won or the try runs out. */
async function oneTry(page, random) {
  for (;;) {
    await page.waitForFunction(() => ['playing', 'failed'].includes(document.body.dataset.status ?? '') || document.body.dataset.screen === 'won');
    let now = await status(page);
    if (now.screen === 'won') return 'won';
    if (now.status === 'failed') return 'failed';
    const puzzle = await puzzleOn(page);
    const step = now.step;
    if (puzzle.world === 'spin') {
      await touch(page, '#board .helper');
      await page.waitForFunction((was) => document.body.dataset.turned !== was, now.turned);
      now = await status(page);
    }
    const shown = turn(puzzle.target, Number(now.turned ?? 0));
    const order = puzzle.kind === 'pairs' ? carelessPairs(puzzle.options, random) : carelessOrder(shown, puzzle.options, random).map((at) => [at]);
    const tried = new Set();
    for (const choice of order) {
      if (choice.length === 2) {
        if (tried.has(pairKey(...choice))) continue;
        tried.add(pairKey(...choice));
        await pickPair(page, ...choice);
      } else await pickOption(page, choice[0]);
      await page.waitForFunction(() => document.body.dataset.status !== 'playing');
      await ready(page);
      now = await status(page);
      if (now.screen === 'won') return 'won';
      if (now.status === 'failed') return 'failed';
      if (now.step !== step) break;
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
  const { page, problems } = await openPage(browser, { progress: allOpen(LEVELS) });
  const random = seeded(20261103);
  const byWorld = new Map();
  const results = new Map();
  const lucky = [];
  const slow = [];
  try {
    for (const { id, world } of LEVELS) {
      await openLevel(page, id);
      const { won, tries } = await playLevel(page, random);
      results.set(id, won);
      const tally = byWorld.get(world) ?? { won: 0, levels: 0 };
      byWorld.set(world, { won: tally.won + (won ? 1 : 0), levels: tally.levels + 1 });
      if (won) {
        await screenIs(page, 'won');
        const { stars, levelMisses: misses } = await status(page);
        console.log(`level ${String(id).padStart(2)} ${world.padEnd(6)} won  on try ${tries} with ${misses ?? 0} miss(es) ${'★'.repeat(Number(stars))}`);
        if (Number(stars) === 3 && (world !== 'spin' || (await status(page)).helped === 'true')) lucky.push(id);
        if (world === 'spin' && tries > 1) slow.push(id);
        await tapCard(page, 'map');
      } else {
        console.log(`level ${String(id).padStart(2)} ${world.padEnd(6)} lost on try ${tries}`);
        if (world === 'spin') slow.push(id);
        await touch(page, '[data-action="levels"]');
      }
      await screenIs(page, 'map');
    }
  } catch (error) {
    await page.screenshot({ path: `${SHOTS}/careless-failed.png` });
    console.log('screen at failure:', await page.evaluate(() => JSON.stringify(document.body.dataset)), problems);
    throw error;
  } finally {
    await browser.close();
    server.kill();
  }
  console.log('');
  for (const [world, { won, levels }] of byWorld) console.log(`${world.padEnd(6)} won ${won} of ${levels}`);
  console.log(`problems: ${problems.length ? problems.join('\n') : 'none'}`);
  const early = LEVELS.filter((level) => carelessGoal(level.id) === 'wins');
  const late = LEVELS.filter((level) => carelessGoal(level.id) === 'loses');
  const earlyWon = early.filter((level) => results.get(level.id)).length;
  const lateLost = late.every((level) => !results.get(level.id));
  console.log(`early levels (1 to ${early.length}) won: ${earlyWon} of ${early.length}; late levels (${late[0].id} to ${late.at(-1).id}) all lost: ${lateLost ? 'yes' : 'no'}`);
  console.log(`3 stars past world 1 or after using ↻: ${lucky.length ? lucky.join(', ') : 'never'}`);
  console.log(`first-world levels that needed a second try: ${slow.length ? slow.join(', ') : 'none'}`);
  process.exit(earlyWon === early.length && lateLost && !lucky.length && !slow.length && !problems.length ? 0 : 1);
}

await main();
