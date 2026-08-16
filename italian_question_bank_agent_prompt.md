# Multiagent brief — Italian language question-bank builder

## 0. How to use this brief
This is the orchestration prompt for a multiagent system that turns a corpus of Italian learning materials (a frequency list, coursebooks, grammars, example-sentence sources, and media) into an auto-gradeable question bank for a mobile HTML5 study game. The game is static-hosted (GitHub Pages) with per-user progress in IndexedDB, so the bank ships as static JSON plus a media manifest — there is no backend. Fill the `<<PLACEHOLDER>>` fields before running. Every rule is binding on every agent unless a section says otherwise.

- `<<CORPUS_LOCATION>>` — where source materials live.
- `<<FREQUENCY_LIST>>` — the ranked Italian frequency list that acts as the vocabulary spine.
- `<<TARGET_ITEM_COUNT>>` — total items this run (e.g., 2,000).
- `<<CEFR_CEILING>>` — highest level to cover this run (e.g., B1).
- `<<SILENT_MIN_RATIO>>` — minimum share of each content bucket that must be silent-playable (e.g., 0.5), so the audio-off mode never collapses to vocabulary-only.

---

## 1. Mission
Build a question bank that develops **usable Italian** — comprehension and production — for an English-speaking learner, starting from a high-frequency core and expanding upward through CEFR levels toward general fluency. The method follows the Fluent Forever approach (pronunciation first, images instead of translation, personal connection, spaced retrieval, high-frequency words first) constrained by second-language-acquisition evidence.

Every item must be **grounded in the corpus**, **auto-gradeable**, **tap-friendly** (no typing, no free text, no spoken-answer grading), and shippable as **static data with relative media paths**.

## 2. Learner profile
- English L1, learning Italian; capable of undergraduate-level study.
- Uses a mobile game with the eleven formats in Section 6. Items must fit those formats exactly.
- Wants the full stack: the vocabulary core, the ear (sound perception), the grammar reflexes, and a path into reading real Italian.
- Studies in two modes: **full** (audio on) and **silent** (audio off, e.g., while listening to something else). The bank must serve both — see the audio-dependency rules in Section 6 and 7.

## 3. Source corpus and grounding rules
Materials live at `<<CORPUS_LOCATION>>`; the vocabulary spine is `<<FREQUENCY_LIST>>`.

- **Grounding is mandatory.** Every item traces to a specific source (a frequency-list entry, a grammar rule with a cited section, an example sentence, a dictionary entry). No invented words, genders, conjugations, or translations.
- **Italian accuracy is non-negotiable.** Gender, article, plural, conjugation, agreement, and spelling must be verified against an authoritative source. A wrong item keyed as correct teaches an error — worse than no item.
- **Provenance on every item** (source title, locator, the fact the key rests on). Internal only; not shown to the learner.
- **Original expression (IP rule).** Words, genders, and grammatical facts are not copyrightable; coursebook *wording* and *example sentences* are. Write original stems, sentences, and explanations. Do not reproduce source passages or example sentences verbatim; adapt or generate fresh ones.
- **Every vocabulary item needs media.** A concept image (for image-based cards) and native-speaker audio. Store these as **relative asset paths** and register them in the media manifest (Section 10) — never embed blobs in the JSON.

## 4. Coverage plan
Organize coverage along four domains, sequenced by frequency and CEFR level up to `<<CEFR_CEILING>>`.

- **Vocabulary** — driven by `<<FREQUENCY_LIST>>`, **high-frequency first**. The most frequent few thousand words carry the bulk of everyday text, so the early tiers are the priority. Tag each word with a frequency tier (e.g., 1–1000, 1001–2000, 2001–5000).
- **Phonology** — Italian sound contrasts for ear training: geminate vs. single consonants (*pala/palla*, *nono/nonno*), open vs. closed *e* and *o*, /ʎ/ (*gli*) vs. /l/, /ɲ/ (*gn*), *s/z* voicing, and stress contrasts (*pero/però*). Sourced with IPA.
- **Grammar** — CEFR-ordered: gender and articles (il/lo/la/l', gli/le), noun–adjective agreement, plurals, articulated prepositions (*di+il→del*), present tense and core conjugations, then upward. Each topic yields cloze, sort, error-correction, and transformation items.
- **Reading** — short comprehension passages that scale with level; the bridge from isolated items to connected input.

Rules:
- **High-frequency first, always.** Do not spend early-tier budget on rare words.
- **Thematic, not semantic, grouping (critical).** When batching new vocabulary, group words by *scene or scenario* (kitchen: *tavolo, piatto, forchetta, cucinare*), NOT by *semantic category* (all colors, all animals, all clothes together). Presenting tight semantic sets of new words causes interference and slows learning; thematic sets help. This rule governs vocabulary batching, matching-set composition, and any grouped display.
- **Silent-mode floor.** In every content bucket (domain × tier/level), at least `<<SILENT_MIN_RATIO>>` of items must be silent-playable (audio `silent` or `enhanced`), so audio-off study covers the whole curriculum, not just review.

## 5. Fluent Forever alignment (apply throughout)
- **Images over translation.** Prefer image-prompted cards to L1-translation cards. Use an English/translation prompt only when a word is too abstract to picture.
- **Pronunciation first.** Seed phonology (ear-training) items early and keep them present across tiers.
- **Recall over recognition** for durable learning: image/flashcard cards are recall-first (retrieve, then reveal), not multiple-choice recognition, wherever the format allows.
- **Personal, concrete imagery.** Choose vivid, concrete image concepts; avoid abstract or ambiguous ones.

## 6. The question formats
Every item is exactly one of these eleven. Each carries an **audio dependency**: `required` (needs sound), `enhanced` (works silent, richer with sound), or `silent` (no sound needed). Silent mode hides `required` items and renders `enhanced` items in their text-prompted variant.

1. **Image → Italian word, self-graded recall** (flashcard). Show image (+ audio when on); learner retrieves the word, flips, self-rates for spacing. Recall-first. *audio: enhanced.*
2. **Minimal-pair discrimination** (2-alternative forced choice). Play a word; learner taps which of a true minimal pair they heard; reveal + feedback. The core ear-training format. *audio: required.*
3. **Audio/word → picture multiple choice.** Hear or read the word; tap the matching image from 3–4. Receptive; good for introducing new words and training listening. *audio: enhanced.*
4. **Cloze / gap-fill.** Sentence with a blank; tap the correct form from a small word bank. Grammar-in-context (articulated prepositions, agreement, conjugation). *audio: silent (enhanced if the sentence is voiced).*
5. **Article / gender & agreement sort.** Tap nouns into article bins (il/lo/la) or sort by agreement. Only for genuinely confusable *grammatical* categories — never semantic ones. *audio: silent.*
6. **Error correction.** Show a sentence with one gender/agreement/preposition error; pick the corrected version. Always reveal the fix and why. *audio: silent.*
7. **Letter-tile spelling.** Show the image/meaning; learner spells the word by tapping letter tiles (no keyboard). Recovers productive orthographic knowledge; drills geminates and *gli/gn*. **Always pair with the image/meaning** — never spelling in isolation. *audio: silent (enhanced if word is voiced first).*
8. **Sentence building from word tiles.** Tap scrambled Italian tiles into correct order. Controlled production of word order, agreement, placement. *audio: silent.*
9. **Reading mini-passage + tap comprehension.** 2–4 Italian sentences, then a tap-answer question or in-passage cloze. Brings connected input into the game; scales with level. *audio: silent.*
10. **Transformation drill.** Given a form, tap the requested transformation (singular→plural, masc→fem, infinitive→conjugated). Automates Italian morphology. *audio: silent.*
11. **Matching pairs** (warm-up). Tap-to-pair words with images (or, sparingly, English). Recognition-level; use as warm-up/association, not core learning. Keep the option pool larger than the pairs; compose sets thematically, not as semantic categories. *audio: silent.*

Do **not** generate "odd-one-out" or "sort-by-meaning-category" items for new vocabulary — grouping semantically related new words interferes with learning. (Odd-one-out may be used only to review already-mastered words; default off.)

## 7. Item-quality standards (every item)
- **One defensible key** for single-answer types; verified Italian throughout.
- **Distractors map to real learner errors** — L1 (English) interference, wrong gender/article, agreement slips, false friends. Record what each distractor targets. No giveaways (odd grammar, always-longest key, etc.).
- **Feedback required.** Every item carries a concise, original-wording explanation; error-correction and minimal-pair items must reveal the correct answer and the reason.
- **Controlled production + feedback** for formats 7, 8, 10 (this is what makes production practice effective).
- **Recall-first** for format 1.
- **Media present and valid** for formats needing it: image concept defined, native audio path assigned, IPA recorded for phonology items.
- **Tagged**: domain, CEFR level, frequency tier, thematic group, format, audio dependency, difficulty (intro/core/advanced), and for phonology the `target_sound`.
- **Self-contained and level-appropriate**: answerable without the source; assumes only vocabulary/grammar already introduced at or below its level.

## 8. Agent roles and pipeline
Run as a pipeline over a shared coverage ledger. Nothing reaches output without passing the verifier, the media-manifest agent, and the editor.

1. **Planner / Orchestrator** — Computes targets across domain × tier/level × format, enforces high-frequency-first sequencing, the thematic-grouping rule, and the `<<SILENT_MIN_RATIO>>` floor. Owns the ledger; reallocates as buckets fill.
2. **Lexicon / Corpus Curator** — Walks `<<FREQUENCY_LIST>>` in order; for each word attaches gender, article, plural, IPA, a concrete image concept, native-audio requirement, and thematic group (scene-based). Extracts grammar rules and common-error patterns from the corpus with provenance.
3. **Item Writers** (parallel, specialized per format) — Turn curated entries into items per Sections 6–7. One entry may spawn several formats (a word → flashcard, spelling, picture-MC; a grammar point → cloze, sort, error-correction, transformation).
4. **Distractor Critic** — Audits options: plausible, error-mapped distractors; true minimal pairs for format 2; thematic (not semantic) composition for matching sets; no giveaways. Rewrites or bounces.
5. **Verifier / Fact-checker** — Confirms every keyed answer against an authoritative source: word, gender, article, plural, conjugation, agreement, spelling, IPA. Bounces or flags anything unconfirmed. This is the accuracy gate — be strict.
6. **Media Manifest agent** — Assigns **relative asset paths** (e.g., `media/audio/animali/il-gatto.opus`, `media/img/animali/gatto.webp`) and registers every required asset in the manifest (Section 10) with its recording text / image concept and spec. Flags items whose media doesn't yet exist so it can be produced and committed.
7. **Tagger** — Applies all tags in Section 7, including audio dependency and thematic group.
8. **Deduplicator** — Removes near-duplicate stems; ensures variety of scenario and tested sub-skill within each bucket; enforces the thematic-grouping and semantic-interference rules across a batch.
9. **Editor / Schema validator** — Enforces the schema (Section 9), mobile constraints (option counts, no free text), relative-path-only media, and stable IDs. Final gate.

Escalate to a human review queue (don't auto-resolve) when sources conflict on a gender/spelling/rule, when a word's image concept is genuinely ambiguous, or when the verifier can't confirm a key.

## 9. Output schema (one JSON object per item)
```json
{
  "id": "VOC-01-A-00042",          // stable across bank updates (IndexedDB progress keys on this)
  "domain": "vocabulary",          // vocabulary | phonology | grammar | reading
  "cefr_level": "A1",
  "frequency_tier": "1-1000",      // null for non-vocab
  "thematic_group": "cucina",      // scene-based, never a raw semantic category
  "format": 1,                     // 1–11 per Section 6
  "audio": "enhanced",             // required | enhanced | silent
  "difficulty": "core",            // intro | core | advanced
  "prompt": {
    "text": null,                  // stem / clue / sentence, as the format needs
    "image_ref": "media/img/cucina/gatto.webp",
    "audio_ref": "media/audio/cucina/il-gatto.opus",
    "sentence": null               // for cloze / sentence-building / reading
  },
  "options": ["…"],                // MC / cloze / picture-MC / error-correction
  "tiles": ["g","a","t","t","o"],  // letter-tile or sentence-building tiles; else null
  "correct": [0],                  // index/indices, or ordered tile sequence
  "sort_map": null,                // format 5: {noun: bin}
  "reason_tier": null,             // reserved (two-tier not used for language)
  "explanation": "…",              // learner-facing feedback, original wording
  "distractor_rationales": ["error each distractor targets"],
  "italian": {
    "lemma": "gatto",
    "gender": "m",
    "article": "il",
    "plural": "gatti",
    "ipa": "ˈɡat.to",
    "target_sound": null           // phonology items: the contrast being trained
  },
  "source": { "title": "…", "locator": "…", "support": "…" },
  "review_flag": null              // null | "source_conflict" | "ambiguous_image" | "thin_support"
}
```
Emit the bank as **static JSON chunked by CEFR level (or frequency tier)** so the game can lazy-load, not download everything at once.

## 10. Media manifest (second required deliverable)
A single manifest listing every asset the bank references, so the assets can be produced and committed to the repo. Per asset:
```json
{
  "path": "media/audio/cucina/il-gatto.opus",
  "type": "audio",                 // audio | image
  "for_item_ids": ["VOC-01-A-00042"],
  "record_text": "il gatto",       // audio: exact text to voice
  "voice_note": "native speaker; multiple speakers required for phonology/minimal-pair sounds",
  "image_concept": null,           // image: concrete depiction to source/generate
  "spec": "Opus ~48 kbps mono"     // audio spec, or WebP + max dimension for images
}
```
Minimal-pair and phonology audio should specify **multiple speakers** for the same target — varied voices are what make perception training transfer. Keep assets light (compressed audio, WebP images) for the static-hosting bandwidth budget.

## 11. Guardrails (non-negotiable)
- **Accuracy over volume.** Bounce anything the verifier can't confirm; wrong Italian keyed correct is the worst output.
- **No hallucinated words, genders, plurals, conjugations, or translations.** If it isn't sourced, it isn't in the bank.
- **Thematic, not semantic, grouping** for all new-vocabulary batches and matching sets. No odd-one-out for new words.
- **Original expression;** no verbatim coursebook text or example sentences.
- **Media as relative paths + manifest only;** no embedded blobs; stable item IDs so IndexedDB progress survives bank updates.
- **Every item audio-tagged;** honor the `<<SILENT_MIN_RATIO>>` floor per bucket so silent mode covers the curriculum.
- **High-frequency first;** report, don't pad, when a bucket can't be filled from the corpus.

## 12. What to hand back
1. The validated question bank as **chunked static JSON** (Section 9 schema).
2. The **media manifest** (Section 10) — every audio/image asset to produce, with record text / image concept and spec.
3. The **coverage ledger**: counts vs. targets by domain × tier/level × format, plus the audio-dependency distribution and per-bucket silent-playable ratio (to confirm the floor is met).
4. A **human-review queue** of flagged items (conflicts, ambiguous images, unconfirmable keys).
5. A **gap report**: frequency tiers, grammar topics, or sounds the corpus under-serves, with the source types needed to fill them.
