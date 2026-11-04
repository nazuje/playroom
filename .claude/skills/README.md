# Vendored skills

Each skill here is a reviewed copy of a third-party skill. Update one by reading the new version in full the same way, never by installing over it.

## three.js

`threejs-animation`, `threejs-interaction`, `threejs-lighting`, `threejs-materials` and `threejs-performance` are copied from [CloudAI-X/threejs-skills](https://github.com/CloudAI-X/threejs-skills) at commit `0e181866f095b5f06d005133876e926515390d95`, unchanged. Each one was read in full on 2026-10-30 before being added: they are Markdown only, with no scripts, no tool permissions and no instructions beyond three.js advice.

They target three.js r186.

`threejs-fundamentals` is left out on purpose, because it shows loading three.js from a CDN. Games here bundle everything.

## UI polish

`mobile-native`, `emil-design-eng` and `break-ui` are copied from [emilkowalski/skills](https://github.com/emilkowalski/skills) at commit `f1090bec277140d02ed202440185ad9d02ac1490`, unchanged. Each one was read in full on 2026-11-04 before being added: they are Markdown only, with no scripts and no tool permissions.

- `mobile-native` fixes what makes a web page feel like a website on a tablet: sticky hover, tap delay, safe areas, overscroll.
- `emil-design-eng` covers motion and press feedback: easing, durations, `:active` states, reduced motion.
- `break-ui` stress-tests a screen with worst-case data, such as long Slovenian names or an empty shelf.

The other skills in that repo are left out: they target React Native, Swift or Sonner, push UI libraries, or repeat a skill we already have.

These skills were written for adult apps. Where they disagree with this repo, `AGENTS.md` and `docs/making-games.md` win:

- Playful motion suits players who can't read yet, so bouncier and slower is fine where the games call for it. The 300ms limit and "restraint" rules fit grown-up screens such as the portal's settings sheet.
- "Test on real hardware" means listing what needs a real tablet in the report. Agents test only in muted headless Chrome and never open pages in the person's own browser.
- `break-ui`'s data toggle stays out of the shipped site. Feed worst-case data in through a headless run instead.

## Licences

### CloudAI-X/threejs-skills

MIT License

Copyright (c) 2026 CloudAI-X

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.

### emilkowalski/skills

MIT License

Copyright (c) 2026 Emil Kowalski

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
