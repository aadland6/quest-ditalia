# GIS Study Game — SRS Engine

A dependency-free, IndexedDB-backed spaced-repetition engine for the GIS study game.
Runs entirely client-side (GitHub Pages friendly). Every card is scheduled by **two
independent learning curves at once**, and the review queue takes whichever says "sooner."

## The two schedulers

### 1. Binary curve (per card) — drives the main learning curve
Still **entirely wrong/correct**, no difficulty grading (no Again/Hard/Good/Easy) — but the
curve itself follows current spaced-repetition research (an **FSRS-style stability model run
in binary pass/fail mode**) rather than a hand-tuned fixed multiplier. See
[Best-practice design](#best-practice-design-what-drives-the-curve) for the evidence and
citations. In short:
- Each card has a **stability** `S` (days) — the time for recall probability to fall to the
  target retention. Reviews are scheduled to hit a **desired retention** (default **0.85**,
  the research-backed efficiency point within the ~85–90% "desirable difficulty" band) via the
  forgetting curve `R(t,S) = (1 + FACTOR·t/S)^DECAY`.
- **correct** → stability grows (`×successFactor` at the target R), with a **bigger boost when
  you recalled it at lower retrievability** (the spacing effect).
- **wrong (lapse)** → a short **relearning step** and stability drops to `×lapseMult` (~0.5) —
  it **keeps partial memory** instead of resetting to zero.
- New cards pass short **learning steps** before graduating; review intervals get a little
  **fuzz** so cards introduced together don't clump onto the same day.

### 2. Bayesian curve (per topic) — reschedules *similar* questions
Bayesian Knowledge Tracing (BKT) over **shared knowledge components (KCs)**. Each card
references one or more KCs (normalized topics). Answering a card updates the mastery
posterior `P(known)` of each of its KCs, and that mastery is **shared by every sibling
card on the same KC**. So:
- a correct **NAD27** answer raises the `geodesy-datums` mastery → pushes *all* datum
  cards' Bayesian review **later**;
- a wrong answer on **any** datum card lowers it → pulls *all* datum cards **sooner**,
  even ones you personally got right.

A card's Bayesian due time is driven by its **weakest KC** ("weakest link"), so a card is
resurfaced if *any* of its concepts is shaky.

### How they combine
`effectiveDue = min(binaryDue, bayesianDue)` (default `policy:'min'`). The Bayesian layer
can therefore surface a card **sooner** than its binary schedule — exactly the requested
behavior — but never later. Policy is configurable: `'min' | 'binary' | 'bayesian' | 'max'`.

The two schedulers above decide *when to re-show cards you've already seen*. A third,
separate layer decides *which unseen card to introduce next*:

## Adaptive new-card recommender
`getNewCards({ mode, area, limit })` chooses which **new** cards to introduce. Three modes:

- **`random`** — a random assortment of unseen cards (shuffled via the injectable rng).
- **`topic`** — restrict to one content `area` (neediest-first within it).
- **`adaptive`** (default) — **Thompson sampling over per-area Beta posteriors**. Each KC's
  answer accuracy is a Beta(α,β) built from its running `correct`/`seen` counts plus a weak
  uniform prior `Beta(1,1)`. For each candidate card we draw a fresh accuracy sample from each
  of its KCs and score the card by its **neediest** KC (`1 − sampled accuracy`); the neediest
  cards win. Because the prior is weak, early samples are high-variance — so at **cold start
  the recommendations are a random assortment** — and as missed/correct answers accumulate the
  posteriors concentrate, automatically shifting from **exploration to exploitation** and
  targeting the areas you're actually weak in. This is a principled explore/exploit bandit, not
  a hand-tuned rule.

`areaNeeds()` exposes the same signal for the UI: per content-area posterior accuracy, answer
counts, and a `need = 1 − accuracy` score, weakest-first — "the areas that need the most
study." The recommender reuses the KC counts already tracked for scheduling, so there's no
extra state. Set the session default with `newCardMode`.

## Files
| File | Role |
|---|---|
| `srs-engine.js` | Storage-agnostic core: binary FSRS-lite curve, BKT scheduler, adaptive new-card recommender, queue. Exports `SRS`, `MemoryStorage`, `DEFAULTS`. |
| `idb-storage.js` | `IdbStorage` — IndexedDB adapter (browser). Drop-in for `MemoryStorage`. |
| `build_srs_index.py` | Collapses the bank's 4,700+ raw `topic_tags` into ~54 canonical KCs. Produces `srs_cards.json` + `srs_kcs.json`. |
| `srs_cards.json` | Scheduling metadata only: `[{id, area, scope, type, kcs[]}]` (0.7 MB). The engine needs only this, not the 9.8 MB content file. |
| `srs_kcs.json` | KC catalog `{kc: {label, count, kind}}`. |
| `srs-tests.js` / `test-srs.mjs` / `selftest.html` | Shared assertions; Node runner; in-browser runner (also tests real IndexedDB + reload persistence). |
| `index.html` / `app.js` | Interactive demo against the real question bank. |

## Knowledge components
Raw tags are far too fragmented for propagation (4,748 distinct, ~2,900 singletons; "datum"
alone spread across ~40 strings). `build_srs_index.py` maps them through a keyword→KC ruleset
into **54 concept KCs** (e.g. `geodesy-datums`, `map-projections`, `topology`, `sar-radar`)
plus **20 coarse `area:*` KCs** (one per content area, half-weighted, as a fallback). 80% of
cards get ≥1 concept KC; the rest still propagate through their area KC. Item-format tags
(`two-tier`, `select-all`, `sort`, …) are excluded. Re-run after editing the ruleset:
```bash
python3 build_srs_index.py
```

## Integration API
```js
import { SRS } from './srs-engine.js';
import { IdbStorage } from './idb-storage.js';

const srs = new SRS(new IdbStorage('gis-srs'), { /* optional param overrides */ });
await srs.init();

// One-time (idempotent): enroll scheduling defs from srs_cards.json
await srs.enroll(await fetch('./srs_cards.json').then(r => r.json()));

// Study loop
const due = await srs.getDueQueue({ now: Date.now(), limit: 20 }); // seen cards that are due
// which NEW card to introduce next — mode: 'adaptive' (default) | 'random' | 'topic'
const fresh = await srs.getNewCards({ mode: 'adaptive', limit: 10 });
//   -> [{ id, area, type, mode, need, reasonKc, mastery }]  (need/reasonKc for adaptive/topic)
const byTopic = await srs.getNewCards({ mode: 'topic', area: 'Cartography and Visualization' });
// ...render the question (join by id to question_bank.json), collect the answer...
await srs.review(cardId, isCorrect);   // updates binary curve + all shared KC masteries

// Inspection
await srs.areaNeeds();     // [{ kc, answers, correct, accuracy, need }] weakest-first (targeting signal)
await srs.cardState(id);   // masteries, binDueAt, bayesDueAt, effective {at, by}
await srs.kcState(kc);     // { kc, pL, seen, correct }
await srs.stats();         // { totalCards, new, seen, dueNow, kcCount, avgMastery }
```
`review()` is the only call that mutates state; it takes an optional `now` (for testing /
time-travel). Everything is async and storage-backed, so it survives reloads.

## Best-practice design (what drives the curve)
The binary curve was updated from a hand-tuned Leitner multiplier to match current
spaced-repetition research. Each change and its source:

- **Schedule to a target retention with an explicit forgetting curve.** Modern schedulers
  (FSRS) model per-item **stability / retrievability** and schedule each review to a desired
  retention, beating SM-2's fixed ease by ~20–30% fewer reviews for the same retention. We use
  the FSRS forgetting curve `R(t,S) = (1 + FACTOR·t/S)^DECAY` (`DECAY=-0.5`,
  `FACTOR=0.9⁻²−1`, so `S` = interval to 90% recall) and `interval = (S/FACTOR)(r⁻²−1)`.
- **Desired retention ≈ 0.85 (within the 85–90% "desirable difficulty" band).** Reviewing where
  recall is effortful but usually successful maximises long-term retention; 0.85 is the
  efficiency point (fewer reviews / more material covered), which suits a broad exam-prep bank.
- **Soft lapse handling.** A lapsed card isn't a new card — best practice is a short relearning
  step plus a new interval ≈ 40–70% of the prior (we use `lapseMult 0.5`), keeping partial
  memory, rather than resetting to a tiny interval. (This was the biggest departure from the
  old `reset-to-6h` default.)
- **Learning steps** before a new card graduates, and **interval fuzz** (±, min ±1 day) so
  cards introduced together don't all fall due on the same day — both standard Anki practice.
- **Spacing effect / desirable difficulty.** A correct review earns a larger stability gain
  when recalled at lower retrievability (you waited longer), so honest spacing is rewarded.

Sources: [Anki FAQ — algorithm/FSRS](https://faqs.ankiweb.net/what-spaced-repetition-algorithm) ·
[The Algorithm (open-spaced-repetition wiki)](https://github.com/open-spaced-repetition/awesome-fsrs/wiki/The-Algorithm) ·
[A technical explanation of FSRS](https://expertium.github.io/Algorithm.html) ·
[FSRS vs SM-2](https://www.antiagent.io/blog/fsrs-vs-sm-2) ·
[Anki lapse settings](https://eshapard.github.io/anki/anki-new-interval-after-a-lapse.html) ·
[Target an 80–90% success rate](https://eshapard.github.io/anki/target-an-80-90-percent-success-rate-in-anki.html) ·
[Optimal scheduling for spaced repetition (arXiv:1602.07032)](https://arxiv.org/pdf/1602.07032).

The Bayesian (BKT-over-KCs) layer is the "reschedule similar questions" mechanism and is
unchanged; it complements the per-card curve above.

## Tunable parameters (see `DEFAULTS` in `srs-engine.js`)
- **binary** (FSRS-lite): `desiredRetention` (0.85), `graduatingStabilityDays` (1.0),
  `successFactor` (2.5), `minBoost`/`maxBoost` (1.1/6.0), `learningStepsMs` ([10m]),
  `relearnStepsMs` ([10m]), `lapseMult` (0.5), `minStabilityDays` (0.5),
  `minReviewIntervalMs` (30m), `maxIntervalMs` (365d), `fuzz` (0.05)
- **bkt**: `pInit` (.25), `pLearn` (.15), `pSlip` (.10), `pGuessByType` (A/B .25, C .12, D .30, E .28, F .10)
- **bayes**: `floorMs` (1h), `maxMs` (60d), `curve` (2.5) — maps KC mastery→interval
- **newCardMode** (`'adaptive'`), **adaptive**: `priorAlpha`/`priorBeta` (1/1 — weak uniform prior; raise to make targeting more conservative / stay random longer)
- **policy** (`'min'`), **areaKcWeight** (0.5), **rng** (injectable for deterministic tests / seeded Thompson sampling)

To trade efficiency vs. safety, adjust `desiredRetention`: the default 0.85 favours coverage
(longer intervals, fewer reviews, slightly more forgetting); raise toward 0.90–0.92 for more
reviews and less forgetting.

## Run locally
```bash
python3 -m http.server 8137     # from the gis_game/ root
# open http://localhost:8137/srs/selftest.html   (61 assertions, incl. IndexedDB)
# open http://localhost:8137/srs/index.html       (interactive demo)
```
(A module server is required — `file://` blocks ES-module imports and `fetch`.)

## Deploying on GitHub Pages
Static hosting is all that's needed. The engine ships as three small ES modules; the only
required data file is `srs_cards.json` (0.7 MB). The 9.8 MB `question_bank.json` is content,
not scheduling — for production consider sharding it by content area or loading questions
lazily so first paint stays light. IndexedDB persistence is per-origin, so each player's
progress lives in their own browser with no backend.
```
