// A skilled player. From a fresh save it plays every level of the built game in order with real touches: it
// works the fruits out one at a time in the order the hint search finds, taps a copy of each, picks its number,
// checks that the sticker landed on every copy with the right number, then answers the question. Run
// `npx vite build` first.
import { loneFruit } from '../src/rules/equation.ts';
import { ALL_VARIANTS, LEVELS, questionValue } from '../src/rules/levels.ts';
import { answer as answerRules, select, startPlay } from '../src/rules/play.ts';
import { plan } from '../src/rules/solve.ts';
import { answer, launch, openLevel, openPage, puzzleOn, ready, screenIs, serve, SHOTS, stickers, tapFruit, touch } from './lib.mjs';

const TAP_WAIT_MS = 40;

/** What the rules say the stickers should be, in board order. */
function expectedStickers(level, known) {
  const terms = [...level.puzzle.clues.flatMap((row) => row.terms), ...level.puzzle.question];
  return terms.filter((term) => known[term.fruit] !== undefined).map((term) => `${term.fruit}:${term.count * known[term.fruit]}`);
}

async function agrees(page, level, play, after) {
  const real = await stickers(page);
  const rules = expectedStickers(level, play.known);
  if (real.join() !== rules.join()) throw new Error(`After ${after} the stickers show ${real.join()} but the rules say ${rules.join()}`);
}

async function puzzle(page, level) {
  let play = startPlay(level);
  let taps = 0;
  const lone = loneFruit(level.puzzle);
  for (const step of plan(level.puzzle)) {
    if (play.won) break;
    if (step.kind === 'fruit' && step.fruit !== lone) {
      await tapFruit(page, step.fruit);
      await page.waitForFunction((fruit) => document.body.dataset.target === fruit, step.fruit);
      play = select(play, step.fruit);
      taps += 1;
    }
    await answer(page, step.value);
    await page.waitForTimeout(TAP_WAIT_MS);
    play = answerRules(play, step.value).play;
    taps += 1;
    if (!play.won) {
      await ready(page);
      await agrees(page, level, play, step.kind === 'fruit' ? `finding the ${step.fruit}` : 'the question');
    }
  }
  if (!play.won) throw new Error(`Level ${level.id}: the plan ended before the question (${questionValue(level)})`);
  return taps;
}

const SCREENS = [
  { name: 'phone', width: 390, height: 844, answers: 'stepper' },
  { name: 'tablet', width: 1024, height: 768, answers: 'grid' },
];

/** Every level from a fresh save on one screen. Returns the stars per level. */
async function playAll(browser, screen) {
  const { page, problems } = await openPage(browser, { width: screen.width, height: screen.height });
  const rows = [];
  try {
    for (const { id } of LEVELS) {
      if ((await page.evaluate(() => document.body.dataset.screen)) !== 'play') {
        const tile = page.locator(`[data-level="${id}"]`);
        if ((await tile.getAttribute('data-open')) !== 'true') throw new Error(`Level ${id} did not open`);
        await openLevel(page, id);
      }
      await page.waitForFunction((wanted) => document.body.dataset.level === String(wanted) && document.body.dataset.status === 'playing', id);
      const picker = await page.evaluate(() => document.body.dataset.picker);
      if (picker !== screen.answers) throw new Error(`${screen.name}: the numbers are a ${picker}, not a ${screen.answers}`);
      const level = await puzzleOn(page, ALL_VARIANTS);
      const started = Date.now();
      const taps = await puzzle(page, level);
      await screenIs(page, 'won');
      const stars = Number(await page.evaluate(() => document.body.dataset.stars));
      rows.push({ id, stars });
      console.log(`${screen.name} level ${String(id).padStart(2)} ${level.world.padEnd(6)} won with ${String(taps).padStart(2)} taps ${'★'.repeat(stars)} ${Date.now() - started} ms`);
      await page.waitForSelector('.card-btn.armed');
      const last = id === LEVELS.at(-1).id;
      const finale = (await page.evaluate(() => document.body.dataset.finale)) === 'true';
      if (finale !== last) throw new Error(`Level ${id}: the finale ${finale ? 'showed' : 'did not show'}`);
      if (last) {
        const big = await page.locator('.card-finale .card-main[data-action="map"]').boundingBox();
        if (!big || big.height < 72) throw new Error('The finale has no big button');
        await page.screenshot({ path: `${SHOTS}/skilled-${screen.name}-finale.png` });
        await touch(page, '[data-action="map"]');
        await screenIs(page, 'map');
        break;
      }
      // Every other win card has one big next button.
      const next = await page.locator('.card-main[data-action="next"]').boundingBox();
      if (!next || next.height < 72) throw new Error(`Level ${id}: no big next button`);
      await touch(page, '[data-action="next"]');
      await ready(page);
    }
  } catch (error) {
    await page.screenshot({ path: `${SHOTS}/skilled-failed.png` });
    console.log('screen at failure:', await page.evaluate(() => JSON.stringify(document.body.dataset)), problems);
    throw error;
  }
  await page.context().close();
  return { rows, problems };
}

async function main() {
  const server = await serve();
  const browser = await launch();
  let ok = true;
  try {
    for (const screen of SCREENS) {
      const { rows, problems } = await playAll(browser, screen);
      const perfect = rows.filter((row) => row.stars === 3).length;
      console.log(`\n${screen.name} (${screen.answers}): won ${rows.length} of ${LEVELS.length} levels, ${perfect} with 3 stars`);
      console.log(`problems: ${problems.length ? problems.join('\n') : 'none'}\n`);
      ok &&= rows.length === LEVELS.length && perfect === LEVELS.length && !problems.length;
    }
  } finally {
    await browser.close();
    server.kill();
  }
  process.exit(ok ? 0 : 1);
}

await main();
