// A skilled player. From a fresh save it plays every level of the built game in order with real touches, on a
// phone: every puzzle of the level's shift right first time, then replays the level until it has met all of its
// shifts. Each time it checks that the board shows the examples, hopper and chute the rules say, that the shift's
// lamps count up, and that every plate opens on its rule once solved. Run `npx vite build` first. REPLAYS=0 plays
// each level once.
import { ALL_VARIANTS, LEVELS, SHIFT, SHIFTS } from '../src/rules/levels.ts';
import { afterAnswer, answer, boardShows, launch, openLevel, openPage, puzzleOn, ready, screenIs, serve, SHOTS, touch } from './lib.mjs';

const REPLAYS = Number(process.env.REPLAYS ?? SHIFTS - 1);

function expectedBoard(level) {
  const { puzzle } = level;
  return {
    pairs: puzzle.examples.map((pair) => `${pair.from}>${pair.to}`),
    hopper: puzzle.ask === 'out' ? String(puzzle.given) : puzzle.ask === 'in' ? '?' : '',
    chute: puzzle.ask === 'in' ? String(puzzle.given) : puzzle.ask === 'out' ? '?' : '',
    plates: puzzle.open.map(String),
  };
}

/** One shift: every puzzle right first time. Returns the variants met and the stars. */
async function playShift(page) {
  const variants = [];
  for (let at = 0; at < SHIFT; at += 1) {
    await page.waitForFunction((wanted) => document.body.dataset.status === 'playing' && document.body.dataset.at === String(wanted), at);
    const level = await puzzleOn(page, ALL_VARIANTS);
    const shows = JSON.stringify(await boardShows(page));
    const wanted = JSON.stringify(expectedBoard(level));
    if (shows !== wanted) throw new Error(`Level ${level.id}.${level.variant}: the board shows ${shows} but the rules say ${wanted}`);
    const lit = await page.locator('#board .lamp-on').count();
    if (lit !== at) throw new Error(`Level ${level.id}: ${lit} lamps lit on puzzle ${at + 1}`);
    variants.push(level.variant);
    await answer(page, level.truth);
    const outcome = await afterAnswer(page, at);
    const expected = at === SHIFT - 1 ? 'won' : 'next';
    if (outcome !== expected) throw new Error(`Level ${level.id}.${level.variant}: a right answer gave ${outcome}, not ${expected}`);
  }
  const opened = await page.evaluate(() => [...document.querySelectorAll('#board .plate')].every((plate) => plate.dataset.open === 'true'));
  if (!opened) throw new Error('A plate stayed shut after the win');
  return { variants, stars: Number(await page.evaluate(() => document.body.dataset.stars)) };
}

async function main() {
  const server = await serve();
  const browser = await launch();
  const { page, problems } = await openPage(browser);
  const rows = [];
  const started = Date.now();
  try {
    for (const { id, world } of LEVELS) {
      if ((await page.evaluate(() => document.body.dataset.screen)) !== 'play') {
        const tile = page.locator(`[data-level="${id}"]`);
        if ((await tile.getAttribute('data-open')) !== 'true') throw new Error(`Level ${id} did not open`);
        await openLevel(page, id);
      }
      await page.waitForFunction((wanted) => document.body.dataset.level === String(wanted), id);
      const seen = [];
      const stars = [];
      for (let go = 0; go <= REPLAYS; go += 1) {
        const shiftStarted = Date.now();
        const result = await playShift(page);
        if (result.variants.some((variant) => seen.includes(variant))) throw new Error(`Level ${id}: replay ${go} brought back a puzzle`);
        seen.push(...result.variants);
        stars.push(result.stars);
        rows.push({ id, stars: result.stars, ms: Date.now() - shiftStarted });
        const finale = await page.evaluate(() => document.body.dataset.finale === 'true');
        if (finale !== (id === LEVELS.length)) throw new Error(`Level ${id}: the end-of-game card ${finale ? 'showed early' : 'is missing'}`);
        await page.waitForSelector('.card-btn.armed');
        if (go < REPLAYS) {
          // The end-of-game card has one button, to the map, so the last level is replayed from there.
          if (await page.locator('[data-action="again"]').count()) await touch(page, '[data-action="again"]');
          else {
            await touch(page, '[data-action="map"]');
            await screenIs(page, 'map');
            await openLevel(page, id);
          }
          await ready(page);
        }
      }
      const shiftMs = rows.slice(-stars.length).map((row) => row.ms);
      console.log(
        `level ${String(id).padStart(2)} ${world.padEnd(5)} won ${stars.length} shifts, ${seen.length} puzzles ${stars.map((n) => '★'.repeat(n)).join(' ')} ~${Math.round(shiftMs.reduce((a, b) => a + b, 0) / shiftMs.length / 1000)}s a shift`,
      );
      const next = page.locator('[data-action="next"]');
      if (await next.count()) await touch(page, '[data-action="next"]');
      else {
        await touch(page, '[data-action="map"]');
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
  console.log(`\nskilled bot: won ${levels} of ${LEVELS.length} levels and ${rows.length} shifts, ${perfect} with 3 stars, in ${Math.round((Date.now() - started) / 60000)} min`);
  console.log(`problems: ${problems.length ? problems.join('\n') : 'none'}`);
  process.exit(levels === LEVELS.length && perfect === rows.length && !problems.length ? 0 : 1);
}

await main();
