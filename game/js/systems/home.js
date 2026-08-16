// home.js — construction projects and the garden's daily crate.
// A project pays its material cost up front, then takes `actions` question-driven
// build steps. Wrong answers waste the step, not the materials.

import { getSave, mutate, level } from '../state.js';
import { ROOM, GARDEN_CRATES } from '../data/construction.js';
import { canAfford, removeItems, addItems, rollLoot } from './inventory.js';
import { grantXp, checkAchievements } from './progress.js';
import { askQuestion } from '../ui/questionModal.js';

const DAY = 864e5;

export function roomTier(roomId) { return getSave().home[roomId] || 0; }

export function nextTierInfo(roomId) {
  const room = ROOM[roomId];
  const cur = roomTier(roomId);
  if (cur >= 3) return null;
  return { tierNum: cur + 1, ...room.tiers[cur] };
}

export function canStartProject(roomId) {
  const s = getSave();
  if (s.build) return { ok: false, why: 'Another project is in progress' };
  const next = nextTierInfo(roomId);
  if (!next) return { ok: false, why: 'Fully upgraded' };
  if (level('construction') < next.lvl) return { ok: false, why: `Requires Construction ${next.lvl}` };
  if (!canAfford(next.cost, { useBank: true })) return { ok: false, why: 'Missing materials' };
  return { ok: true, next };
}

export function startProject(roomId) {
  const chk = canStartProject(roomId);
  if (!chk.ok) return chk;
  removeItems(chk.next.cost, { useBank: true });
  mutate(s => { s.build = { roomId, tier: chk.next.tierNum, done: 0, total: chk.next.actions, xp: chk.next.xp }; });
  return { ok: true };
}

export function cancelProject() {
  // refund materials of the pending tier
  const s = getSave();
  if (!s.build) return;
  const room = ROOM[s.build.roomId];
  const cost = room.tiers[s.build.tier - 1].cost;
  addItems(cost, { source: 'internal' });
  mutate(st => { st.build = null; });
}

// One build step. Returns null if aborted; { finished } etc otherwise.
export async function doBuildStep() {
  const s = getSave();
  const b = s.build;
  if (!b) return { blocked: 'No project underway' };
  const room = ROOM[b.roomId];

  const res = await askQuestion({
    icon: '🔨', title: `Building: ${room.name} (tier ${b.tier})`,
    sub: `Construction · step ${b.done + 1} of ${b.total}`,
  });
  if (!res) return null;

  mutate(st => { st.actions.construction = (st.actions.construction || 0) + 1; });

  if (!res.correct) {
    checkAchievements();
    return { correct: false, msg: 'A beam slips — no progress this step.' };
  }

  const stepXp = grantXp('construction', Math.round(b.xp / b.total));
  let finished = false;
  mutate(st => {
    st.build.done++;
    if (st.build.done >= st.build.total) {
      st.home[b.roomId] = b.tier;
      st.build = null;
      finished = true;
    }
  });
  checkAchievements();
  return { correct: true, xp: stepXp, finished, room };
}

// ---- garden daily crate ----
export function gardenReady() {
  const s = getSave();
  const tier = roomTier('garden');
  if (tier < 1) return { ok: false, why: 'Build the Garden first' };
  const readyAt = (s.gardenClaimed || 0) + DAY;
  if (Date.now() < readyAt) return { ok: false, why: 'Crate not ready', readyAt };
  return { ok: true, tier };
}

export function claimGarden() {
  const g = gardenReady();
  if (!g.ok) return g;
  const table = GARDEN_CRATES[g.tier].map(r => ({ ...r, chance: 1 }));
  const gains = rollLoot(table);
  mutate(s => { s.gardenClaimed = Date.now(); });
  const { banked } = addItems(gains, { source: 'garden' });
  checkAchievements();
  return { ok: true, gains, banked };
}
