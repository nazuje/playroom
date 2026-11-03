# 🍓 Fruit Code / Sadna šifra

Picture equations for ages 5 to 12, alone or side by side with a grown-up. Every fruit hides a number. A board of crates shows rows like 🍎 + 🍎 = 6 and 🍎 + 🍌 = 8, and the chalk sign at the bottom asks 🍌 = ?. Crack one fruit and its number sticks to every copy of it, so the next row gets easier. That is substitution, made visible. It starts with one fruit added to itself and ends with three unknowns, take-away and ×2 that make a grown-up think. It plays in English and Slovenian, with the flag in the top bar.

## The look

A fruit stall at a sunny morning market: a tomato-and-white striped awning for the top bar, honey-wood crates for the clue rows, and a slate chalk sign in a wooden frame for the question. The dock below is the stall's green counter. Every fruit is an emoji with googly eyes. The signature effect is the sticker slap: when a fruit is found, a lime fruit-label sticker with its number flies in and thwacks onto every copy on the board, one after another from top to bottom, and a row whose fruits are all known gets a ✓ stamp. The number buttons are the same lime stickers, so picking one feels like choosing the label to slap on.

## How it plays

Everything is a tap. Numbers on the board show their digit and dots in rows of five, so a child who can't read numbers yet can count them.

- **Listen.** Tapping a row reads it out: "Apple plus apple makes 6." 🔊 repeats the instruction.
- **Pick what to work out.** The number buttons start on the question. Tapping a fruit picks that fruit instead: every copy glows, the numbers light up, and the prompt shows that fruit. Tapping the question picks the question again.
- **Answer.** Three big stickers on the first two worlds. Later 0 to 20: as a grid of stickers under the board on a tablet, and on a phone as a big −, a number with dots, a big + and a ✓, all under the board so the board is never covered. Holding − or + keeps counting.
- **A right number** slaps its sticker onto every copy of the fruit. A bunch of three bananas shows three times the banana's number, and "2 ×" pictures show twice it.
- **A wrong number** makes the fruit blow a raspberry, squish flat, or roll its eyes, in turn. Its copies wear the wrong number in red for a moment, and any row that can be added up with it flips its "=" to "≠" and pops up what it would really make. Only fruits already found are used for that, never the hidden ones.
- **Tries.** A try ends after 2 wrong numbers with three choices, or 3 with 0 to 20, so trying every number never wins. The fruits tumble, the stickers fall off, and one big 🔄 starts a fresh puzzle of the same shape. Every retry, every 🔄 in the top bar and every replay of a finished level gets a new puzzle: each level has 5, and the count of goes is saved, so a reload doesn't bring back the same one.
- **Help.** After 2 misses on a level the easiest row pulses, with the fruit to find in it, found by the same search the tests use. After 8 seconds with no tap a 👆 points at the next thing to tap: the fruit to work out next, or the numbers. The first time a new idea appears (picking a number, picking a fruit, the stepper, a bunch, "2 ×", a minus) a hand shows it once without words.
- **Challenge rules.** Levels open in order and finished levels stay finished. After 5 failed tries on a level, a small skip button appears. Stars: 3 for no misses in the winning try, 2 for one, 1 for two. Nothing is timed.

## Levels

24 levels in 5 worlds. Each world adds one idea, and its first level is quick.

| World | Levels | The idea | First and last (the first puzzle of each) |
| --- | --- | --- | --- |
| 🍎 One fruit | 1 to 4 | the same fruit is the same number, three choices | 🍎+🍎=4, then 🍌+🍌+🍌=18 |
| 🍌 Two fruits | 5 to 9 | find one fruit, use it for the next, three choices | 🍎+🍎=6, 🍎+🍌=4, then 🍊+🍊+🍉=17, 🍉+🍉+🍉=15 |
| 🔗 Fruit chain | 10 to 14 | three fruits in a chain, questions that add two or three | 🍋+🍋, 🍋+🍊, 🍊+🍌 → 🍌, then three rows → 🍉+🍓+🍎 |
| 🧮 Count and take away | 15 to 19 | a bunch of 3 against one fruit, and minus | 🍌🍌🍌=15, 🍌+🍓=13 → 🍓, then 3🍓−🍋, 🍓+🍓, 🍋+🍍 → 🍓+🍍 |
| 🔐 Code breakers | 20 to 24 | no row has only one fruit to find, so rows work together | 🍊+🍓=8, 🍊−🍓=2 → 🍊, then 2×🍊+🍐=13, 🍐+🍎=4, 🍊−🍎=4 → all three |

The puzzles come from row templates in `src/rules/levels.ts`, such as `A+A`, `b3A-B` (a bunch of three A, minus B) and `x2A+B` (2 × A plus B), with a range for each fruit's number and a fixed seed for each puzzle, so every device and every run gets the same ones. On the 0 to 20 levels no answer sits within 2 of any number on the board, so copying a number never works. `levels.test.ts` proves, for all 120 puzzles, that each has exactly one whole-number answer (every fruit is capped well inside the 0 to 60 search, which makes the search a proof), that every number stays within 0 to 20, that different fruits stand for different numbers, that each can be worked out one fruit at a time ending with the question, and that the code breakers' rows each hold at least two fruits to find.

## How it's built

The rules are pure modules in `src/rules/`, with tests.

- `equation.ts` is the rows as data: terms with a fruit, a shape (one, bunch or times), a count and a sign.
- `solve.ts` searches whole numbers. It proves each puzzle has one answer, and finds the easiest next step (one row with one unknown beats two rows together) for the hint, the nudge and the skilled bot.
- `levels.ts` makes the staircase and its 5 puzzles per level. `play.ts` is one try: the target, answers, stickers, misses, the end of a try and stars. `progress.ts` keeps finished and skipped levels with the kit's `store`.

The view is plain DOM and CSS, with no canvas. `view/board.ts` lays out the crates, picks the biggest fruit size that fits (64px or more on a 360 by 640 phone) and plays the slap, the faces, the "≠" and the hint. `view/pictures.ts` draws fruits, stickers and number tiles. `view/guide.ts` is the pointing hand. `screens/` holds the play screen, the level map and the win card.

## Bots and checks

These play a normal build served by `vite preview` on port 5188 with real touch events, and aren't part of `npm test`.

```sh
npx vite build                 # in this folder
node e2e/skilled-bot.mjs       # every level from a fresh save, working out each fruit as the hint search does, checking every sticker
node e2e/careless-bot.mjs      # a hurried child: guesses near a number it sees, never taps a fruit, retries until 5 tries fail
node e2e/screen-check.mjs      # 3 screens, both languages, every level's fit, a failed try, mashing, a language switch, calm mode. Pictures land in .shots/
```

The skilled bot wins all 24 levels with 3 stars, through the phone stepper. The careless bot wins all of worlds 1 and 2 within a couple of tries and loses every 0 to 20 level after 5 failed tries.

## Run it

From the repo root:

```sh
npm install
npm run dev -w @playroom/fruit-code -- --port 5188   # just this game
npm test -w @playroom/fruit-code                     # rules, level proofs and the Slovenian clips
npm run voice -- fruit-code                          # after changing any Slovenian line
```

The root `npm run build` puts the game in `dist/fruit-code/`, live at <https://nazuje.github.io/playroom/fruit-code/>.
