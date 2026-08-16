// progress.js — xp grants (with perks & level-up detection) and achievement sweeps.
import { getSave, mutate, level, totalLevel, combatLevel, maxHp } from '../state.js';
import { perks } from './perks.js';
import { ACHIEVEMENTS } from '../data/achievements.js';
import { SKILL } from '../data/skills.js';

let notify = (msg, icon) => console.log(icon, msg);
export const setNotifier = fn => { notify = fn; };

// Grant xp (perk-boosted). Announces level-ups. Returns xp actually granted.
export function grantXp(skill, base) {
  if (base <= 0) return 0;
  const boosted = Math.max(1, Math.round(base * (1 + perks().xpBoost)));
  const before = level(skill);
  const hpBefore = maxHp();
  mutate(s => { s.xp[skill] = (s.xp[skill] || 0) + boosted; });
  const after = level(skill);
  if (after > before) {
    notify(`${SKILL[skill].name} level ${after}!`, '🎉');
    if (skill === 'hitpoints') {
      mutate(s => { s.hp += (maxHp() - hpBefore); }); // level-up heals the new max
    }
  }
  return boosted;
}

export function healPlayer(amount) {
  mutate(s => { s.hp = Math.min(maxHp(), s.hp + amount); });
}

export function checkAchievements() {
  const s = getSave();
  const ctx = { save: s, level, totalLevel, combatLevel };
  const fresh = [];
  for (const a of ACHIEVEMENTS) {
    if (s.ach[a.id]) continue;
    let ok = false;
    try { ok = a.check(ctx); } catch { /* defensive: bad check never crashes the game */ }
    if (ok) fresh.push(a);
  }
  if (fresh.length) {
    mutate(st => { for (const a of fresh) st.ach[a.id] = Date.now(); });
    for (const a of fresh) notify(`Achievement: ${a.name}`, a.icon);
  }
  return fresh;
}
