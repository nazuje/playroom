// A skilled player. From a fresh save it plays every level of the built game in order with real touches, on a
// phone: every stack of the level's set right first time, through the stepper, tokens or map cards, then replays
// the level until it has met all of its sets. Each time it checks that the stage shows the stack the rules say,
// and that the end-of-game card shows only after the last level. Run `npx vite build` first. REPLAYS=0 plays each
// level once.
import { heightsKey } from '../src/rules/stack.ts';
import { LEVELS, SET, SETS } from '../src/rules/levels.ts';
import { afterAnswer, answer, launch, openLevel, openPage, puzzleOn, ready, screenIs, serve, SHOTS, stageShows, touch } from './lib.mjs';

const REPLAYS = Number(process.env.REPLAYS ?? SETS - 1);
const FROM = Number(process.env.FROM ?? 1);

/** One set: every stack right first time. Returns the variants met and the stars. */
async function playSet(page) {
  const variants = [];
  for (let at = 0; at < SET; at += 1) {
    await page.waitForFunction((wanted) => document.body.dataset.status === 'playing' && document.body.dataset.at === String(wanted), at, { timeout: 20000 });
    const level = await puzzleOn(page);
    const shows = await stageShows(page);
    if (shows !== heightsKey(level.heights)) throw new Error(`Level ${level.id}.${level.variant}: the stage shows ${shows} but the rules say ${heightsKey(level.heights)}`);
    variants.push(level.variant);
    await answer(page, level.truth);
    const outcome = await afterAnswer(page, at);
    const expected = at === SET - 1 ? 'won' : 'next';
    if (outcome !== expected) throw new Error(`Level ${level.id}.${level.variant}: a right answer gave ${outcome}, not ${expected}`);
  }
  return { variants, stars: Number(await page.evaluate(() => document.body.dataset.stars)) };
}

async function main() {
  const server = await serve();
  const browser = await launch();
  const progress = FROM > 1 ? { stars: Object.fromEntries(LEVELS.filter((level) => level.id < FROM).map((level) => [level.id, 3])), skipped: [] } : null;
  const { page, problems } = await openPage(browser, { progress });
  const rows = [];
  const started = Date.now();
  try {
    for (const { id, world } of LEVELS.filter((level) => level.id >= FROM)) {
      if ((await page.evaluate(() => document.body.dataset.screen)) !== 'play') {
        const tile = page.locator(`[data-level="${id}"]`);
        if ((await tile.getAttribute('data-open')) !== 'true') throw new Error(`Level ${id} did not open`);
        await openLevel(page, id);
      }
      await page.waitForFunction((wanted) => document.body.dataset.level === String(wanted), id);
      const seen = [];
      const stars = [];
      for (let go = 0; go <= REPLAYS; go += 1) {
        const setStarted = Date.now();
        const result = await playSet(page);
        if (result.variants.some((variant) => seen.includes(variant))) throw new Error(`Level ${id}: replay ${go} brought back a stack`);
        seen.push(...result.variants);
        stars.push(result.stars);
        rows.push({ id, stars: result.stars, ms: Date.now() - setStarted });
        const finale = await page.evaluate(() => document.body.dataset.finale === 'true');
        if (finale !== (id === LEVELS.length)) throw new Error(`Level ${id}: the end-of-game card ${finale ? 'showed early' : 'is missing'}`);
        await page.waitForSelector('.card-btn.armed');
        if (go < REPLAYS) {
          if (await page.locator('[data-action="again"]').count()) await touch(page, '[data-action="again"]');
          else {
            await touch(page, '[data-action="map"]');
            await screenIs(page, 'map');
            await openLevel(page, id);
          }
          await ready(page);
        }
      }
      const setMs = rows.slice(-stars.length).map((row) => row.ms);
      console.log(
        `level ${String(id).padStart(2)} ${world.padEnd(6)} won ${stars.length} sets, ${seen.length} stacks ${stars.map((n) => '★'.repeat(n)).join(' ')} ~${Math.round(setMs.reduce((a, b) => a + b, 0) / setMs.length / 1000)}s a set`,
      );
      if (await page.locator('[data-action="next"]').count()) await touch(page, '[data-action="next"]');
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
  const wanted = LEVELS.filter((level) => level.id >= FROM).length;
  console.log(`\nskilled bot: won ${levels} of ${wanted} levels and ${rows.length} sets, ${perfect} with 3 stars, in ${Math.round((Date.now() - started) / 60000)} min`);
  console.log(`problems: ${problems.length ? problems.join('\n') : 'none'}`);
  process.exit(levels === wanted && perfect === rows.length && !problems.length ? 0 : 1);
}

await main();
