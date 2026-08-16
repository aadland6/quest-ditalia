# Italian Learning Resources 🇮🇹

## 🗡️ Quest d'Italia — the 3D study-RPG (play it!)

**[`game/`](game/) is the main event**: a RuneScape-inspired 3D study RPG where every
game action — mining, combat, crafting, farming — asks one Italian question chosen by a
dual spaced-repetition scheduler (FSRS-lite per card + Bayesian Knowledge Tracing across
67 shared concepts). It merges the 7,234-item bank (this corpus + the Muraverde bank),
882 native audio clips, and a procedural conjugation engine (62 verbs × 12 tenses) that
drills whichever tense concept the scheduler sees weakening. Installable PWA, offline
after first load. See [`game/README.md`](game/README.md).

- **Play on GitHub Pages:** open `/game/` on this repo's Pages site.
- **Locally:** `python3 serve.py` → `http://localhost:8137/game/`.

> The `01_…`–`10_…` resource folders described below are kept **local only**
> (licensed third-party materials, ~400 MB) and are not part of this repository.

A curated collection of **free, open-source, public-domain, and Creative Commons** resources for learning Italian, organized around the [Fluent Forever](https://fluentforever.com) method (Gabriel Wyner). Assembled by a 10-agent parallel sweep on 2026-08-15.

Everything here is either **downloaded locally** or **linked with a note** in each folder's `SOURCES.md`. Nothing copyrighted/commercial was pirated — paid resources (Assimil, Routledge frequency dictionaries, the Fluent Forever book/app) are only referenced.

**Total: ~406 MB across 69 files.** Every download was verified as a genuine file (correct type + real content), not an HTML error page.

---

## 🎮 Impara — the study game (built from this corpus)

The [`app/`](app/) folder is a complete, tap-only **Italian study game** — static, deployable to **GitHub Pages**, with all progress stored in the browser's **IndexedDB** (no backend). Its **5,011-item question bank** (CEFR **A1–B2**) was generated from the resources above via a multi-agent Sonnet pipeline, following the brief in `italian_question_bank_agent_prompt.md` and the Fluent Forever method.

- **Play/deploy:** see [`app/README.md`](app/README.md). Locally: `cd app && python3 -m http.server 8791` → open `http://localhost:8791`.
- **10 question formats:** flashcard, picture-MC (emoji), cloze, gender/article sort, error-correction, letter-tile spelling, sentence-building, reading comprehension, transformation, matching. Recall-first, high-frequency-first, spaced repetition (Leitner).
- **Study modes:** per-level (A1/A2/B1/B2) or **Mixed review** — spaced-repetition across all levels, prioritizing due items then new high-frequency-first.
- **Bank composition:** vocabulary 2,800 · grammar 1,241 · reading 802 · phonology 168 · silent-playable 100%.
- **How it was built + how to extend:** [`build/PIPELINE.md`](build/PIPELINE.md). Frozen schema: [`build/SCHEMA.md`](build/SCHEMA.md). Deliverables (coverage ledger, media manifest, review queue, audit findings): [`build/deliverables/`](build/deliverables/).
- **Images = emoji; audio = native + TTS.** No image assets needed. **882 native-speaker word clips** (of 1,048 catalogued) were fetched from **Wikimedia Commons** (Lingua Libre + Wiktionary, all free licenses), transcoded to AAC/Ogg, and wired onto the bank items (`audio:"enhanced"`); the remaining 166 words fall back to the browser's built-in `it-IT` speech synthesis at play time — so **every item is audible**. See [`05_audio_native/FETCH_PLAN.md`](05_audio_native/FETCH_PLAN.md) for how, and [`app/media/audio/ATTRIBUTIONS.md`](app/media/audio/ATTRIBUTIONS.md) for credits. Every generated grammar/reading item passed an adversarial verification + fix pass.

---

## How this maps to the Fluent Forever method

Fluent Forever runs in two phases. Here's where each resource fits:

### Phase 1 — Train your ears (pronunciation first)
1. **Learn the sounds & IPA** → [`04_pronunciation_ipa/`](04_pronunciation_ipa/) — IPA chart, spelling-to-sound rules, minimal pairs, FSI course.
2. **Hear native speakers** → [`05_audio_native/`](05_audio_native/) — Forvo, RhinoSpike, Youglish, LibriVox guide + sample.

### Phase 2 — Words, grammar, conversation
3. **Learn the first ~625 base words** → [`07_core_vocab_625/`](07_core_vocab_625/) — the official FF list, fully translated to Italian.
4. **Expand via frequency** → [`02_frequency_lists/`](02_frequency_lists/) — most-common-word lists to prioritize learning.
5. **Look up words & definitions** → [`03_dictionaries/`](03_dictionaries/) — bilingual, monolingual, IPA.
6. **Mine example sentences** → [`06_example_sentences/`](06_example_sentences/) — ~982K Italian + ~403K aligned IT-EN pairs.
7. **Study grammar as needed** → [`08_grammar/`](08_grammar/) — reference grammars + conjugation tables.
8. **Build spaced-repetition cards** → [`10_anki_srs/`](10_anki_srs/) — Anki guide + starter decks.
9. **Read & listen extensively** → [`01_textbooks/`](01_textbooks/) + [`09_readers_audiobooks/`](09_readers_audiobooks/) — coursebooks, graded/parallel texts, public-domain literature paired with LibriVox audio.

The core FF loop: pick a word (from the 625 list or a frequency list) → find an image (Google Images) → get native audio (Forvo/RhinoSpike) → add IPA → make an Anki card. Everything you need to feed that loop is in this folder.

---

## Folder index

| Folder | Contents | Highlights |
|--------|----------|-----------|
| [`01_textbooks/`](01_textbooks/) | 14 free/open coursebooks | FSI Programmed Course, ERIC gov course, 10 CC-licensed LibreTexts OER books (SPUNTI, Voci, D'accordo!, etc.) |
| [`02_frequency_lists/`](02_frequency_lists/) | 8 frequency datasets | OpenSubtitles 50k + full (798k), itWaC lemmas by POS, SUBTLEX-IT norms, Wiktionary top-1000 |
| [`03_dictionaries/`](03_dictionaries/) | Bilingual + monolingual + IPA | FreeDict ita-eng/eng-ita, Apertium lexicons; Kaikki/Wiktionary extracts linked (w/ IPA) |
| [`04_pronunciation_ipa/`](04_pronunciation_ipa/) | IPA & phonetics | Authored IPA chart, spelling→sound rules, minimal pairs; FSI course PDFs |
| [`05_audio_native/`](05_audio_native/) | Native-audio guide | Forvo/RhinoSpike/Youglish/LibriVox workflow + Pinocchio Ch.1 sample MP3 |
| [`06_example_sentences/`](06_example_sentences/) | Tatoeba | 981,944 Italian sentences + 403,478 IT-EN aligned pairs (CC-BY) |
| [`07_core_vocab_625/`](07_core_vocab_625/) | FF base vocab | Official 625 list (English) + **full Italian translation CSV** w/ gender + top-100 quick-start |
| [`08_grammar/`](08_grammar/) | Grammar references | 3 public-domain grammar PDFs + authored grammar overview & full conjugation tables |
| [`09_readers_audiobooks/`](09_readers_audiobooks/) | Reading + audio | Pinocchio (text+LibriVox pair), Dante, Deledda, Manzoni, Verga; parallel-text sites linked |
| [`10_anki_srs/`](10_anki_srs/) | Anki / SRS | Setup + FF-card guide, ~20 linked decks, 3 starter `.apkg` decks, FF 625 demo PDF |

**Each folder has a `SOURCES.md`** with full provenance: title, URL, license, and downloaded-vs-linked status for every item.

---

## Licenses & attribution — read before redistributing

This is a mixed-license collection gathered for **personal learning use**. If you share or reuse any of it, honor each item's terms:

- **Tatoeba sentences** (`06_`) — CC-BY 2.0 FR. Must credit tatoeba.org and contributors.
- **OpenSubtitles frequency** (`02_`) — CC BY-SA 4.0. SUBTLEX-IT is CC BY-NC-SA (non-commercial).
- **LibreTexts textbooks** (`01_`) — CC BY-NC / CC BY-NC-SA (non-commercial).
- **FreeDict** (`03_`) — GPL-2+. **Apertium** (`03_`) — GPL-2/GPL-3.
- **Kaikki/Wiktionary** data — CC BY-SA / GFDL.
- **FSI / ERIC / Project Gutenberg / Wikisource** texts (`01_`, `04_`, `08_`, `09_`) — U.S. government public domain or otherwise public domain.
- **Italian 625 translations** (`07_`) — original work assembled here, **not** copied from Fluent Forever's paid translation product.

Non-commercial (`-NC`) items must not be used commercially; ShareAlike (`-SA`) and GPL items must keep their license if redistributed.

---

## Notes

- The **FSI Italian Programmed Course** PDFs appear in both `01_textbooks/` and `04_pronunciation_ipa/` (grabbed independently by two agents) — kept in both since it serves as both a coursebook and a pronunciation resource.
- A few resources are **link-only** because they can't be cleanly downloaded: Forvo (streaming/paid API), RhinoSpike (submit-and-wait), Youglish (YouTube stream), the large Kaikki dictionary extracts (>150 MB), and corpora behind bot-detection (PAISÀ). See the relevant `SOURCES.md`.
- Best starting point for a beginner: `04_pronunciation_ipa/` → `07_core_vocab_625/` → `10_anki_srs/`.
