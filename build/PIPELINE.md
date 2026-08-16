# Question-bank build pipeline

How the `app/data/` Italian question bank (~5,000 items, A1–B2) was generated from the resource corpus, per `italian_question_bank_agent_prompt.md`. Multi-agent (Sonnet fan-out) + deterministic build.

## Adaptations to the brief
- **Images → emoji.** Concrete words carry an `emoji`; abstract words fall back to an English text prompt. No image assets to produce.
- **Audio → silent-first.** No per-word native audio exists in the corpus, so the bank ships `audio: "silent"` throughout and **omits format 2** (audio minimal-pair discrimination). The desired audio is catalogued in `deliverables/media_manifest.json` for later production. Silent-ratio floor (≥0.5) is met by construction (1.0).
- **Correctness = hybrid.** Vocabulary is *derived* from a human-verified lexicon (morphology copied verbatim, not re-generated); grammar/reading/phonology are generated then **verified** by an adversarial audit pass.

## Stages
1. **Contract** — `SCHEMA.md` freezes the item / lexicon / manifest schemas. Everything conforms to it.
2. **Wave 1 — curation (6 agents)** → `build/lex/`
   - 4 vocabulary scene-curators (home/kitchen, people/body, world/time, verbs/abstract) → ~974 enriched words with gender/article/plural/IPA/emoji/CEFR/tier/thematic-group, grounded in the 625-list + frequency data + dictionaries.
   - 1 grammar-syllabus curator → 55 CEFR-ordered grammar points (rule, pattern, L1-error, suggested formats).
   - 1 phonology curator → 45 minimal-pair / gemination / gli / gn / stress contrast sets.
3. **Wave 2 — item writers (12 agents)** → `build/items/`
   - 4 vocab writers (formats 1/3/7/11), morphology copied verbatim from the lexicon.
   - 4 grammar writers by level (formats 4/5/6/8/10) from the syllabus.
   - 3 reading writers by level (format 9), original passages.
   - 1 phonology writer (silent formats 7/6) from the contrast sets.
   Some writers self-delegated into nested batch-agents that staged output in the scratchpad; those batches were swept into `build/items/`.
4. **Build** — `build_bank.py`: structural validation against the contract → dedupe → deterministic stable ids (`<DOMAIN>-<LEVEL>-<6digits>`) → chunk by CEFR level into `app/data/bank_<L>.json` → emit `index.json`, coverage ledger, media manifest, review queue.
5. **Wave 3 — verification (3 agents)** → `deliverables/verify_*.json`
   - Adversarial audit of the free-generated grammar + reading Italian: keyed-answer correctness, distractor validity, agreement/tense accuracy, CEFR level control. B1/B2 grammar+phonology audited 100% (0 findings); A1/A2 grammar 100%; reading full automated + ~42% manual.
6. **Fix + finalize** — a fixer agent applies the verifiers' corrections to the shipped chunks by id; `finalize.py` re-validates, re-scans for the duplicate-option bug, and regenerates the ledger + review queue from `app/data/`.

## Regenerating / extending
- Add or edit items in `build/items/*.json` (conform to `SCHEMA.md`), then `python3 build/build_bank.py`.
- **Note:** the Wave-3/fix corrections were applied to the shipped `app/data/` chunks. A raw rebuild from `build/items/` reintroduces the pre-fix issues, so re-run the verify+fix pass (or back-port fixes to source) after a full rebuild. For incremental additions, append new item files and merge.

## Deliverables (`build/deliverables/`)
- `coverage_ledger.json` — counts by level × domain × format, audio distribution, per-level silent ratio, QA summary.
- `media_manifest.json` — every desired audio asset (record text + relative path + spec), all `status: to_produce`.
- `review_queue.json` — items flagged for human review.
- `verify_*.json` — raw audit findings.
