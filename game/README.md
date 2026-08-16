# Quest d'Italia 🇮🇹

A RuneScape-inspired study RPG where **every game action is an Italian question**.
Swinging a pickaxe, loosing an arrow, picking a chest lock, planting a crop — each
one asks a question chosen by a spaced-repetition scheduler. Correct answers land
the blow; wrong answers miss and show the explanation. Playing *is* studying.

Installable PWA (offline after first load), low-poly 3D world in the RS2/OSRS
spirit, per-device IndexedDB saves.

## Content

- **7,234 authored items** (A1–B2) merged from two banks: the Impara trainer bank
  (5,011 items, 10 formats: flashcards, emoji MC, cloze, gender sort, error
  correction, letter-tile spelling, sentence building, reading, transformation,
  matching pairs) and the Muraverde bank (2,223 exam-style items).
- **Native audio** for hundreds of vocabulary items (LinguaLibre/Wikimedia CC0,
  see `media/audio/ATTRIBUTIONS.md`), with it-IT speech-synthesis fallback.
- **Conjugation drills**: a procedural engine (62 verbs × 12 tenses) generates
  unlimited cloze drills. Drills are *cardless* — they are served when the
  Bayesian layer sees a weak tense concept and they update that concept's
  mastery, rescheduling every authored card that shares it. Free drilling per
  tense in the Study screen's **Palestra dei verbi**.

## How questions are sourced

1. **Due reviews first** (dual scheduler: per-card FSRS-lite binary curve +
   Bayesian Knowledge Tracing over ~67 shared knowledge components).
2. Else, if a **conjugation concept is weak** (Thompson-sampled accuracy < 0.6),
   a generated verb drill (~1 action in 4 at most).
3. Else an **adaptive new card** (Thompson sampling toward weakest topics).

Every answer updates both schedulers; a missed congiuntivo card resurfaces *all*
congiuntivo cards sooner — and summons the drill engine.

## Storage

Two IndexedDB databases: `italia-game` (save file) and `italia-srs` (scheduler
state). Reset from Settings.

## Dev

```
python3 ../serve.py          # from the repo root → http://localhost:8137/game/
```

- SRS regression tests: open `/srs/selftest.html` (77 assertions incl. IndexedDB).
- Content pipeline (rerun after editing banks):
  1. `python3 ../build/wire_audio.py` — wire native clips into the app bank
  2. `python3 tools/build_bank.py` — merge banks → `question_bank/italian_bank.json`, copy audio
  3. `python3 ../srs/build_italian_index.py` — Italian keyword→KC ruleset → `data/srs_cards.json` + `data/srs_kcs.json`
  4. `python3 tools/shard_bank.py` — per-area learner shards → `data/bank/`
- Service worker: bump `VERSION` in `sw.js` per deploy; during dev, unregister +
  clear caches (stale-while-revalidate serves old modules for one load).
- Debug hooks on the world screen: `__worldP`, `__worldTick(dt)`, `__worldHold(ux,uy)`,
  `__worldRender()`, `__worldProject(x,y)`.
