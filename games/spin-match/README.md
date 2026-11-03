# 🌀 Spin Match / Zavrti in najdi

Mental-rotation puzzles in the style of the "which one is the same shape, just turned?" questions on IQ tests, for ages 5 to 12, alone or side by side with a grown-up. A little critter made of square tiles rests in a tide pool, and the player picks the critter on the sand that is the same one turned. Some of the others are the critter backwards, as in a mirror, and some have one tile in another place. It trains turning a shape in your head and telling a turned shape from a mirrored one. It starts with big friendly critters, two choices and a shell button that turns the target, and ends with near twins of seven tiles and "which two are the same?", which challenge a grown-up. It plays in English and Slovenian, with the flag in the top bar.

## The look

A sunny coral reef. Sun rays sway down through turquoise water that darkens towards the deep, and bubbles drift up. The target rests in a round tide pool ringed with bubbles, and a coral shell with ↻ sits on its corner. The options lie on the sandy sea floor below, each in a sea-glass pebble. Three pearls above the pool light up, one per puzzle of the set. The level map is a reef of ledges from the sunny shallows down to the deep, each level a bubble, and the win card is a piece of sea glass with a coral rim.

Critters are drawn in SVG: rounded tiles in a body colour (coral, sunshine, lilac, bubblegum or tangerine), one tile with a face that looks one way, and on the later worlds tiles painted with a blue dot, a gold ring or a pink diamond. Every painted mark looks the same turned or mirrored, so only where the tiles sit and which way the face looks tell how a critter lies.

The signature effect is the whirlpool. The right critter lifts off the sand and spins up through a swirl of water, turning exactly as far as it needs to with a rising whirr, and lies down on the target with a click and a ring of bubbles. A backwards critter flips over like a pancake, and halfway through the flip it is the target turned, which is what "backwards" means; then it flips back and keeps a little 🪞. A critter with one tile out of place shakes, that tile glows red and a dashed outline shows where it belongs. A clearly different shape just wobbles.

## How it plays

Everything is a tap, handled on `pointerdown`, so two fingers both work.

- **Pick a critter.** Two big ones on the first world, then three, four and five. A wrong one is dimmed once it has shown what is wrong, and tapping it again just makes it shake its head.
- **↻ turns the target** a quarter clockwise each tap, so a child can try turns on screen until the target matches an option. It is free on the first two worlds. On the mirror world it is still there but counts as a hint: it is fine to use, and a set solved with it earns 2 stars, not 3. The two grown-up worlds have none.
- **Which two are the same?** The last two levels have no target. Five cards lie on the sand and exactly two are one critter turned two ways. Tap one and it goes into the left slot, tap another and it goes into the right; tapping the first again puts it back. The right pair spins together and snaps; a wrong pair shows what is wrong on the second card, and that pair can't be tried twice.
- **A try is a set of three puzzles** of the same kind, each a fresh one. A pearl lights for each one done, with a cheer, and the next critter comes up.
- **Tries.** The first world is for age 5, so its tries never fail: a wrong critter still costs a star, but the set always finishes. From the second world on, a try ends after 2 wrong taps across the whole set when there are 3 options, or 3 when there are more, so tapping everything never wins. The critters get dizzy and spin, and a big 🔄 is up within a second for a fresh set of the same kind. Every retry, every 🔄 in the top bar and every replay of a finished level gets fresh puzzles: the count of tries is saved, so a reload doesn't bring back the same ones.
- **Help.** After 2 misses on a level, ↻ glows with the hand on it, or on worlds without ↻ the target turns slowly all the way round, stopping at every quarter, and in "which two are the same?" every card does. After 8 seconds with no tap, or 3.5 seconds into each set on the first world, a 👆 taps the target, then travels across the sand as each critter hops under it, and comes back to rest on the target. It never stops on a critter, which would look like the answer. Tapping the target makes the critters hop one after another, so it answers with the sound off. The first time an idea appears, the hand shows it once without words: ↻ turning the target, the target flipping over into its mirror image, the painted tiles lighting up, and the two slots of "which two are the same?".
- **Speech is short**, because the puzzles are pictures: "Which one is the same, just turned?", "That one is backwards!", "One square is in a different place!", the cheers, the world intros and the finale. 🔊 repeats the instruction.
- **Challenge rules.** Levels open in order and finished levels stay finished. After 5 failed tries on a level, a small skip button appears, and it always moves on to the next level in order. Stars count every miss on a level since it was last won, across every try, leaving and reloading, so starting again never buys a better score: 3 stars for none, 2 for one or two or for ↻ on the mirror world, 1 for more. The best stars per level stay saved. Nothing is timed. The win card's big button is "next level" across its whole width and wakes after 0.6 seconds; replay and the map sit small in its top corners and wake after 1.6, so a hand still mashing only ever moves on to the next level. Nothing on the sand, skip included, can be tapped under a card, and a map tile only counts a tap that began on it.
- **The end.** Winning the last level brings the end-of-game card: confetti from all over the screen, the last critters dancing round a trophy, every star so far, a spoken "You matched every critter!" and one big button back to the map.

## Levels

24 levels in 5 worlds. Each world brings one idea, and its first levels are quick.

| World | Levels | The idea | Critters | Options | ↻ |
| --- | --- | --- | --- | --- | --- |
| 🐚 Spin | 1 to 4 | Same but turned, a quarter or a half: an L, a T, an S, with a face. Never fails | 4 tiles | 2 big | free |
| 🐢 Turn | 5 to 9 | Turn it in your head; the wrong ones are clearly other shapes | 4 to 5 tiles | 3 | free |
| 🪞 Mirror | 10 to 14 | One option is backwards; turns of a quarter, a half or three quarters. Then one tile moved | 4 to 5 tiles | 4 | a hint |
| 🐙 Colours | 15 to 19 | Painted tiles; wrong ones are backwards, have a tile moved or a colour on the wrong tile | 5 to 6 tiles | 4 | none |
| 🐋 Grown-up | 20 to 24 | No face, one diamond: near twins that are all backwards or one tile off, then "which two are the same?" | 6 to 7 tiles | 5 | none |

Every puzzle is made by a small pure generator from a fixed seed per level and go, so the same go is the same everywhere. As it makes each one, it checks it:

- the target has no symmetry at all, so none of its turns looks like itself and its mirror image never looks like a turn of it. From the mirror world on, the plain outline has no symmetry either, so backwards shows in the shape itself, not only in the face or the paint;
- the solver, which only compares the critters on screen, finds exactly one option that is the target turned, and it is turned by a quarter turn the level allows, never not at all. In "which two are the same?" exactly one pair of cards is one critter turned;
- every wrong option is what it says: a mirror image is the target backwards, a moved tile leaves every other tile matching the best turn of the target, a moved colour keeps the outline and puts one colour on the wrong tile, and on the first worlds another shape differs from the target by at least two tiles however it is turned. No two options are the same critter turned;
- the careless eye (`rules/careless.ts`), a child in a hurry who doesn't turn anything in their head and grabs the option that looks most like the target as it lies, slips at least once in every set past the first world, so careless play never earns 3 stars there. Up to level 12 it slips once a set at most and wins. From level 13 it slips on every puzzle and runs out of tries, while some wrong option always looks less alike than the answer, so taking the least alike is no trick either.

`levels.test.ts` proves all of this for the first 20 goes of every level, along with a fresh puzzle on every go and the right option moving round. `shapes.test.ts` proves the turning, mirroring, symmetry, moved tiles and glance. `fit.test.ts` proves every level fits a 390 by 844 phone, a 360 by 640 phone and a tablet both ways, with options at 64px or more, and 88px for the options and ↻ on the first world.

## How it's built

The rules are pure modules in `src/rules/`, with tests.

- `shapes.ts` is a critter as tiles, with turning, mirroring, symmetry, moved tiles and colours, how one critter differs from another, and the glance. `solve.ts` finds the option that is the target turned, or the pair that is one critter.
- `levels.ts` is the staircase, the generator and the wrong options. `careless.ts` is the careless eye. `play.ts` is one try: the set, misses over it, the end of a try and what a wrong choice shows. `misses.ts` keeps misses and ↻ hints per level over every try until it is won, and the stars. `progress.ts` keeps finished and skipped levels.

The view is plain DOM, CSS and SVG. `view/art.ts` draws critters, `view/fit.ts` picks the biggest pool and pebbles that fit the screen, `view/board.ts` is the tide pool and everything it does, and `view/guide.ts` is the pointing hand. `screens/` holds the play screen, the level map, the win card and the finale. `sounds.ts` makes the whirr, the click, the flip, the bonk, the dizzy wind-down and the tada from the kit's `playSound` and `playNote`.

## Bots and checks

These play a normal build served by `vite preview` on port 5198 (or `PORT`) in muted headless Chrome with real touch events, and aren't part of `npm test`.

```sh
npx vite build                 # in this folder
node e2e/skilled-bot.mjs       # every level from a fresh save, solving each puzzle from what is on screen, then 2 replays each
node e2e/careless-bot.mjs      # a hurried child who grabs whatever looks most alike as it lies, retrying until 5 tries fail: wins levels 1 to 12, loses 13 to 24, never 3 stars past world 1
node e2e/screen-check.mjs      # 3 screens, both languages, every level's fit, ↻, every kind of wrong choice, pairs, a lost try, the idle hand, mashing, calm mode. Pictures land in .shots/
```

## Run it

From the repo root:

```sh
npm install
npm run dev -w @playroom/spin-match -- --port 5198   # just this game
npm test -w @playroom/spin-match                     # rules, generator proofs, fit and the Slovenian clips
npm run voice -- spin-match                          # after changing any Slovenian line
```

The root `npm run build` puts the game in `dist/spin-match/`, live at <https://nazuje.github.io/playroom/spin-match/>.
