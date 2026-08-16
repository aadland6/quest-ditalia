// srs-tests.js — shared assertions for the SRS engine, runnable in Node or the browser.
import { SRS, MemoryStorage, DEFAULTS, MIN, HOUR, DAY, intervalForRetention } from '../game/js/srs/srs-engine.js';

const approx = (a, b, tol = 1e-6) => Math.abs(a - b) <= tol;
// Deterministic PRNG so Thompson sampling is reproducible in tests.
const mulberry32 = (seed) => () => { let t = (seed += 0x6D2B79F5); t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };

const DATUM = ['geodesy-datums', 'area:conceptual-foundations'];
const PROJ = ['map-projections', 'area:conceptual-foundations'];
const defs = [
  ...['D1', 'D2', 'D3'].map(id => ({ id, kcs: DATUM, area: 'Conceptual Foundations', scope: 'exam', type: 'A' })),
  ...['P1', 'P2', 'P3'].map(id => ({ id, kcs: PROJ, area: 'Conceptual Foundations', scope: 'exam', type: 'A' })),
];
const t0 = 1_700_000_000_000;

// Run the storage-agnostic core tests. `mkStorage` returns a fresh storage adapter
// (MemoryStorage in Node; IdbStorage-with-reset in the browser). `log(line, ok?)`
// receives each result. Returns {pass, fail}.
export async function runCore(log, mkStorage = () => new MemoryStorage()) {
  let pass = 0, fail = 0;
  const ok = (cond, msg) => { if (cond) { pass++; log('  ✓ ' + msg, true); } else { fail++; log('  ✗ FAIL: ' + msg, false); } };
  // fuzz off + retention pinned to 0.90 so the interval MATH is exact and independent of the
  // shipped product default (which is asserted separately below).
  const fresh = async () => { const s = new SRS(await mkStorage(), { binary: { fuzz: 0, desiredRetention: 0.90 } }); await s.init(); await s.enroll(defs, t0); return s; };

  log('[1] Binary curve: FSRS-lite stability model, scheduled to desired retention (binary, no grading)');
  {
    ok(DEFAULTS.binary.desiredRetention === 0.85, `shipped default desiredRetention = 0.85 (efficiency point)`);
    const s = await fresh();
    let r = await s.review('D1', true, t0);                 // new -> pass learning step -> graduate to review
    ok(approx(r.card.intervalMs, 1 * DAY), `1st correct graduates to a ~1 day first review (${(r.card.intervalMs / DAY).toFixed(2)}d)`);
    ok(r.card.status === 'review', `status = review after graduating`);
    r = await s.review('D1', true, r.card.binDueAt);        // reviewed on schedule (R≈0.9) -> stability ×2.5
    ok(approx(r.card.intervalMs, 2.5 * DAY, 1), `on-schedule correct grows interval ~2.5× (${(r.card.intervalMs / DAY).toFixed(2)}d)`);
    r = await s.review('D1', true, r.card.binDueAt);
    ok(approx(r.card.intervalMs, 6.25 * DAY, 1), `next on-schedule correct grows again (~6.25d) (${(r.card.intervalMs / DAY).toFixed(2)}d)`);
    const preS = r.card.stability, preIvl = r.card.intervalMs;
    r = await s.review('D1', false, r.card.binDueAt);       // LAPSE: soft, keeps partial memory
    ok(r.card.status === 'relearning' && approx(r.card.intervalMs, 10 * MIN, 1), `wrong -> 10-min relearning step, not a hard reset`);
    ok(approx(r.card.stability, preS * 0.5), `lapse keeps ~50% of stability (${r.card.stability.toFixed(2)}d from ${preS.toFixed(2)}d)`);
    r = await s.review('D1', true, r.card.binDueAt);        // graduate relearning -> resume reduced stability
    ok(r.card.status === 'review' && r.card.intervalMs > 2 * DAY && r.card.intervalMs < preIvl,
      `relearn graduates to a reduced interval (${(r.card.intervalMs / DAY).toFixed(2)}d), between fresh and pre-lapse`);
  }

  log('[2] BKT mastery: rises on correct, falls on wrong');
  {
    const s = await fresh();
    const p0 = (await s.kcState('geodesy-datums')).pL;
    await s.review('D1', true, t0);
    const p1 = (await s.kcState('geodesy-datums')).pL;
    await s.review('D2', false, t0 + 1000);
    const p2 = (await s.kcState('geodesy-datums')).pL;
    ok(p1 > p0, `correct raised datum mastery ${p0.toFixed(3)} -> ${p1.toFixed(3)}`);
    ok(p2 < p1, `wrong lowered datum mastery ${p1.toFixed(3)} -> ${p2.toFixed(3)}`);
  }

  log('[3] Propagation reschedules SIBLING datum cards, but not unrelated projection cards');
  {
    const s = await fresh();
    await s.review('D1', true, t0);
    const D2 = await s.cardState('D2'), P2 = await s.cardState('P2');
    ok(D2.bayesDueAt > P2.bayesDueAt, `after D1 correct: sibling D2 due LATER than untouched P2 (${D2.mastery.toFixed(3)} > ${P2.mastery.toFixed(3)})`);
  }
  {
    const s = await fresh();
    await s.review('D3', false, t0);
    const D2 = await s.cardState('D2'), P2 = await s.cardState('P2');
    ok(D2.bayesDueAt < P2.bayesDueAt, `after D3 wrong: sibling D2 due SOONER than untouched P2 (${D2.mastery.toFixed(3)} < ${P2.mastery.toFixed(3)})`);
  }

  log('[4] Headline: Bayesian layer surfaces a well-drilled card SOONER than its binary schedule');
  log('    because a DIFFERENT datum question was answered wrong');
  {
    const s = await fresh();
    let r = await s.review('D2', true, t0);
    for (let i = 0; i < 3; i++) r = await s.review('D2', true, r.card.binDueAt); // drill on schedule
    const binInterval = r.card.intervalMs;
    const tSib = r.card.lastReviewedAt;
    let D2 = await s.cardState('D2');
    ok(binInterval > 10 * DAY, `D2 drilled to a long binary interval (${(binInterval / DAY).toFixed(1)}d)`);
    ok(D2.effective.by === 'binary', `before sibling errors, D2 effective due = binary`);
    for (let i = 0; i < 3; i++) await s.review('D3', false, tSib + i * 1000);
    D2 = await s.cardState('D2');
    const now = tSib + 10_000;
    ok(D2.effective.by === 'bayesian', `after sibling errors, D2 effective due flips to BAYESIAN (datum mastery ${D2.mastery.toFixed(3)})`);
    ok(D2.effective.at < D2.binDueAt, `D2 resurfaces sooner: bayes ${((D2.effective.at - now) / DAY).toFixed(1)}d vs binary ${((D2.binDueAt - now) / DAY).toFixed(1)}d`);
  }

  log('[5] Queue + re-enroll idempotency');
  {
    const store = await mkStorage();
    const s = new SRS(store, { binary: { fuzz: 0 } }); await s.init(); await s.enroll(defs, t0);
    await s.review('D1', false, t0);   // new + wrong -> learning step (10 min)
    const q = await s.getDueQueue({ now: t0 + 1 * HOUR, limit: 10 });
    ok(q.some(x => x.id === 'D1'), `D1 appears in due queue after its 10-min step elapses`);
    const before = (await store.getCard('D1')).seen;
    const s2 = new SRS(store); await s2.init();
    const res = await s2.enroll(defs, t0 + DAY);
    ok(res.newCards === 0, `re-enroll adds 0 new cards (idempotent)`);
    ok((await store.getCard('D1')).seen === before, `existing card state preserved across re-enroll`);
  }

  log('[6] Interval fuzz: bounded jitter, disabled at fuzz=0');
  {
    const ivl = 20 * DAY; // 5% = 1 day, so ± max(1d, 1d) = ±1 day
    const hi = new SRS(new MemoryStorage(), { rng: () => 1 })._fuzz(ivl);
    const lo = new SRS(new MemoryStorage(), { rng: () => 0 })._fuzz(ivl);
    ok(approx(hi, 21 * DAY, 1), `fuzz(+) adds ~1 day at a 20d interval (${(hi / DAY).toFixed(2)}d)`);
    ok(approx(lo, 19 * DAY, 1), `fuzz(-) subtracts ~1 day at a 20d interval (${(lo / DAY).toFixed(2)}d)`);
    ok(new SRS(new MemoryStorage(), { binary: { fuzz: 0 } })._fuzz(ivl) === ivl, `fuzz=0 disables jitter`);
    ok(new SRS(new MemoryStorage(), { rng: () => 1 })._fuzz(1 * DAY) === 1 * DAY, `no fuzz below 2.5 days`);
  }

  log('[7] Adaptive new-card recommender: random assortment at cold start, targets weak areas as');
  log('    evidence accrues; random & topic modes work');
  {
    const N = 10;
    const adefs = [
      ...Array.from({ length: N }, (_, i) => ({ id: `W${i}`, kcs: ['kc-weak', 'area:weak-area'], area: 'Weak Area', scope: 'exam', type: 'A' })),
      ...Array.from({ length: N }, (_, i) => ({ id: `S${i}`, kcs: ['kc-strong', 'area:strong-area'], area: 'Strong Area', scope: 'exam', type: 'A' })),
    ];
    const mkAdaptive = async (seed) => { const s = new SRS(await mkStorage(), { rng: mulberry32(seed), binary: { fuzz: 0 } }); await s.init(); await s.enroll(adefs, t0); return s; };

    // cold start: adaptive should surface a MIX of areas (a random assortment), not one area
    {
      const s = await mkAdaptive(1);
      const rec = await s.getNewCards({ mode: 'adaptive', limit: 8 });
      const areas = new Set(rec.map(r => r.area));
      ok(areas.has('Weak Area') && areas.has('Strong Area'), `cold-start adaptive returns a mix of both areas (random assortment)`);
    }

    // build evidence: 4 wrong in Weak Area, 4 correct in Strong Area
    const s = await mkAdaptive(2);
    for (let i = 0; i < 4; i++) await s.review(`W${i}`, false, t0 + i * 1000);
    for (let i = 0; i < 4; i++) await s.review(`S${i}`, true, t0 + 100000 + i * 1000);

    const needs = await s.areaNeeds();
    const w = needs.find(x => x.kc === 'area:weak-area'), st = needs.find(x => x.kc === 'area:strong-area');
    ok(w.accuracy < 0.5 && st.accuracy > 0.5, `areaNeeds: weak area accuracy ${w.accuracy.toFixed(2)} < strong ${st.accuracy.toFixed(2)}`);
    ok(needs[0].kc === 'area:weak-area', `areaNeeds ranks the weak area as most in need`);

    // adaptive recommendations now target the weak area's remaining new cards
    const rec = await s.getNewCards({ mode: 'adaptive', limit: 6 });
    const weakCount = rec.filter(r => r.area === 'Weak Area').length;
    ok(weakCount >= 5, `adaptive targets weak area after evidence (${weakCount}/6 recommendations from Weak Area)`);
    ok(rec[0].reasonKc && typeof rec[0].need === 'number', `recommendations carry a reason KC + need score`);

    // topic mode: restrict to one area
    const topic = await s.getNewCards({ mode: 'topic', area: 'Strong Area', limit: 100 });
    ok(topic.length > 0 && topic.every(r => r.area === 'Strong Area'), `topic mode returns only the requested area (${topic.length} cards)`);

    // random mode: a shuffled mix of remaining new cards across areas
    const rnd = await s.getNewCards({ mode: 'random', limit: 100 });
    ok(new Set(rnd.map(r => r.area)).size === 2 && rnd.every(r => r.mode === 'random'), `random mode returns a mix across areas`);
  }

  log('[8] reviewKcs: cardless drill answers update KC mastery only (conjugation drills)');
  {
    const s = await fresh();
    const before = (await s.kcState('geodesy-datums')).pL;
    const cardCount = (await s.s.getAllCards()).length;

    // wrong drill answer lowers the KC's mastery and reschedules sibling cards sooner
    const r1 = await s.reviewKcs(['geodesy-datums'], false, { now: t0 });
    const afterWrong = (await s.kcState('geodesy-datums')).pL;
    ok(afterWrong < before, `wrong drill lowers KC mastery (${before.toFixed(3)} -> ${afterWrong.toFixed(3)})`);
    ok(r1.kcsUpdated.length === 1 && approx(r1.kcsUpdated[0].pL, afterWrong), `reviewKcs reports the updated posterior`);

    // correct drill answers raise it back
    await s.reviewKcs(['geodesy-datums'], true, { now: t0 + 1000 });
    await s.reviewKcs(['geodesy-datums'], true, { now: t0 + 2000 });
    const afterRight = (await s.kcState('geodesy-datums')).pL;
    ok(afterRight > afterWrong, `correct drills raise KC mastery (${afterWrong.toFixed(3)} -> ${afterRight.toFixed(3)})`);

    // no card was created or touched
    ok((await s.s.getAllCards()).length === cardCount, `reviewKcs creates no cards`);
    ok((await s.s.getCard('D1')).seen === 0, `sibling cards' own curves untouched`);

    // seen/correct counts feed areaNeeds / the adaptive recommender
    const rec = await s.kcState('geodesy-datums');
    ok(rec.seen === 3 && rec.correct === 2, `KC seen/correct counters accumulate (${rec.seen}/${rec.correct})`);

    // drills on a brand-new KC create its mastery record on first use
    await s.reviewKcs(['conj-congiuntivo'], false, { now: t0 + 3000 });
    const fresh1 = await s.kcState('conj-congiuntivo');
    ok(fresh1 && fresh1.pL < DEFAULTS.bkt.pInit, `unknown KC is created and updated on first drill`);

    // a wrong drill pulls sibling cards' bayesian due time sooner
    const s2 = await fresh();
    await s2.review('D1', true, t0);                        // graduate D1 (~1d binary due)
    const dueBefore = (await s2.cardState('D1')).bayesDueAt;
    for (let i = 0; i < 3; i++) await s2.reviewKcs(['geodesy-datums'], false, { now: t0 + 1000 + i });
    const dueAfter = (await s2.cardState('D1')).bayesDueAt;
    ok(dueAfter < dueBefore, `wrong drills pull sibling cards' bayesian due sooner (${((dueBefore - dueAfter) / HOUR).toFixed(1)}h sooner)`);
  }

  return { pass, fail };
}
