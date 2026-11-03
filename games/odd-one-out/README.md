# 🦄 Odd One Out / Kdo ne spada zraven?

"Which one doesn't belong?" puzzles in the style of IQ tests, for ages 4 to 12, alone or side by side with a grown-up. Friends sit on lily pads on a pond at sunrise. All of them share a rule except one, and the player taps the one that breaks it. It starts with three animals and a car, which a 4-year-old can sort, and ends with hidden rules, broken sequences and sets full of decoys that challenge a grown-up. It plays in English and Slovenian, with the flag in the top bar.

## The look

A pond at sunrise: a peach and pink sky shimmering on teal water, a low sun on the far bank, reeds at the edges and a sandy near bank at the bottom. The top bar is a wooden jetty of planks with nail heads. Each thing sits on a cream plate on a floating lily pad, which bobs gently and has its notch pointing its own way. Three lotus buds hang above the pads, one per puzzle of the set, and bloom as each is solved. The level map is lily pads to hop along under wooden signs, and the win card is a lily pad with a lotus on top. The accent colour is lotus orchid.

Pictures on the first world are emoji. Everything else is drawn in SVG, so every look the rules use is exact: shape (circle, square, triangle, star, heart, moon, pentagon, hexagon, cross, arrow, and the lopsided flag, boot and L), colour (six), size (three), fill (solid or empty), dots (1 to 9, like a dice, in buddy pairs or scattered), a written number, a turn in eighths and a mirror image.

The signature effect is the send-off. Tap the odd one and it leaves the pond one of four ways, never the same way twice in a row: its lily pad springs like a trampoline and it somersaults over the others to splash down far away, a frog pops up and gulps it, a flamingo swoops down and carries it off, or it dives straight in with a big splash. About one set in eight brings a rare surprise after its second puzzle: a rainbow fish leaps over the pond, or a duck leads her ducklings across. Then the friends left behind dance together in a way that shows their rule: they hop if they are all animals, glow their shared colour, spin if they are the same shape, grow and shrink for size, count their dots one by one, flip left to right if they all have a mirror line (and look just the same), or turn back upright if they are all the same shape turned. A wrong tap makes that thing protest: it shakes its head with a ✋ above it, says "Hey! I belong here!", and lights up together with one friend it belongs with.

## How it plays

Everything is a tap, handled on `pointerdown`, so two fingers both work.

- **Tap the odd one.** Four big pictures on the first world, then four shapes, five dot cards, five shapes, and six on the grown-up world. A thing that already protested is dimmed, and tapping it again just makes it shake its head.
- **A try is a set of three puzzles** of the same kind, each a fresh one. A lotus blooms for each one done.
- **Tries.** The first world is for age 4, so its tries never fail: a wrong tap still protests and costs a star, but the set always finishes. From the second world on, a try ends after two fewer wrong taps than there are things, and never more than 3, counted across the whole set: 2 with four things, 3 with five or six. So tapping every pad in turn never wins. Everyone tumbles into the pond, and a big 🔄 is there at once, ready within a second, for a fresh set of the same kind. Every retry, every 🔄 in the top bar and every replay of a finished level gets fresh puzzles: the count of tries is saved, so a reload doesn't bring back the same ones.
- **Help.** A wrong tap points at one friend that shares the rule with it, which narrows the choice without giving the answer away. After 2 misses on a level, two friends dance the rule together (on the first world, every friend does, so the odd one stands out at once). After 8 seconds with no tap, or 3.5 seconds into each set on the first world, a 👆 sweeps across every pad as it hops, then leaves; it never stops on a pad, which would look like the answer. Tapping the open water makes every pad hop in turn. The first time an idea appears, it shows itself once without words: every friend dances the idea together while the odd one stands still with a puzzled ❓, then the hand points at the odd one, without tapping it, and goes.
- **Speech is short**, because the puzzles are pictures: "Which one doesn't belong?", the cheers, the protests, the world intros and the finale. On the first world it also says what the group was once the odd one is gone ("They're all animals!"). 🔊 repeats the instruction.
- **Challenge rules.** Levels open in order and finished levels stay finished. After 5 failed tries on a level, a small skip button appears on the near bank, and it always moves on to the next level in order. Stars count every miss on a level since it was last won, across every try, leaving and reloading, so starting again never buys a better score: 3 stars for none, 2 for one or two, 1 for more. The best stars per level stay saved. Nothing is timed. The win card's big button is "next level" across its whole width and wakes after 0.6 seconds; replay and the map sit small in its top corners and wake after 1.6, so a hand still mashing only ever moves on to the next level.
- **The pond grows.** Each finished level brings a new pond friend (a daisy, a frog, a ladybird, a turtle and so on, 24 in all). The win card shows the new one, they sit on the near bank while playing, and the map shows them all with a ripple waiting for each one still to come.
- **The end.** Winning the last level brings a pond party: confetti from all over the screen, the last pond friends earned leaping round a trophy, every star so far, a spoken "You found every odd one out!" and one big button back to the map.

## Levels

24 levels in 5 worlds. Each world brings one idea, and its first levels are quick.

| World | Levels | The idea | Things |
| --- | --- | --- | --- |
| 🐸 Kinds of things | 1 to 5 | Three of a kind and one that isn't: animals and vehicles, then food and toys, then any of those, then clothes and plants too | 4 big pictures |
| 🔺 Colours and shapes | 6 to 10 | One look: colour, shape, size, fill, then any of them, with the other looks muddling things more and more | 4 shapes |
| 🎲 Count the dots | 11 to 15 | All 3 dots but one 4, like a dice and then scattered, even and odd with dots in buddy pairs, number cards with dots, and the card whose number tells a fib | 5 cards |
| 🪞 Look twice | 16 to 20 | Two looks that go together (the big ones are red, the small ones blue), then shape, fill and size pairings, all with a mirror line but one, and the same shape turned by quarter turns with one mirror image. Every thing differs from the others somehow | 5 shapes |
| 🧠 Grown-up puzzles | 21 to 24 | Hidden rules (as many dots as sides), sequences where one breaks the step or the turn-taking, and sets where several things look odd but only one breaks the true rule | 6 things |

Five things sit like the dots of a dice and six in two rows of three on every screen; four sit in a square on a phone and in a row on a tablet.

### Fair puzzles

Ambiguity is the classic failure of odd-one-out puzzles, so every puzzle is made by a small pure generator from a fixed seed per level and go, and the solver (`rules/solve.ts`) checks it as it is made. The solver knows every simple rule the game uses, and asks of each rule which thing it singles out: the one whose removal leaves every other thing keeping the rule.

- **Same:** all share one value of a look. For pictures: their group, whether they fly, live or go on water, have wheels, are bigger than a grown-up, and their main colour. For drawn things: shape, colour, size, fill, number of sides, round edges, a mirror line, which way a lopsided shape faces, the turn, standing upright, the number of dots, even or odd, sides matching dots, the written number, and whether the number matches the dots.
- **Pair:** one look decides another both ways, in groups of two or more: size, colour, shape, fill, dots, and the row or column a thing sits in, so things side by side can't form a group of their own.
- **Step:** in reading order, dots, size, turn, sides or the written number go up or down by the same amount each time.
- **Take turns:** in two rows of three, two values of a look take turns like a checkerboard.

A puzzle is kept only when the rule the level meant singles out exactly one thing, no rule at all singles out anything else, and any other rule that also points at the answer is about the same looks, so a colour puzzle never has an answer that is also the only big one. The first world's pictures come from curated groups, each picture in exactly one, with nothing that could sit in two (no teddy bears, fish, corn or toy cars). Some groups never meet at all, because a child could fairly sort one into the other: food and plants (a tomato is a plant too), and vehicles and toys (a red car looks like a toy car). Single pictures that could pass for another group never meet it either: round cartoon animal faces could be cuddly toys, and skates or a kite could go places. The tests list these pairings and check no puzzle breaks them.

The odd one's place is drawn from each go's seed before the puzzle is made, and a test over 120 goes per level shows that no tapping pattern (always one place, a cycle, the same place as last time) beats chance.

### The careless eye

The careless eye (`rules/careless.ts`) is a child in a hurry whose eye lands on one thing and who taps whatever looks most different from it. When the eye lands on the odd one, everything else looks wrong, which is the classic slip of comparing two things instead of seeing the group. Colour counts most, then size, shape and fill, then dots and turns, and a mirror image not at all. The generator sizes each set to it: the first world can't be lost; on the second world it slips exactly once a set, so it wins with 2 stars but never 3; on the third world and the first two levels of the fourth it slips on every puzzle, so it runs out of tries; and on the last three levels of the fourth world and all the grown-up levels it runs out of tries on the first puzzle, while some wrong thing always looks less different than the answer, so tapping the least different thing is no trick either. Tapping at random finishes a set within the miss limit about one time in sixteen with four things, one in twelve with five and one in twenty with six; a test plays random taps and left-to-right taps on every level to check it.

`levels.test.ts` proves all of this for the first 20 goes of every level, including a second solver that counts values instead and must always agree with the first, hand-made ambiguous sets the solver must reject, a fresh puzzle on every go and the odd one moving round the pond. `fit.test.ts` proves every level fits a 390 by 844 phone, a 360 by 640 phone and a tablet both ways, with pads at 64px or more and 88px on the first world, and that the pads sit in the rows and columns the solver reads groups from.

## How it's built

The rules are pure modules in `src/rules/`, with tests.

- `things.ts` is a thing as numbers, and the shapes it can be. `pics.ts` is the curated groups of pictures. `solve.ts` is every rule the game knows and the solver.
- `levels.ts` is the staircase and the generator. `careless.ts` is the careless eye. `play.ts` is one try: the set, misses over it, the end of a try, the friend a wrong tap points to, the dance for each idea, and which exit and surprise each puzzle gets. `life.ts` is the pond friend each level brings. `misses.ts` keeps misses per level over every try until it is won, and the stars. `progress.ts` keeps finished and skipped levels.

The view is plain DOM, CSS and SVG. `view/art.ts` draws things, `view/fit.ts` places and sizes the pads, `view/pond.ts` is the pond and everything it does, `view/exits.ts` is the four send-offs and the two surprises, and `view/guide.ts` is the pointing hand. `screens/` holds the play screen, the level map, the win card and the finale. `sounds.ts` makes the boing and slide whistle, the protest, the dance notes, the plops and the tada from the kit's `playSound` and `playNote`.

## Bots and checks

These play a normal build served by `vite preview` on port 5197 (or `PORT`) in muted headless Chrome with real touch events, and aren't part of `npm test`.

```sh
npx vite build                 # in this folder
node e2e/skilled-bot.mjs       # every level from a fresh save, solving each puzzle from what is on screen, then 2 replays each
node e2e/careless-bot.mjs      # a hurried child who taps whatever looks most different, retrying until 5 tries fail: wins worlds 1 and 2, loses the rest, never 3 stars past world 1
node e2e/screen-check.mjs      # 3 screens, both languages, every level's fit, wrong taps, a lost try, the idle hand, mashing, the cards and finale, calm mode. Pictures land in .shots/
```

## Run it

From the repo root:

```sh
npm install
npm run dev -w @playroom/odd-one-out -- --port 5197   # just this game
npm test -w @playroom/odd-one-out                     # rules, generator proofs, fit and the Slovenian clips
npm run voice -- odd-one-out                          # after changing any Slovenian line
```

The root `npm run build` puts the game in `dist/odd-one-out/`, live at <https://nazuje.github.io/playroom/odd-one-out/>.
