// combat.js — turn-based, question-driven combat.
// Correct answer → you strike (accuracy vs enemy defence, damage from strength/bow).
// Wrong answer → the enemy strikes you (mitigated by Defence + armour).
// 0 HP → safe retreat to town; no items lost.

import { getSave, mutate, level, maxHp } from '../state.js';
import { ENEMY } from '../data/enemies.js';
import { item } from '../data/items.js';
import { gearStats, weaponStyle } from './equipment.js';
import { perks } from './perks.js';
import { grantXp, checkAchievements } from './progress.js';
import { addItems, rollLoot, invQty, removeItems } from './inventory.js';
import { onKill as contractKill } from './contracts.js';

const clamp = (x, lo, hi) => Math.max(lo, Math.min(hi, x));

export function playerCombatProfile() {
  const g = gearStats();
  const p = perks();
  const style = weaponStyle();
  const s = getSave();
  if (style === 'ranged') {
    const ammo = s.equip.ammo && invQty(s.equip.ammo) > 0 ? s.equip.ammo : null;
    return {
      style, ammo,
      accRoll: (level('ranged') + 8) * (g.rAcc + 16) * (1 + p.accuracyBonus),
      maxHit: 2 + Math.floor(level('ranged') / 8) + Math.floor(g.rStr / 5) + p.maxHitBonus,
      xpSkill: 'ranged',
    };
  }
  return {
    style: 'melee', ammo: null,
    accRoll: (level('attack') + 8) * (g.acc + 16) * (1 + p.accuracyBonus),
    maxHit: 2 + Math.floor(level('strength') / 8) + Math.floor(g.str / 5) + p.maxHitBonus,
    xpSkill: s.style, // attack | strength | defence (player-chosen melee focus)
  };
}

export function startFight(enemyId) {
  const e = ENEMY[enemyId];
  return { enemy: e, enemyHp: e.hp, over: false, won: false, log: [] };
}

// Player lands an attack (called on a correct answer). Mutates fight.
export function playerAttack(fight) {
  const prof = playerCombatProfile();
  const e = fight.enemy;
  if (prof.style === 'ranged') {
    if (!prof.ammo) return { noAmmo: true };
    removeItems({ [prof.ammo]: 1 });
  }
  const defRoll = (e.def + 8) * 20;
  const hitChance = clamp(prof.accRoll / (prof.accRoll + defRoll), 0.25, 0.95);
  const hit = Math.random() < hitChance;
  const dmg = hit ? 1 + Math.floor(Math.random() * prof.maxHit) : 0;
  fight.enemyHp = Math.max(0, fight.enemyHp - dmg);

  const cxp = 1 + perks().combatXp; // Training Yard bonus
  let xp = 0, hpXp = 0;
  if (dmg > 0) {
    xp = grantXp(prof.xpSkill, Math.round(dmg * 4 * cxp));
    hpXp = grantXp('hitpoints', Math.max(1, Math.round(dmg * 1.33 * cxp)));
  }

  let result = { hit, dmg, xp, hpXp, style: prof.style };
  if (fight.enemyHp <= 0) {
    fight.over = true; fight.won = true;
    result.loot = onKill(e);
    result.bonusXp = grantXp(prof.xpSkill, Math.round(e.xp * 0.7 * cxp));
    result.bonusHpXp = grantXp('hitpoints', Math.round(e.xp * 0.3 * cxp));
  }
  return result;
}

// Enemy retaliates (called on a wrong answer). Mutates save hp / fight.
export function enemyAttack(fight) {
  const e = fight.enemy;
  const g = gearStats();
  const p = perks();
  const atkRoll = (e.att + 8) * 24;
  const defRoll = (level('defence') + 8) * (g.def + p.defBonus + 12);
  const hitChance = clamp(atkRoll / (atkRoll + defRoll), 0.1, 0.9);
  const hit = Math.random() < hitChance;
  const dmg = hit ? 1 + Math.floor(Math.random() * e.maxHit) : 0;
  let fled = false;
  if (dmg > 0) {
    mutate(s => { s.hp = Math.max(0, s.hp - dmg); });
    if (getSave().hp <= 0) {
      fled = true;
      fight.over = true; fight.won = false;
      mutate(s => { s.hp = 1; });
    }
  }
  return { hit, dmg, fled };
}

function onKill(e) {
  mutate(s => { s.kills[e.id] = (s.kills[e.id] || 0) + 1; });
  contractKill(e.id);
  let gains = rollLoot(e.loot);
  if (Math.random() < perks().lootDouble) {
    for (const k of Object.keys(gains)) gains[k] *= 2;
  }
  const { banked } = addItems(gains, { source: 'combat' });
  checkAchievements();
  return { gains, banked };
}

export function useBandage() {
  return eatFood('bandage');
}

// Eat/apply any healing consumable (food, bandages, salves) from the inventory.
export function eatFood(id) {
  const it = item(id);
  if (!it.heal || invQty(id) < 1 || getSave().hp >= maxHp()) return false;
  removeItems({ [id]: 1 });
  mutate(s => { s.hp = Math.min(maxHp(), s.hp + Math.ceil(maxHp() * it.heal)); });
  return true;
}

// Best owned healing item, for the combat quick-heal button.
export function bestFood() {
  const s = getSave();
  let best = null;
  for (const [id, qty] of Object.entries(s.inv)) {
    if (qty < 1) continue;
    const it = item(id);
    if (it.heal && (!best || it.heal > item(best).heal)) best = id;
  }
  return best;
}
