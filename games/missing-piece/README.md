# 🧩 Missing Piece / Manjkajoči košček

Picture-grid puzzles in the style of the "which piece completes the grid?" questions on IQ tests, for ages 4 to 12, alone or side by side with a grown-up. A patchwork quilt hangs on a clothesline with its last patch missing. The patches follow rules across the rows and down the columns, and the player picks the piece from the basket that fits every rule. It starts with a 2 by 2 match a 4-year-old can do and ends with 3 by 3 grids where three rules work at once, or patches add up and cancel out, which challenge a grown-up. It plays in English and Slovenian, with the flag in the top bar.

## The look

A patchwork quilt pinned with wooden pegs to a twisted-rope clothesline, under a starry plum night with a big low moon. The quilt has a magenta binding with gold running stitches, the patches are linen with stitched edges, and the missing patch is a dark hole with a gold "?". The pieces wait below in a woven wicker sewing basket. Three little lanterns hang on the line, one for each puzzle of the set. The level map is rows of sewing buttons, one colour per world, and the win card is a sewn-in label.

Patches are drawn in SVG, never emoji, so every attribute is exact: shape (circle, square, triangle, star, heart, diamond, arrow, moon), colour (six), fill (solid, striped, empty), count (1 to 3), size (small, medium, big), turn (quarter turns) and spot (a corner, or the middle). On the grown-up levels a patch holds buttons on a 3 by 3 grid instead.

The signature effect is the music box. The right piece flies out of the basket into the gap, then every patch lights up in reading order, each with its own note, so the pattern plays as a little tune: a row of the same shape holds one note, counts going up climb a scale, and a "once each" grid plays every note once a row. Then the quilt billows on the line. A wrong piece boings, wobbles and pops back out to the basket, and the row or column whose rule it breaks shakes.

## How it plays

Everything is a tap, handled on `pointerdown`, so two fingers both work.

- **Pick a piece.** Three big pieces on the first world, then four, five and six. A wrong piece is dimmed once it bounces out, and tapping it again just makes it shake its head.
- **A try is a set of three puzzles** of the same kind, each a fresh one. A lantern lights for each one done, with a cheer and the tune, and the next quilt comes up.
- **Tries.** The first world is for age 4, so its tries never fail: a wrong piece still bounces out, shakes its rule and costs a star, but the set always finishes. From the second world on, a try ends after 2 wrong pieces across the whole set when there are 3 pieces, or 3 when there are 4 to 6, so tapping everything never wins. The quilt tangles, every patch spinning out of place, and a big 🔄 is there at once, ready within a second, for a fresh set of the same kind. Every retry, every 🔄 in the top bar and every replay of a finished level gets fresh puzzles: the count of tries is saved, so a reload doesn't bring back the same ones.
- **Help.** After 2 misses on a level, the rule's row or column hops patch by patch with its notes, then the hand rests on the gap. After 8 seconds with no tap a 👆 points at the gap, never at a piece, which would look like the answer. Tapping the gap makes the pieces hop one after another, so it answers with the sound off, and tapping any patch makes it hop and play its note. The first time a kind of rule appears (same along a row, same down a column, a step, once each, adding up, cancelling out), the patches show it once without words: the row hops in turn, or the first two patches fly onto the third.
- **Speech is short**, because the puzzles are pictures: "Which piece fits?", the cheers, the funny miss lines, the world intros and the finale. 🔊 repeats the instruction.
- **Challenge rules.** Levels open in order and finished levels stay finished. After 5 failed tries on a level, a small skip button appears. Stars count every miss on a level since it was last won, across every try, leaving and reloading, so starting again never buys a better score: 3 stars for none, 2 for one or two, 1 for more. The best stars per level stay saved. Nothing is timed. The win card ignores taps for 0.6 seconds, so a mashing hand can't skip it, and the map ignores the end of the tap that opened it.
- **The end.** Winning the last level brings the end-of-game card: confetti from all over the screen, a little quilt that lights up patch by patch around a trophy, every star so far, a spoken "You finished every quilt!" and one big button back to the map.

## Levels

24 levels in 5 worlds. Each world brings one idea, and its first levels are quick.

| World | Levels | The idea | Grid | Pieces |
| --- | --- | --- | --- | --- |
| 🟥 Match | 1 to 5 | One rule: the same shape along each row, the same colour down each column, then either, or fill or size | 2 by 2 | 3 big |
| 🎨 Two at once | 6 to 10 | One rule along the rows and another down the columns: shape and colour, fill, size | 2 by 2, then 3 by 3 | 3, then 4 |
| 🪜 Step by step | 11 to 15 | Counts go 1, 2, 3, sizes grow, shapes turn a quarter each step, a shape hops round the corners, then two steps at once | 3 by 3 | 4 |
| 🔀 Once each | 16 to 20 | Every shape or colour once in each row and column, then two of those, then with steps too | 3 by 3 | 5 |
| 🧠 Grown-up puzzles | 21 to 24 | Three rules at once, buttons that add up (patch 3 = patch 1 + patch 2), buttons in both that cancel out, and both with two more rules | 3 by 3 | 6 |

Every puzzle is made by a small pure generator from a fixed seed per level and go, so the same go is the same everywhere. As it makes each one, the solver checks it:

- the solver knows every pattern a player might see in one attribute: the same along rows, down columns, once each, a step along rows or down columns (round the ring for turns and corners), and for buttons adding up, cancelling out, keeping only the shared ones or taking away, along rows or down columns;
- the visible patches allow exactly one value of every attribute in the gap, so exactly one piece fits every rule, and it is the answer;
- every wrong piece differs from the answer in exactly one attribute and breaks exactly that rule. Wrong pieces are tempting: what the neighbours have, one step too far, the wrong way to combine buttons, or the right piece in the wrong colour. Every first-world puzzle offers a piece that copies the patch beside or above the gap.

The careless eye (`rules/careless.ts`) is a child in a hurry who grabs the piece most like the patch beside the gap. The generator sizes each set to it: the first world can't be lost, so it always wins there, with 1 or 2 stars when it slips; on the second world and level 11 it slips exactly once a set, so it wins with 2 stars but never 3; from level 12 on it slips on every puzzle; on the last three "once each" levels and all the grown-up levels it runs out of tries on the first puzzle, while some wrong piece always looks less like the neighbour than the answer, so taking the least alike piece is no trick either. Tapping at random finishes a late set within the miss limit less than one time in ten.

`levels.test.ts` proves all of this for the first 20 goes of every level, along with a fresh puzzle on every go and the right piece moving round the basket. `fit.test.ts` proves every level fits a 390 by 844 phone, a 360 by 640 phone and a tablet both ways, with patches and pieces at 64px or more, and 88px for the pieces on the first world.

## How it's built

The rules are pure modules in `src/rules/`, with tests.

- `cells.ts` is a patch as numbers. `patterns.ts` is every pattern the solver knows, and `solve.ts` puts each piece in the gap and asks whether some pattern explains every attribute.
- `levels.ts` is the staircase, the grid generator and the wrong pieces. `careless.ts` is the careless eye. `play.ts` is one try: the set, misses over it, the end of a try and the line a wrong piece breaks. `misses.ts` keeps misses per level over every try until it is won, and the stars. `progress.ts` keeps finished and skipped levels. `tune.ts` gives each patch its note.

The view is plain DOM, CSS and SVG. `view/pieces.ts` draws patches, `view/fit.ts` picks the biggest quilt and pieces that fit the screen, `view/board.ts` is the quilt and everything it does, and `view/guide.ts` is the pointing hand. `screens/` holds the play screen, the level map, the win card and the finale. `sounds.ts` makes the notes, the pop, the boing, the tangle and the tada from the kit's `playSound` and `playNote`.

## Bots and checks

These play a normal build served by `vite preview` on port 5194 (or `PORT`) in muted headless Chrome with real touch events, and aren't part of `npm test`.

```sh
npx vite build                 # in this folder
node e2e/skilled-bot.mjs       # every level from a fresh save, solving each puzzle from what is on screen, then 2 replays each
node e2e/careless-bot.mjs      # a hurried child who grabs the piece most like its neighbour, retrying until 5 tries fail: wins worlds 1 and 2, loses the late levels, never 3 stars past world 1
node e2e/screen-check.mjs      # 3 screens, both languages, every level's fit, wrong pieces, a lost try, the idle hand, mashing, calm mode. Pictures land in .shots/
```

## Run it

From the repo root:

```sh
npm install
npm run dev -w @playroom/missing-piece -- --port 5194   # just this game
npm test -w @playroom/missing-piece                     # rules, generator proofs, fit and the Slovenian clips
npm run voice -- missing-piece                          # after changing any Slovenian line
```

The root `npm run build` puts the game in `dist/missing-piece/`, live at <https://nazuje.github.io/playroom/missing-piece/>.
