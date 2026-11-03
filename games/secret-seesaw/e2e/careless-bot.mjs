// A careless player: a child in a hurry who never moves anything on the seesaw. For a mystery it takes the
// difference between the plain numbers on its seesaw, ignoring how many boxes there are and the other seesaw,
// then tries the numbers next to that. It never gives up on its own: it keeps guessing until the try tumbles,
// takes the one-tap retry on the fresh puzzle, and stops only after 8 tries on a level. On "make it level"
// boards, where nothing is ever lost, it drops random tray weights and takes any one of its own back off when
// the seesaw tips too far, for up to 30 taps. The random numbers are seeded, so a run can be repeated. Run
// `npx vite build` first.
//
// It passes when it wins every level of the first two worlds and loses the last three of each later world.
import { LEVELS } from '../src/rules/levels.ts';
import { allOpen, answer, launch, openLevel, openPage, pictures, ready, screenIs, serve, touch } from './lib.mjs';

const TRIES = 8;
const MOST_TRAY_TAPS = 30;
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

const plainSum = (side) => side.split('+').reduce((sum, token) => sum + (/^\d+$/.test(token) ? Number(token) : 0), 0);

/** The quick guess: the gap between the plain numbers on the seesaw that holds this mystery. */
function quickGuess(seesaws, mystery) {
  const holder = seesaws.find((picture) => picture.split(/[+=]/).includes(mystery)) ?? seesaws[0];
  const [left, right] = holder.split('=');
  return Math.abs(plainSum(right) - plainSum(left));
}

const status = (page) => page.evaluate(() => ({ ...document.body.dataset }));

/** One try: quick guesses until it wins or tumbles. */
async function oneTry(page, level) {
  for (const mystery of level.ask) {
    const quick = quickGuess(await pictures(page), mystery);
    const shown = await page.locator('[data-choice]').evaluateAll((items) => items.map((item) => Number(item.dataset.choice)));
    const choices = shown.length ? shown : Array.from({ length: 21 }, (_, n) => n);
    const guesses = choices.sort((a, b) => Math.abs(a - quick) - Math.abs(b - quick) || b - a);
    for (const value of guesses) {
      await answer(page, value);
      await page.waitForTimeout(TAP_WAIT_MS);
      await ready(page);
      const now = await status(page);
      if (now.screen === 'won') return true;
      if (now.screen === 'lost') return false;
      if (now.asking !== mystery) break;
    }
  }
  return (await status(page)).screen === 'won';
}

/** Tries again and again on fresh puzzles. Returns the try it won on, or 0. */
async function puzzle(page, level) {
  for (let attempt = 1; attempt <= TRIES; attempt += 1) {
    if (await oneTry(page, level)) return attempt;
    await screenIs(page, 'lost');
    if (attempt === TRIES) return 0;
    await page.waitForSelector('[data-action="try-again"].armed');
    await touch(page, '[data-action="try-again"]');
    await page.waitForFunction(() => document.body.dataset.screen === 'play' && document.body.dataset.status === 'playing');
  }
  return 0;
}

async function levelBoard(page, random) {
  const placed = [];
  for (let taps = 0; taps < MOST_TRAY_TAPS; taps += 1) {
    await ready(page);
    const now = await status(page);
    if (now.screen === 'won') return true;
    const lean = await page.locator('.rig').first().getAttribute('data-lean');
    const openSide = await page.locator('.basket.open').getAttribute('data-side');
    const tooHeavy = (openSide === 'right' && lean === '1') || (openSide === 'left' && lean === '-1');
    if (tooHeavy && placed.length) {
      // Any one of its own weights comes back off, not always the last.
      const [back] = placed.splice(Math.floor(random() * placed.length), 1);
      await touch(page, `#scene [data-item="${back}"]`);
    } else {
      const tray = await page.locator('[data-tray]').evaluateAll((items) => items.map((item) => item.dataset.tray));
      if (!tray.length) {
        await touch(page, `#scene [data-item="${placed.pop()}"]`);
      } else {
        const pick = tray[Math.floor(random() * tray.length)];
        placed.push(pick);
        await touch(page, `[data-tray="${pick}"]`);
      }
    }
    await page.waitForTimeout(TAP_WAIT_MS);
  }
  return (await status(page)).screen === 'won';
}

async function main() {
  const server = await serve();
  const browser = await launch();
  const { page, problems } = await openPage(browser, { progress: allOpen(LEVELS) });
  const random = seeded(20261103);
  const byWorld = new Map();
  const results = new Map();
  try {
    for (const level of LEVELS) {
      await openLevel(page, level.id);
      const wonOn = level.ask.length ? await puzzle(page, level) : (await levelBoard(page, random)) ? 1 : 0;
      const won = wonOn > 0;
      results.set(level.id, won);
      const world = byWorld.get(level.world) ?? { won: 0, levels: 0 };
      byWorld.set(level.world, { won: world.won + (won ? 1 : 0), levels: world.levels + 1 });
      console.log(`level ${String(level.id).padStart(2)} ${level.world.padEnd(6)} ${won ? `won on try ${wonOn}` : `lost all ${TRIES} tries`}`);
      if (won) {
        await screenIs(page, 'won');
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
  for (const [world, { won, levels }] of byWorld) console.log(`${world.padEnd(6)} won ${won} of ${levels}`);
  console.log(`problems: ${problems.length ? problems.join('\n') : 'none'}`);
  const early = LEVELS.filter((level) => level.world === 'box' || level.world === 'level');
  const late = ['boxes', 'both', 'two'].flatMap((world) => LEVELS.filter((level) => level.world === world).slice(-3));
  const fair = early.every((level) => results.get(level.id)) && late.every((level) => !results.get(level.id));
  console.log(`early levels all won and late levels all lost: ${fair ? 'yes' : 'no'}`);
  process.exit(fair && !problems.length ? 0 : 1);
}

await main();
