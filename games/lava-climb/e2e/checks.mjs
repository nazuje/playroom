// Screens, languages, mashing, keyboard and reduced motion, on the real built game.
// node e2e/checks.mjs   Screenshots land in e2e/shots/.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { allOpen, buildGame, enterLevel, Fingers, openBrowser, openPhone, replay, serveGame, SHOTS } from './harness.mjs';

const routes = JSON.parse(readFileSync(fileURLToPath(new URL('routes.json', import.meta.url)), 'utf8'));
const SCREENS = [
  { name: 'phone', width: 390, height: 844 },
  { name: 'tablet', width: 768, height: 1024 },
  { name: 'side', width: 844, height: 390 },
  { name: 'laptop', width: 1280, height: 800 },
];
const TAPS = 50;
const SAFE_TOP = 90;

function mashPoints({ width, height }) {
  return Array.from({ length: TAPS }, (_, tap) => ({ x: 20 + ((tap * 83) % (width - 40)), y: SAFE_TOP + ((tap * 137) % (height - SAFE_TOP - 20)) }));
}

async function mash(page, screen) {
  for (const { x, y } of mashPoints(screen)) {
    await page.touchscreen.tap(x, y);
    await page.waitForTimeout(25);
  }
}

async function sideways(page, screen, problems) {
  const extra = (await page.evaluate(() => document.documentElement.scrollWidth)) - screen.width;
  if (extra > 0) problems.push(`scrolls sideways by ${extra}px`);
}

async function smallTargets(page, problems, where) {
  const small = await page.locator('a, button').evaluateAll((items) => items
    .map((item) => ({ item, box: item.getBoundingClientRect() }))
    .filter(({ box }) => box.width > 0 && (box.width < 48 || box.height < 48))
    .map(({ item, box }) => `${item.getAttribute('aria-label') ?? item.textContent} ${Math.round(box.width)}x${Math.round(box.height)}`));
  if (small.length) problems.push(`${where} small: ${small.join(', ')}`);
}

async function onePass(browser, screen, language) {
  const tag = `${screen.name}-${language}`;
  const shot = (name) => page.screenshot({ path: join(SHOTS, `${tag}-${name}.png`) });
  const { context, page, problems } = await openPhone(browser, { width: screen.width, height: screen.height, language, progress: allOpen() });
  await page.waitForSelector('.level-btn');
  await page.waitForTimeout(500);
  await shot('map');
  await smallTargets(page, problems, 'map');
  await sideways(page, screen, problems);

  await enterLevel(page, 5);
  await page.waitForTimeout(250);
  await shot('ready');
  await smallTargets(page, problems, 'play');
  await sideways(page, screen, problems);
  await mash(page, screen);
  await page.waitForTimeout(200);
  await shot('mashed');
  if (!(await page.locator('#tower').count())) problems.push('mashing left the level');

  // Language mid-game: the climb carries on and the words change.
  const before = await page.evaluate(() => document.getElementById('tower').dataset.run.split(' ')[0]);
  await shot('before-language');
  await page.locator('.language-btn').tap({ timeout: 4000 });
  await page.waitForTimeout(150);
  const after = await page.evaluate(() => ({ tick: document.getElementById('tower').dataset.run.split(' ')[0], lang: document.documentElement.lang }));
  if (after.lang === language) problems.push('the language button did nothing');
  if (Number(after.tick) < Number(before)) problems.push('switching language restarted the level');
  await page.locator('.language-btn').tap();

  // Stand still and let the lava come: the singe, the retry and how long it takes.
  const fingers = await Fingers.on(page);
  await page.locator('.hud-left .bar-btn').first().tap();
  await page.waitForSelector('.level-btn');
  await enterLevel(page, 1);
  fingers.zones = await Fingers.readZones(page);
  await fingers.set({ dir: 1, jump: false, dash: false });
  await page.waitForTimeout(60);
  await fingers.lift();
  await page.waitForFunction(() => document.getElementById('tower').dataset.phase === 'singed', null, { timeout: 30000 });
  await page.waitForTimeout(180);
  await shot('singed');
  const singedAt = Date.now();
  await page.waitForFunction(() => document.getElementById('tower').dataset.phase === 'ready', null, { timeout: 3000, polling: 16 });
  const retryMs = Date.now() - singedAt + 180;
  if (retryMs > 1000) problems.push(`retry took ${retryMs}ms`);

  const { won: ok } = await replay(fingers, routes.l1);
  if (ok) {
    await page.waitForFunction(() => document.getElementById('tower')?.dataset.phase === 'result', null, { timeout: 4000 });
    await page.waitForTimeout(100);
    await shot('result');
    await mash(page, screen);
    await page.waitForTimeout(900);
    await shot('result-mashed');
    await smallTargets(page, problems, 'result');
    const next = page.locator('.result .big-btn');
    if (await next.count()) {
      await next.tap();
      await page.waitForTimeout(300);
      const level = await page.evaluate(() => document.getElementById('tower')?.dataset.level);
      if (level !== '2' && level !== '1') problems.push(`next went to ${level}`);
    }
  } else problems.push('could not finish level 1 for the result screen');
  await context.close();
  return problems;
}

async function keyboard(browser) {
  const { context, page, problems } = await openPhone(browser, { width: 1280, height: 800, progress: allOpen() });
  await page.waitForSelector('.level-btn');
  await enterLevel(page, 8);
  await page.keyboard.down('ArrowRight');
  await page.keyboard.press('Space');
  await page.waitForTimeout(120);
  await page.keyboard.down('Space');
  await page.waitForTimeout(160);
  await page.keyboard.press('KeyX');
  await page.waitForTimeout(120);
  await page.keyboard.up('Space');
  await page.keyboard.up('ArrowRight');
  await page.waitForTimeout(120);
  const [tick, x] = (await page.evaluate(() => document.getElementById('tower').dataset.run)).split(' ').map(Number);
  if (tick < 20 || x < 110) problems.push(`keyboard did little: tick ${tick}, x ${x}`);
  await context.close();
  return problems;
}

async function calm(browser) {
  const { context, page, problems } = await openPhone(browser, { reducedMotion: 'reduce', progress: allOpen() });
  await page.waitForSelector('.level-btn');
  await enterLevel(page, 1);
  const fingers = await Fingers.on(page);
  await fingers.set({ dir: 1, jump: false, dash: false });
  await page.waitForTimeout(3000);
  await fingers.lift();
  await page.screenshot({ path: join(SHOTS, 'reduced-motion.png') });
  await context.close();
  return problems;
}

/** Five singes on a fresh save bring the skip button, which only a long press works. */
async function skipping(browser) {
  const screen = SCREENS[0];
  const { context, page, problems } = await openPhone(browser);
  await page.waitForSelector('.level-btn');
  await enterLevel(page, 1);
  const fingers = await Fingers.on(page);
  for (let singe = 0; singe < 5; singe += 1) {
    await fingers.set({ dir: 1, jump: false, dash: false });
    await page.waitForTimeout(40);
    await fingers.lift();
    await page.waitForFunction(() => document.getElementById('tower').dataset.phase === 'singed', null, { timeout: 30000 });
    await page.waitForFunction(() => document.getElementById('tower').dataset.phase === 'ready', null, { timeout: 3000 });
  }
  if (!(await page.locator('.skip-btn').isVisible())) problems.push('no skip button after 5 tries');
  await mash(page, { ...screen, height: 690 });
  const level = await page.evaluate(() => document.getElementById('tower').dataset.level);
  if (level !== '1') problems.push('mashing pressed skip');
  const box = await page.locator('.skip-btn').boundingBox();
  const finger = { id: 9, x: box.x + box.width / 2, y: box.y + box.height / 2 };
  await fingers.session.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [finger] });
  await page.waitForTimeout(450);
  await page.screenshot({ path: join(SHOTS, 'skip-held.png') });
  await page.waitForTimeout(800);
  await fingers.session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await page.waitForTimeout(300);
  const after = await page.evaluate(() => document.getElementById('tower').dataset.level);
  if (after !== '2') problems.push(`skip went to level ${after}`);
  await context.close();
  return problems;
}

async function main() {
  if (!process.env.NO_BUILD) buildGame();
  const server = await serveGame();
  const browser = await openBrowser();
  let failed = 0;
  const report = (name, problems) => {
    console.log(`${problems.length ? 'FAIL' : 'ok'} ${name}`);
    for (const problem of problems) console.log(`   ${problem}`);
    failed += problems.length;
  };
  try {
    const passes = SCREENS.flatMap((screen) => ['en', 'sl'].map((language) => [screen, language]));
    while (passes.length) {
      const batch = passes.splice(0, 3);
      await Promise.all(batch.map(async ([screen, language]) => report(`${screen.name} ${language}`, await onePass(browser, screen, language).catch((error) => [`stopped: ${error.message.split('\n')[0]}`]))));
    }
    report('skip', await skipping(browser));
    report('keyboard', await keyboard(browser));
    report('reduced motion', await calm(browser));
  } finally {
    await browser.close();
    server.kill();
  }
  console.log(`\n${failed} problem(s). Look at the screenshots too.`);
  process.exit(failed ? 1 : 0);
}

await main();
