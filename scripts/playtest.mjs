// Plays built games the way a small child does: mashes them on a phone and a tablet in every language.
// Run `npm run build` first. Screenshots land in .playtest/.
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const DIST = join(ROOT, 'dist');
const OUT = join(ROOT, '.playtest');
const PORT = 5180;
const BASE = `http://localhost:${PORT}/`;
const TOP_BAR_PX = 90;
const MASH_TAPS = 40;
const MIN_TARGET_PX = 48;
const MIN_COLORS = 12;
const MIN_CANVAS_PX = 200;
// The only outside services the site uses. See AGENTS.md.
const FONT_HOSTS = ['fonts.googleapis.com', 'fonts.gstatic.com'];
const GAME_HOSTS = { 'globe-safari': ['en.wikipedia.org', 'thumb.wikimedia.org', 'upload.wikimedia.org'] };
const FILE_TYPES = new Set(['script', 'stylesheet', 'image', 'media', 'font', 'fetch', 'xhr']);
const SCREENS = [
  { name: 'phone', width: 390, height: 844 },
  { name: 'tablet', width: 1024, height: 768 },
];

// Software 3D, so WebGL works with no graphics card. Headless Chrome still plays sound through the
// computer's speakers, so bots and playtests run muted; the games' audio code runs the same either way.
export const launchOptions = {
  channel: 'chrome',
  headless: true,
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--mute-audio'],
};

function fail(message) {
  console.error(`\nplaytest: ${message}`);
  process.exit(1);
}

function chooseGames(asked) {
  const games = JSON.parse(readFileSync(join(ROOT, 'games.json'), 'utf8')).filter(({ status }) => status === 'ready');
  const chosen = asked.length ? games.filter(({ slug }) => asked.includes(slug)) : games;
  const missing = asked.filter((slug) => !games.some((game) => game.slug === slug));
  if (missing.length) fail(`not ready in games.json: ${missing.join(', ')}`);
  for (const { slug } of chosen) {
    if (!existsSync(join(DIST, slug, 'index.html'))) fail(`dist/${slug} is missing. Run: npm run build`);
  }
  return chosen;
}

async function startServer() {
  const vite = join(ROOT, 'node_modules', '.bin', 'vite');
  const server = spawn(vite, ['preview', '--outDir', 'dist', '--port', String(PORT), '--strictPort'], { cwd: ROOT, stdio: 'ignore' });
  for (let tries = 0; tries < 100; tries += 1) {
    const up = await fetch(BASE).then(() => true, () => false);
    if (up) return server;
    await new Promise((resolve) => setTimeout(resolve, 150));
  }
  server.kill();
  return fail('the preview server did not start');
}

/** Scattered spots below the top bar, so the same run hits the same places every time. */
function mashPoints({ width, height }) {
  return Array.from({ length: MASH_TAPS }, (_, tap) => ({
    x: 20 + ((tap * 83) % (width - 40)),
    y: TOP_BAR_PX + ((tap * 137) % (height - TOP_BAR_PX - 20)),
  }));
}

async function countColors(page, png) {
  const url = `data:image/png;base64,${png.toString('base64')}`;
  return page.evaluate(async (source) => {
    const image = new Image();
    image.src = source;
    await image.decode();
    const canvas = new OffscreenCanvas(image.width, image.height);
    const context = canvas.getContext('2d');
    context.drawImage(image, 0, 0);
    const { data } = context.getImageData(0, 0, image.width, image.height);
    const colors = new Set();
    for (let at = 0; at < data.length; at += 4 * 7) colors.add((data[at] << 16) | (data[at + 1] << 8) | data[at + 2]);
    return colors.size;
  }, url);
}

/** A canvas that draws nothing looks the same with it hidden, whatever sits behind it. */
async function blankCanvases(page) {
  let blank = 0;
  for (const canvas of await page.locator('canvas').all()) {
    const box = await canvas.boundingBox();
    if (!box || box.width < MIN_CANVAS_PX || box.height < MIN_CANVAS_PX) continue;
    const clip = { ...box, x: Math.max(box.x, 0), y: Math.max(box.y, 0) };
    const shown = await page.screenshot({ clip });
    await canvas.evaluate((element) => (element.style.visibility = 'hidden'));
    const hidden = await page.screenshot({ clip });
    await canvas.evaluate((element) => (element.style.visibility = ''));
    if (shown.equals(hidden)) blank += 1;
  }
  return blank;
}

const smallTargets = (page) =>
  page.locator('a, button, [role="button"]').evaluateAll((items, least) =>
    items
      .map((item) => ({ item, box: item.getBoundingClientRect() }))
      .filter(({ box }) => box.width > 0 && box.height > 0 && (box.width < least || box.height < least))
      .map(({ item, box }) => `${item.getAttribute('aria-label') || item.textContent?.trim() || item.tagName} ${Math.round(box.width)}x${Math.round(box.height)}`), MIN_TARGET_PX);

async function playOne(browser, slug, language, screen) {
  const context = await browser.newContext({
    viewport: { width: screen.width, height: screen.height },
    hasTouch: true,
    isMobile: true,
  });
  await context.addInitScript((chosen) => localStorage.setItem('playroom:language', JSON.stringify(chosen)), language);
  const page = await context.newPage();
  const problems = [];
  page.on('console', (message) => {
    if (message.type() === 'error') problems.push(`console: ${message.text()}`);
  });
  page.on('pageerror', (error) => problems.push(`crash: ${error.message}`));
  page.on('request', (request) => {
    const { hostname, protocol } = new URL(request.url());
    const allowed = ['localhost', ...FONT_HOSTS, ...(GAME_HOSTS[slug] ?? [])];
    if (protocol.startsWith('http') && !allowed.includes(hostname)) problems.push(`outside request: ${request.url()}`);
  });
  page.on('response', (response) => {
    if (new URL(response.url()).hostname !== 'localhost') return;
    // The preview server answers a missing file with the game's own page and a 200.
    const wrongFile = FILE_TYPES.has(response.request().resourceType()) && response.headers()['content-type']?.includes('text/html');
    if (response.status() >= 400 || wrongFile) problems.push(`missing file: ${response.url()}`);
  });

  const url = `${BASE}${slug}/`;
  const shot = (step) => join(OUT, `${slug}-${language}-${screen.name}-${step}.png`);
  await page.goto(url);
  await page.waitForTimeout(900);
  await page.screenshot({ path: shot('start') });
  if ((await countColors(page, await page.screenshot())) < MIN_COLORS) problems.push('the page looks blank');
  const small = await smallTargets(page);

  for (const { x, y } of mashPoints(screen)) {
    await page.touchscreen.tap(x, y);
    await page.waitForTimeout(60);
  }
  await page.waitForTimeout(700);
  await page.screenshot({ path: shot('played') });

  if (!page.url().startsWith(url)) problems.push(`mashing left the game for ${page.url()}`);
  const sideways = (await page.evaluate(() => document.documentElement.scrollWidth)) - screen.width;
  if (sideways > 0) problems.push(`scrolls sideways by ${sideways}px`);
  const blank = await blankCanvases(page);
  if (blank) problems.push(`${blank} blank canvas(es) after playing`);
  await context.close();
  return { problems, small };
}

async function main() {
  const games = chooseGames(process.argv.slice(2));
  rmSync(OUT, { recursive: true, force: true });
  mkdirSync(OUT, { recursive: true });
  const server = await startServer();
  const browser = await chromium.launch(launchOptions);
  let failed = 0;
  try {
    for (const { slug, languages } of games) {
      for (const language of languages) {
        for (const screen of SCREENS) {
          const { problems, small } = await playOne(browser, slug, language, screen);
          console.log(`${problems.length ? '✗' : '✓'} ${slug} ${language} ${screen.name}`);
          for (const problem of problems) console.log(`    ${problem}`);
          if (small.length) console.log(`    small targets: ${[...new Set(small)].join(', ')}`);
          failed += problems.length;
        }
      }
    }
  } finally {
    await browser.close();
    server.kill();
  }
  console.log(`\n${failed} problem(s). Screenshots are in .playtest/, so look at them too.`);
  process.exit(failed ? 1 : 0);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) await main();
