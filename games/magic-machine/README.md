# ⚙️ Magic Machine / Čarobni stroj

Function machines for ages 5 to 12, alone or side by side with a grown-up. A number goes in, the machine does something secret, and a different number comes out. The conveyor belt on top shows what it has already made, like 2 ➜ 4, 3 ➜ 5, 5 ➜ 7. The player predicts what comes out next, names the rule, runs the machine backwards, and finally chains two machines. That is a function, its rule and its inverse, the groundwork for algebra. It starts with plus one and ends with two hidden machines run backwards, which makes a grown-up think. It plays in English and Slovenian, with the flag in the top bar.

## The look

An inventor's workshop drawn on blueprint paper: a deep blue plan with a white grid, a steel beam with rivets and a brass edge for the top bar, and a navy workbench with a brass ruler edge for the dock. On the plan stands a silly tomato-red contraption with two gauges for eyes, brass gears peeking out of its sides, a chimney, a brass hopper on top and a mint chute at the bottom. Numbers are round enamel tokens with a brass rim, the digit and its dots in rows of five. The rule hides behind a striped "?" plate. Levels on the map are hex nuts.

The signature effect is the run. The token drops into the hopper with a clank, the machine rattles, its gears spin, its gauge needles swing and the chimney puffs steam, then the new token rolls out of the chute with a pop and the "?" plate flips over to show the rule. With two machines, the token goes through a striped pipe from one to the other. A wrong answer makes the same machine sputter dark smoke.

## How it plays

Everything is a tap, handled on `pointerdown`, so two fingers both work.

- **Listen.** On the first two worlds the examples are read out as each one lights up: "2 goes in, 4 comes out." Tapping an example reads it again. Tapping the "?" token or the shut plate being asked about says the question and lights up the answers. Tapping an open plate says its rule ("Double!"), and tapping a shut plate that isn't asked about gets "Shh! It's a secret." 🔊 repeats the instruction.
- **Answer.** Three big tokens on the first two worlds and the first backwards level. Rule cards when the question is the rule: a symbol and number with a picture, green dots for plus, crossed-out red dots for minus, copies for times and a cut token for half. Three cards in world 2, four on the backwards fix, five for the hidden second machine, and on the two-machine fix five cards that each hold a pair of parts in order. The right answer's place, among tokens or cards, is planned per level: every place equally often, in a seeded order that no fixed way of guessing can follow. Later 0 to 20: on a tablet as a grid under the machine, and on a phone as a big −, a token with dots, a big + and a ✓, all under the machine so it is never covered. Holding − or + keeps counting, and ✓ pulses once a number is set.
- **A right answer** runs the machine with it and the plate flips open. A right rule card runs every example through the machine, each one getting a ✓.
- **A wrong answer** sputters, coughs or toots, in turn. A wrong number in the chute shakes in red. A wrong backwards guess shows what it really makes beside the wanted number ("6 ≠ 7"), or a ✗ when the machine can't take it, such as halving 7. A wrong card marks each example ✓ or ✗, so the player sees it only works for some.
- **A shift.** Each go at a level is a shift of 3 puzzles of the same shape. The first machine has a lamp for each: it blinks for the puzzle on the machine and lights mint once it's solved, with "One more machine!" before the next. Every retry, every 🔄 in the top bar and every replay of a finished level gets a fresh shift: each level has 15 puzzles in 5 shifts, and the count of goes is saved, so a reload doesn't bring back the same ones.
- **Tries.** Misses count across the whole shift. A try ends on the 4th wrong answer with three tokens, three cards or 0 to 20, about one slip a puzzle, and on the 2nd with four or five cards, where every wrong card fits some example, so guessing through them wins about one try in thirty and trying everything never wins. The miss that ends a try runs the machine quickly and puts one big 🔄 up at once, tappable within a second, while the machine wobbles and its needles droop behind it.
- **Help.** After 2 misses on a level, a gentle hint: a shut plate peeks open for a moment, open plates pulse, or on rule questions the examples pulse with "Check every number!". After 8 seconds with no tap a 👆 points at the next thing to do: on the phone stepper the + until the number has moved, then ✓; elsewhere the "?" being asked about, while the whole row of answers bounces in turn, so no single answer looks like a hint. The first time a new idea appears (picking a token, a rule card, backwards, fixing a machine, fixing two at once, machines in a row, the stepper) a hand shows it once without words, with the row of answers glowing together. Everything the hand points at moves when tapped, so it answers with the sound off.
- **Challenge rules.** Levels open in order and finished levels stay finished. After 5 failed tries on a level, a small skip button appears. Stars count every miss on a level since it was last won, across every try, leaving and reloading, so starting again never buys a better score: 3 stars for none, 2 for one or two, 1 for more. The best stars per level stay saved, and a replay of a finished level starts counting from nothing. Nothing is timed. The win card ignores taps for 0.6 seconds, so a mashing hand can't skip it, and the map ignores the end of the tap that opened it.
- **The end.** Winning the last level brings the end-of-game card: confetti from all over the screen, a trophy with spinning gears, every star so far, a spoken "You fixed every machine!" and one big button back to the map.

## Levels

25 levels in 5 worlds. Each world adds one idea, and its first level is quick. Examples are the first puzzle of each level.

| World | Levels | The idea | Answers |
| --- | --- | --- | --- |
| ➕ Adding machines | 1 to 4 | +1, +2, +3, then any of them: what comes out? 1 ➜ 2, 6 ➜ 7, so 8 ➜ ? | three tokens |
| ✖️ Take away and double | 5 to 9 | −1, ×2, a mix, then name the rule from 3 cards. On level 9 one wrong card fits the first example | three tokens, then cards |
| 🔮 Secret rules | 10 to 14 | +10, half, ×3, then any of +4 to +9, −3 to −5, ×2, ×3 and half, from 3 examples and finally only 2 | 0 to 20 |
| ⏪ Backwards | 15 to 19 | the rule is shown: what went in? Then "fix the machine", where every wrong part gets some example right, then backwards with the rule hidden | three tokens, cards, then 0 to 20 |
| 🔗 Machines in a row | 20 to 25 | through two open machines, the hidden second machine from 5 cards, fixing both hidden machines with the right pair of parts in the right order from 5 cards, back through two with the second hidden, back through three with the middle one hidden, and back through three with the first and last hidden | 0 to 20, with cards on 21 and 22 |

Levels 22 to 25 are for grown-ups. Their examples can't be explained by any single plus, minus, times or half, so spotting one rule fails. On 22 only one pair of parts, in one order, does the job, and the wrong cards include pairs that fit one example. On 25 each example alone fits many pairs of hidden machines, so only both together pin them down, and the answer means running three machines backwards, often through a half.

The puzzles come from specs in `src/rules/levels.ts`: the rules each machine can get, which plates are open, how many examples, the range of numbers that go in and what is asked. A fixed seed per puzzle means every device and every run gets the same ones, and a level's 5 puzzles use different rules where its pool allows. `levels.test.ts` proves for all 120 puzzles that:

- every example is true, and every number on screen is from 0 to 20 (a number inside a chain may reach 40);
- trying all 48 rules a machine could have (plus or minus 1 to 20, times or divided by 2 to 5) leaves exactly one answer, the one the level expects, and a lone shut plate hides exactly one rule, so the plate never lies when it opens;
- a backwards question has exactly one input from 0 to 60;
- copying a number on screen is never right, and on 0 to 20 levels the answer is at least 3 from the number on the machine;
- each three-token level offers the right number, the copy, and a real slip (running the machine forwards on backwards levels);
- each card level has exactly one card that fits every example, and on "fix the machine" every wrong part fits some example;
- no single rule explains the examples on levels 22 to 25, on 22 exactly one pair of parts fits, on 22 and 25 neither example alone is enough, and after world 2 every wrong card fits some example;
- each go is a shift of 3 of a level's 15 puzzles, and 5 goes meet all 15.
- the right answer's place gives nothing away: over 30 seeds and in the shipped puzzles, every place comes up about equally, and no fixed strategy (always first, always last, cycling either way, or the same place as 1 to 6 puzzles ago) beats chance by more than 1.3 times.

## How it's built

The rules are pure modules in `src/rules/`, with tests.

- `machine.ts` is the rules as data, running a number through up to three machines, rule cards that fill every shut plate, and checking examples.
- `solve.ts` is the solver: every way to fill the shut plates from 48 rules that makes every example true, found by walking the machines in order and dropping a rule as soon as a machine can't take a number, and what each would answer.
- `levels.ts` makes the staircase, its 15 puzzles per level and the shifts. `play.ts` is one try at a shift: answers, moving on, misses across the shift, what a wrong answer shows, the end of a try and stars. `progress.ts` keeps finished and skipped levels with the kit's `store`.

The view is plain DOM and CSS. `view/board.ts` draws the belt and the machines and picks a size unit that fits the screen, so tokens and plates stay at 64px or more on a 360 by 640 phone. `view/tokens.ts` draws tokens and rule faces, and `view/guide.ts` is the pointing hand. `screens/` holds the play screen, the level map and the win card. `sounds.ts` makes the clank, the whir, the roll, the sputters, the wobble and the tada from the kit's `playSound` and `playNote`.

## Bots and checks

These play a normal build served by `vite preview` on port 5192 (or `PORT`) in muted headless Chrome with real touch events, and aren't part of `npm test`.

```sh
npx vite build                 # in this folder
node e2e/skilled-bot.mjs       # every level from a fresh save, then every replay until all 5 shifts (15 puzzles) are won
node e2e/careless-bot.mjs      # a hurried child: copies the number on the machine or taps the first card, then guesses near it, retries until 5 tries fail
node e2e/screen-check.mjs      # 3 screens, both languages, every level's fit, wrong answers, a failed try and how fast 🔄 is ready, where the idle hand lands, mashing, calm mode. Pictures land in .shots/
```

The skilled bot wins all 25 levels and all 125 shifts with 3 stars, through the phone stepper, in about 8 to 12 seconds a shift with no thinking time, so a child's round lands at about 1 to 3 minutes. It checks the lamps count up and that the end-of-game card shows only after the last level. The careless bot wins all of worlds 1 and 2 and loses every 0 to 20 level after 5 failed tries, and it fails the run if it ever earns 3 stars after world 1.

## Run it

From the repo root:

```sh
npm install
npm run dev -w @playroom/magic-machine -- --port 5192   # just this game
npm test -w @playroom/magic-machine                     # rules, level proofs and the Slovenian clips
npm run voice -- magic-machine                          # after changing any Slovenian line
```

The root `npm run build` puts the game in `dist/magic-machine/`, live at <https://nazuje.github.io/playroom/magic-machine/>.
