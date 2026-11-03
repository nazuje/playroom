# 🌍 Globe Safari / Safari po svetu

A gentle geography game for parents and young kids (about 3 to 9). Spin a realistic 3D Earth, tap anywhere, land or sea, and meet the wild animals that live there. It plays in English and Slovenian.

## How to play

1. **Spin the Earth.** Drag to turn it, and pinch or scroll to zoom. It slowly turns by itself when nobody is touching it.
2. **Tap anywhere.** A pulsing finger shows where. The camera whooshes down to that spot, drops a pin, and opens a panel about the wild place there, like the *Amazon Rainforest*, the *African Savanna* or the *Great Barrier Reef*. The place is read aloud.
3. **Who lives here?** A round of five mystery animals. Each clue is spoken as it appears. Guess after the first clue for ⭐⭐⭐, after the second for ⭐⭐, after the third for ⭐. **We got it!** shows the stars it is worth right now, and **Show me ✨** turns the card with no stars and a friendly "Now you know!". After the fifth animal comes a finish with confetti, a spoken cheer, the stars from the round and one big **Play again** button. Playing again brings animals you haven't met first.
4. **Meet them all.** See every animal in the region as flip cards. Turning a card says its name and a fun fact.
5. Tap 🔊 next to any clue or fact to hear it again. If nobody taps for a while, the next step gently pulses.
6. **Surprise me! 🎲** jumps to a random wild place. **Back to space 🚀** zooms back out.
7. The flag in the top corner switches between English and Slovenian at any time. The open place, the mystery animal, its clues and any turned cards stay as they were.

There are 32 wild regions covering every continent and every ocean, each with 6 to 8 animals.

## Run it

Globe Safari is one game in [Playroom](../../README.md). You need Node.js 22 or newer. From the repository root:

```sh
npm install
npm run dev -w @playroom/globe-safari     # start a local dev server for just this game
npm test -w @playroom/globe-safari        # run the unit tests
```

The root `npm run build` puts the game in `dist/globe-safari/` with relative paths, so it works from any folder, including GitHub Pages at `/playroom/globe-safari/`.

## How it works

- `src/data/` holds the hand-written regions and animals, each region with simple latitude/longitude boxes or small polygons and a priority, so small specific places (the Galápagos, Madagascar, New Zealand) win over broad ones.
- `src/geo/lookup.ts` is the pure lookup: it checks whether a point is on land using the country shapes, picks the best matching region, falls back to the nearest region for land in between, and to the right ocean for open water. Every point on Earth gets a region; the tests check a 5° grid over the whole globe.
- `src/globe/` sets up the 3D Earth with globe.gl, the camera moves, borders and the pin.
- `src/game/score.ts` is the pure scoring: stars by how many clues were needed, and which animals make the next round. `score.test.ts` tests it.
- `src/ui/` holds the panel, the guessing game, the flip-card grid and the read-aloud button. Speech, sounds, the star burst and the home button come from `@playroom/kit`. Buttons answer on `pointerdown`, so two fingers both count, and a button that appears where one was just pressed ignores taps for a moment, so a mash can't skip a reveal or the finish. The flip cards and the globe itself answer on click, because the card grid scrolls and the globe drags.
- `src/photos.ts` fetches animal photos from Wikipedia at runtime and remembers them. If a photo can't load, the animal's emoji is shown instead. Wikipedia is used for photos only: no Wikipedia text is shown or spoken, so both languages use the same English article titles.
- `src/lang/` holds the words. `en.ts` reads the English straight from `src/data/`, and `sl.ts` takes the Slovenian from `src/lang/places/`, one file per continent like `src/data/regions/`, keyed by region and animal id. Slovenian country names live in `src/lang/countries.ts`. Every Slovenian line that can be spoken (the start instruction, each way a reveal or a round can end, each place's description and each animal's clues and fun fact, about 1010 lines) is a recorded clip in `public/voice/sl/`, made with `npm run voice -- globe-safari`, and `src/lang/sl.test.ts` fails if any is missing or any place or animal has no Slovenian words.

## Credits

- **Earth imagery:** NASA Blue Marble and topography (public domain), via the [three-globe](https://github.com/vasturiano/three-globe) examples. Star background from the same examples.
- **Clouds:** NASA-derived cloud map from [webgl-earth](https://github.com/turban/webgl-earth) by Bjørn Sandvik, shipped with the globe.gl examples, resized for the web.
- **Country borders:** [Natural Earth](https://www.naturalearthdata.com/) (public domain), via [world-atlas](https://github.com/topojson/world-atlas).
- **Animal photos:** [Wikipedia](https://en.wikipedia.org/) and Wikimedia Commons contributors, loaded live through the Wikipedia REST API.
- **3D globe:** [globe.gl](https://github.com/vasturiano/globe.gl) by Vasco Asturiano, built on [three.js](https://threejs.org/).
- **Font:** [Fredoka](https://fonts.google.com/specimen/Fredoka) from Google Fonts.
