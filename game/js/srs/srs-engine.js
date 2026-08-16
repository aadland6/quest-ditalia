// srs-engine.js — dual-scheduler spaced-repetition engine for the GIS study game.
//
// Two independent learning curves per card, combined into one review queue:
//
//  1) BINARY (per-card memory model). Updates ENTIRELY on wrong/correct for THIS card
//     — no difficulty grading (no Again/Hard/Good/Easy). This is the card's own curve.
//     It follows evidence-based spaced-repetition practice (FSRS-style, run in binary
//     pass/fail mode):
//       - Each card has a STABILITY S (days): the time for recall probability to fall
//         to the target retention. Reviews are scheduled to hit a DESIRED RETENTION
//         (default 0.90 — the ~85-90% "desirable difficulty" sweet spot) using the
//         forgetting curve R(t,S) = (1 + FACTOR*t/S)^DECAY.
//       - New cards pass short LEARNING STEPS before graduating; lapses go through
//         RELEARNING STEPS and keep partial memory (stability *= lapseMult, ~0.5)
//         rather than resetting to zero.
//       - A correct review earns a BIGGER stability boost when recalled at lower
//         retrievability (the spacing effect / desirable difficulty).
//       - Review intervals get a little FUZZ so cards introduced together don't clump
//         onto the same day.
//     Sources behind these choices are cited in README.md.
//
//  2) BAYESIAN (Bayesian Knowledge Tracing over shared knowledge components).
//     Every card references one or more KCs (normalized topics, e.g. "geodesy-datums").
//     Answering a card updates the mastery posterior of each of its KCs, which is
//     SHARED by every sibling card on that KC. So a correct NAD27 answer raises the
//     datum mastery for all datum cards (pushing their review later), and a wrong
//     answer on any datum card lowers it (pulling every datum card's review sooner).
//     A card's Bayesian due time is driven by its weakest KC ("weakest link").
//
//  The queue orders by effectiveDue = min(binaryDue, bayesianDue) by default, so the
//  Bayesian layer can surface a card SOONER than the binary layer alone — but never
//  later. Policy is configurable ('min' | 'binary' | 'bayesian' | 'max').
//
// Storage-agnostic: pass any adapter implementing the Storage interface below.
// MemoryStorage (in this file) is used for Node tests; IdbStorage (idb-storage.js)
// backs the browser / GitHub Pages build. No external dependencies.

export const MIN = 60e3, HOUR = 3600e3, DAY = 24 * HOUR;

// FSRS forgetting curve constants. Stability S is defined as the interval at which
// retrievability reaches 0.90, which fixes FACTOR given DECAY.
export const DECAY = -0.5;
export const FACTOR = Math.pow(0.9, 1 / DECAY) - 1; // = 0.9^-2 - 1 ≈ 0.234568

// R(t,S): probability of recall t days after last review, given stability S (days).
export const retrievability = (tDays, S) => (S <= 0 ? 0 : Math.pow(1 + FACTOR * tDays / S, DECAY));
// Interval (days) after which retrievability falls to r, given stability S. r=0.9 -> S.
export const intervalForRetention = (S, r) => (S / FACTOR) * (Math.pow(r, 1 / DECAY) - 1);

export const DEFAULTS = {
  binary: {
    desiredRetention: 0.85,        // target recall prob at review time (~85-90% sweet spot; 0.85 = efficiency point)
    graduatingStabilityDays: 1.0,  // stability a card gets when it graduates learning (~1d first review at r=0.9)
    successFactor: 2.5,            // stability multiplier on a correct review AT the target retention
    minBoost: 1.1, maxBoost: 6.0,  // clamp the per-review stability multiplier
    learningStepsMs: [10 * MIN],   // short steps a NEW card passes before graduating
    relearnStepsMs: [10 * MIN],    // short steps a LAPSED card passes before graduating again
    lapseMult: 0.5,                // on a lapse, stability *= this (keep partial memory, ~40-70% is best practice)
    minStabilityDays: 0.5,         // floor for post-lapse stability
    maxStabilityDays: 365,         // cap
    minReviewIntervalMs: 30 * MIN, // floor for a scheduled review interval
    maxIntervalMs: 365 * DAY,      // cap
    fuzz: 0.05,                    // ± jitter on review intervals to avoid same-day clumping (min ±1 day)
  },
  bkt: {
    pInit: 0.25,   // prior mastery of a fresh KC, P(known)
    pLearn: 0.15,  // P(transition unknown->known) per answered opportunity
    pSlip: 0.10,   // P(answer wrong | known)
    // guess = P(answer correct | not known), by item type (≈ 1/optionCount, lower for hard formats)
    // Italian bank formats: '1' flashcard (self-graded, no guessing), '3'/'4'/'6'/'9'/'10'/'12'
    // 4-option MC, '5' sort (all-or-nothing), '7' letter tiles, '8' sentence building,
    // '11' matching pairs (zero-mistake), 'drill' generated conjugation cloze.
    pGuessByType: {
      A: 0.25, B: 0.25, C: 0.12, D: 0.30, E: 0.28, F: 0.10,
      1: 0.02, 3: 0.25, 4: 0.25, 5: 0.10, 6: 0.25, 7: 0.05,
      8: 0.08, 9: 0.25, 10: 0.25, 11: 0.15, 12: 0.25, drill: 0.25,
      default: 0.22,
    },
    clampLo: 0.01, clampHi: 0.999,
  },
  bayes: {
    floorMs: 1 * HOUR,   // shortest Bayesian interval (mastery ~0)
    maxMs: 60 * DAY,     // longest Bayesian interval (mastery ~1)
    curve: 2.5,          // interval = floor + (max-floor) * mastery^curve
  },
  policy: 'min',         // how binary & bayesian due times combine
  areaKcWeight: 0.5,     // coarse "area:" KCs count at half weight in the weakest-link calc

  // Adaptive NEW-card recommender: which unseen card to introduce next.
  newCardMode: 'adaptive', // 'adaptive' | 'random' | 'topic'
  adaptive: {
    // Beta-Bernoulli prior on "probability of answering an area correctly". A weak
    // uniform prior (1,1) means early recommendations are effectively random (a random
    // assortment) and only become targeted as missed/correct answers accumulate.
    priorAlpha: 1, priorBeta: 1,
    // Thompson sampling draws an accuracy sample per KC; the neediest (lowest sampled
    // accuracy) areas win. Sampling is what turns cold-start exploration into targeted
    // exploitation automatically. Uses the injectable rng, so it's deterministic in tests.
  },
};

// ----------------------------- storage interface -----------------------------
// An adapter must implement (all async):
//   init()
//   getCard(id) / putCard(card) / bulkPutCards(cards) / getAllCards()
//   getKc(id)   / putKc(kc)     / bulkPutKcs(kcs)     / getAllKcs()
//   getMeta(k)  / setMeta(k,v)
//   logReview(entry)               (may be a no-op)

export class MemoryStorage {
  constructor() { this.cards = new Map(); this.kcs = new Map(); this.meta = new Map(); this.log = []; }
  async init() {}
  async getCard(id) { return this.cards.get(id) || null; }
  async putCard(c) { this.cards.set(c.id, c); }
  async deleteCards(ids) { for (const id of ids) this.cards.delete(id); }
  async bulkPutCards(cs) { for (const c of cs) this.cards.set(c.id, c); }
  async getAllCards() { return [...this.cards.values()]; }
  async getKc(id) { return this.kcs.get(id) || null; }
  async putKc(k) { this.kcs.set(k.kc, k); }
  async bulkPutKcs(ks) { for (const k of ks) this.kcs.set(k.kc, k); }
  async getAllKcs() { return [...this.kcs.values()]; }
  async getMeta(k) { return this.meta.has(k) ? this.meta.get(k) : null; }
  async setMeta(k, v) { this.meta.set(k, v); }
  async logReview(e) { this.log.push(e); }
}

// --------------------------------- engine ------------------------------------
export class SRS {
  constructor(storage, params = {}) {
    this.s = storage;
    this.rng = params.rng || Math.random; // injectable for deterministic tests
    this.p = {
      binary: { ...DEFAULTS.binary, ...(params.binary || {}) },
      bkt: { ...DEFAULTS.bkt, ...(params.bkt || {}), pGuessByType: { ...DEFAULTS.bkt.pGuessByType, ...((params.bkt || {}).pGuessByType || {}) } },
      bayes: { ...DEFAULTS.bayes, ...(params.bayes || {}) },
      policy: params.policy || DEFAULTS.policy,
      areaKcWeight: params.areaKcWeight ?? DEFAULTS.areaKcWeight,
      newCardMode: params.newCardMode || DEFAULTS.newCardMode,
      adaptive: { ...DEFAULTS.adaptive, ...(params.adaptive || {}) },
    };
  }

  async init() { await this.s.init(); }

  // Enroll card definitions [{id, kcs, area, scope, type}]. Idempotent: existing
  // scheduling state is preserved; only new cards/KCs are created.
  async enroll(cardDefs, now = Date.now()) {
    const newCards = [], kcSeen = new Set();
    for (const d of cardDefs) {
      const existing = await this.s.getCard(d.id);
      if (!existing) {
        newCards.push({
          id: d.id, kcs: d.kcs || [], area: d.area || '', scope: d.scope || '', type: d.type || 'A',
          enrolledAt: now, seen: 0,
          // binary memory model (FSRS-lite, binary input)
          status: 'new',        // 'new' | 'learning' | 'review' | 'relearning'
          step: 0,              // index into learning/relearn steps
          stability: 0,         // days; set when the card graduates to 'review'
          intervalMs: 0, binDueAt: now, lastReviewedAt: null, lastCorrect: null,
          streak: 0, lapses: 0,
          // bayesian anchor (recomputed against live KC mastery)
          bayesAnchorAt: now,
        });
      }
      for (const kc of (d.kcs || [])) kcSeen.add(kc);
    }
    if (newCards.length) await this.s.bulkPutCards(newCards);
    // create KC mastery records
    const newKcs = [];
    for (const kc of kcSeen) {
      if (!(await this.s.getKc(kc))) newKcs.push({ kc, pL: this.p.bkt.pInit, seen: 0, correct: 0, updatedAt: now });
    }
    if (newKcs.length) await this.s.bulkPutKcs(newKcs);
    await this.s.setMeta('enrolledCount', (await this.s.getAllCards()).length);
    return { newCards: newCards.length, newKcs: newKcs.length };
  }

  // Remove enrolled cards whose ids are no longer in the content bank (e.g. a
  // question format was retired). KC mastery records are kept — the evidence
  // they hold still applies to the surviving sibling cards. Returns the count.
  async prune(validIds, now = Date.now()) {
    const valid = validIds instanceof Set ? validIds : new Set(validIds);
    const stale = (await this.s.getAllCards()).map(c => c.id).filter(id => !valid.has(id));
    if (stale.length) {
      await this.s.deleteCards(stale);
      await this.s.setMeta('enrolledCount', (await this.s.getAllCards()).length);
      await this.s.logReview({ id: null, correct: null, ts: now, pruned: stale.length });
    }
    return stale.length;
  }

  guessFor(type) { return this.p.bkt.pGuessByType[type] ?? this.p.bkt.pGuessByType.default; }

  // One BKT update on a KC given an observation. Returns the new pL.
  bktUpdate(pL, correct, guess) {
    const { pSlip, pLearn, clampLo, clampHi } = this.p.bkt;
    // posterior P(known | observation)
    let post;
    if (correct) post = (pL * (1 - pSlip)) / (pL * (1 - pSlip) + (1 - pL) * guess);
    else post = (pL * pSlip) / (pL * pSlip + (1 - pL) * (1 - guess));
    // learning transition
    let next = post + (1 - post) * pLearn;
    return Math.min(clampHi, Math.max(clampLo, next));
  }

  // Weakest-link mastery for a card given a KC-mastery lookup map.
  cardMastery(card, kcMap) {
    let m = 1;
    for (const kc of card.kcs) {
      const rec = kcMap.get(kc);
      if (!rec) continue;
      // area KCs are coarse; soften their pull toward 1 by areaKcWeight
      const w = kc.startsWith('area:') ? this.p.areaKcWeight : 1;
      const eff = 1 - w * (1 - rec.pL);
      if (eff < m) m = eff;
    }
    return m;
  }

  bayesIntervalMs(mastery) {
    const { floorMs, maxMs, curve } = this.p.bayes;
    return floorMs + (maxMs - floorMs) * Math.pow(Math.max(0, Math.min(1, mastery)), curve);
  }

  bayesDueAt(card, kcMap) {
    return card.bayesAnchorAt + this.bayesIntervalMs(this.cardMastery(card, kcMap));
  }

  effectiveDueAt(card, kcMap) {
    const b = card.binDueAt, y = this.bayesDueAt(card, kcMap);
    switch (this.p.policy) {
      case 'binary': return { at: b, by: 'binary', binDueAt: b, bayesDueAt: y };
      case 'bayesian': return { at: y, by: 'bayesian', binDueAt: b, bayesDueAt: y };
      case 'max': return { at: Math.max(b, y), by: b >= y ? 'binary' : 'bayesian', binDueAt: b, bayesDueAt: y };
      case 'min':
      default: return { at: Math.min(b, y), by: b <= y ? 'binary' : 'bayesian', binDueAt: b, bayesDueAt: y };
    }
  }

  // ---- binary memory-model helpers (FSRS-lite, binary input) ----

  // Apply Anki-style fuzz to a scheduled review interval (ms) so cards introduced
  // together don't clump onto the same day. No fuzz below ~2.5 days; otherwise
  // ± max(fuzz*ivl, 1 day).
  _fuzz(ivlMs) {
    const f = this.p.binary.fuzz;
    if (!f || ivlMs < 2.5 * DAY) return ivlMs;
    const amt = Math.max(ivlMs * f, DAY);
    return ivlMs + (this.rng() * 2 - 1) * amt;
  }

  // Put a card into 'review' with a given stability, scheduling to the desired retention.
  _scheduleReview(card, stabilityDays, now) {
    const bp = this.p.binary;
    const S = Math.min(bp.maxStabilityDays, Math.max(0, stabilityDays));
    card.stability = S;
    let ivl = intervalForRetention(S, bp.desiredRetention) * DAY;
    ivl = this._fuzz(ivl);
    ivl = Math.max(bp.minReviewIntervalMs, Math.min(bp.maxIntervalMs, ivl));
    card.intervalMs = ivl; card.status = 'review'; card.step = 0; card.binDueAt = now + ivl;
  }

  _stepTo(card, status, stepIdx, stepsMs, now) {
    card.status = status; card.step = stepIdx;
    card.intervalMs = stepsMs[stepIdx]; card.binDueAt = now + stepsMs[stepIdx];
  }

  // Advance the binary memory model for one binary answer.
  _binaryUpdate(card, correct, now) {
    const bp = this.p.binary;
    const prevReviewedAt = card.lastReviewedAt;
    if (correct) {
      card.streak += 1;
      if (card.status === 'new' || card.status === 'learning') {
        const next = card.step + 1;
        if (next >= bp.learningStepsMs.length) this._scheduleReview(card, bp.graduatingStabilityDays, now);
        else this._stepTo(card, 'learning', next, bp.learningStepsMs, now);
      } else if (card.status === 'relearning') {
        const next = card.step + 1;
        if (next >= bp.relearnStepsMs.length) this._scheduleReview(card, card.stability, now); // resume reduced stability
        else this._stepTo(card, 'relearning', next, bp.relearnStepsMs, now);
      } else { // review: grow stability, bigger boost when recalled at lower retrievability (spacing effect)
        const S = card.stability || bp.graduatingStabilityDays;
        const elapsedDays = prevReviewedAt ? (now - prevReviewedAt) / DAY : intervalForRetention(S, bp.desiredRetention);
        const R = retrievability(elapsedDays, S);
        const mult = Math.min(bp.maxBoost, Math.max(bp.minBoost,
          1 + (bp.successFactor - 1) * (1 - R) / (1 - bp.desiredRetention)));
        this._scheduleReview(card, S * mult, now);
      }
    } else { // wrong
      card.streak = 0;
      if (card.status === 'review') { // lapse: keep partial memory, drop into relearning
        card.lapses += 1;
        card.stability = Math.max(bp.minStabilityDays, (card.stability || bp.graduatingStabilityDays) * bp.lapseMult);
        this._stepTo(card, 'relearning', 0, bp.relearnStepsMs, now);
      } else if (card.status === 'relearning') {
        this._stepTo(card, 'relearning', 0, bp.relearnStepsMs, now);
      } else { // new/learning: back to the first learning step
        this._stepTo(card, 'learning', 0, bp.learningStepsMs, now);
      }
    }
  }

  // Record an answer. Updates the binary curve for this card AND the BKT mastery
  // of every KC the card touches (which reschedules its siblings).
  async review(id, correct, now = Date.now()) {
    const card = await this.s.getCard(id);
    if (!card) throw new Error(`unknown card ${id}`);
    // binary memory model (uses prior lastReviewedAt, so update it after)
    this._binaryUpdate(card, !!correct, now);
    card.lastReviewedAt = now; card.lastCorrect = !!correct; card.seen += 1;
    card.bayesAnchorAt = now;
    await this.s.putCard(card);
    // bayesian: update each KC's mastery (shared across siblings)
    const guess = this.guessFor(card.type);
    const updated = [];
    for (const kc of card.kcs) {
      const rec = (await this.s.getKc(kc)) || { kc, pL: this.p.bkt.pInit, seen: 0, correct: 0, updatedAt: now };
      rec.pL = this.bktUpdate(rec.pL, correct, guess);
      rec.seen += 1; rec.correct += correct ? 1 : 0; rec.updatedAt = now;
      await this.s.putKc(rec); updated.push({ kc, pL: rec.pL });
    }
    await this.s.logReview({ id, correct: !!correct, ts: now, kcs: card.kcs });
    return { card, kcsUpdated: updated };
  }

  // Record a CARDLESS answer against a set of KCs (e.g. a generated conjugation
  // drill): runs the Bayesian half of review() only. Updates each KC's BKT
  // mastery (rescheduling every sibling card on that KC) and its seen/correct
  // counts (feeding areaNeeds and the adaptive recommender) — but touches no
  // card and no binary curve. Creates missing KC records on first use.
  async reviewKcs(kcs, correct, { type = 'drill', now = Date.now() } = {}) {
    const guess = this.guessFor(type);
    const updated = [];
    for (const kc of (kcs || [])) {
      const rec = (await this.s.getKc(kc)) || { kc, pL: this.p.bkt.pInit, seen: 0, correct: 0, updatedAt: now };
      rec.pL = this.bktUpdate(rec.pL, correct, guess);
      rec.seen += 1; rec.correct += correct ? 1 : 0; rec.updatedAt = now;
      await this.s.putKc(rec); updated.push({ kc, pL: rec.pL });
    }
    await this.s.logReview({ id: null, correct: !!correct, ts: now, kcs: [...(kcs || [])], drill: type });
    return { kcsUpdated: updated };
  }

  async _kcMap() {
    const m = new Map();
    for (const k of await this.s.getAllKcs()) m.set(k.kc, k);
    return m;
  }

  // Cards whose effective due time has arrived (seen cards only), soonest first.
  async getDueQueue({ now = Date.now(), limit = 20, includeNew = false } = {}) {
    const kcMap = await this._kcMap();
    const out = [];
    for (const card of await this.s.getAllCards()) {
      if (!includeNew && card.status === 'new') continue;
      const e = this.effectiveDueAt(card, kcMap);
      if (e.at <= now) out.push({ id: card.id, area: card.area, type: card.type, due: e.at, by: e.by, binDueAt: e.binDueAt, bayesDueAt: e.bayesDueAt, mastery: this.cardMastery(card, kcMap), overdueMs: now - e.at });
    }
    out.sort((a, b) => a.due - b.due);
    return limit ? out.slice(0, limit) : out;
  }

  // ---- adaptive new-card recommender (Beta-Bernoulli accuracy per KC) ----
  // Beta posterior params for a KC's answer accuracy, from its running seen/correct counts.
  _beta(rec) {
    const a = this.p.adaptive.priorAlpha + (rec?.correct || 0);
    const n = rec?.seen || 0;
    const b = this.p.adaptive.priorBeta + (n - (rec?.correct || 0));
    return { a, b, n };
  }
  _postMean(rec) { const { a, b } = this._beta(rec); return a / (a + b); }

  // Standard-normal via Box-Muller, then Marsaglia-Tsang Gamma(shape>=1), then Beta — all
  // driven by the injectable rng so tests are reproducible.
  _normal() {
    let u = 0, v = 0;
    while (u === 0) u = this.rng();
    while (v === 0) v = this.rng();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  }
  _gamma(k) { // shape k >= 1, scale 1
    const d = k - 1 / 3, c = 1 / Math.sqrt(9 * d);
    for (;;) {
      let x, v;
      do { x = this._normal(); v = 1 + c * x; } while (v <= 0);
      v = v * v * v;
      const u = this.rng();
      if (u < 1 - 0.0331 * x * x * x * x) return d * v;
      if (Math.log(u) < 0.5 * x * x + d * (1 - v + Math.log(v))) return d * v;
    }
  }
  _sampleAccuracy(rec) { const { a, b } = this._beta(rec); const x = this._gamma(a), y = this._gamma(b); return x / (x + y); }

  // "Areas that need the most study": per content-area posterior accuracy + need, weakest
  // first. Uses the coarse "area:" KC records (accumulated over every card in the area).
  async areaNeeds({ minAnswers = 0 } = {}) {
    const out = [];
    for (const rec of await this.s.getAllKcs()) {
      if (!rec.kc.startsWith('area:')) continue;
      const { a, b, n } = this._beta(rec);
      if (n < minAnswers) continue;
      const mean = a / (a + b);
      out.push({ kc: rec.kc, answers: n, correct: rec.correct || 0, accuracy: mean, need: 1 - mean });
    }
    out.sort((x, y) => y.need - x.need);
    return out;
  }

  _shuffle(arr) { for (let i = arr.length - 1; i > 0; i--) { const j = Math.floor(this.rng() * (i + 1));[arr[i], arr[j]] = [arr[j], arr[i]]; } return arr; }

  // Recommend fresh (unseen) cards to introduce next.
  //   mode 'random'   — a random assortment (cold-start default feel).
  //   mode 'topic'    — restrict to one content area (or KC), neediest-first within it.
  //   mode 'adaptive' — Thompson-sample each KC's accuracy; surface cards from the areas
  //                     that look weakest right now. Random-ish until evidence accrues,
  //                     then targeted toward missed areas.
  async getNewCards({ mode = this.p.newCardMode, area = null, limit = 10 } = {}) {
    const kcMap = await this._kcMap();
    let news = (await this.s.getAllCards()).filter(c => c.status === 'new');
    if (mode === 'topic' && area) news = news.filter(c => c.area === area || (c.kcs || []).includes(area));

    if (mode === 'random') {
      return this._shuffle(news).slice(0, limit).map(c => ({
        id: c.id, area: c.area, type: c.type, mode: 'random', mastery: this.cardMastery(c, kcMap),
      }));
    }

    // adaptive (also used to order 'topic'): Thompson-sample each card independently (each
    // card is an arm) so cold start yields a diverse random assortment, while a card's
    // neediest KC still drives the score once posteriors concentrate on weak areas.
    const scored = news.map(c => {
      let best = null, bestNeed = -1;
      for (const kc of (c.kcs || [])) {
        const need = 1 - this._sampleAccuracy(kcMap.get(kc)); // higher = weaker area right now
        if (need > bestNeed) { bestNeed = need; best = kc; }
      }
      return { id: c.id, area: c.area, type: c.type, mode: (mode === 'topic' ? 'topic' : 'adaptive'), need: bestNeed, reasonKc: best, mastery: this.cardMastery(c, kcMap) };
    });
    scored.sort((a, b) => b.need - a.need);
    return scored.slice(0, limit);
  }

  async cardState(id) {
    const c = await this.s.getCard(id); if (!c) return null;
    const kcMap = await this._kcMap();
    return {
      ...c, mastery: this.cardMastery(c, kcMap),
      bayesDueAt: this.bayesDueAt(c, kcMap),
      effective: this.effectiveDueAt(c, kcMap),
      kcMastery: c.kcs.map(kc => ({ kc, pL: kcMap.get(kc)?.pL ?? null })),
    };
  }

  async kcState(kc) { return this.s.getKc(kc); }

  async stats({ now = Date.now() } = {}) {
    const cards = await this.s.getAllCards();
    const kcMap = await this._kcMap();
    let dueNow = 0, seen = 0, neu = 0;
    for (const c of cards) {
      if (c.status === 'new') { neu++; continue; }
      seen++;
      if (this.effectiveDueAt(c, kcMap).at <= now) dueNow++;
    }
    const kcs = [...kcMap.values()];
    const avgMastery = kcs.length ? kcs.reduce((a, k) => a + k.pL, 0) / kcs.length : 0;
    return { totalCards: cards.length, new: neu, seen, dueNow, kcCount: kcs.length, avgMastery };
  }
}
