# 🌋 Lava Climb

A 2D precision platformer for ages 6 to 12, to play alone. Climb 24 towers while glowing lava rises from below at a steady pace. There's no luck in it: tight, fair and fast. In Slovenian it's *Beg pred lavo*.

## How to play

1. Pick a level on the tower. Levels open in order, from the Volcano Shaft through the Ice Tower and the Clockwork Tower to The Top.
2. The climb and the clock start with your first press, so take a breath first. Big ◀ ▶ buttons move, and ▲ jumps. Any finger on the tower itself jumps too. On a laptop use the arrow keys and Space, with X or Z for the dash.
3. Hold jump to go higher. From level 3, slide on the rough rock with bright lime rungs and jump off it. From level 8, the wind button dashes sideways in the air, once per jump, and a wall gives the dash back. Before the first press on those two levels, a see-through hero shows the new move on the real tower, with no words needed.
4. Reach the glowing door at the top. One star for getting out, one for speed and one for every gem. A golden secret gem hides behind a false wall in a few levels.
5. Touch lava, spikes or a falling rock and the hero singes, with smoke and a surprised face, and the climb restarts by itself in under a second. A press cuts the wait shorter still. Every singe counts on the proud 🔥 badge.
6. After 3 tries, or after about 45 seconds of failing, a small skip button appears. It needs a long press, so mashing can't work it.

Levels add crumbling ledges, moving platforms, belts, ice, spikes, bouncy pads and falling rocks. A rock always shivers in its hole first, with a red-ringed shadow on the floor where it will land. The first levels teach one idea, with ledges only two rows apart and slow lava. The last ones need exact wall kick and dash chains. Every so often a cheeky lava fish pops up and waves.

The game also plays in Slovenian, with the flag in the top bar. Its words are in `src/lang/`.

## How it's built

`sim.ts` is the whole game with no drawing in it. It steps at a fixed 120 ticks a second from plain numbers, so a slow tablet plays the same game as a fast laptop, and the clock-driven pieces in `level.ts` (movers, rocks, lava) are pure functions of the tick. `tuning.ts` holds every number that decides how the jump feels: coyote time, jump buffering, the softer top of a held jump, the wall kick and the dash.

Levels are lists of handcrafted stretches of tower in `levels.ts`, in the words of `stamps.ts`, where each stamp is a small text map. `level.ts` turns that into a real level, and `rating.ts`, `save.ts`, `keys.ts` and `camera.ts` are small pure modules with tests.

`view.ts` and `art/` paint the canvas. The lava is cheap by design: one wavy shape filled from a ready-made gradient, a ready-made glow, and a few dots for bubbles and embers. The heat shimmer redraws only the wall just above the lava, in strips. A slow device drops the extras and then the sharpness, by itself. Reduced motion turns off the shimmer, the waves and the shake.

## Proving it's fair

The scripts in `e2e/` play the real build, and they aren't part of `npm test`.

- `solve.mjs` searches the game's own rules for a route up each level and records it to `routes.json`. It plays with stricter edges than a child gets: feet land at least 7 units inside a ledge and spikes count as 6 units bigger, on a tile of 20. Run it after changing a level, and `sh e2e/solve-all.sh` to do all of them at once.
- `bot-skilled.mjs` replays each recorded route in a `vite build` served by `vite preview`, with real touch events at real speed, reading only ordinary `data-` attributes on the canvas. Each touch carries the moment it happens, as a real screen's do, and the game plays each press on the tick of that moment, so a slow frame can't change the result. It reports time, stars and how close the lava came. This proves each route works in the real game, with perfect timing. It doesn't prove what a hand can do, which is what a real child and the stricter edges are for.
- `bot-careless.mjs` is a child in a hurry: it heads for the next ledge, looks now and then, jumps early and late, and never plans a wall kick or a dash. It reads the same `data-` attributes.
- `checks.mjs` tries four screens, both languages, 50-tap mashing, a language switch mid-climb, the keyboard and reduced motion.

`levels.test.ts` replays every recorded route through the pure rules, so a change that breaks a route fails `npm test` at once.

## Run it

Lava Climb is one game in [Playroom](../../README.md). You need Node.js 22 or newer. From the repository root:

```sh
npm install
npm run dev -w @playroom/lava-climb -- --port 5352     # start a local dev server for just this game
npm test -w @playroom/lava-climb                       # run the unit tests
node games/lava-climb/e2e/bot-skilled.mjs              # play every level for real, about 12 minutes
```

The root `npm run build` puts the game in `dist/lava-climb/`, live at <https://nazuje.github.io/playroom/lava-climb/>.
