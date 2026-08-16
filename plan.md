# GIS Quest — Build Plan

A RuneScape-inspired study RPG for personal use, played on iPhone/iPad, hosted on GitHub
Pages. **Every game action is a study question**: swinging a pickaxe, firing an arrow, or
picking a chest lock presents a question chosen by the existing SRS engine (due cards
first, then adaptive new cards). Correct answers advance the game; wrong answers cost you
the action and show the explanation. The game is the study session.

## Decisions (confirmed with user)
- **Core loop:** questions ARE the actions (max study density).
- **Visuals (REVISED):** a **tile-based world with a movable character**. One continuous
  scrolling map rendered on canvas; the player taps to walk (A* pathfinding) and taps
  world elements — trees, ore veins, flax, enemies, chests, buildings — to interact.
  Interactions open the existing question modal / screens on top of the world. The
  original SVG-map-plus-panels style was built first and rejected as not the right feel.
- **Combat stats:** Attack, Strength, Defense, Hitpoints, **Ranged** (5th stat).
- **Packaging:** PWA (manifest + service worker, offline after first load) living in
  `game/`, with the whole `gis_game/` folder as the eventual GitHub Pages repo root.
- **Reuse, don't rewrite:** `srs/srs-engine.js` + `srs/idb-storage.js` are imported as-is
  (single source of truth). Question rendering/grading for the six item types (A–F) is
  adapted from `srs/app.js` into a mobile question modal.
- **Later additions:** expanded skill trees (7 woods, 9 smithing pieces/metal, rings/
  shields/satchels, 15 enemies, 10 rooms, daily contracts) and a 12th skill, **Farming**,
  fed by all other skills.

## World engine (tile world revision)

```
game/js/world/
├── worldmap.js   ← authored-in-code tile grid (~72×96): terrain, collision, regions,
│                   and every placed entity (trees, veins, buildings, enemies, chests,
│                   combat-level gates). Deterministic — no external assets.
└── path.js       ← A* pathfinding over the walkable grid (4-directional)
game/js/ui/worldScreen.js ← canvas renderer + input: camera follows the character,
                            tap-to-walk, tap-entity → path adjacent → trigger interaction
```

- **Terrain:** flat-color tiles with per-region palettes (town, meadow, mine, forest,
  ridge, keep, peak) + paths, water, mountain walls. Entities render as emoji sprites.
  Character is an emoji surveyor with a tween between tiles; camera clamps to the map.
- **Interactions** dispatch to the systems that already exist:
  tree/vein/flax/clay/nests → `doGather` question; enemy sprite → combat screen;
  chest → chest gauntlet; bank/workshop/store/sawmill/library/home → their screens;
  farm plot cluster by the home → farm screen. Back buttons return to the world.
- **Gating:** ridge/keep/peak entrances are gate tiles that refuse passage (with a
  toast) until the required combat level; mountain walls prevent going around.
- **Navigation:** the "Map" tab becomes the "World" tab (the tile world). The old
  map/area/town screens are retired; all other screens are unchanged.
- **Save:** player tile position persists in the game save.

### Phase 10 — OSRS/RS2-style 3D engine (current revision)
Replace the 2D canvas presentation with a **low-poly 3D WebGL world** in the spirit of
the RS2/OSRS engine. Single-player scale; all models, textures and animations are
**original, built procedurally in code** (no game-cache assets). Three.js is vendored
locally (`game/vendor/three.module.js`) so the PWA stays self-contained and offline.

```
game/vendor/three.module.js   ← vendored renderer library
game/js/world3d/terrain.js    ← heightmap from the SAME 72×96 tile grid: rolling
                                ground, raised mountain walls, sunken river, flat-
                                shaded per-face colours (the faceted RS2 ground look)
game/js/world3d/models.js     ← procedural low-poly models: trees per wood tier, ore
                                rocks with metal-coloured veins, buildings with roofs
                                and nameplates, chests, gates, and every monster
                                (slime, rat, wolf, bandits, skeleton, golem, wyrms…),
                                plus the animated player character
game/js/ui/worldScreen.js     ← rewritten: Three.js scene, OSRS-style orbit camera
                                (drag to rotate, pinch to zoom), tap = raycast pick →
                                walk (same A*) → interact (same systems)
```

- Terrain heights derive from tile types (mountains high, river sunken, peak plateau),
  smoothed for rolling hills; movement/collision stays pure grid logic.
- The character walks tile-to-tile with a procedural limb-swing animation and turns
  to face its heading; enemies idle (slimes squash, wyrms flap).
- Same interaction contract as before: gather questions, combat/chest/building
  screens open over the 3D view; position persists.

### Phase 9 (2D tile world — superseded by Phase 10)
1. `worldmap.js` — regions, terrain painter, collision, entity placement, gates.
2. `path.js` — A*.
3. `worldScreen.js` — canvas draw loop, camera, tap handling, walk tweening,
   interaction dispatch, region banner.
4. Rewire navigation + back targets; retire map/area/town screens.
5. Verify on mobile viewport: walk, gather, fight, chest, buildings, farm, reload
   persistence of position.

## Architecture

```
gis_game/                    ← repo root on GitHub Pages
├── srs/                     ← existing engine (unchanged)
├── question_bank/           ← existing bank (question_bank.json stays for the demo)
└── game/
    ├── index.html           ← single-page app shell
    ├── manifest.webmanifest
    ├── sw.js                ← cache-first service worker
    ├── css/game.css
    ├── icons/               ← app icons (generated SVG→PNG)
    ├── data/bank/*.json     ← question bank sharded by content area (~20 files)
    ├── tools/shard_bank.py  ← generates the shards + shard index
    └── js/
        ├── main.js          ← boot, router, screen switching
        ├── state.js         ← game save (IndexedDB, separate DB from SRS)
        ├── xp.js            ← RS-style xp curve, levels 1–99
        ├── questions.js     ← SRS bridge: shard loader, question modal, grading
        ├── data/            ← pure data modules
        │   ├── skills.js  items.js  recipes.js  areas.js  enemies.js
        │   └── construction.js  shop.js  achievements.js
        ├── systems/         ← game logic (no DOM)
        │   ├── inventory.js  bankvault.js  activity.js  combat.js
        │   ├── chests.js  equipment.js  home.js
        └── ui/              ← screens & components (DOM)
            ├── map.js  area.js  skillsScreen.js  invScreen.js  bankScreen.js
            ├── homeScreen.js  combatScreen.js  chestScreen.js  shopScreen.js
            ├── questionModal.js  hud.js  toast.js  charSheet.js
```

- **Two IndexedDB databases:** the SRS keeps `gis-srs` (existing engine, untouched);
  the game saves to `gis-game` (inventory, bank, xp, equipment, home, chest cooldowns,
  achievements, settings). Autosave after every mutation.
- **Question flow:** activity requests a question → `questions.js` asks SRS
  (`getDueQueue` first, else `getNewCards({mode:'adaptive'})`) → looks up the card's
  content area in `srs_cards.json` → lazy-fetches that area's shard (cached by SW) →
  renders the modal → grades → `srs.review(id, correct)` → returns `{correct}` to the
  activity. One global pipeline; every skill trains the same SRS.
- **No build step:** plain ES modules, GitHub Pages friendly.

## Game design

### Skills (11)
| Skill | Trains by | Feeds |
|---|---|---|
| Mining | mining ore/stone/gems (Q per swing) | Smithing, Construction |
| Woodcutting | chopping trees (Q per chop) | Fletching, Construction |
| Smithing | smelting bars, forging melee gear/tools/arrowheads/nails | Combat, all tool tiers |
| Fletching | staves→bows, shafts+heads+feathers→arrows | Ranged combat |
| Crafting | leather/hide armor, bowstrings, bandages, gem cutting, jewelry | Ranged armor, healing, perk amulets |
| Construction | building home rooms & furniture | Passive perks |
| Attack / Strength / Defense / Ranged | combat (Q per round; style selects xp) | — |
| Hitpoints | trickle xp from all combat | survivability |

XP curve: RuneScape formula (`Σ floor(l + 300·2^(l/7))/4`), levels 1–99. Higher-tier
nodes/trees/enemies/recipes gate on level. Tools (pickaxe/axe/knife tiers you smith)
add double-yield chance, giving Smithing value beyond combat.

Correct-answer streaks (3/5/10) grant escalating bonus yield/xp — rewards sustained
focus. Wrong answer = missed action + inline explanation (the study moment).

### Material tiers
Bronze (copper+tin) → Iron → Steel (iron+coal) → Mithril → Adamant → Runite.
Trees: Wood → Oak → Willow → Maple → Yew. Hides: rat fur → leather; wyrm hide → best
ranged armor. Gems (sapphire→emerald→ruby→diamond) from mining/golems → amulets with
perks (+xp%, +loot%, +accuracy).

### World map (7 areas)
1. **Hearthollow (town):** Bank, General Store (coins sink: feathers, nails, plank
   sawmill), Library (pure SRS review sessions — clearing due cards pays small loot),
   your **Home plot** (Construction).
2. **Copperfell Mine:** copper/tin/iron + stone; deeper veins (coal, mithril…) unlock
   by Mining level. Chest: *Miner's Cache*.
3. **Thornwood Forest:** trees by Woodcutting level; feathers from nests. Chest:
   *Hollow Stump*.
4. **Meadowbrook Fields:** flax (→bowstring/bandages), clay. Low-level combat: Marsh
   Slime, Giant Rat (furs, bones). Chest: *Scarecrow's Stash*.
5. **Bandit Ridge:** mid combat — Bandit, Bandit Archer (coins, feathers, arrowheads,
   keys). Chest: *Stolen Strongbox* (needs Bandit Key).
6. **Ruined Keep:** Skeleton, Ghoul, Stone Golem (bars, ores, gems). Chest: *Keep
   Vault* (needs Keep Key).
7. **Wyrm Peak** (endgame): Young/Elder Wyrm (wyrm hide, runite, diamonds). Chest:
   *Wyrm Hoard*. Gated by combat level.

### Combat
Turn-based, question-driven. Pick a style (melee: attack/strength/defense xp choice;
ranged: consumes arrows). Each round = one question:
- **Correct** → you attack: accuracy roll (Attack/Ranged + weapon vs enemy defense),
  damage roll (Strength/bow tier). Streaks boost max hit.
- **Wrong** → enemy attacks: damage mitigated by Defense + armor.
Enemy dies → loot table roll (resources, coins, keys, rare uniques) + slayer-style
bonus xp. Player at 0 HP → safe retreat to town (no item loss), HP restored by
bandages (Crafting) or resting at Home hearth.

### Chests
Question gauntlets (3–5 questions, some requiring dropped keys). Perfect run = bonus
roll. Real-time cooldown per chest (~4h). Loot: coins, resources, gems, rare cosmetics.

### Construction (Home)
Rooms built from planks + nails + stone + clay: **Study** (+xp% globally), **Workshop**
(crafting/fletching bonus), **Hearth** (heal between fights), **Garden** (daily
resource crate), **Armory** (equipment set perks), **Trophy Hall** (achievements
display). Each room has 3 upgrade tiers.

### Depth/retention systems
Achievements + collection log (uniques seen), per-skill stats, area-mastery meters
(driven by `srs.areaNeeds()` — the game shows which *study* areas are weakest),
equipment with real stat effects, streak records.

## Build phases
1. **Scaffold + data plumbing:** shard script, index.html/PWA shell, state.js, xp.js,
   questions.js bridge with the six-format modal (adapted from app.js). ✅ testable
   in browser early.
2. **Core systems:** inventory, bank, items/recipes data, activity engine (mining +
   woodcutting first, end-to-end with questions).
3. **Production skills:** smithing, fletching, crafting + equipment system.
4. **Combat:** enemies, loot tables, combat screen, all 5 combat stats, bandages/heal.
5. **World:** map screen, all 7 areas, chests, shop, library.
6. **Construction & perks:** home screen, rooms, perk hooks into all systems.
7. **Polish:** achievements, collection log, onboarding, HUD, dark-mode-friendly
   mobile CSS, icons, service worker, offline test, iPhone viewport test.
8. **Verify:** run via local server in the browser pane at mobile viewport; test the
   full loop (mine → smelt → smith → fight → chest → construct) and reload
   persistence; run existing SRS selftest to confirm no regression.

## Out of scope (for now)
Magic/prayer, trading/GE economy, multiplayer, sound, quest storylines (chests +
achievements carry progression), cooking/farming skills.
