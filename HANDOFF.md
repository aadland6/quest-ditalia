# GIS Quest — Construction Summary & Porting Guide

A complete inventory of how the game was built, every asset in it, and exactly what to
swap to refocus it from GIS study to **learning Italian**. Written 2026-08-16 at the
point of handoff.

**The one-sentence architecture:** a content-agnostic study-RPG engine where every game
action (mining a rock, shooting an arrow, building a wall) asks one question chosen by
a spaced-repetition scheduler; the *only* GIS-specific parts are the question bank, the
knowledge-component index built from it, and cosmetic flavour text. The engine, the 3D
world, all game systems, and all art carry over to Italian unchanged.

---

## 1. The stack (all layers, bottom-up)

| Layer | Where | Status for Italian port |
|---|---|---|
| Question bank (4,976 items, 6 formats) | `question_bank/question_bank.json` | **REPLACE** with Italian items, same schema |
| SRS engine (dual scheduler) | `srs/srs-engine.js`, `srs/idb-storage.js` | Keep unchanged (content-agnostic) |
| KC index builder | `srs/build_srs_index.py` | Keep script, **rewrite the keyword→KC ruleset** |
| Scheduling metadata | `srs/srs_cards.json`, `srs/srs_kcs.json` | **REGENERATE** from the new bank |
| Question shards (lazy-load content) | `game/data/bank/*.json` + `shard_index.json` | **REGENERATE** via `game/tools/shard_bank.py` |
| Question bridge | `game/js/questions.js` | Keep (reads only ids/areas) |
| Game data (items, skills, enemies…) | `game/js/data/*` | Keep; optionally re-flavour text |
| Game systems (combat, farming…) | `game/js/systems/*` | Keep unchanged |
| World layout + pathfinding | `game/js/world/*` | Keep unchanged |
| 3D renderer + procedural assets | `game/js/world3d/*`, `game/vendor/three.module.js` | Keep unchanged |
| UI screens | `game/js/ui/*` | Keep; a few GIS-flavoured strings |
| PWA shell | `game/index.html`, `sw.js`, `manifest.webmanifest`, `icons/` | Keep; rename app |

Everything is plain ES modules — **no build step**. Deployable to GitHub Pages as-is.
The only vendored dependency is Three.js r160 (MIT, 656 KB, precached by the service
worker). All models/textures/animations are procedural originals (no game-cache assets).

---

## 2. Core design (decided with the user, in order)

1. **Questions ARE the actions** — one question per pickaxe swing / arrow / craft /
   build step / chest lock. Correct → the action succeeds (+xp, +loot, +1 hp "rest");
   wrong → the action misses and the explanation is shown. Crafting materials are
   never consumed on a miss.
2. Question sourcing per action: **due SRS reviews first** (spaced repetition), else
   an **adaptive new card** (Thompson sampling toward the learner's weakest topics).
   Every answer updates both schedulers (per-card FSRS-lite binary curve + Bayesian
   Knowledge Tracing across shared topic components that reschedules *similar* cards).
3. Combat stat set: Attack, Strength, Defence, Ranged, Hitpoints (melee style
   selectable; ranged consumes arrows). Combat tuned for question pacing: ~5–10
   correct answers per at-level kill (`maxHit = 2 + lvl/8 + gearStr/5`, deliberately
   low enemy HP).
4. Packaging: **installable PWA**, offline after first load, per-device IndexedDB
   saves (two databases: `gis-game` = save file, `gis-srs` = scheduler state).
5. Visual style (twice revised): final form is **low-poly 3D in the RS2/OSRS spirit**
   — faceted heightmap terrain with corner-blended vertex colours, gouraud-shaded
   tapered characters (no boxes), lumpy "blob" tree canopies, timber-framed buildings.
6. Controls: **on-screen D-pad by default** (8-way, camera-relative, wall-sliding
   diagonals), tap-to-move selectable in Settings. Tap entities to interact in both
   modes; drag orbits the camera, pinch zooms.
7. A **living world**: ~1,400 baked scenery pieces, wandering enemies, 11 named
   wandering NPCs with tap dialogue, butterflies/birds/chimney-smoke/campfire.

---

## 3. File-by-file inventory (~6,400 lines of game code + 1,100 SRS)

### Engine-side (`srs/`) — keep for Italian
- `srs-engine.js` (429) — storage-agnostic SRS core. Binary FSRS-lite curve
  (stability/retrievability, desired retention 0.85, learning steps, soft lapses,
  fuzz) + BKT over knowledge components ("weakest link" due dates, propagates to
  sibling cards) + adaptive new-card recommender (per-KC Beta posteriors, Thompson
  sampling). `effectiveDue = min(binary, bayesian)`. 61-assertion self-test suite
  (`selftest.html` runs it against real IndexedDB).
- `idb-storage.js` (60) — IndexedDB adapter.
- `build_srs_index.py` (213) — collapses raw `topic_tags` into ~54 canonical KCs via
  a keyword ruleset; emits `srs_cards.json` (id, area, type, kcs — 0.7 MB) and
  `srs_kcs.json` (labels). **The ruleset is the GIS-specific part.**

### Game data modules (`game/js/data/`) — the game's "database", all hand-authored
- `skills.js` — 12 skills: Attack, Strength, Defence, Ranged, Hitpoints, Mining,
  Woodcutting, **Farming**, Smithing, Fletching, Crafting, Construction.
- `items.js` (~250 entries, generated per-tier in code) — 6 metals (bronze→runite) ×
  10 smithables (dagger/sword/scimitar/kiteshield/helm/body/legs/axe/pickaxe/spade),
  7 woods (wood→yew) × logs/planks/staves/shortbows/longbows, arrows per metal,
  3 ranged armour sets, silver/gold jewellery (5 gem rings + 5 amulets with perks),
  gems to amethyst, 3 pack-expanding satchels (28→40 slots), 7 seeds + 7 crops +
  herbs + salves (heal 15–100%), keys, bonemeal, 4 GIS-flavoured trophy rares
  (surveyor's compass, ancient map, astrolabe, golden theodolite).
- `recipes.js` (~120 recipes) — smelting, forging, fletching (incl. longbows),
  crafting (leatherwork, bowstrings, gem cutting, jewellery, satchels, salves,
  bonemeal, pottery). One recipe = one question-driven action.
- `enemies.js` — 15 enemies lv 2–75 with weighted loot tables (resources, coins,
  seeds, chest keys, rares): slime, rat, lurker, wolf, cave crawler, 3 bandits,
  skeleton, ghoul, golem, wight, 2 wyrms, Wyrm Matriarch boss.
- `areas.js` — 7 regions with gather nodes (10 mining, 8 woodcutting, flax/clay),
  chest definitions (question gauntlets, cooldowns, key gating, perfect = double
  loot), combat-level gates (10/20/40).
- `farming.js` — 7 crops (real-time growth 30 m–6 h), plot unlocks by level.
- `construction.js` — 10 home rooms × 3 tiers with perks (+xp, refunds, healing,
  daily crate, accuracy, coins, combat xp, richer library crates, crop speed,
  daily contracts).
- `shop.js` — store stock, 60% sell rate, sawmill plank fees.
- `npcs.js` — 11 named NPCs with wander radii and rotating dialogue (flavour +
  gameplay tips + study encouragement).
- `achievements.js` (~60) — study milestones, streaks, per-skill levels, kills,
  chests, home, farming, contracts, collection rares.

### Game systems (`game/js/systems/`) — logic, no DOM
`inventory.js` (28-slot pack + satchel bonus, unlimited bank, collection log,
loot rolls) · `equipment.js` (8 slots: weapon/shield/head/body/legs/ammo/amulet/ring;
gear stat aggregation; best-tool lookup) · `activity.js` (gathering & production
actions; streak bonuses; nest seed drops) · `combat.js` (turn-based question combat,
accuracy/max-hit formulas, loot, generalized food/healing) · `chests.js` ·
`farming.js` (plots, plant/harvest actions, bonemeal, spade double-harvest) ·
`home.js` (build projects, garden crate) · `contracts.js` (daily kill/gather/review
tasks from the Map Room) · `perks.js` (aggregates room + jewellery bonuses) ·
`progress.js` (xp grants with level-ups, achievement sweep) — plus `xp.js`
(RuneScape 1–99 curve) and `state.js` (single-document IndexedDB save, debounced
persist, deep-merged migrations).

### World (`game/js/world/` + `game/js/world3d/`)
- `worldmap.js` (217) — the 72×96 tile grid authored in code: terrain types,
  collision, 7 regions, ~90 interactive entities (gather nodes placed
  deeper-is-higher-tier, enemies, chests, buildings, gates, NPCs), spatial index
  with `moveEntity()` for wanderers, placement validation.
- `decor.js` (131) — deterministic scatter of ~1,400 scenery pieces + hand-placed
  set dressing (town well/lamps/stall, bandit camp, graveyard); blocking-prop set;
  **flood-fill connectivity guarantee**.
- `path.js` (43) — A* (4-directional) with pluggable passability.
- `terrain.js` (156) — faceted heightmap mesh from the tile grid (mountains ~3.4
  high, sunken river + bridge, volcanic plateau), **corner-blended vertex colours**
  (RS2 ground feathering) + dither; bilinear `heightAt()`; translucent river plane.
- `models.js` (598) — ALL creature/prop models, procedural: shared gouraud humanoid
  (tapered torso/limbs, hair/hood, animated legs+arms with boots/hands as children),
  player with back-cape, 15 monsters (squashing slimes, capsule wolves, rocky golem,
  winged wyrms, hovering wight/ghost…), NPC/dog/ghost variants, 8 tree types with
  noisy-blob canopies, ore rocks with per-metal vein colours, timber-framed buildings
  (stone base, plaster, posts, windows, overhanging roof, ridge beam; per-type roofs
  and extras), chest with sparkle, gates, butterflies, birds, campfire flame, smoke,
  canvas-drawn nameplate sprites, `blobGeometry()` (seeded noisy icosahedra).
- `scenery.js` (185) — descriptor-based baker: merges all static decor into ONE
  vertex-coloured mesh (single draw call) with per-triangle dither. 20 prop types.

### UI (`game/js/ui/`)
- `worldScreen.js` (579) — the 3D world: renderer/scene lifecycle, orbit camera,
  D-pad + tap input, raycast picking (walk-adjacent-then-interact with chase
  rechecks), wander AI for enemies/NPCs, ambient animations, chest sparkles, gate
  labels, region banner, debug hooks.
- `questionModal.js` (229) — full-screen question UI for all six item formats
  (A scenario MC, B term recall, C select-all, D answer+reason, E error-correction,
  F categorize/sort), grading, SRS reporting, streaks, explanations, next-review
  display.
- Screens: skills (+ per-skill **unlock-ladder** view), pack & gear, bank, workshop
  (4 stations), shop + sawmill, library (due-review rewards), home (rooms, farm
  entry, contract card), farm (plots/timers/planting), combat, chest gauntlet,
  study dashboard (SRS mastery, weakest areas, achievements, collection log),
  settings (controls/D-pad side/rename/reset), plus router/HUD/toast/common.

### Shell & tools
`index.html` (PWA shell) · `sw.js` (precache + stale-while-revalidate; bump
`VERSION` to force updates) · `manifest.webmanifest` · `icons/` (compass-rose PNGs
from `tools/make_icons.py`, pure-Python) · `tools/shard_bank.py` (bank → per-area
shards, strips author-only fields) · `serve.py` (dev server; stock `http.server`
fails under some sandboxes) · `.claude/launch.json` (attaches preview to :8137).

---

## 4. What is actually GIS-specific (the porting seam)

Surprisingly little:

1. **`question_bank/question_bank.json`** — the content itself.
2. **`srs/build_srs_index.py`'s keyword→KC ruleset** — maps topic tags to ~54
   knowledge components (`geodesy-datums`, `map-projections`, …).
3. **Derived artifacts** of 1+2: `srs_cards.json`, `srs_kcs.json`,
   `game/data/bank/*` shards.
4. **Flavour strings**: game title "GIS Quest", intro text, some NPC lines
   ("cartographer", "datums"), trophy rare names (theodolite etc.), the enemy/area
   fantasy names are theme-neutral already.
5. `corpus_manifest.json`, `papers/` (source corpus), `gisp_question_bank_agent_prompt.md`
   — GIS-only; don't copy to the new repo.

Everything else — engine, schedulers, systems, world, art — is content-blind: the
game only ever sees `{id, content_area}` for sourcing and the six-format item schema
for rendering.

## 5. Porting checklist for Italian

1. **Author an Italian bank** in the SAME item schema (`id, content_area, scope,
   item_type A–F, difficulty, cognitive_level, stem, options, correct, reason_tier,
   sort_map, explanation, topic_tags, source`). The six formats map beautifully to
   language learning:
   - **A** scenario MC → situational usage ("Al ristorante, come chiedi il conto?")
   - **B** term recall → vocabulary (word ↔ translation)
   - **C** select-all → e.g. "which nouns are feminine?"
   - **D** answer+reason → pick the tense AND why it's required
   - **E** error-correction → spot the grammar mistake, pick the fix
   - **F** categorize/sort → sort words by gender, verbs by conjugation (-are/-ere/-ire), tense buckets
   Content areas could be CEFR-ish themes: `Vocabolario di base`, `Verbi e coniugazioni`,
   `Grammatica`, `Preposizioni`, `Ascolto/Lettura`, `Frasi utili`, `Cultura`, … and
   `difficulty` (intro/core/advanced) can encode A1/A2 → B1/B2 → C1.
2. **Rewrite the KC ruleset** in `build_srs_index.py` (Italian keyword → KC, e.g.
   `passato prossimo → verb-past`, `congiuntivo → subjunctive`, per-theme vocab KCs);
   run it → new `srs_cards.json` + `srs_kcs.json`. The BKT propagation then makes a
   miss on one subjunctive card resurface *all* subjunctive cards sooner — exactly
   what you want for grammar.
3. **Run `game/tools/shard_bank.py`** → new `game/data/bank/` shards + index.
4. **Reflavour** (optional but fun): title ("Quest d'Italia"?), intro copy, NPC
   dialogue in progressively harder Italian (great immersion — Pip speaks A1,
   the ghost speaks C1), trophy rares (espresso machine, Vespa, Divine Comedy…),
   region names to Italian countryside. All in `data/npcs.js`, `data/items.js`,
   `data/areas.js`, `main.js` onboarding, `index.html` title/manifest.
5. **Copy these directories** to the new repo: `game/` (minus `data/bank`, regenerate),
   `srs/` (minus `srs_cards.json`/`srs_kcs.json`, regenerate), `serve.py`. Skip
   `papers/`, `question_bank/raw|clean` unless you want the provenance pattern.
6. Keep the two-database IndexedDB naming or rename (`gis-game`/`gis-srs` in
   `state.js`, `questions.js`, `sw.js` VERSION, `settingsScreen.js` reset) — renaming
   gives Italian a clean save slate on the same device.

## 6. Dev & verification workflow (as practised this session)

- `python3 serve.py` from repo root → `http://localhost:8137/game/`.
- SRS regression: open `/srs/selftest.html` (61 assertions incl. real IndexedDB).
- In-browser smoke tests exercised every system via dynamic module imports
  (data-integrity sweep: every item id referenced by recipes/loot/chests/crops/shop
  must resolve — rerun this after any content edit).
- Debug hooks on the world screen (rAF suspends in hidden panes):
  `__worldP` (position/state), `__worldTick(dt)` (advance movement), `__worldHold(ux,uy)`
  (virtual D-pad), `__worldRender()` (force a frame), `__worldProject(x,y)` (tile→px
  for synthetic taps).
- Load-time validators console.error on: entity overlaps, entities on blocked tiles,
  decoration walling anything off (flood-fill).
- Service worker: bump `VERSION` in `sw.js` per deploy; during dev, unregister + clear
  caches (stale-while-revalidate serves old modules for one load).

## 7. Known tuning constants (feel adjustments)

Walk speed `SPEED=5.5` and camera in `worldScreen.js`; D-pad size/deadzone in
`game.css`/`worldScreen.js`; combat pacing in `systems/combat.js`; SRS retention and
all scheduler params in `srs/srs-engine.js` `DEFAULTS`; streak thresholds in
`systems/activity.js`; grow times in `data/farming.js`; chest cooldowns in
`data/areas.js`.
