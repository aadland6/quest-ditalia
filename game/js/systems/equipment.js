// equipment.js — equip slots, gear stat aggregation, tool lookup.
import { getSave, mutate, level } from '../state.js';
import { item, METALS } from '../data/items.js';
import { invQty } from './inventory.js';

export const SLOTS = ['weapon', 'shield', 'head', 'body', 'legs', 'ammo', 'amulet', 'ring'];

export function meetsReqs(id) {
  const eq = item(id).equip;
  if (!eq) return false;
  return Object.entries(eq.req || {}).every(([sk, lvl]) => level(sk) >= lvl);
}

export function reqText(id) {
  const eq = item(id).equip;
  return Object.entries(eq?.req || {}).map(([sk, lvl]) => `${sk} ${lvl}`).join(', ');
}

// Equip from inventory. Ammo stacks fully into the slot (qty tracked in inv still).
export function equipItem(id) {
  const it = item(id);
  if (!it.equip || !meetsReqs(id) || invQty(id) < 1) return false;
  mutate(s => {
    const slot = it.equip.slot;
    if (slot !== 'ammo') {
      // swap: previous piece back to inventory
      const prev = s.equip[slot];
      if (prev) s.inv[prev] = (s.inv[prev] || 0) + 1;
      s.inv[id] -= 1; if (!s.inv[id]) delete s.inv[id];
    }
    s.equip[slot] = id; // ammo: reference only, consumed from inv per shot
  });
  return true;
}

export function unequip(slot) {
  mutate(s => {
    const id = s.equip[slot];
    if (!id) return;
    if (slot !== 'ammo') s.inv[id] = (s.inv[id] || 0) + 1;
    delete s.equip[slot];
  });
}

export function gearStats() {
  const s = getSave();
  const agg = { acc: 0, str: 0, def: 0, rAcc: 0, rStr: 0 };
  for (const [slot, id] of Object.entries(s.equip)) {
    if (!id) continue;
    if (slot === 'ammo' && invQty(id) < 1) continue; // out of arrows
    const eq = item(id).equip || {};
    agg.acc += eq.acc || 0; agg.str += eq.str || 0; agg.def += eq.def || 0;
    agg.rAcc += eq.rAcc || 0; agg.rStr += eq.rStr || 0;
  }
  return agg;
}

export const weaponStyle = () => {
  const w = getSave().equip.weapon;
  return w ? (item(w).equip.style || 'melee') : 'melee';
};

// Best owned tool for a gathering skill (checks inventory AND bank — tools are QoL)
export function bestTool(skill) {
  const s = getSave();
  for (let t = METALS.length - 1; t >= 0; t--) {
    const id = `${METALS[t]}_${skill === 'mining' ? 'pickaxe' : 'axe'}`;
    if ((s.inv[id] || 0) + (s.bankVault[id] || 0) > 0) return { id, tier: t };
  }
  return null;
}

export const toolDoubleChance = skill => {
  if (skill !== 'mining' && skill !== 'woodcutting') return 0;
  const t = bestTool(skill);
  return t ? 0.05 + t.tier * 0.05 : 0;
};
