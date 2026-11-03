// A careless player: a child in a hurry who never reads the examples. Its first tap copies the number already on
// the machine, or takes the card under its thumb, the first one. After that it grabs numbers close to the one on
// the machine, or any card, at random, through every puzzle of the shift. It never gives up: when a try runs out
// it taps 🔄 and guesses again at the fresh shift. A level counts as lost once 5 tries have failed, which is when the game
// offers to skip it. The random numbers are seeded, so a run can be repeated. Run `npx vite build` first.
//
// It passes when it wins every level of the first two worlds, loses the last three of each later world, and
// never earns 3 stars after world 1, because misses count across every try.
import { ALL_VARIANTS, LEVELS, temptingFor } from '../src/rules/levels.ts';
import { afterAnswer, allOpen, answer, launch, openLevel, openPage, puzzleOn, screenIs, serve, touch } from './lib.mjs';

const TRIES_BEFORE_SKIP = 5;
const NEAR = 3;

function seeded(seed) {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let mixed = Math.imul(state ^ (state >>> 15), 1 | state);
    mixed ^= mixed + Math.imul(mixed ^ (mixed >>> 7), 61 | mixed);
    return ((mixed ^ (mixed >>> 14)) >>> 0) / 4294967296;
  };
}

/** The quick guesses, quickest first: the cards left to right, or the numbers nearest the one on the machine. */
function guessesFor(level) {
  if (level.answer === 'cards') return [...level.cards];
  const quick = temptingFor(level.puzzle);
  return [...level.numbers].sort((a, b) => Math.abs(a - quick) - Math.abs(b - quick) || b - a);
}

/**
 * One try at a shift. The very first tap is the quickest guess: the copied number, or the card under the thumb.
 * After that it grabs one of the nearest few guesses at random, puzzle after puzzle, until it wins the shift or
 * the try runs out.
 */
async function oneTry(page, random) {
  let first = true;
  for (;;) {
    const level = await puzzleOn(page, ALL_VARIANTS);
    const at = Number(await page.evaluate(() => document.body.dataset.at));
    const guesses = guessesFor(level);
    for (;;) {
      const [pick] = guesses.splice(first ? 0 : Math.floor(random() * Math.min(NEAR, guesses.length)), 1);
      first = false;
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
  const { page, problems } = await openPage(browser, { progress: allOpen(LEVELS) });
  const random = seeded(20261104);
  const byWorld = new Map();
  const results = new Map();
  const tooGood = [];
  try {
    for (const { id, world, answer: kind } of LEVELS) {
      await openLevel(page, id);
      const { won, tries } = await playLevel(page, random);
      results.set(id, won);
      const tally = byWorld.get(world) ?? { won: 0, levels: 0 };
      byWorld.set(world, { won: tally.won + (won ? 1 : 0), levels: tally.levels + 1 });
      console.log(`level ${String(id).padStart(2)} ${world.padEnd(5)} ${kind.padEnd(6)} ${won ? 'won ' : 'lost'} on try ${tries}`);
      if (won) {
        await screenIs(page, 'won');
        const stars = Number(await page.evaluate(() => document.body.dataset.stars));
        console.log(`         ${'★'.repeat(stars)}`);
        if (world !== 'add' && stars === 3) tooGood.push(id);
        await page.waitForSelector('.card-btn.armed');
        await touch(page, '[data-action="map"]');
      } else {
        await touch(page, '[data-action="levels"]');
      }
      await screenIs(page, 'map');
    }
  } finally {
    await browser.close();
    server.kill();
  }
  console.log('');
  for (const [world, { won, levels }] of byWorld) console.log(`${world.padEnd(5)} won ${won} of ${levels}`);
  console.log(`problems: ${problems.length ? problems.join('\n') : 'none'}`);
  const early = LEVELS.filter((level) => level.world === 'add' || level.world === 'take');
  const late = ['mix', 'back', 'chain'].flatMap((world) => LEVELS.filter((level) => level.world === world).slice(-3));
  const fair = early.every((level) => results.get(level.id)) && late.every((level) => !results.get(level.id));
  console.log(`early levels all won and late levels all lost: ${fair ? 'yes' : 'no'}`);
  console.log(`3 stars after world 1: ${tooGood.length ? `levels ${tooGood.join(', ')}` : 'never'}`);
  process.exit(fair && !tooGood.length && !problems.length ? 0 : 1);
}

await main();
