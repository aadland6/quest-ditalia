// activity.js — gathering and production actions. Each action = one question.
// Correct → yields + xp (+streak/tool bonuses, +1 hp rest). Wrong → the action
// misses; materials are never consumed on a miss (studying is punished enough).

import { getSave, mutate, level } from '../state.js';
import { GEM_TABLE } from '../data/areas.js';
import { item } from '../data/items.js';
import { addItems, removeItems, canAfford } from './inventory.js';
import { toolDoubleChance, bestTool } from './equipment.js';
import { perks } from './perks.js';
import { grantXp, healPlayer, checkAchievements } from './progress.js';
import { askQuestion } from '../ui/questionModal.js';
import { onGather as contractGather } from './contracts.js';

// bird nests occasionally hold seeds (Woodcutting feeds Farming)
const NEST_SEEDS = [
  { item: 'seed_potato', w: 30 }, { item: 'seed_flax', w: 28 }, { item: 'seed_marshweed', w: 22 },
  { item: 'seed_corn', w: 12 }, { item: 'seed_wyrmbane', w: 5 }, { item: 'seed_wheat', w: 2 }, { item: 'seed_starbloom', w: 1 },
];

export function nodeAvailable(node) {
  return level(node.skill) >= node.lvl;
}

export function toolMissing(node) {
  if (node.skill === 'mining' && node.id !== 'claypit') return !bestTool('mining');
  if (node.skill === 'woodcutting' && node.id !== 'nests') return !bestTool('woodcutting');
  return false;
}

function streakXpMult() {
  const st = getSave().streak;
  if (st >= 10) return 1.5;
  if (st >= 5) return 1.25;
  return 1;
}

function pickGem() {
  const total = GEM_TABLE.reduce((a, g) => a + g.w, 0);
  let r = Math.random() * total;
  for (const g of GEM_TABLE) { r -= g.w; if (r <= 0) return g.item; }
  return GEM_TABLE[0].item;
}

// One gathering action at an area node. Returns a summary or null (aborted / gated).
export async function doGather(area, node) {
  if (!nodeAvailable(node)) return { blocked: `Requires ${node.skill} level ${node.lvl}` };
  if (toolMissing(node)) return { blocked: `You need a ${node.skill === 'mining' ? 'pickaxe' : 'axe'} (smith one, or buy bronze at the store)` };

  const res = await askQuestion({ icon: node.icon, title: node.name, sub: `${cap(node.skill)} · ${area.name}` });
  if (!res) return null;

  mutate(s => { s.actions[node.skill] = (s.actions[node.skill] || 0) + 1; });

  if (!res.correct) {
    checkAchievements();
    return { correct: false, msg: 'The attempt slips — nothing gained.' };
  }

  // resolve yield
  let gains = node.out === 'gem' ? { [pickGem()]: 1 } : { ...node.out };
  if (node.id === 'nests' && Math.random() < 0.35) {
    const total = NEST_SEEDS.reduce((a, s) => a + s.w, 0);
    let r = Math.random() * total;
    for (const s of NEST_SEEDS) { r -= s.w; if (r <= 0) { gains[s.item] = (gains[s.item] || 0) + 1; break; } }
  }
  let doubled = false;
  if (Math.random() < toolDoubleChance(node.skill)) {
    doubled = true;
    gains = Object.fromEntries(Object.entries(gains).map(([k, v]) => [k, v * 2]));
  }
  const streak = getSave().streak;
  if (streak > 0 && streak % 10 === 0) { // every 10th streak answer: bonus yield
    doubled = true;
    gains = Object.fromEntries(Object.entries(gains).map(([k, v]) => [k, v * 2]));
  }

  const { banked } = addItems(gains, { source: 'gather' });
  contractGather(gains);
  const xp = grantXp(node.skill, Math.round(node.xp * streakXpMult()));
  healPlayer(1);
  checkAchievements();

  return { correct: true, gains, xp, doubled, banked, skill: node.skill };
}

// One production action (recipe). In town, materials may draw from the bank.
export async function doRecipe(recipe, { useBank = true, stationIcon = '⚒️', stationName = '' } = {}) {
  if (level(recipe.skill) < recipe.lvl) return { blocked: `Requires ${recipe.skill} level ${recipe.lvl}` };
  if (!canAfford(recipe.in, { useBank })) return { blocked: 'Missing materials' };

  const res = await askQuestion({ icon: stationIcon, title: recipe.name, sub: `${cap(recipe.skill)}${stationName ? ' · ' + stationName : ''}` });
  if (!res) return null;

  mutate(s => { s.actions[recipe.skill] = (s.actions[recipe.skill] || 0) + 1; });

  if (!res.correct) {
    checkAchievements();
    return { correct: false, msg: 'Ruined attempt — materials survive, pride does not.' };
  }

  const refunded = Math.random() < perks().refundChance;
  if (!refunded) removeItems(recipe.in, { useBank });
  addItems(recipe.out, { source: 'craft' });
  const xp = grantXp(recipe.skill, Math.round(recipe.xp * streakXpMult()));
  healPlayer(1);
  checkAchievements();

  return { correct: true, gains: recipe.out, xp, refunded };
}

const cap = s => s.charAt(0).toUpperCase() + s.slice(1);
