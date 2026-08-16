# FROZEN CONTRACT — Italian Question Bank v1

Every agent MUST emit data conforming exactly to these schemas. The game engine and validator depend on them. This adapts the brief's §9/§10 for our constraints: **emoji instead of image files; audio silent-first (skip audio-required items we can't voice)**.

## Levels & tiers
- `cefr_level`: one of `A1`, `A2`, `B1`, `B2` (B2 is the ceiling).
- `frequency_tier`: `1-1000`, `1001-2000`, `2001-5000`, or `null` (non-vocab).
- High-frequency-first: spend early-level budget on frequent words.

## A) Enriched lexicon entry (Wave 1 curators emit arrays of these → build/lex/*.json)
```json
{
  "lemma": "gatto",
  "pos": "noun",                 // noun | verb | adj | adv | pron | prep | conj | num | phrase
  "gender": "m",                 // m | f | null (non-noun)
  "article": "il",               // il|lo|la|l'|i|gli|le | null
  "plural": "gatti",             // or null
  "ipa": "ˈɡat.to",
  "en_gloss": "cat",
  "emoji": "🐱",                 // single emoji (or short sequence) for concrete words; null if abstract → item uses English text prompt
  "thematic_group": "natura_animali",  // SCENE-based, never a raw semantic category
  "cefr_level": "A1",
  "frequency_tier": "1-1000",
  "common_error": "English speakers may forget gender; 'il gatto' not 'la gatto'",  // L1-interference note, or null
  "source_support": "625-list Animal; freq rank ~###"   // provenance
}
```
Accuracy is non-negotiable: gender/article/plural/IPA must be correct. Prefer the 625 CSV (already verified) as the backbone; verify extensions against dictionaries (03_) and Wiktionary/Kaikki.

## B) Item object (Wave 2 writers emit arrays of these → build/items/*.json)
```json
{
  "id": "VOC-A1-000042",         // <DOMAINPREFIX>-<LEVEL>-<6digits>; STABLE (IndexedDB keys on it). Prefixes: VOC, GRA, PHO, REA
  "domain": "vocabulary",        // vocabulary | phonology | grammar | reading
  "cefr_level": "A1",
  "frequency_tier": "1-1000",    // null for non-vocab
  "thematic_group": "natura_animali",
  "format": 1,                   // integer 1..11 (we DO NOT emit format 2 — no audio)
  "audio": "silent",             // required | enhanced | silent   (we emit silent or enhanced only)
  "difficulty": "core",          // intro | core | advanced
  "prompt": {
    "text": null,                // stem/clue/instruction shown to learner
    "emoji": "🐱",               // emoji cue, or null
    "audio_ref": null,           // relative path ONLY if the asset exists in repo; else null
    "sentence": null             // cloze/sentence-building/reading text
  },
  "options": ["il gatto","la gatto","il gatta","le gatto"],  // strings; may be emojis for picture-MC/matching; [] if none
  "tiles": null,                 // array for letter-tile(7)/sentence-building(8); else null
  "correct": [0],                // index/indices into options, OR ordered tile sequence (array of tile indices), OR []
  "sort_map": null,              // format 5 only: {"gatto":"il","casa":"la",...}
  "explanation": "Gatto is masculine: il gatto. Distractors use wrong gender/agreement.",  // ORIGINAL wording, learner-facing
  "distractor_rationales": ["wrong article la","fem noun form","wrong plural article"],  // one per distractor
  "italian": {
    "lemma": "gatto", "gender": "m", "article": "il", "plural": "gatti",
    "ipa": "ˈɡat.to", "target_sound": null       // phonology: the contrast, e.g. "geminate /tt/ vs /t/"
  },
  "source": { "title": "FF 625 list", "locator": "Animal", "support": "gatto = cat, m." },
  "review_flag": null            // null | "source_conflict" | "ambiguous_image" | "thin_support"
}
```

### Per-format field rules (which fields are required)
1. **Flashcard (emoji→word, self-graded recall)** — `prompt.emoji` set (or `prompt.text` = English if abstract); `italian.lemma` is the answer; `options`/`correct` empty (self-graded). audio: `enhanced` if audio_ref exists else `silent`.
3. **Word→picture MC** — `prompt.text` = Italian word (or `prompt.emoji` null); `options` = 3–4 **emoji** strings; `correct` = [index]. Distractor emojis are plausible confusions.
4. **Cloze/gap-fill** — `prompt.sentence` with `___`; `options` = small word bank (3–4); `correct`=[index]. audio silent (enhanced if voiced).
5. **Gender/agreement sort** — `prompt.text` instruction; `sort_map` = {noun:bin}; `options` = the bins (e.g. ["il","lo","la"]); `tiles`=null. Only grammatical categories, never semantic.
6. **Error correction** — `prompt.sentence` = wrong sentence; `options` = 2–4 candidate corrections; `correct`=[index]; explanation states the fix + why.
7. **Letter-tile spelling** — MUST pair with meaning: `prompt.emoji` or `prompt.text` set; `tiles` = shuffled letters (array of single chars, include needed doubles); `correct` = ordered array of tile indices spelling the lemma. Drills geminates/gli/gn.
8. **Sentence building** — `prompt.text` = English meaning or instruction; `tiles` = shuffled Italian word tiles; `correct` = ordered indices for a correct order. Keep sentences short & unambiguous (one correct order).
9. **Reading mini-passage** — `prompt.sentence` = 2–4 original Italian sentences (level-appropriate, ONLY vocab/grammar at/below level); then `prompt.text` = the question; `options` 3–4; `correct`=[index]. Original text — never copy source passages.
10. **Transformation drill** — `prompt.text` = instruction + given form (e.g. "plurale di: il libro"); `options` 3–4 OR `tiles` for spelling the transform; `correct` accordingly.
11. **Matching pairs (warm-up)** — `prompt.text` = instruction; `options` = interleaved pairs encoded as `["gatto","🐱","cane","🐶",...]` with `correct` = array of [wordIndex, emojiIndex] pairs; compose sets THEMATICALLY (same scene), pool ≥ pairs.

### Hard rules (all items)
- One defensible key. Verified Italian. No hallucinated words/genders/plurals/conjugations.
- Distractors map to real L1/gender/agreement errors; no giveaways; record `distractor_rationales`.
- `explanation` required, original wording.
- Thematic (scene) grouping for any grouped/matching/batch display; NO semantic-category sets of new words; NO odd-one-out.
- Original expression: do NOT reproduce coursebook/Tatoeba sentences verbatim — write fresh.
- Self-contained & level-appropriate.
- Emit only `audio`: `silent` or `enhanced`. Never `required` (we skip audio-only items).

## C) Media manifest entry (build/deliverables/media_manifest.json)
```json
{ "path":"media/audio/natura_animali/il-gatto.opus", "type":"audio",
  "for_item_ids":["VOC-A1-000042"], "record_text":"il gatto",
  "voice_note":"native speaker; multiple speakers for phonology", "image_concept":null,
  "spec":"Opus ~48kbps mono", "status":"to_produce" }
```
Emoji "images" need no asset (rendered as text glyphs) — do NOT put emojis in the manifest. Only real audio assets go in the manifest, all `status:"to_produce"` unless the file exists in-repo.
