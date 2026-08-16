// chests.js — chest gauntlets: N questions, key + cooldown gating, perfect bonus.
import { getSave, mutate } from '../state.js';
import { addItems, rollLoot, invQty, bankQty, removeItems } from './inventory.js';
import { perks } from './perks.js';
import { checkAchievements } from './progress.js';

const HOUR = 36e5;

export function chestStatus(chest) {
  const s = getSave();
  const last = s.chests[chest.id] || 0;
  const readyAt = last + chest.cooldownH * HOUR;
  const onCooldown = Date.now() < readyAt;
  const needsKey = !!chest.keyItem;
  const hasKey = needsKey ? (invQty(chest.keyItem) + bankQty(chest.keyItem)) > 0 : true;
  return { onCooldown, readyAt, needsKey, hasKey, canOpen: !onCooldown && hasKey };
}

// Complete a run: consume key, set cooldown, roll loot (twice if perfect).
export function completeChest(chest, perfect) {
  if (chest.keyItem) removeItems({ [chest.keyItem]: 1 }, { useBank: true });
  mutate(s => {
    s.chests[chest.id] = Date.now();
    if (perfect) s.perfectChests = (s.perfectChests || 0) + 1;
  });
  let gains = rollLoot(chest.loot);
  if (perfect) {
    const second = rollLoot(chest.loot);
    for (const [k, v] of Object.entries(second)) gains[k] = (gains[k] || 0) + v;
  }
  if (Math.random() < perks().lootDouble) {
    for (const k of Object.keys(gains)) gains[k] *= 2;
  }
  const { banked } = addItems(gains, { source: 'chest' });
  checkAchievements();
  return { gains, banked };
}
