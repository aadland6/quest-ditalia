// perks.js — aggregates passive bonuses from home rooms and equipped jewellery.
import { getSave } from '../state.js';

const AMULET_PERKS = {
  sapphire_amulet: { xpBoost: 0.05 },
  emerald_amulet: { lootDouble: 0.10 },
  ruby_amulet: { accuracyBonus: 0.08 },
  diamond_amulet: { maxHitBonus: 1, xpBoost: 0.05 },
  amethyst_amulet: { xpBoost: 0.08, maxHitBonus: 1 },
};
const RING_PERKS = {
  sapphire_ring: { xpBoost: 0.03 },
  emerald_ring: { lootDouble: 0.06 },
  ruby_ring: { accuracyBonus: 0.05 },
  diamond_ring: { coinBoost: 0.08 },
  amethyst_ring: { xpBoost: 0.04, lootDouble: 0.04 },
};

export function perks() {
  const s = getSave();
  const home = s.home || {};
  const p = {
    xpBoost: (home.study || 0) * 0.04,          // Study room: +4%/tier
    combatXp: (home.training_yard || 0) * 0.04, // Training Yard: +4%/tier combat xp
    refundChance: (home.workshop || 0) * 0.07,  // Workshop: material refund
    hearthHeal: 0.25 + (home.hearth || 0) * 0.25,
    accuracyBonus: (home.armory || 0) * 0.03,
    defBonus: (home.armory || 0),
    coinBoost: (home.trophy || 0) * 0.05,
    crateBonus: (home.observatory || 0),        // Observatory: extra library crate rolls
    contractTier: (home.map_room || 0),         // Sala delle Mappe: daily contracts
    lootDouble: 0,
    maxHitBonus: 0,
  };
  for (const bonus of [AMULET_PERKS[s.equip.amulet], RING_PERKS[s.equip.ring]]) {
    if (!bonus) continue;
    for (const [k, v] of Object.entries(bonus)) p[k] += v;
  }
  return p;
}
