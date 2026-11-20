# Ashbound — notes for Claude

Personal game for Ani. Ani gave Claude full design control, but prefers concise replies and doesn't want to manage code.

## Updating the game
1. Edit `src/` (rules in core.js, screens in ui.js, look in style.css).
2. `node tools/test.js` must print ALL PASS. Add a test for new rules.
3. `node tools/sim.js 800`: keep every theme's win rate within a few points of the others (Voltron is fine, but must not dominate; never add penalties like "Strain" — make alternatives strong instead). Fresh-save bot win rate around 5–15%.
4. `python3 -m http.server 8765 &` then `python3 tools/ui_test.py`: no errors.
5. `python3 build.py` (and `python3 build.py artifact` for the Claude artifact copy), commit `index.html` + `sw.js` + sources, push to `main`. Pages redeploys; phones pick it up next time they're online.
6. Save format lives in localStorage key `ashbound.web.v1`; if you change `G.meta`/`G.run` shape, keep old saves loading (defaults via Object.assign).

## Design guardrails
- One creature per side; three card types (creature, spell, artifact); energy = round number (max 10); hand kept; Ash → Burn.
- Everything drawn/synthesized in code. No image or audio files except the generated icons.
