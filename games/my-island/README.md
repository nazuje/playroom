# 🏝️ My Island / Moj otok

A toy-like 3D island to live on. A child makes a little person, walks about by tapping, and helps eight animal friends: planting and picking a garden, adopting and caring for pets, baking treats, collecting shells, bugs, flowers and fish, and decorating a home and the island itself. There are no timers, no energy, no failing and nothing to buy. Ages 4 to 8, playing alone or with a grown-up, in English and Slovenian. Everything is done by tapping and nothing has to be read: each line is spoken aloud and also shown in a bubble for a grown-up.

## How it plays

Four islands fit on one device, each chosen by a picture, so siblings don't need to read names. A new island starts with a character creator (skin, hair, hair colour, clothes, colours and a hat, or 🎲 for a surprise). The wardrobe in the village square changes it again at any time.

A tap on the ground walks there, around trees, fences and houses. A tap on a friend, plot, shop, pet or find walks there and uses it. The camera follows from above at a tilt, and the light drifts from morning to evening to a starry night and back.

- **Friends and quests.** Tobi 🐢, Moko 🐹, Kiki 🦜, Gogo 🐐, Nino 🐸 and Bibo 🍄 live on the main island. Zuzu 🐝 lives on Flower Hill and Pepi 🐧 on Snowy Isle. They have 30 quests between them, one at a time. A big star floats over whoever or whatever comes next, an arrow points to it when it's off screen, and 🔊 says the step again. Quests are never required: the island is just as playable with one waiting.
- **Island Level.** Finished quests raise it from 1 to 10. Level 4 (after 9 quests) repairs the bridge to Flower Hill. Level 7 (after 18) launches the boat to Snowy Isle. Levels also open crops (tomato at 2, corn at 3, pumpkin at 5, melon at 8), pets (puppy 2, bunny 3, duckling 5, piglet 6, chick 7, dino 8, pony 9), recipes, garden plots (6, then 8, 10 and 12) and furniture, up to a rainbow arch at 10.
- **Garden.** Plant, water and pick. Plants only ever grow, and rain waters them all.
- **Pets.** Adopt at the pet corner, then brush, feed and play. Hearts only ever go up. Up to three follow along and sometimes do a trick.
- **Bakery.** Put the crops into the bowl, then into the oven. Treats can be given to any friend, who cheers and gives shells back.
- **Collecting.** Finds lie on the beach, in the forest, on the hill and in the snow, and come back after a while. Fishing at the pond is a gentle timing tap, and the green zone widens after every miss. The 📖 book shows each find as a silhouette until it's found.
- **Decorating.** Shells are the only money. They buy furniture for the house and decorations for outside. Tap a thing, then the floor. Things can be turned, moved and put back in the cupboard.
- **Rare surprises.** A rainbow after rain, shooting stars at night, a parade of friends, a golden butterfly and a whale. Each is recorded in the book.

The 🏝️ button that goes back to the islands and the creator's "Let's go!" only work when held for about a second, while a yellow ring fills around them, so a mash can never leave an island or make a new one. Every new screen also ignores taps for a moment. Each moment says at most two short lines, and the next friend's request follows after a pause. Anything done towards a quest before its friend asks still counts.

A finished island stays open for free play. A grown-up can reset an island from the picker: 🔧 shows the reset buttons, and the reset needs a second, deliberate press within 4 seconds.

## How it's built

Rules are pure modules in `src/rules/` with no DOM or three.js. `play.ts` is a session: tapping a target, walking, arriving and the outcome to show and say. `world.ts` lays out the island tiles and `path.ts` finds the route. `quests.ts` and `guide.ts` decide the next step and where the star goes. `garden.ts`, `pets.ts`, `bakery.ts`, `finds.ts`, `fishing.ts` and `decor.ts` hold the activities. `surprises.ts` and `daylight.ts` run off the game's own play clock, never the real time, so a reload doesn't skip anything.

Saving is in `save.ts`. Each island is stored twice, in alternating copies with a revision number. Reading takes the newer good copy, so a write cut off halfway never loses the island. Every save carries a version and goes through `MIGRATIONS`. A save that can't be read, including one from a newer game, is shown as "can't open" and left exactly as it is, never overwritten. `healIsland` repairs a damaged field from its starting value and keeps the rest. The game saves every few seconds, after every outcome and when the page is hidden.

The view in `src/view/` is low-poly, with vertex colours and one shared material. `builder.ts` merges the ground, nature, town and furniture into a few meshes, so even a fully decorated island draws in under 30 calls (the budget is 100). An invisible real button follows each tappable thing, which gives keyboard focus and screen-reader labels. Taps go to the canvas, where `picking.ts` chooses the nearest thing under the finger. The house interior and the dressing-up stand are small scenes off to one side of the same world.

Words are in `src/lang/`. There are 125 spoken lines, each under 12 words. Slovenian clips are in `public/voice/sl/`.

## Bots

These run on a normal build served by `vite preview` on port 5371, with real touch events, and aren't part of vitest. `e2e/fixtures.mjs` makes saves with the game's own rules, including a heavily decorated island with every pet, 12 plots, a full book and 60 placed things.

```sh
npx vite build                    # in this folder
node e2e/run-all.mjs              # everything below, three at a time
node e2e/quest-bot.mjs            # a new island: creator, the first 10 quests by following the star, reload, second island
node e2e/free-play.mjs            # every activity once on a half-done island, checked in the save, then a reload
node e2e/screen-check.mjs         # 4 sizes, both languages, 50-tap mash on every screen, a mash in play
                                  # that must keep the same island and island count, draw calls,
                                  # language switch mid-quest, keyboard and mouse, reduced motion
SIZE=390x844 node e2e/screen-check.mjs   # one size, or SIZE=extras for the last three checks
node e2e/contact.mjs .shots /tmp/sheet.png '390x844' 6 200   # screenshots side by side
```

Screenshots land in `.shots/`. Every bot fails on a console error or a request to anywhere but localhost and Google Fonts.

## Run it

From the repo root:

```sh
npm install
npm run dev -w @playroom/my-island -- --port 5371   # just this game
npm test -w @playroom/my-island                     # unit tests
npm run voice -- my-island                          # after changing any spoken Slovenian line
```

The root `npm run build` puts the game in `dist/my-island/`, live at <https://nazuje.github.io/playroom/my-island/>.
