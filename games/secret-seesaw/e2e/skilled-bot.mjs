// A skilled player. From a fresh save it plays every level of the built game in order with real touches, then
// replays them all on their fresh second puzzles. On each level it
// takes the same off both sides and swaps mysteries exactly as the hint search finds, checks after every tap
// that the real seesaws show what the rules say, then picks the right number. Run `npx vite build` first.
import { describe } from '../src/rules/board.ts';
import { LEVELS, levelFor, trayMakes } from '../src/rules/levels.ts';
import { guess, openLean, place, startPlay, tap } from '../src/rules/play.ts';
import { stepsTo } from '../src/rules/solve.ts';
import { answer, launch, openLevel, openPage, pictures, ready, screenIs, serve, SHOTS, touch, variant } from './lib.mjs';

const TAP_WAIT_MS = 40;

async function agrees(page, play, after) {
  const real = await pictures(page);
  const rules = play.board.seesaws.map(describe);
  if (real.join(' | ') !== rules.join(' | ')) throw new Error(`After ${after} the game shows ${real.join(' | ')} but the rules say ${rules.join(' | ')}`);
}

async function levelBoard(page, level) {
  let play = startPlay(level);
  const need = -openLean(play);
  const values = trayMakes(level.tray, need);
  const used = new Set();
  for (const value of values) {
    const index = level.tray.findIndex((one, at) => one === value && !used.has(at));
    used.add(index);
    await touch(page, `[data-tray="t${index}"]`);
    await page.waitForTimeout(TAP_WAIT_MS);
    play = place(play, `t${index}`).play;
    if (!play.won) await agrees(page, play, `tray t${index}`);
  }
  return values.length;
}

async function puzzle(page, level) {
  let play = startPlay(level);
  let taps = 0;
  for (const mystery of level.ask) {
    for (const id of stepsTo(play.board, mystery)) {
      await touch(page, `#scene [data-item="${id}"]`);
      await page.waitForTimeout(TAP_WAIT_MS);
      play = tap(play, id).play;
      taps += 1;
      await agrees(page, play, `tapping ${id}`);
    }
    const value = level.values[mystery];
    await answer(page, value);
    play = guess(play, value).play;
    taps += 1;
    if (!play.won) {
      await page.waitForFunction((next) => document.body.dataset.asking === next && document.body.dataset.status === 'playing', play.level.ask[play.asking]);
      await agrees(page, play, `finding the ${mystery}`);
    }
  }
  return taps;
}

/** Plays every level once, in order. The first round meets each level as designed, the replay a fresh puzzle. */
async function round(page, name, rows) {
  for (const designed of LEVELS) {
    if ((await page.evaluate(() => document.body.dataset.screen)) !== 'play') {
      const tile = page.locator(`[data-level="${designed.id}"]`);
      if ((await tile.getAttribute('data-open')) !== 'true') throw new Error(`Level ${designed.id} did not open`);
      await openLevel(page, designed.id);
    }
    await page.waitForFunction((id) => document.body.dataset.level === String(id) && document.body.dataset.status === 'playing', designed.id);
    const level = levelFor(designed.id, await variant(page));
    if ((name === 'replay') !== (level.variant > 0)) throw new Error(`Level ${designed.id} on the ${name} met try ${level.variant}`);
    const fresh = JSON.stringify(level.seesaws) !== JSON.stringify(designed.seesaws) || JSON.stringify(level.tray) !== JSON.stringify(designed.tray);
    const started = Date.now();
    const taps = level.ask.length ? await puzzle(page, level) : await levelBoard(page, level);
    await screenIs(page, 'won');
    const stars = Number(await page.evaluate(() => document.body.dataset.stars));
    rows.push({ id: level.id, stars, fresh });
    const pictured = level.seesaws.map((plan) => `${plan.left.join('+')}=${plan.right.join('+')}`).join(' | ');
    console.log(`${name} level ${String(level.id).padStart(2)} ${level.world.padEnd(6)} won with ${String(taps).padStart(2)} taps ${'★'.repeat(stars)} ${Date.now() - started} ms  ${pictured}`);
    await page.waitForSelector('.card-btn.armed');
    const next = page.locator('[data-action="next"]');
    if (await next.count()) await touch(page, '[data-action="next"]');
    else {
      await touch(page, '[data-action="map"]');
      await screenIs(page, 'map');
    }
    await ready(page);
  }
}

async function main() {
  const server = await serve();
  const browser = await launch();
  const width = Number(process.env.WIDTH ?? 390);
  const height = Number(process.env.HEIGHT ?? 844);
  const { page, problems } = await openPage(browser, { width, height });
  const first = [];
  const replay = [];
  try {
    await round(page, 'first', first);
    await round(page, 'replay', replay);
  } catch (error) {
    await page.screenshot({ path: `${SHOTS}/skilled-failed.png` });
    console.log('screen at failure:', await page.evaluate(() => JSON.stringify(document.body.dataset)), problems);
    throw error;
  } finally {
    await browser.close();
    server.kill();
  }
  const perfect = (rows) => rows.filter((row) => row.stars === 3).length;
  console.log(`\nskilled bot at ${width}x${height}: won ${first.length} of ${LEVELS.length} levels, ${perfect(first)} with 3 stars`);
  console.log(`replay: won ${replay.length} of ${LEVELS.length}, ${perfect(replay)} with 3 stars, ${replay.filter((row) => row.fresh).length} with a fresh puzzle`);
  console.log(`problems: ${problems.length ? problems.join('\n') : 'none'}`);
  const all = [...first, ...replay];
  process.exit(all.length === 2 * LEVELS.length && perfect(all) === all.length && !problems.length ? 0 : 1);
}

await main();
