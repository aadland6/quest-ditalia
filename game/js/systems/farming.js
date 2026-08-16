// farming.js (system) — plots, planting, growth, harvest.
// Every other skill feeds in: seeds (combat drops, bird nests, shop, chests),
// spades (Smithing), bonemeal from bones+clay (Crafting), the Greenhouse
// (Construction) speeds growth, and crops feed back into Crafting and healing.

import { getSave, mutate, level } from '../state.js';
import { CROP, CROPS, plotCount } from '../data/farming.js';
import { METALS } from '../data/items.js';
import { invQty, bankQty, removeItems, addItems } from './inventory.js';
import { getSave as save } from '../state.js';
import { grantXp, healPlayer, checkAchievements } from './progress.js';
import { askQuestion } from '../ui/questionModal.js';
import { onGather as contractGather } from './contracts.js';

const MIN = 6e4;

export function plots() {
  const s = getSave();
  const n = plotCount(level('farming'));
  const arr = (s.farm?.plots || []).slice(0, n);
  while (arr.length < n) arr.push(null);
  return arr;
}

export function spadeTier() {
  const s = getSave();
  for (let t = METALS.length - 1; t >= 0; t--) {
    const id = `${METALS[t]}_spade`;
    if ((s.inv[id] || 0) + (s.bankVault[id] || 0) > 0) return t;
  }
  return -1;
}
export const spadeDoubleChance = () => { const t = spadeTier(); return t < 0 ? 0 : 0.05 + t * 0.05; };

export function growMs(crop) {
  const greenhouse = getSave().home?.greenhouse || 0;
  return crop.growMin * MIN * (1 - 0.1 * greenhouse);
}

export function plotState(p) {
  if (!p) return { state: 'empty' };
  const crop = CROP[p.crop];
  const ready = Date.now() >= p.at + growMs(crop);
  return { state: ready ? 'ready' : 'growing', crop, readyAt: p.at + growMs(crop), fertilized: p.fert };
}

export function plantableCrops() {
  return CROPS.map(c => ({
    ...c,
    unlocked: level('farming') >= c.lvl,
    seeds: invQty(c.seed) + bankQty(c.seed),
  }));
}

// Plant a crop in plot i (question-driven). fertilize consumes 1 bonemeal for +50% yield.
export async function plant(i, cropId, fertilize) {
  const crop = CROP[cropId];
  if (level('farming') < crop.lvl) return { blocked: `Requires Farming ${crop.lvl}` };
  if (spadeTier() < 0) return { blocked: 'You need a spade (smith one — 2 bars at the anvil)' };
  if (invQty(crop.seed) + bankQty(crop.seed) < 1) return { blocked: `No ${crop.name.toLowerCase()} seeds — enemies, nests and chests drop them` };
  if (fertilize && invQty('bonemeal') + bankQty('bonemeal') < 1) fertilize = false;

  const res = await askQuestion({ icon: crop.icon, title: `Plant ${crop.name}`, sub: 'Farming · your farm' });
  if (!res) return null;
  mutate(s => { s.actions.farming = (s.actions.farming || 0) + 1; });
  if (!res.correct) { checkAchievements(); return { correct: false, msg: 'The seedbed is botched — seeds survive, this hour does not.' }; }

  removeItems({ [crop.seed]: 1 }, { useBank: true });
  if (fertilize) removeItems({ bonemeal: 1 }, { useBank: true });
  mutate(s => {
    if (!s.farm) s.farm = { plots: [] };
    while (s.farm.plots.length <= i) s.farm.plots.push(null);
    s.farm.plots[i] = { crop: cropId, at: Date.now(), fert: !!fertilize };
  });
  const xp = grantXp('farming', crop.plantXp);
  healPlayer(1);
  checkAchievements();
  return { correct: true, xp, crop };
}

// Harvest plot i (question-driven).
export async function harvest(i) {
  const p = plots()[i];
  const st = plotState(p);
  if (st.state !== 'ready') return { blocked: 'Not ready yet' };
  const crop = st.crop;

  const res = await askQuestion({ icon: crop.icon, title: `Harvest ${crop.name}`, sub: 'Farming · your farm' });
  if (!res) return null;
  mutate(s => { s.actions.farming = (s.actions.farming || 0) + 1; });
  if (!res.correct) { checkAchievements(); return { correct: false, msg: 'You bruise the crop — it needs another moment.' }; }

  let n = crop.yield[0] + Math.floor(Math.random() * (crop.yield[1] - crop.yield[0] + 1));
  if (p.fert) n = Math.ceil(n * 1.5);
  let doubled = false;
  if (Math.random() < spadeDoubleChance()) { n *= 2; doubled = true; }
  const gains = { [crop.out]: n };

  mutate(s => { s.farm.plots[i] = null; s.harvests = (s.harvests || 0) + 1; });
  const { banked } = addItems(gains, { source: 'gather' });
  contractGather(gains);
  const xp = grantXp('farming', crop.harvestXp);
  healPlayer(1);
  checkAchievements();
  return { correct: true, gains, xp, doubled, banked };
}
