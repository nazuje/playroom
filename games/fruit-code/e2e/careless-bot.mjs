// A careless player: a child in a hurry who never taps a fruit to work it out. It copies the number at the end
// of the last row holding the question's fruit, then grabs numbers close to it in a random order, and never gives
// up: when a try runs out it taps 🔄 and guesses again at the fresh puzzle. A level counts as lost once 5 tries
// have failed, which is when the game offers to skip it. The random numbers are seeded, so a run can be
// repeated. Run `npx vite build` first.
//
// It passes when it wins at least 8 of the 9 levels in the first two worlds, loses the last three of each later
// world, and never earns 3 stars past world 1, since misses add up over every try. With three choices the copied
// number is always one of them and always wrong, so each try is a coin flip after it: a child this careless loses
// an early level about one time in 32, after 5 tries, and the skip button is there for that.
import { fruitsIn } from '../src/rules/equation.ts';
import { ALL_VARIANTS, LEVELS, temptingFor } from '../src/rules/levels.ts';
import { allOpen, answer, launch, openLevel, openPage, puzzleOn, ready, screenIs, serve, touch } from './lib.mjs';

const TRIES_BEFORE_SKIP = 5;
const NEAR = 3;
const TAP_WAIT_MS = 40;

function seeded(seed) {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let mixed = Math.imul(state ^ (state >>> 15), 1 | state);
    mixed ^= mixed + Math.imul(mixed ^ (mixed >>> 7), 61 | mixed);
    return ((mixed ^ (mixed >>> 14)) >>> 0) / 4294967296;
  };
}

const status = (page) => page.evaluate(() => ({ ...document.body.dataset }));

/** One try: numbers near the quick guess, in a random order, until it wins or the try runs out. */
async function oneTry(page, random) {
  const level = await puzzleOn(page, ALL_VARIANTS);
  const quick = temptingFor(level.puzzle, fruitsIn(level.puzzle.question));
  const near = [...level.choices.question].sort((a, b) => Math.abs(a - quick) - Math.abs(b - quick) || b - a).slice(0, NEAR);
  // The copied number first, if it is offered, then the rest in any order.
  const copied = near[0] === quick;
  while (near.length) {
    const pick = copied && near.length === NEAR ? 0 : Math.floor(random() * near.length);
    const [value] = near.splice(pick, 1);
    await answer(page, value);
    await page.waitForTimeout(TAP_WAIT_MS);
    await ready(page);
    const now = await status(page);
    if (now.screen === 'won') return 'won';
    if (now.status === 'failed') return 'failed';
  }
  return 'failed';
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
        console.log(`level ${String(id).padStart(2)} ${world.padEnd(6)} won  on try ${tries} with ${misses} miss(es) ${'★'.repeat(Number(stars))}`);
        if (Number(stars) === 3 && world !== 'one') lucky.push(id);
        await page.waitForSelector('.card-btn.armed');
        await touch(page, '[data-action="map"]');
      } else {
        console.log(`level ${String(id).padStart(2)} ${world.padEnd(6)} lost on try ${tries}`);
        await touch(page, '[data-action="levels"]');
      }
      await screenIs(page, 'map');
    }
  } finally {
    await browser.close();
    server.kill();
  }
  console.log('');
  for (const [world, { won, levels }] of byWorld) console.log(`${world.padEnd(6)} won ${won} of ${levels}`);
  console.log(`problems: ${problems.length ? problems.join('\n') : 'none'}`);
  const early = LEVELS.filter((level) => level.world === 'one' || level.world === 'two');
  const late = ['chain', 'count', 'system'].flatMap((world) => LEVELS.filter((level) => level.world === world).slice(-3));
  const earlyWon = early.filter((level) => results.get(level.id)).length;
  const fair = earlyWon >= early.length - 1 && late.every((level) => !results.get(level.id));
  console.log(`early levels won: ${earlyWon} of ${early.length}; late levels all lost: ${late.every((level) => !results.get(level.id)) ? 'yes' : 'no'}`);
  console.log(`3 stars past world 1: ${lucky.length ? lucky.join(', ') : 'never'}`);
  process.exit(fair && !lucky.length && !problems.length ? 0 : 1);
}

await main();
