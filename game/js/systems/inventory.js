// inventory.js — inventory (28 slots, stack cap per slot) and bank (unlimited).
// Every acquisition passes through addItems() so the collection log stays complete.

import { getSave, mutate } from '../state.js';
import { item, ITEMS } from '../data/items.js';
import { perks } from './perks.js';

export const INV_SLOTS = 28;                        // base capacity
export const STACK_CAP = 100;                       // per-slot cap for materials
const UNCAPPED = new Set(['currency', 'ammo', 'key']);

// Effective capacity: base + best owned satchel (passive; inventory or bank)
export function invCap() {
  const s = getSave();
  let best = 0;
  for (const [id, it] of Object.entries(ITEMS)) {
    if (it.cat === 'satchel' && ((s.inv[id] || 0) + (s.bankVault[id] || 0)) > 0) {
      best = Math.max(best, it.carry || 0);
    }
  }
  return INV_SLOTS + best;
}

const cap = id => UNCAPPED.has(item(id).cat) ? Infinity : STACK_CAP;

export const invQty = id => getSave().inv[id] || 0;
export const bankQty = id => getSave().bankVault[id] || 0;
export const totalQty = id => invQty(id) + bankQty(id);
export const usedSlots = () => Object.keys(getSave().inv).length;

// Add items to inventory; overflow goes to the bank (with a note in the result).
// Returns { added, banked }.
export function addItems(gains, { source = 'other' } = {}) {
  return mutate(s => {
    let banked = 0, added = 0;
    for (let [id, qty] of Object.entries(gains)) {
      if (qty <= 0) continue;
      if (id === 'coins' && perks().coinBoost > 0 && source !== 'internal') {
        qty = Math.ceil(qty * (1 + perks().coinBoost));
      }
      s.log[id] ??= Date.now();
      const have = s.inv[id] || 0;
      const room = have > 0 || Object.keys(s.inv).length < invCap()
        ? Math.max(0, cap(id) - have) : 0;
      const toInv = Math.min(qty, room);
      if (toInv > 0) s.inv[id] = have + toInv;
      const rest = qty - toInv;
      if (rest > 0) { s.bankVault[id] = (s.bankVault[id] || 0) + rest; banked += rest; }
      added += toInv;
    }
    return { added, banked };
  });
}

export function removeItems(costs, { useBank = false } = {}) {
  if (!canAfford(costs, { useBank })) return false;
  mutate(s => {
    for (const [id, qty] of Object.entries(costs)) {
      let need = qty;
      const fromInv = Math.min(need, s.inv[id] || 0);
      if (fromInv) { s.inv[id] -= fromInv; if (!s.inv[id]) delete s.inv[id]; need -= fromInv; }
      if (need > 0 && useBank) {
        s.bankVault[id] -= need;
        if (!s.bankVault[id]) delete s.bankVault[id];
      }
    }
  });
  return true;
}

export function canAfford(costs, { useBank = false } = {}) {
  return Object.entries(costs).every(([id, qty]) =>
    (invQty(id) + (useBank ? bankQty(id) : 0)) >= qty);
}

export function deposit(id, qty = Infinity) {
  mutate(s => {
    const n = Math.min(qty, s.inv[id] || 0);
    if (n <= 0) return;
    s.inv[id] -= n; if (!s.inv[id]) delete s.inv[id];
    s.bankVault[id] = (s.bankVault[id] || 0) + n;
  });
}

export function withdraw(id, qty = Infinity) {
  mutate(s => {
    const have = s.bankVault[id] || 0;
    if (have <= 0) return;
    const invHave = s.inv[id] || 0;
    const room = invHave > 0 || Object.keys(s.inv).length < invCap()
      ? Math.max(0, cap(id) - invHave) : 0;
    const n = Math.min(qty, have, room);
    if (n <= 0) return;
    s.bankVault[id] -= n; if (!s.bankVault[id]) delete s.bankVault[id];
    s.inv[id] = invHave + n;
  });
}

export function depositAll() {
  mutate(s => {
    for (const [id, qty] of Object.entries(s.inv)) {
      if (item(id).cat === 'currency') continue;           // keep coins on you
      if (Object.values(s.equip).includes(id) && qty === 1) continue; // safety: equipped refs live in equip, not inv
      s.bankVault[id] = (s.bankVault[id] || 0) + qty;
      delete s.inv[id];
    }
  });
}

// Weighted / chance-based loot roll from a table [{item,min,max,chance}]
export function rollLoot(table, rng = Math.random) {
  const gains = {};
  for (const row of table) {
    if (rng() <= (row.chance ?? 1)) {
      const qty = row.min + Math.floor(rng() * (row.max - row.min + 1));
      if (qty > 0) gains[row.item] = (gains[row.item] || 0) + qty;
    }
  }
  return gains;
}
