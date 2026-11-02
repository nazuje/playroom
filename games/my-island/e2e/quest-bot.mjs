// Plays a new island the way a child following the star would: every step a real tap on the screen.
// Finishes the first quests, reloads to prove the save, then checks that a second island is separate.
import { body, fail, hold, launch, makeIsland, openPage, panelIs, screenIs, serve, shot, touch } from './lib.mjs';

const QUESTS_TO_FINISH = Number(process.env.QUESTS ?? 10);
const LANGUAGE = process.env.LANG_PICK ?? 'en';
const MOST_STEPS = 900;

const visible = (page, selector) => page.locator(selector).first().isVisible().catch(() => false);
const wait = (page, ms) => page.waitForTimeout(ms);

async function tapTarget(page, id) {
  const selector = `.hit[data-target="${id}"]:not([hidden])`;
  if (await page.locator(selector).count()) {
    await touch(page, selector);
    return 'tapped';
  }
  if (await visible(page, '#arrow')) {
    await touch(page, '#arrow');
    return 'arrow';
  }
  return 'none';
}

/** Does whatever the open panel is for, the way the quest wants. Returns false if nothing was done. */
async function usePanel(page, panel) {
  switch (panel) {
    case 'seeds': {
      const crop = (await body(page, 'questCrop')) || 'carrot';
      const pick = `[data-crop="${crop}"]:not(.choice-locked)`;
      await touch(page, (await page.locator(pick).count()) ? pick : '[data-crop]:not(.choice-locked)');
      return true;
    }
    case 'bakery': {
      if (!(await page.locator('[data-ready="yes"]').count())) break;
      await touch(page, '[data-ready="yes"]');
      for (let step = 0; step < 4 && (await page.locator('[data-action="add"]').count()); step += 1) await touch(page, '[data-action="add"]');
      await touch(page, '[data-action="oven"]');
      await wait(page, 300);
      break;
    }
    case 'pets':
      if (await page.locator('[data-lock="open"]').count()) {
        await touch(page, '[data-lock="open"]');
        return true;
      }
      break;
    case 'care':
      for (const action of ['brush', 'feed', 'play']) {
        await touch(page, `[data-care="${action}"]`);
        await wait(page, 150);
      }
      break;
    case 'fishing':
      for (let tries = 0; tries < 8 && !(await page.locator('[data-action="again"]').count()); tries += 1) {
        await touch(page, '[data-action="catch"]');
        await wait(page, 250);
      }
      break;
    case 'give':
      if (await page.locator('[data-treat]').count()) {
        await touch(page, '[data-treat]');
        return true;
      }
      break;
    case 'wardrobe':
      await touch(page, '[data-tab="hat"]');
      await touch(page, '[data-option="2"]');
      await touch(page, '[data-action="done"]');
      return true;
    default:
  }
  if (await body(page, 'panel')) await touch(page, '[data-action="close"]');
  return true;
}

async function decorate(page, room) {
  const owned = page.locator('[data-item]');
  if (!(await owned.count())) {
    const shells = Number(await body(page, 'shells'));
    const buys = page.locator('[data-buy]:not(.choice-short)');
    if ((await buys.count()) && shells > 0) await buys.first().tap();
  }
  if (await page.locator('[data-item]').count()) await touch(page, '[data-item]');
  const { width, height } = page.viewportSize();
  await page.touchscreen.tap(width * (room === 'home' ? 0.35 : 0.3), height * 0.42);
  await wait(page, 300);
  await touch(page, room === 'home' ? '[data-action="door"]' : '[data-action="done"]');
  await screenIs(page, 'play');
}

export async function followQuests(page, goal, log = () => {}) {
  let last = '';
  for (let step = 0; step < MOST_STEPS; step += 1) {
    const done = Number(await body(page, 'quests'));
    if (done >= goal) return done;
    const screen = await body(page, 'screen');
    const panel = await body(page, 'panel');
    if (screen === 'house') {
      await decorate(page, 'home');
      continue;
    }
    if (screen === 'decor') {
      await decorate(page, 'outdoor');
      continue;
    }
    if (screen === 'wardrobe' || panel) {
      await usePanel(page, panel || 'wardrobe');
      await wait(page, 300);
      continue;
    }
    if ((await body(page, 'walking')) === 'yes') {
      await wait(page, 250);
      continue;
    }
    const target = await body(page, 'questTarget');
    const note = `${done}:${target}`;
    if (note !== last) log(`quest ${done + 1}: ${target}`);
    last = note;
    if (target === 'button:decor') {
      await touch(page, '#decor');
      await screenIs(page, 'decor');
      continue;
    }
    const how = await tapTarget(page, target);
    // A plot that is still growing gets a friendly line and nothing else: wait a moment, then look again.
    await wait(page, how === 'none' ? 500 : 900);
    if (target.startsWith('plot:') && !(await body(page, 'panel'))) await wait(page, 1500);
  }
  throw new Error(`Stuck at quest ${Number(await body(page, 'quests')) + 1}`);
}

const isMain = process.argv[1]?.endsWith('quest-bot.mjs');
if (isMain) {
  const server = await serve();
  const browser = await launch();
  const started = Date.now();
  try {
    const { page, context, problems } = await openPage(browser, { language: LANGUAGE });
    await makeIsland(page, { avatar: 1, picks: [['hair', 2], ['outfit', 3], ['hat', 5]] });
    await shot(page, 'quest-start');
    const done = await followQuests(page, QUESTS_TO_FINISH, (line) => console.log(`  ${((Date.now() - started) / 1000).toFixed(0)}s ${line}`));
    const before = { level: await body(page, 'level'), shells: await body(page, 'shells'), pets: await body(page, 'pets') };
    await wait(page, 3000);
    await shot(page, 'quest-done');
    console.log(`finished ${done} quests, level ${before.level}, ${before.shells} shells, ${before.pets} pets`);

    await page.reload();
    await screenIs(page, 'islands');
    await shot(page, 'quest-reloaded-picker');
    await touch(page, '.slot[data-slot="0"]');
    await screenIs(page, 'play');
    const after = { level: await body(page, 'level'), shells: await body(page, 'shells'), pets: await body(page, 'pets'), quests: await body(page, 'quests') };
    if (Number(after.quests) < done || after.level !== before.level || after.pets !== before.pets) fail(problems, `The reload lost progress: ${JSON.stringify(before)} then ${JSON.stringify(after)}`);
    console.log(`reload kept it: ${JSON.stringify(after)}`);

    await hold(page, '[data-action="islands"]');
    await screenIs(page, 'islands');
    await makeIsland(page, { avatar: 4 });
    const second = { slot: await body(page, 'slot'), quests: await body(page, 'quests'), shells: await body(page, 'shells') };
    if (second.slot !== '1' || second.quests !== '0' || second.shells !== '0') fail(problems, `The second island is not fresh: ${JSON.stringify(second)}`);
    await hold(page, '[data-action="islands"]');
    await screenIs(page, 'islands');
    const slots = await page.locator('.slot[data-state="ok"]').count();
    if (slots !== 2) fail(problems, `Expected two islands on the picker, saw ${slots}`);
    await touch(page, '.slot[data-slot="0"]');
    await screenIs(page, 'play');
    if (Number(await body(page, 'quests')) < done) fail(problems, 'The first island changed after making the second');
    console.log('second island is separate, first island untouched');
    await shot(page, 'quest-back-to-first');
    if (problems.length) fail(problems, 'Problems in the console');
    console.log(`quest bot passed in ${((Date.now() - started) / 1000).toFixed(0)}s`);
    await context.close();
  } finally {
    await browser.close();
    server.kill();
  }
}
