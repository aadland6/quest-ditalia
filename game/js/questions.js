// questions.js — bridge between the game and the SRS engine.
// Every game action requests one question: due cards first (spaced repetition),
// then — when a conjugation concept looks weak — a generated verb drill,
// otherwise a new card picked by the adaptive (Thompson-sampling) recommender.
// Content is lazy-loaded from per-area shards in game/data/bank/.
//
// Conjugation drills are CARDLESS: they are generated on the fly for a weak
// tense KC and graded via srs.reviewKcs(), which updates the shared Bayesian
// concept mastery (rescheduling the authored sibling cards) without ever
// touching the per-card scheduler.

import { SRS } from './srs/srs-engine.js';
import { IdbStorage } from './srs/idb-storage.js';
import { DRILLABLE_KCS, makeDrill } from './data/conjdrills.js';

let srs = null;
const cardArea = new Map();        // card id -> content area
let shardIndex = null;             // area -> { file, count }
const shardCache = new Map();      // area -> Promise<Map<id, item>>

// Drill pacing: at most ~1 action in 4 becomes a drill, and only when the
// weakest drilled concept's sampled accuracy drops below this threshold.
const DRILL_MAX_SHARE = 0.25;
const DRILL_ACCURACY_THRESHOLD = 0.6;

export async function initQuestions() {
  const [cards, index] = await Promise.all([
    fetch('./data/srs_cards.json').then(r => r.json()),
    fetch('./data/bank/shard_index.json').then(r => r.json()),
  ]);
  shardIndex = index;
  for (const c of cards) cardArea.set(c.id, c.area);
  srs = new SRS(new IdbStorage('italia-srs'));
  await srs.init();
  const have = await srs.s.getAllCards();
  if (have.length < cards.length) await srs.enroll(cards);
  // Drop cards for content removed from the bank (e.g. retired formats)
  if (have.length) await srs.prune(new Set(cardArea.keys()));
  return srs;
}

export const getSrs = () => srs;

function loadShard(area) {
  if (!shardCache.has(area)) {
    const entry = shardIndex[area];
    if (!entry) throw new Error(`no shard for area: ${area}`);
    shardCache.set(area, fetch(`./data/bank/${entry.file}`)
      .then(r => r.json())
      .then(items => new Map(items.map(i => [i.id, i])))
      .catch(e => { shardCache.delete(area); throw e; }));
  }
  return shardCache.get(area);
}

export async function loadItem(id) {
  const area = cardArea.get(id);
  if (!area) throw new Error(`unknown card: ${id}`);
  const shard = await loadShard(area);
  const item = shard.get(id);
  if (!item) throw new Error(`card ${id} missing from shard ${area}`);
  return item;
}

// When a drilled conjugation concept is weak (Thompson-sampled accuracy below
// the threshold), return a generated drill for the neediest tense. Only KCs the
// learner has actually met (seen > 0 via authored cards or prior drills) are
// eligible — the drill engine never introduces a tense before the bank does.
async function maybeDrill() {
  if (Math.random() > DRILL_MAX_SHARE) return null;
  let worst = null, worstAcc = 1;
  for (const kc of DRILLABLE_KCS) {
    const rec = await srs.kcState(kc);
    if (!rec || !rec.seen) continue;
    const acc = srs._sampleAccuracy(rec);
    if (acc < worstAcc) { worstAcc = acc; worst = kc; }
  }
  if (!worst || worstAcc >= DRILL_ACCURACY_THRESHOLD) return null;
  return makeDrill(worst);
}

// Pick the next question. kind: 'due' (review), 'drill' (generated conjugation
// practice for a weak concept) or 'new' (adaptive introduction).
// opts.dueOnly — only serve due reviews (Library mode); returns null when queue is empty.
export async function nextQuestion(opts = {}) {
  const now = Date.now();
  const due = await srs.getDueQueue({ now, limit: 1 });
  if (due.length) {
    return { item: await loadItem(due[0].id), kind: 'due' };
  }
  if (opts.dueOnly) return null;
  const drill = await maybeDrill();
  if (drill) return { item: drill, kind: 'drill' };
  const fresh = await srs.getNewCards({ mode: 'adaptive', limit: 1 });
  if (fresh.length) {
    const rec = fresh[0];
    return { item: await loadItem(rec.id), kind: 'new', need: rec.need, reasonKc: rec.reasonKc };
  }
  // Entire bank exhausted as "new" — fall back to soonest-due card even if not due yet
  const soon = await srs.getDueQueue({ now: now + 365 * 864e5, limit: 1 });
  if (soon.length) return { item: await loadItem(soon[0].id), kind: 'due' };
  return null;
}

// Report the answer back to the schedulers. Drills update concept mastery only
// (reviewKcs); bank cards update both the binary curve and BKT (review).
export const reportAnswer = (item, correct) =>
  item.drill
    ? srs.reviewKcs(item.kcs, correct, { type: 'drill' })
    : srs.review(item.id, correct);

export const dueCount = async () => (await srs.stats({ now: Date.now() })).dueNow;
export const srsStats = () => srs.stats({ now: Date.now() });
export const areaNeeds = () => srs.areaNeeds({ minAnswers: 1 });
