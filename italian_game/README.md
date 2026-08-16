# 🐭⚔️ Le Cronache di Muraverde

A 2D dungeon-crawler RPG (Zelda/Pokémon style) that teaches **Italian from A1 to B1** — an original homage to woodland-abbey adventure tales. Pure HTML5/CSS/JS: no build step, no dependencies, no backend. Play it in any browser, on desktop or phone.

## 🎮 How it works

- **Explore** 7 zones alive with danger: visible enemies roam every wild map and chase you on sight (❗), chests and coin sparkles spawn in random spots on every visit, and a boss guards the exit of every zone — from Yellowtooth the Brute in the Woods to King Greyfang on his bone throne.
- **Progress** — from the safe Abbey of Muraverde through woods, meadow, river, hills, and mine to the rat king's fortress. Each zone maps to a CEFR band (A1 → A2 → B1) and to specific grammar topics from a CILS/CELI/PLIDA-aligned syllabus.
- **Fight** in turn-based battles where your attacks only land if you answer Italian questions: multiple choice, cloze fill-in-the-blank, emoji picture vocabulary, and error correction. Answer streaks boost damage.
- **Level up** your hero — 5 species (mouse, hedgehog, hare, otter, badger) × 3 classes (warrior, scholar, scout) with distinct stats and growth.
- **Gather** wood, stone, and grain (each harvest is a vocabulary quiz) and **rebuild the Abbey**: belltower (+XP), library (question hints), forge (better gear + special strike), infirmary, mill, garden.
- **Review**: every question you miss goes into a spaced-repetition *Ripasso* pool that resurfaces in play and can be drilled at the library.
- **Language toggle**: the game runs in simple Italian; tap 🇬🇧 anytime for English, and every question has an English *Aiuto* explainer of the grammar rule.
- **Study settings** (⚙️ button): by default questions follow each zone's curriculum, but you can pin CEFR levels (A1/A2/B1) and/or specific concepts (possessives, passato vs imperfetto, congiuntivo…) — the filter applies to battles, gates, and chests, and is saved with your game.

**Art & style**: every character, enemy, tile, and the title page are hand-built inline SVG in an illuminated-manuscript style — parchment panels, uncial lettering, gold-leaf drop caps, and a medieval woodcut palette. No image files, no fonts to download: the entire look ships inside `js/assets.js`.

**Controls**: arrow keys / WASD to move, walk into people to talk, walk onto objects to use them. `M`/`Esc` or 🎒 for the menu. On touch devices an on-screen d-pad appears; the 🕹️/👆 button switches to tap-to-move (tap or hold anywhere on the map to walk there, tap your hero for the menu) — handy on iPad.

**Content**: 2,223 hand-written exam-style questions (A1: 705, A2: 767, B1: 751), including a 1,000-word frequency vocabulary course (top 500 verbs + top 500 nouns) + a full conjugation engine (11 tenses/moods, ~35 irregular verbs) and generators that produce unlimited drills, + 160 emoji-vocabulary words.

## 🚀 Host it free on GitHub Pages

1. Create a new GitHub repository and push this folder to it.
2. On GitHub: **Settings → Pages → Source: Deploy from a branch → Branch: `main` / root → Save**.
3. Your game is live at `https://<username>.github.io/<repo>/` — open it on any device.

Progress saves automatically in the browser (localStorage). To move progress between devices: **Menu → 💾 → Esporta codice**, then **Importa codice** on the other device.

## 🧑‍💻 Run locally

```bash
python3 -m http.server 8321
```

Then open http://localhost:8321.

## 📁 Structure

```
index.html            app shell
css/style.css         all styling
js/data/strings.js    UI translations (it/en)
js/data/verbs.js      conjugation engine + irregular verb tables
js/data/bank_a1.js    hand-authored A1 question bank
js/data/bank_a2.js    hand-authored A2 question bank
js/data/bank_b1.js    hand-authored B1 question bank
js/data/vocab.js      emoji vocabulary (160 words)
js/data/generators.js procedural question generators
js/data/gamedata.js   races, classes, enemies, items, buildings, zones
js/data/maps.js       tile maps, portals, NPCs, bosses
js/assets.js          SVG sprite system + illuminated title art
js/engine.js          game state, save/load, XP
js/quiz.js            quiz modal (help, hints, review pool)
js/battle.js          turn-based combat
js/abbey.js           city-building + forge shop
js/world.js           canvas overworld, movement, encounters
js/main.js            boot, title, character creation, menus
```

Adding content is data-only: append questions to a bank file (same JSON shape), words to `vocab.js`, or verbs to `verbs.js` — no engine changes needed.
