# ⚖️ Secret Seesaw / Skrivnostna gugalnica

A balance puzzle on a circus seesaw, for ages 5 to 12, alone or side by side with a grown-up. A mystery box sits on the seesaw with number weights. The seesaw is level, so both sides weigh the same: what's in the box? It starts with first sums and ends with two mysteries on two seesaws, a small system of equations that makes a grown-up think. It plays in English and Slovenian, with the flag in the top bar.

## The look

A night circus tent with deep teal stripes, a raspberry ring on the floor and tangerine props. The plank is a striped circus pole on a drum. Each end carries a tray on a post that stays upright, so the stacks never slide, and each tray moves up and down by the real difference between the sides. The signature effect is the bubble level in the middle of every plank. It slides to the high side and glows mint when the sides are equal. When the right number is picked, the box lid pops and the number springs out like a jack-in-the-box.

## How it plays

Everything is a tap. Weights show their digit and dots in rows of five, so a child who can't read numbers yet can count them.

- **Take the same off both sides.** Tap a box with a twin on the other side and both leave together, meeting over the drum with a "=". Tap a weight and the same amount comes off both sides: the bigger weight opposite shrinks, with a "−2" floating up from each side. Either way the seesaw stays level.
- **Swap a mystery for what it weighs.** On the last world, when one seesaw shows a single hat against a box and a 3, tapping a hat on the other seesaw swaps it for a box and a 3. The seesaw stays exactly where it was.
- **Answer.** Pick a number from three big buttons on the early levels, or from 0 to 20 later. On a narrow phone the 0 to 20 picker waits in a sheet behind a big "🎁 = ?" button. A right number opens the box for good, and it shows its number from then on. A wrong number opens the box for a moment with that number in it, and the seesaw tips honestly to show it. "Too heavy!" or "Too light!" says which way, and the number dims.
- **Make it level.** On world 2 there is no box. Tray weights go on the side with the dashed mint tray, a tap takes one back, and the level wins the moment the seesaw is level.
- **Hints.** After 2 misses on a go, the next solving move pulses, found by the same search the tests use. Once the mystery stands alone, the weights it equals pulse.
- **Challenge rules.** Levels open in order and finished levels stay finished. 🔄 starts the level again with one tap. After 5 misses on a level, counting every go, a small skip button appears. Stars: 3 for no misses, 2 for one or two, 1 for any other win. Nothing is timed.

## Levels

24 levels in 5 worlds. Each world adds one idea, and its first level is quick.

| World | Levels | The idea | First and last |
| --- | --- | --- | --- |
| 🎁 The box | 1 to 5 | box + a = b, up to 10, three choices | box + 1 = 5, then 10 = 6 + box + 1 |
| ⚖️ Make it level | 6 to 9 | add tray weights until the sides are equal | 3 = ?, then 10 + 2 = 3 + ? from 1, 2, 3, 5, 6 |
| 📦 Many boxes | 10 to 14 | identical boxes: 2 boxes = 8 | 2 boxes = 8, then 4 boxes + 4 = 8 + 8 |
| ↔️ Both sides | 15 to 19 | boxes on both sides, take boxes off both | 2 boxes = box + 8, then 5 boxes + 5 = 2 boxes + 17 |
| 🎩 Box and hat | 20 to 24 | two mysteries on two seesaws | box + 6 = 14 and hat = box + 4, then 2 boxes + hat = 11 and hat + box + 5 = 2 hats + 6 |

The numbers come from small generators in `src/rules/levels.ts`, each with a fixed seed, so every device and every run gets the same levels. `levels.test.ts` proves that every puzzle has exactly one whole-number answer (searching 0 to 60 for each mystery), that every weight and answer stays within 0 to 20, that each puzzle can be worked out with taps alone in the order it's asked, and that any order of taps keeps a level seesaw level.

## How it's built

The rules are pure modules in `src/rules/`, with tests.

- `board.ts` is the seesaws as data, and every move: pair, take, swap, tray and opening a mystery.
- `levels.ts` makes the staircase. `solve.ts` finds the fewest taps that leave a mystery alone, for the hint, the tests and the skilled bot.
- `play.ts` is one go at a level: taps, tray weights, answers, misses and stars. `progress.ts` keeps finished and skipped levels with the kit's `store`.

The view is plain DOM and CSS, with no canvas. `view/scene.ts` lays out one or two seesaws for the screen, picks the biggest item size that fits (64px or more on a 390 by 844 phone), and runs one spring for each plank, so a change of weight wobbles and settles. In calm mode the plank moves straight to its angle. `view/items.ts` draws the weights, the box and the hat. `screens/` holds the play screen, the level map and the win card.

## Bots and checks

These play a normal build served by `vite preview` with real touch events, and aren't part of `npm test`.

```sh
npx vite build                 # in this folder
node e2e/skilled-bot.mjs       # every level from a fresh save, with the solver's moves, checking every tap against the rules
node e2e/careless-bot.mjs      # a hurried child: quick guesses, no moves, gives up after 5 misses
node e2e/screen-check.mjs      # 3 screens, both languages, mashing, a language switch mid-level, calm mode. Pictures land in .shots/
```

The skilled bot wins all 24 levels with 3 stars. The careless bot wins all of worlds 1 and 2, plus the quick first levels of the later worlds, and loses the last three levels of worlds 3, 4 and 5.

On a 360 by 640 phone the last world's two seesaws can't both fit 64px stacks, so items there shrink to 52 to 58px. Every other level keeps 64px targets on that screen too.

## Run it

From the repo root:

```sh
npm install
npm run dev -w @playroom/secret-seesaw -- --port 5361   # just this game
npm test -w @playroom/secret-seesaw                     # rules, level proofs and the Slovenian clips
npm run voice -- secret-seesaw                          # after changing any Slovenian line
```

The root `npm run build` puts the game in `dist/secret-seesaw/`, live at <https://nazuje.github.io/playroom/secret-seesaw/>.
