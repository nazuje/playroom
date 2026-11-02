// Runs every bot against one preview server, a few at a time, and says which passed.
// Build first: npx vite build
import { spawn } from 'node:child_process';
import { join } from 'node:path';
import { GAME, serve } from './lib.mjs';

const JOBS = [
  ['quest bot', 'quest-bot.mjs', {}],
  ['free play', 'free-play.mjs', {}],
  ['free play in Slovenian', 'free-play.mjs', { LANG_PICK: 'sl' }],
  ['screens 390x844', 'screen-check.mjs', { SIZE: '390x844' }],
  ['screens 768x1024', 'screen-check.mjs', { SIZE: '768x1024' }],
  ['screens 844x390', 'screen-check.mjs', { SIZE: '844x390' }],
  ['screens 1280x800', 'screen-check.mjs', { SIZE: '1280x800' }],
  ['language, keyboard, motion', 'screen-check.mjs', { SIZE: 'extras' }],
];
const AT_ONCE = Number(process.env.AT_ONCE ?? 3);

function run([name, file, env]) {
  return new Promise((resolve) => {
    const started = Date.now();
    let output = '';
    const child = spawn(process.execPath, [join(GAME, 'e2e', file)], { cwd: GAME, env: { ...process.env, ...env } });
    child.stdout.on('data', (chunk) => (output += chunk));
    child.stderr.on('data', (chunk) => (output += chunk));
    child.on('close', (code) => {
      const seconds = ((Date.now() - started) / 1000).toFixed(0);
      console.log(`${code === 0 ? 'PASS' : 'FAIL'} ${name} (${seconds}s)`);
      for (const line of output.split('\n').filter((each) => /draw calls|finished|passed/.test(each))) console.log(`     ${line.trim()}`);
      if (code !== 0) console.log(output.split('\n').slice(-25).join('\n'));
      resolve(code === 0);
    });
  });
}

const server = await serve();
const results = [];
try {
  const queue = [...JOBS];
  const worker = async () => {
    while (queue.length) results.push(await run(queue.shift()));
  };
  await Promise.all(Array.from({ length: AT_ONCE }, worker));
} finally {
  server.kill();
}
const failed = results.filter((ok) => !ok).length;
console.log(failed ? `${failed} of ${JOBS.length} failed` : `all ${JOBS.length} passed`);
process.exit(failed ? 1 : 0);
