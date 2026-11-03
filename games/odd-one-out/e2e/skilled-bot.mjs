// A skilled player. From a fresh save it plays every level of the built game in order with real touches on a
// phone, a set of three puzzles each try, and replays each level for fresh sets. Each time it checks that the pond
// shows what the rules made, works out the odd one with the solver from the things on show alone, taps it, and
// checks it was bounced off its pad and every lotus bloomed. Run `npx vite build` first. REPLAYS sets the replays
// per level: 2 by default, so 9 puzzles a level.
import { LEVELS, SET } from '../src/rules/levels.ts';
import { solve } from '../src/rules/solve.ts';
import { thingKey } from '../src/rules/things.ts';
import { launch, openLevel, openPage, pondShows, puzzleOn, ready, screenIs, serve, SHOTS, tapCard, tapThing } from './lib.mjs';

const REPLAYS = Number(process.env.REPLAYS ?? 2);
const WIDTH = Number(process.env.WIDTH ?? 390);
const HEIGHT = Number(process.env.HEIGHT ?? 844);

async function playPuzzle(page, step) {
  await page.waitForFunction((wanted) => document.body.dataset.status === 'playing' && document.body.dataset.step === String(wanted), step);
  const puzzle = await puzzleOn(page);
  const shows = JSON.stringify(await pondShows(page));
  const wanted = JSON.stringify(puzzle.things.map(thingKey));
  if (shows !== wanted) throw new Error(`Level ${puzzle.id} go ${puzzle.go}: the pond shows ${shows} but the rules made ${wanted}`);
  const odd = solve(puzzle.things);
  if (odd === null) throw new Error(`Level ${puzzle.id} go ${puzzle.go}: no single odd one`);
  await tapThing(page, odd);
  const bounced = await page
    .waitForFunction((index) => document.querySelector(`#pond .pad[data-index="${index}"]`)?.classList.contains('launched'), odd, { timeout: 8000 })
    .then(() => true, () => false);
  if (!bounced) throw new Error(`Level ${puzzle.id} go ${puzzle.go}: the odd one was never bounced off`);
  return puzzle;
}

/** One try: the three puzzles of the set, each right first time. */
async function playSet(page) {
  const started = Date.now();
  const goes = [];
  for (let step = 0; step < SET; step += 1) goes.push((await playPuzzle(page, step)).go);
  await screenIs(page, 'won');
  const lit = await page.evaluate(() => document.querySelectorAll('#pond .bud-on').length);
  if (lit !== SET) throw new Error(`Only ${lit} lotuses open after a whole set`);
  const stars = Number(await page.evaluate(() => document.body.dataset.stars));
  return { goes, stars, ms: Date.now() - started };
}

async function main() {
  const server = await serve();
  const browser = await launch();
  const { page, problems } = await openPage(browser, { width: WIDTH, height: HEIGHT });
  const rows = [];
  try {
    for (const { id, world } of LEVELS) {
      if ((await page.evaluate(() => document.body.dataset.screen)) !== 'play') {
        const tile = page.locator(`[data-level="${id}"]`);
        if ((await tile.getAttribute('data-open')) !== 'true') throw new Error(`Level ${id} did not open`);
        await openLevel(page, id);
      }
      await page.waitForFunction((wanted) => document.body.dataset.level === String(wanted), id);
      const goes = [];
      for (let go = 0; go <= REPLAYS; go += 1) {
        const set = await playSet(page);
        if (set.goes.some((one) => goes.includes(one))) throw new Error(`Level ${id}: replay ${go} brought back a puzzle`);
        goes.push(...set.goes);
        rows.push({ id, stars: set.stars, ms: set.ms });
        const finale = await page.evaluate(() => document.body.dataset.finale === 'true');
        if (finale !== (id === LEVELS.length)) throw new Error(`Level ${id}: the end-of-game card ${finale ? 'showed early' : 'is missing'}`);
        if (go < REPLAYS) {
          // The end-of-game card has one button, to the map, so the last level is replayed from there.
          if (await page.locator('[data-action="again"]').count()) await tapCard(page, 'again');
          else {
            await tapCard(page, 'map');
            await screenIs(page, 'map');
            await openLevel(page, id);
          }
          await ready(page);
        }
      }
      const last = rows.slice(-(REPLAYS + 1));
      console.log(
        `level ${String(id).padStart(2)} ${world.padEnd(6)} won ${last.length} sets, ${goes.length} puzzles ${last.map((row) => '★'.repeat(row.stars)).join(' ')} ~${Math.round(last.reduce((sum, row) => sum + row.ms, 0) / last.length)} ms a set`,
      );
      if (id === LEVELS.length) await page.screenshot({ path: `${SHOTS}/skilled-finale.png` });
      const next = page.locator('[data-action="next"]');
      if (await next.count()) await tapCard(page, 'next');
      else {
        await tapCard(page, 'map');
        await screenIs(page, 'map');
      }
      await ready(page);
    }
  } catch (error) {
    await page.screenshot({ path: `${SHOTS}/skilled-failed.png` });
    console.log('screen at failure:', await page.evaluate(() => JSON.stringify(document.body.dataset)), problems);
    throw error;
  } finally {
    await browser.close();
    server.kill();
  }
  const perfect = rows.filter((row) => row.stars === 3).length;
  const levels = new Set(rows.map((row) => row.id)).size;
  console.log(`\nskilled bot: won ${levels} of ${LEVELS.length} levels and ${rows.length} sets of ${SET}, ${perfect} with 3 stars`);
  console.log(`problems: ${problems.length ? problems.join('\n') : 'none'}`);
  process.exit(levels === LEVELS.length && perfect === rows.length && !problems.length ? 0 : 1);
}

await main();
