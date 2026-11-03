# Making a Playroom game

The players are a 6-year-old and a 4-year-old, boys and girls alike, mostly on a tablet or phone. These rules hold for every game. `README.md` covers the mechanics of adding a game or a language.

## Every game

- **Plays without reading.** Everything important is spoken, with a 🔊 button to repeat it, and the game still makes sense with the sound off, through pictures and a pulsing hint. Words on screen are for the grown-up.
- **Tap only, and big.** Gameplay targets are at least 64px, and 88px in games for age 3 to 5. Everything else is at least 48px. Text is at least 16px. Portrait phones (360px wide) and landscape tablets both fit with no sideways scroll.
- **Failure is funny.** A miss gets a silly reaction and a way forward. After a couple of misses, the answer gets easier to spot, so nobody gets stuck.
- **Mash-proof.** A palm on the screen or 50 fast taps breaks nothing, loses nothing and skips no screen. The home button and any start-over control stay small and away from the play area. Handle game taps on `pointerdown`, and keep two simultaneous fingers working.
- **Fast reward, short rounds.** Rounds last 1 to 3 minutes, or 30 to 90 seconds for age 3 to 5, then a burst of confetti, a spoken cheer and one big button for the next round.
- **Kind to everyone.** Characters are gender-neutral and nothing is sorted by gender. Dinosaurs, unicorns, crowns and diggers all sit side by side. Nothing is scary, mean or violent, and anything hit laughs.
- **Self-contained.** Art is CSS, canvas, emoji or three.js primitives, and sound comes from `playSound` and `playNote` in kit, so games make no outside requests. Game rules live in pure modules with vitest tests, and respect `prefers-reduced-motion`.

## Fun and action games

- Every tap gets sound and movement within a frame. Rare surprises keep the tenth round fresh, and something should grow over time, such as a collection.
- Action games may keep score, show a personal best and give up to 3 stars. Retrying takes one tap, and every level stays open. Easy is the default and a 4-year-old can enjoy it, with at least one harder setting for the 6-year-old. There are no lives, no game over and no pressure timers: a mistake costs a moment, never the run.
- Playing always beats not playing. An assist helps a 4-year-old succeed, while a hands-off run earns the lowest rating and scores below even careless play. Prove it with simulated hands-off, careless and skilled players across every setting, in tests.
- Keep rules frame-rate independent.

## Challenge games

The parent asked for games that are truly hard. Maze Escape and every game tagged `challenge` have real losing, and these rules replace the softer ones above where they differ. They suit age 6 and up.

- Losing costs nothing but the try: a funny reaction, one tap to retry within a second, and finished levels stay finished.
- Difficulty is a staircase. The first levels teach one idea and a 6-year-old beats them quickly. The last levels are a real challenge for a grown-up.
- Levels open in order. After 5 failed tries on a level, or sooner when tries are long, a small skip button appears, so nobody stays stuck.
- Every loss is fair: the danger or mistake was visible, and the player can see what to do differently.
- Prove the staircase by playing the built game with real touch events, not only by simulation. A skilled bot beats every level, a careless bot beats the early levels and loses the late ones. Simulated results have disagreed with the real game here before, so the real run decides.

## Puzzle games

Secret Seesaw, Fruit Code, Magic Machine and Missing Piece are challenge puzzles with one right answer. Their testers kept finding the same holes, so every puzzle game follows these rules. Copy the structure of those four games: pure `rules/` with a seeded generator and solver, `rules/misses.ts`, and the bots and screen check in `e2e/`.

- Guessing never wins. A try ends after at most (choices − 2) misses, and never more than 3, so tapping everything can't win. The retry deals a fresh puzzle of the same shape. Replays get fresh puzzles too. Wrong choices are tempting: each is the classic mistake or breaks exactly one rule. The right answer's place in the row is unpredictable, and a test over many seeds shows that no fixed tapping pattern (always first, always last, a cycle, the same place as last time) beats chance. An always-larger decoy in a sorted row breaks this, as does `variant % count`.
- Stars count misses across every try until the level is won, saved with `store` so leaving or reloading doesn't reset them: 0 gives 3 stars, 1 or 2 give 2, more give 1. Only 0 is "perfect".
- A level is a short set of about 3 puzzles, so a round lasts 1 to 3 minutes.
- The first world is for the 4-year-old and never fails. Misses there only cost stars.
- Answer pickers never cover the board on a phone. Use a −/+ stepper with hold-to-repeat under the board on phones, and a grid on tablets.
- The idle hand points at something tappable and never rests on one answer, which would read as a hint. The first time an idea appears, the hand shows it once without words.
- Cards and win screens ignore taps for about 0.6s. The win card's one big button goes to the next level, and the dock and skip are hidden under it. Finishing the last level gets a real finale.
- The careless bot never quits on its own and never earns 3 stars after the first world.

## 3D games

- Build on `@playroom/stage3d`, which owns sizing, pixel ratio, sleep and lost contexts, whatever a three.js example shows. When `createStage` returns null, show a kind translated message and the home button.
- Aim for bright, toy-like low-poly worlds: `flatShading`, a hemisphere light plus one directional light, blob shadows, and fog at the far edge. Reuse geometries and materials, instance repeats, and stay near 100 draw calls.
- The camera moves smoothly, with no rolling or hard shaking.
- For three.js API questions, use the skills in `.claude/skills/`, or find the page through the index at <https://threejs.org/docs/llms.txt>.

## Look

Choose each game's world and palette before writing code: the place it's set, three main colors, and one signature effect. Each game should be recognisable from a thumbnail. Cream or off-white backgrounds, pill-shaped buttons and a yellow primary button are the house habit, so reach for something the game's own world suggests instead.

## Slovenian

Build English and Slovenian from the start, following `README.md`. Spoken lines are warm, natural and short, as a kindergarten teacher would say them, so rewrite jokes rather than translating them word for word. Address the child in a way that works for any gender: "Bravo!", or a present-tense or imperative verb. Use `slCounted` and friends for numbers.

Stress can't be read from spelling and the voice engine guesses. After generating clips, read every word in `npm run voice:words -- <slug>`, and fix only the ones you're sure of with `npm run voice:fix -- <word> <ipa>`. List anything that needs a native speaker's ear in your report.
