# Ash

A roguelike card game for the phone (formerly Ashbound; the repo and link keep the old name). Fight 8 foes in a row, build your deck from themed bundles, pick augments, and burn your foes with Ash. Every picture and sound is generated in code.

**Play:** https://actionani.github.io/ashbound/ (open in Safari → Share → Add to Home Screen; after the first visit it works offline).

## How it's built
- `src/core.js` — all game rules (no DOM). `src/ui.js` — screens. `src/style.css` — look.
- `python3 build.py` → `index.html` + `sw.js` (offline cache). Commit those; GitHub Pages serves the repo root.
- `node tools/test.js` — rule tests. `node tools/sim.js 800` — bots play 800 runs per strategy to check balance.
- `python3 tools/ui_test.py` (with `python3 -m http.server 8765` running) — plays through the UI in headless Chrome.
- `python3 tools/make_icons.py` — redraws the app icons.
