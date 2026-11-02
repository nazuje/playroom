# ☄️ Dodge Arena

A 3D survival game for ages 6 to 12, for one player with one finger. A small space explorer stands on a round glowing arena floating in space, and everything else tries to hit them. There is real losing here, because a parent asked for harder games.

## How to play

1. Tap **Endless** or **Challenge**. Endless goes on until your hearts run out and saves your best time. Challenge has twelve stages that open in order.
2. Touch and hold anywhere, and the explorer runs towards your finger. On a laptop, use the arrow keys or WASD.
3. Tap the big 🚀 button (Space on a laptop) to leap. It's a short hop that also throws you forwards, then it needs about a second and a half to recharge. Timing it is the main skill. The button pulses whenever a ring or beam turns up, and a green arrow bounces over the explorer and the button just before one reaches you.
4. You have 3 hearts. A hit is a cartoon BONK that costs one, then you blink for a moment and nothing can touch you. At zero hearts, the run ends with your time shown big and proud, and one tap on the button starts again in under a second.

## What's trying to hit you

Each danger has its own colour and sound, and every one shows itself before it can touch anyone. The warning is 1.5 seconds at first and shrinks slowly, but never below 0.8 seconds.

| Danger | Warning | What to do |
| --- | --- | --- |
| ☄️ Meteor | An orange landing shadow fills up | Run out of the circle |
| 🪨 Boulder | A purple lane with moving arrows | Get out of the lane. It's too tall to jump |
| 🔦 Beam | A pink fan shows where it will sweep, and a streak on the floor shows where it is | Jump it or step out of the fan |
| 💫 Ring | A cyan orb charges, then a thick glowing band spreads | Jump when it reaches you |
| 🌀 Spinning bar | A yellow circle, then the bar rises | Stay out of the circle |
| 🟢 Slime | A puddle on the far side | Keep running. It flashes and shows its splash before it bursts |

## Endless

Waves last 12 seconds and the pace climbs through them. Each of the first waves brings a new danger, and after that one danger arrives in pairs. Every minute mark is a named wave: Meteor Storm, Boulder Bowling, Laser Disco, Ring Party and Slime Soup.

Rare surprises keep the tenth run fresh: a heart, a slow-motion orb that slows the world but not you, a golden wave when touches only sparkle, and a friendly UFO that shields you for a few seconds.

## Challenge

Stages 1 to 6 teach the dangers, the ones you run from first and then beams and rings, which you jump. Those two stages space their dangers out. Early on, a leap a moment late still counts, and by stage 9 it has to be on time. Stages 7 to 12 combine them, ending in something a grown-up will find properly hard. Survive for the time shown. You get 1 star for finishing, 2 for one bonk at most, and 3 for none. After 5 failed tries on a stage, a small skip button appears.

The game also plays in Slovenian as *Izmikaj se!*, with the flag in the top bar. Its words are in `src/lang/`.

## How it's built

The rules are pure and have tests. `dangers.ts` holds what each danger does and where it can touch you, `waves.ts` the pace, `stages.ts` the twelve stages, `director.ts` what comes next, and `run.ts` the whole run in fixed steps, so a slow tablet plays the same game as a fast laptop.

`src/art/` is all three.js primitives, with no model or texture files. Every repeat is instanced. Warnings are glowing marks drawn by a small shader that stops at the arena's edge.

The game publishes what's on the arena in data attributes on `#readout`, in every build, so a tester can play the real game with real touches. `e2e/bots.mjs` does that with a skilled, a careless and an idle bot, and `e2e/check.mjs` covers screen sizes, languages, mashing, keyboard and reduced motion. Both read only those attributes and the screen. `src/bots.ts` holds the bots' thinking, which vitest also runs in simulation, and is not part of the game.

## Run it

Dodge Arena is one game in [Playroom](../../README.md). You need Node.js 22 or newer. From the repository root:

```sh
npm install
npm run dev -w @playroom/dodge-arena     # start a local dev server on port 5353
npm test -w @playroom/dodge-arena        # run the unit tests
```

To play it with the bots, from this folder:

```sh
npx vite build
node e2e/bots.mjs                        # endless and all twelve stages, about 40 minutes
node e2e/bots.mjs --endless skilled,careless,idle --runs 3
node e2e/bots.mjs --stages 10-12 --bots skilled --runs 3
node e2e/check.mjs /tmp/dodge-shots      # screens, languages, mashing and the rest
```

The root `npm run build` puts the game in `dist/dodge-arena/`, live at <https://nazuje.github.io/playroom/dodge-arena/>.
