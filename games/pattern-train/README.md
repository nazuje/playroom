# 🚂 Pattern Train

A logic game for ages 5 to 9, played alone. A train pulls in carrying a repeating pattern, and you work out what comes next.

It plays in English and Slovenian. The flag in the top bar switches language at any time, even mid-train, without losing your place. Slovenian speech is recorded ahead of time and ships with the game, so it works on a tablet with no Slovenian voice.

## How to play

1. Tap **All aboard!** to start at your furthest level, or pick any level.
2. Look at the cars and tap the item that fills the empty one. A wrong pick wiggles and dims, and nothing is lost.
3. When a train is full, it chugs away. Five trains finish a level.
4. Tap **Say it!** (**Poslušaj!** in Slovenian) to hear the pattern chanted as a little tune, which helps a child hear the rhythm. The 💡 hint brackets the part that repeats.

The levels are AB, AAB and ABB, ABC, AABB and ABAC, gaps in the pattern, and growing patterns.

## Run it

Pattern Train is one game in [Playroom](../../README.md). You need Node.js 22 or newer. From the repository root:

```sh
npm install
npm run dev -w @playroom/pattern-train     # start a local dev server for just this game
npm test -w @playroom/pattern-train        # run the unit tests
```

The root `npm run build` puts the game in `dist/pattern-train/`, live at <https://nazuje.github.io/playroom/pattern-train/>.
