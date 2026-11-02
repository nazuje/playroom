# 🔦 Beam Bender / Zrcalni žarek

A 3D light puzzle in a dark workshop. A laser fires across a toy tray. Tap a mirror to turn it a quarter turn, and the beam moves at once. Light every crystal before the moves run out. It's all thinking: no reflexes and no clock. Ages 6 to 12, alone or with a grown-up, in English and Slovenian.

## How it plays

There are 30 levels in 8 worlds, each adding one idea: plain mirrors with one working side, fixed blocks, splitters, colored beams with filters, two-sided mirrors, switches that slide a crate, portals, and a last world that mixes them all. The first levels take 1 or 2 taps. The last takes 19, and a grown-up needs a real think.

- **Move limit.** Every level has one. Run out and the laser fizzles, with one tap to retry. After 5 losses on a level, a small skip button appears. Levels open in order and finished levels stay finished.
- **Stars.** Par earns 3, a tidy win 2 and any other win 1.
- **Hints.** Up to 3 per level. A hint marks one correct mirror, and a level won with a hint earns at most 1 star. A retry doesn't refill hints.
- **Undo.** It restores the board and costs no move of its own, so it can never lose a try, but the tap it takes back still counts. One wrong tap on a plain mirror costs 1 move with undo, and 4 by turning the mirror all the way round.
- **Switches.** A switch fires when light arrives on it, and the crate stays put afterwards, so the order of taps matters. A second arrival slides it back.

### Rare surprises

- **Hidden crystals.** Levels 8, 14 and 26 hide one on a plain floor tile, marked only by a rare glint. Shining light on it opens a bonus level. It takes a deliberate detour, on purpose.
- **Disco.** When one tap lights two or more dark crystals at once, the workshop throws a party. Only a few levels allow it, and only if the tap nearest the laser comes last.

## How it's built

Rules are pure modules in `src/rules/`, with no frame timing at all: a tap changes the state and that's it.

- `board.ts` reads a level drawing. `levels.ts` holds every level as hand-drawn data, and nothing in the game is random.
- `trace.ts` follows the light. `play.ts` is one try: taps, undo, stars, disco.
- `solver.ts` searches every reachable board. The tests use it to prove each level winnable at its par and within its limit, and to report wrong first moves and the exact odds of winning by tapping at random. The hint button uses the same search from the current board, in a web worker because the last levels have millions of states.

The view is in `src/view/` on `@playroom/stage3d`. Mirrors are drawn as wedges, so the working side reads from above. An invisible real button sits over each piece, which gives 64px targets, keyboard use and screen-reader labels. Each tile is fitted so the 5 by 5 board keeps 64px targets at 360px wide.

Level layouts are hand-drawn. A throwaway script helped pick starting turns while they were being designed, and the results are stored as plain data.

## Bots

These run on a normal build served by `vite preview`, with real touch events, and aren't part of vitest.

```sh
npx vite build                 # in this folder
node e2e/skilled-bot.mjs       # solver-driven, plays all 33 levels from a fresh save, hidden crystals included
node e2e/careless-bot.mjs 20   # random taps on real mirrors, 20 tries per level
node e2e/screen-check.mjs      # 4 screen sizes, both languages, mashing, keyboard, reduced motion. Pictures land in .shots/
```

## Run it

From the repo root:

```sh
npm install
npm run dev -w @playroom/beam-bender -- --port 5351   # just this game
npm test -w @playroom/beam-bender                     # unit tests and the level proofs
```

The root `npm run build` puts the game in `dist/beam-bender/`, live at <https://nazuje.github.io/playroom/beam-bender/>.
