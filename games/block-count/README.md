# 🧊 Block Count / Preštej kocke

Block-counting puzzles in 3D, like the ones in IQ and spatial tests: how many blocks are in this stack, counting the ones you can't see? For ages 4 to 12, alone or side by side with a grown-up. It trains counting, spatial reasoning and working out hidden blocks. It starts with a row of 3 blocks and ends with deep stacks, boxes to fill and maps from above that make a grown-up think. It plays in English and Slovenian, with the flag in the top bar.

## The look

A toy theatre at night. Chunky candy-coloured blocks stand on a gold turntable on dark wooden stage boards, under a warm spotlight, between raspberry velvet curtains, with a painted backdrop of purple hills, a moon and stars. Every layer has its own colour (mint, sunflower, bubblegum, lilac, tangerine), so a block's colour says how high it sits. Each face has a rounded panel, so blocks of the same colour side by side still read as separate blocks. The top bar is a gold marquee with bulbs, the dock is the velvet front of the stage with chunky cream number blocks, and levels are ticket stubs on a playbill: each act is a gold marquee sign ringed with bulbs, over rows of red velvet seats.

The signature effect is the curtain call. When the answer is right, the stack spreads apart a little and every block takes a bow in turn, hopping up with a rising note and a number badge. The blocks you can see go first. Then the stack turns to see-through glass and the hidden blocks bow last, glowing pink with pink badges, so the player sees exactly which ones were hiding. On "fill the box", cream sugar cubes drop into every empty spot, counting up. On map questions, each column bows with its height. A wrong answer makes the whole stack wobble like jelly.

It is drawn with three.js through `@playroom/stage3d`: instanced flat-shaded blocks (solid and glass), a hemisphere light and one directional light (tops brightest, fronts next, right sides darkest), soft blob shadows under each column, and fog at the far edge. The whole scene is about 15 draw calls. When the device can't draw 3D, a kind translated message shows with the home button.

## The rule that makes every count certain

Blocks never float: every block stands on the floor or on another block. The "blocks never float" lesson at the start of the second world shows it: a block hovers in the air, wobbles, and drops onto the one below, while the voice says so. Every stack drops onto the stage as a whole, and every curtain call shows the hidden blocks standing right under the ones on top.

The generator only hides a block when the rule forces it, which means a visible block stands on top of it. The tests prove this for every puzzle. The camera's eye is fixed per puzzle, and screens only zoom, so what shows never depends on the device. From that eye, the tests take every block that clearly shows (rays from 16 points on each face to the eye, checked against every other block). Since blocks never float, each of those blocks stands on blocks down to the floor. That is the fewest blocks the view allows, and the tests assert it is exactly the stack on the stage. Two more checks make the view fair:

- no block shows only a sliver: each one is either clearly seen or completely hidden, so "the blocks you can see" is never in doubt;
- one more block anywhere it could stand, on top of any column or on the empty floor, would clearly show, so the view also proves nothing extra is hiding.

## How it plays

Everything is a tap, handled on `pointerdown`, so two fingers both work.

- **Listen.** Each world starts with its idea out loud, then the question ("How many blocks?"). 🔊 says it again. Tapping the stage says the question and lights up the answers.
- **Tap to count.** Tapping a block lights it up with a knock and says how many are lit, so a 4-year-old can count by tapping. Tapping it again unlights it. Only blocks you can see can be tapped, which is the lesson: the lit count can fall short.
- **Turn.** On the first two worlds the turntable turns, by dragging the stage or with ↻, as a help. The answer never needs it.
- **Answer.** On the first world, three big number blocks with dots in order, the right one at a place drawn from the level's seed. After that every number from 1 up to 12, 20 or 30: a grid under the stage on a tablet, and on a phone a big −, a number block, a big + and a ✓, all under the stage so it is never covered. Holding − or + keeps counting. On map levels, five map cards.
- **Resting answers.** While the stack takes its bows or wobbles, the answers and the stepper dim and ignore taps, so nothing looks tappable that isn't.
- **A surprise.** About one set in eight hides a golden block: the last block to bow turns gold and twirls high over the stack with a sparkle and stars. It only shows in the curtain call, so it never changes the puzzle.
- **A set.** Each go at a level is a set of 3 stacks. Every retry, every 🔄 in the top bar and every replay deals a fresh set: each level has 15 stacks in 5 sets, and the count of goes is saved, so a reload doesn't bring back the same ones.
- **Tries.** Misses count across the whole set. The first world never fails, and misses there only cost stars. With numbers to pick from, a try ends on the 4th wrong answer, about one slip a stack. With five map cards, it ends on the 3rd. The miss that ends a try opens the stack to show what was hiding, shows the right count in red, and puts one big 🔄 up, tappable within half a second.
- **Help.** After 2 misses on a level, a hint: on the first world the stack counts itself slowly, lighting each block with its number, and later the stack opens up for a peek at what hides inside. After 8 seconds with no tap a 👆 points at the next thing to do: on the phone stepper the + until the number has moved, then ✓, and elsewhere the stack, while the whole row of answers bounces in turn, so no single answer looks like a hint. The first time each idea appears (counting by tapping, the turntable, the lesson, the stepper, filling the box, the map's peg), a hand shows it once without words.
- **Challenge rules.** Levels open in order and finished levels stay finished. After 5 failed tries on a level, a small skip button appears. Stars count every miss on a level since it was last won, across every try, leaving and reloading: 3 stars for none, 2 for one or two, 1 for more. Nothing is timed. The win card ignores taps for 0.6 seconds, and the playbill ignores the end of the tap that opened it.
- **The end.** Winning the last level brings the curtain call card: confetti from all over, bowing blocks and a bouquet, every star so far, "Bravo! You counted every stack!" and one big button back to the playbill.

## Levels

24 levels in 5 worlds ("acts").

| World | Levels | The idea | Answers |
| --- | --- | --- | --- |
| 👀 Every block shows | 1 to 5 | Rows of 2 to 5 blocks, some with gaps, then little piles up to 3 high. Nothing hides. Level 1 starts with a row of 3 | three number blocks with dots, never fails |
| 🙈 Hiding underneath | 6 to 10 | Two layers on a 2×2 to 3×3 floor. 1 hidden block, then 2, then 2 or 3, under blocks you can see | 1 to 12 |
| 🪜 Stairs and corners | 11 to 15 | The turntable stops. Stairs climbing to the back left, and corners one or two blocks thick, up to 3 high, with 1 to 6 hidden supports and up to 20 blocks | 1 to 20 |
| 📦 Fill the box | 16 to 19 | A gold frame shows a 2×2×2, 3×2×2, 3×3×2 or 3×2×3 box. How many more blocks fill it? Some spots are two or three deep | 1 to 20 |
| 🎓 Grown-up stacks | 20 to 24 | Deep stacks on 3×3, 4×3 and 4×4 floors up to 4 high, with 5 to 14 hidden blocks and up to 30 in all, and two levels of "which map from above matches?", where each card shows the column heights | 1 to 30, or five map cards |

On map levels the four wrong cards are the classic slips: the stack read in a mirror (always there), seen from behind, turned a quarter, and one column a block too tall or too short. The tests prove every card's stack looks different from the camera, so exactly one card matches. A pink peg on the stage marks the front left corner, and every card has the same pink dot.

The puzzles come from specs in `src/rules/levels.ts`: shape, floor sizes, tallest column, how many blocks and how many hidden, and for boxes how many are missing. A fixed seed per puzzle means every device gets the same ones. `levels.test.ts` proves for all 360 stacks that:

- the fewest blocks that explain the view, held up from below, are the whole stack, with no slivers, and one more block anywhere would show;
- hidden blocks only sit under other blocks, the first world hides none, and every later counting stack hides at least one;
- each level has 15 different stacks in 5 sets of 3;
- on every three-token and map level the answer sits at each place equally often, shuffled from the level's seed, so no tapping habit (always the same card, left to right in each set or on and on, right to left, the same as last time, one along from last time) does much better than chance on any level or over them all, and none wins more than a set or two without a miss;
- the answer is the count, or the blocks missing from the box, and it is offered;
- each map question has five different maps, the mirror among them, and exactly one matching the stage.

## The careless eye

`rules/careless.ts` is a child in a hurry: it counts only the blocks it can see (on "fill the box", only the empty spots on top), then nudges the number one up, one down, two up and so on. On maps it picks the mirror first. The tests prove it wins every stack of the first world at once, misses at least once on every stack after that (so it never earns 3 stars there), wins levels 6 and 7 with misses to spare, and runs out of tries on every set of the last three levels of every later world.

## How it's built

The rules are pure modules in `src/rules/`, with tests.

- `stack.ts` is a stack as a height map, its blocks in counting order, mirrors and turns, and boxes.
- `sight.ts` is the camera's fixed eye and what it can see of each block.
- `solve.ts` is the solver: the fewest blocks that explain the view, whether one more block would show, and which maps look like the stage.
- `levels.ts` makes the staircase, its sets and where answers sit, `surprise.ts` which sets hide the golden block, `careless.ts` the careless eye, `play.ts` one try at a set, `misses.ts` misses across tries, and `progress.ts` finished and skipped levels with the kit's `store`.

The view is in `src/view/`: `theatre.ts` the toy theatre, `blocks.ts` the instanced blocks and their drops, hops, wobble, spread and glass, `board.ts` the stage on screen with the camera, taps, turning, number badges and the curtain call steps, `tokens.ts` the number blocks and map cards, and `guide.ts` the pointing hand. `screens/` holds the play screen, the playbill and the win cards. `sounds.ts` makes the knocks, the rising notes, the jelly wobbles and the fanfare from the kit's `playSound` and `playNote`.

## Bots and checks

These play a normal build from `dist/` (or `DIST`) served by `vite preview` on port 5199 (or `PORT`) in muted headless Chrome with software 3D and real touch events, and aren't part of `npm test`.

```sh
npx vite build                 # in this folder
node e2e/skilled-bot.mjs       # every level from a fresh save, then every replay until all 5 sets are won
node e2e/careless-bot.mjs      # counts only what it sees and nudges, retries until 5 tries fail
node e2e/screen-check.mjs      # 3 screens, both languages, every level's fit, a failed try and how fast 🔄 is ready, the idle hand, mashing, the golden block and resting answers, calm mode. Pictures land in .shots/
```

## Run it

From the repo root:

```sh
npm install
npm run dev -w @playroom/block-count     # just this game
npm test -w @playroom/block-count        # rules, the proofs and the Slovenian clips
npm run voice -- block-count             # after changing any Slovenian line
```

The root `npm run build` puts the game in `dist/block-count/`, live at <https://nazuje.github.io/playroom/block-count/>.
