# 🎨 Color Lab

A paint-mixing game for ages 4 to 9, alone or with a grown-up. Guess first, then pour and see what happens. It plays in English and Slovenian: the flag in the top bar switches language at any time, even mid-round, without losing progress.

## How to play

- **Guess the color:** two paints are shown. Tap the color you think they'll make, then tap **Pour!** and watch them swirl together.
- **Make this color:** a character asks for a color. Tap paints into the beaker and tap **Mix**. If it's not right, add more or empty the beaker, and a hint appears.
- **Free paint:** mix anything and paint a butterfly or a house. There's no scoring, and pictures are saved on the device.

## Languages

The words live in `src/lang/`: `en.ts`, and `sl.ts` with every Slovenian line the game can say. Slovenian color names are adjectives that agree with *barva* (paint), which is feminine, so each color has a nominative form ("To je rdeča!") and an accusative one ("Potrebujem rdečo barvo!"). Slovenian speech is prerecorded in `public/voice/sl/`. After changing a spoken Slovenian line, run `npm run voice -- color-lab` from the repository root.

## Tuning

The paint rules are written out at the top of `src/mix.ts`. Colors come from a table of what real paint does, not from averaging screen colors, which gives muddy wrong answers.

## Run it

Color Lab is one game in [Playroom](../../README.md). You need Node.js 22 or newer. From the repository root:

```sh
npm install
npm run dev -w @playroom/color-lab     # start a local dev server for just this game
npm test -w @playroom/color-lab        # run the unit tests
```

The root `npm run build` puts the game in `dist/color-lab/`, live at <https://nazuje.github.io/playroom/color-lab/>.
