// contracts.js — daily contracts from the Sala delle Mappe.
// One contract per day (rolls at first visit after midnight). Kinds:
//   kill  — defeat N of an enemy suited to your combat level
//   gather — collect N of a resource suited to your gathering levels
//   review — clear N due reviews (any screen counts)
// Reward: coins + bonus xp in a related skill, scaled by Sala delle Mappe tier.

import { getSave, mutate, level, combatLevel } from '../state.js';
import { ENEMY, ENEMIES } from '../data/enemies.js';
import { item } from '../data/items.js';
import { perks } from './perks.js';
import { addItems } from './inventory.js';
import { grantXp, checkAchievements } from './progress.js';

const dayKey = (ts = Date.now()) => new Date(ts).toISOString().slice(0, 10);

const GATHER_POOL = [
  { item: 'copper_ore', skill: 'mining', lvl: 1 }, { item: 'logs', skill: 'woodcutting', lvl: 1 },
  { item: 'flax', skill: 'crafting', lvl: 1 }, { item: 'clay', skill: 'mining', lvl: 3 },
  { item: 'iron_ore', skill: 'mining', lvl: 15 }, { item: 'oak_logs', skill: 'woodcutting', lvl: 15 },
  { item: 'silver_ore', skill: 'mining', lvl: 20 }, { item: 'teak_logs', skill: 'woodcutting', lvl: 24 },
  { item: 'coal', skill: 'mining', lvl: 30 }, { item: 'willow_logs', skill: 'woodcutting', lvl: 33 },
  { item: 'gold_ore', skill: 'mining', lvl: 40 }, { item: 'maple_logs', skill: 'woodcutting', lvl: 45 },
  { item: 'granite', skill: 'mining', lvl: 48 }, { item: 'elder_logs', skill: 'woodcutting', lvl: 58 },
  { item: 'mithril_ore', skill: 'mining', lvl: 55 }, { item: 'yew_logs', skill: 'woodcutting', lvl: 70 },
];

function rollContract(tier) {
  const cb = combatLevel();
  const kinds = ['kill', 'gather', 'review'];
  const kind = kinds[Math.floor(Math.random() * kinds.length)];
  if (kind === 'kill') {
    const options = ENEMIES.filter(e => e.level <= cb + 5 && e.level >= Math.max(1, cb - 25));
    const e = options.length ? options[Math.floor(Math.random() * options.length)] : ENEMY.marsh_slime;
    const n = 3 + tier + Math.floor(Math.random() * 3);
    return { kind, target: e.id, n, xpSkill: 'hitpoints', label: `Defeat ${n}× ${e.name}`, icon: e.icon };
  }
  if (kind === 'gather') {
    const options = GATHER_POOL.filter(g => level(g.skill) >= g.lvl);
    const g = options[Math.floor(Math.random() * options.length)] || GATHER_POOL[0];
    const n = (8 + tier * 4) + Math.floor(Math.random() * 8);
    return { kind, target: g.item, n, xpSkill: g.skill, label: `Gather ${n}× ${item(g.item).name}`, icon: item(g.item).icon };
  }
  const n = 5 + tier * 3 + Math.floor(Math.random() * 5);
  return { kind: 'review', target: null, n, xpSkill: null, label: `Clear ${n} due reviews`, icon: '📖' };
}

// Ensure today's contract exists (called when viewing the Sala delle Mappe). Returns it.
export function todaysContract() {
  const tier = perks().contractTier;
  if (tier < 1) return null;
  const s = getSave();
  const today = dayKey();
  if (!s.contract || s.contract.day !== today) {
    const c = rollContract(tier);
    mutate(st => { st.contract = { ...c, day: today, done: 0, claimed: false, tier }; });
  }
  return getSave().contract;
}

function bump(pred, amount = 1) {
  const s = getSave();
  const c = s.contract;
  if (!c || c.claimed || c.day !== dayKey() || c.done >= c.n) return;
  if (!pred(c)) return;
  mutate(st => { st.contract.done = Math.min(st.contract.n, st.contract.done + amount); });
}

export const onKill = enemyId => bump(c => c.kind === 'kill' && c.target === enemyId);
export const onGather = gains => {
  const s = getSave();
  const c = s.contract;
  if (!c || c.kind !== 'gather') return;
  const got = gains[c.target] || 0;
  if (got > 0) bump(() => true, got);
};
export const onReview = () => bump(c => c.kind === 'review');

export function claimContract() {
  const s = getSave();
  const c = s.contract;
  if (!c || c.claimed || c.done < c.n) return null;
  const tier = c.tier || 1;
  const coins = (60 + Math.floor(Math.random() * 40)) * tier * (c.kind === 'kill' ? 2 : 1);
  mutate(st => { st.contract.claimed = true; st.contractsDone = (st.contractsDone || 0) + 1; });
  addItems({ coins }, { source: 'contract' });
  let xp = 0;
  if (c.xpSkill) xp = grantXp(c.xpSkill, 40 * tier + 20);
  checkAchievements();
  return { coins, xp, xpSkill: c.xpSkill };
}
