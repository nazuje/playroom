# Playroom

Web games for a family with a 6-year-old and a 4-year-old who can't read yet, in English and Slovenian. Live at <https://nazuje.github.io/playroom/> from a public repo. `README.md` explains setup, the registry and how to add a game or a language.

Read `docs/making-games.md` before building or changing a game.

## Done means

1. `npm test`, `npm run typecheck` and `npm run build` all exit 0. Read the exit codes, because `npm test` runs Node tests after vitest and a grep for vitest output misses them.
2. `npm run playtest -- <slug>` passes, after a build, and you've looked at the screenshots in `.playtest/`.
3. For a new game or a big change, a separate agent that didn't build it plays it, following `.claude/agents/game-tester.md`. This can happen after publishing, with its fixes going out as updates.

4. Commit, push to `main` and confirm the deploy and the live page, without waiting to be asked. Publish each finished game on its own, and send tester fixes as follow-up updates.

Report what no script can check: real sound, real tablets and native Slovenian. No one has yet confirmed any of these on a real device.

## Guardrails

- These are children's games on a public site. Games keep everything on the device and have no accounts, analytics, ads, purchases, outbound links or calls to outside services. The existing exceptions are the Fredoka font from Google Fonts, Globe Safari's Wikipedia lookups and the credit links on the portal. `npm run playtest` fails on any other outside request.
- Every game is original. Names, characters and art never come from a commercial game.
- Pushing to `main` publishes straight to the live site. The repo is public, so keep personal details out of it.
- Lint and type errors are fixed in the code, never silenced.

## Gotchas

- A new workspace needs `npm install` at the root, or `npm ci` fails in CI.
- Slovenian clips in `public/voice/sl/` and `sl.clips.json` are committed, and the build fails on a missing clip. After changing any spoken Slovenian line, run `npm run voice -- <slug>`.
- The voice tool needs `npm run voice:setup` once per machine and Homebrew's `espeak-ng` on macOS, because Piper's bundled data path is broken there.
- Launch headless Chrome with `launchOptions` imported from `scripts/playtest.mjs`, never a hand-copied set of flags. Its `--mute-audio` keeps test runs from playing through the computer's speakers.
- Never open a game in the person's own browser, by browser tools, `open` or a dev server's auto-open: the games make sound and it plays aloud. `.claude/settings.json` denies the browser tools. Test only in muted headless Chrome.
- `.claude/skills/` holds reviewed copies of third-party skills. Read any update in full before replacing them.
