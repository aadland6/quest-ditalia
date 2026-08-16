// recipes.js — production recipes. One recipe = one action = one question.
// { id, skill, name, lvl, xp, in:{item:qty}, out:{item:qty}, station }
// Stations: furnace, anvil (Smithing — in town workshop & keep forge), bench (Fletching/Crafting — anywhere),
// loom (Crafting in town), sawmill (buy plank conversion — handled by shop, not here).

import { METALS, METAL_NAMES, WOODS, WOOD_NAMES } from './items.js';

export const RECIPES = [];
const add = r => { RECIPES.push(r); return r; };

// ---------- SMITHING: smelting ----------
const SMELT = [
  { m: 'bronze', lvl: 1, xp: 8, in: { copper_ore: 1, tin_ore: 1 } },
  { m: 'iron', lvl: 12, xp: 15, in: { iron_ore: 1 } },
  { m: 'steel', lvl: 22, xp: 22, in: { iron_ore: 1, coal: 1 } },
  { m: 'mithril', lvl: 35, xp: 35, in: { mithril_ore: 1, coal: 2 } },
  { m: 'adamant', lvl: 50, xp: 45, in: { adamant_ore: 1, coal: 3 } },
  { m: 'runite', lvl: 65, xp: 60, in: { runite_ore: 1, coal: 4 } },
];
SMELT.forEach((s, t) => add({
  id: `smelt_${s.m}`, skill: 'smithing', name: `Smelt ${METAL_NAMES[t].toLowerCase()} bar`,
  lvl: s.lvl, xp: s.xp, in: s.in, out: { [`${s.m}_bar`]: 1 }, station: 'furnace',
}));
add({ id: 'smelt_gold', skill: 'smithing', name: 'Smelt gold bar', lvl: 30, xp: 25, in: { gold_ore: 1 }, out: { gold_bar: 1 }, station: 'furnace' });
add({ id: 'smelt_silver', skill: 'smithing', name: 'Smelt silver bar', lvl: 18, xp: 18, in: { silver_ore: 1 }, out: { silver_bar: 1 }, station: 'furnace' });

// ---------- SMITHING: forging (per metal tier) ----------
const FORGE_LVL = [1, 12, 22, 35, 50, 65]; // base level per tier; each piece adds an offset
const PIECES = [
  { key: 'dagger', name: 'dagger', bars: 1, off: 0 },
  { key: 'axe', name: 'axe', bars: 1, off: 1 },
  { key: 'helm', name: 'helm', bars: 2, off: 2 },
  { key: 'pickaxe', name: 'pickaxe', bars: 2, off: 3 },
  { key: 'sword', name: 'sword', bars: 2, off: 4 },
  { key: 'scimitar', name: 'scimitar', bars: 3, off: 5 },
  { key: 'platelegs', name: 'platelegs', bars: 3, off: 6 },
  { key: 'kiteshield', name: 'kiteshield', bars: 3, off: 7 },
  { key: 'platebody', name: 'platebody', bars: 5, off: 8 },
  { key: 'spade', name: 'spade', bars: 2, off: 2 },
];
METALS.forEach((m, t) => {
  const barXp = [12, 25, 37, 50, 62, 75][t];
  for (const p of PIECES) add({
    id: `forge_${m}_${p.key}`, skill: 'smithing', name: `Forge ${METAL_NAMES[t].toLowerCase()} ${p.name}`,
    lvl: Math.min(99, FORGE_LVL[t] + p.off), xp: barXp * p.bars,
    in: { [`${m}_bar`]: p.bars }, out: { [`${m}_${p.key}`]: 1 }, station: 'anvil',
  });
  add({
    id: `forge_${m}_arrowheads`, skill: 'smithing', name: `Forge ${METAL_NAMES[t].toLowerCase()} arrowheads`,
    lvl: Math.min(99, FORGE_LVL[t] + 3), xp: barXp,
    in: { [`${m}_bar`]: 1 }, out: { [`${m}_arrowheads`]: 15 }, station: 'anvil',
  });
});
add({ id: 'forge_nails', skill: 'smithing', name: 'Forge nails', lvl: 4, xp: 12, in: { bronze_bar: 1 }, out: { nails: 15 }, station: 'anvil' });

// ---------- FLETCHING ----------
const FLETCH_LVL = [1, 10, 20, 30, 42, 54, 66];
WOODS.forEach((w, t) => {
  const logId = w === 'wood' ? 'logs' : `${w}_logs`;
  add({
    id: `carve_${w}_stave`, skill: 'fletching', name: `Carve ${WOOD_NAMES[t].toLowerCase()} bow stave`,
    lvl: FLETCH_LVL[t], xp: [10, 18, 26, 38, 55, 75, 95][t], in: { [logId]: 1 }, out: { [`${w}_stave`]: 1 }, station: 'bench',
  });
  add({
    id: `string_${w}_bow`, skill: 'fletching', name: `String ${WOOD_NAMES[t].toLowerCase()} bow`,
    lvl: FLETCH_LVL[t] + 2, xp: [12, 22, 32, 46, 65, 88, 110][t], in: { [`${w}_stave`]: 1, bowstring: 1 }, out: { [`${w}_bow`]: 1 }, station: 'bench',
  });
  add({
    id: `carve_${w}_longstave`, skill: 'fletching', name: `Carve ${WOOD_NAMES[t].toLowerCase()} longbow stave`,
    lvl: Math.min(99, FLETCH_LVL[t] + 4), xp: [16, 28, 42, 60, 88, 120, 150][t], in: { [logId]: 2 }, out: { [`${w}_longstave`]: 1 }, station: 'bench',
  });
  add({
    id: `string_${w}_longbow`, skill: 'fletching', name: `String ${WOOD_NAMES[t].toLowerCase()} longbow`,
    lvl: Math.min(99, FLETCH_LVL[t] + 6), xp: [18, 33, 48, 70, 98, 132, 165][t], in: { [`${w}_longstave`]: 1, bowstring: 1 }, out: { [`${w}_longbow`]: 1 }, station: 'bench',
  });
  add({
    id: `cut_${w}_shafts`, skill: 'fletching', name: `Cut arrow shafts (${WOOD_NAMES[t].toLowerCase()})`,
    lvl: Math.max(1, FLETCH_LVL[t] - 1), xp: [8, 14, 22, 32, 45, 60, 78][t], in: { [logId]: 1 }, out: { arrow_shaft: 15 + t * 3 }, station: 'bench',
  });
});
METALS.forEach((m, t) => add({
  id: `fletch_${m}_arrows`, skill: 'fletching', name: `Fletch ${METAL_NAMES[t].toLowerCase()} arrows`,
  lvl: [1, 12, 22, 35, 50, 65][t] + 2, xp: [15, 25, 38, 55, 70, 90][t],
  in: { arrow_shaft: 15, feather: 15, [`${m}_arrowheads`]: 15 }, out: { [`${m}_arrow`]: 15 }, station: 'bench',
}));

// ---------- CRAFTING ----------
add({ id: 'spin_bowstring', skill: 'crafting', name: 'Spin bowstring', lvl: 1, xp: 10, in: { flax: 1 }, out: { bowstring: 1 }, station: 'loom' });
add({ id: 'weave_bandage', skill: 'crafting', name: 'Weave linen bandage', lvl: 5, xp: 14, in: { flax: 2 }, out: { bandage: 1 }, station: 'loom' });
add({ id: 'tan_leather', skill: 'crafting', name: 'Tan leather', lvl: 1, xp: 8, in: { rat_fur: 1 }, out: { leather: 1 }, station: 'bench' });
const LEATHER_SETS = [
  { set: 'leather', name: 'leather', lvl: 3, mat: { leather: 1 }, xps: [16, 25, 20] },
  { set: 'studded', name: 'studded', lvl: 22, mat: { leather: 1, iron_bar: 1 }, xps: [30, 45, 38] },
  { set: 'wyrm', name: 'wyrm-hide', lvl: 45, mat: { wyrm_hide: 1 }, xps: [60, 90, 75] },
];
for (const s of LEATHER_SETS) {
  add({ id: `craft_${s.set}_coif`, skill: 'crafting', name: `Sew ${s.name} coif`, lvl: s.lvl, xp: s.xps[0], in: { ...s.mat }, out: { [`${s.set}_coif`]: 1 }, station: 'bench' });
  add({ id: `craft_${s.set}_body`, skill: 'crafting', name: `Sew ${s.name} body`, lvl: s.lvl + 4, xp: s.xps[1], in: scale(s.mat, 3), out: { [`${s.set}_body`]: 1 }, station: 'bench' });
  add({ id: `craft_${s.set}_chaps`, skill: 'crafting', name: `Sew ${s.name} chaps`, lvl: s.lvl + 2, xp: s.xps[2], in: scale(s.mat, 2), out: { [`${s.set}_chaps`]: 1 }, station: 'bench' });
}
const GEM_CUTS = [['sapphire', 12, 25], ['emerald', 25, 45], ['ruby', 38, 70], ['diamond', 55, 110], ['amethyst', 70, 150]];
for (const [g, lvl, xp] of GEM_CUTS) {
  add({ id: `cut_${g}`, skill: 'crafting', name: `Cut ${g}`, lvl, xp, in: { [`uncut_${g}`]: 1 }, out: { [g]: 1 }, station: 'bench' });
  add({ id: `craft_${g}_ring`, skill: 'crafting', name: `Craft ${g} ring`, lvl: lvl + 3, xp: Math.round(xp * 1.5), in: { [g]: 1, silver_bar: 1 }, out: { [`${g}_ring`]: 1 }, station: 'bench' });
  add({ id: `craft_${g}_amulet`, skill: 'crafting', name: `Craft ${g} amulet`, lvl: lvl + 6, xp: xp * 2, in: { [g]: 1, gold_bar: 1 }, out: { [`${g}_amulet`]: 1 }, station: 'bench' });
}

// pottery & satchels
add({ id: 'fire_pot', skill: 'crafting', name: 'Fire clay pot', lvl: 8, xp: 15, in: { clay: 2 }, out: { pot: 1 }, station: 'loom' });

// farming support: fertilizer + herb salves (farming feeds back into crafting)
add({ id: 'grind_bonemeal', skill: 'crafting', name: 'Grind bonemeal', lvl: 4, xp: 10, in: { bones: 2, clay: 1 }, out: { bonemeal: 2 }, station: 'loom' });
add({ id: 'mix_healing_salve', skill: 'crafting', name: 'Mix healing salve', lvl: 18, xp: 45, in: { marshweed: 2, flax: 1, pot: 1 }, out: { healing_salve: 1 }, station: 'loom' });
add({ id: 'mix_wyrmbane_salve', skill: 'crafting', name: 'Mix wyrmbane salve', lvl: 42, xp: 110, in: { wyrmbane: 2, marshweed: 1, pot: 1 }, out: { wyrmbane_salve: 1 }, station: 'loom' });
add({ id: 'distil_starbloom', skill: 'crafting', name: 'Distil starbloom elixir', lvl: 72, xp: 260, in: { starbloom: 1, wyrmbane: 1, pot: 1 }, out: { starbloom_elixir: 1 }, station: 'loom' });
add({ id: 'craft_leather_satchel', skill: 'crafting', name: 'Stitch leather satchel', lvl: 30, xp: 120,
  in: { leather: 6, wolf_pelt: 2, bowstring: 1 }, out: { leather_satchel: 1 }, station: 'bench' });
add({ id: 'craft_hunters_satchel', skill: 'crafting', name: "Stitch hunter's satchel", lvl: 55, xp: 300,
  in: { leather: 10, wolf_pelt: 5, iron_bar: 1, bowstring: 2 }, out: { hunters_satchel: 1 }, station: 'bench' });
add({ id: 'craft_borsa_viaggiatore', skill: 'crafting', name: "Stitch traveler's bag", lvl: 75, xp: 700,
  in: { wyrm_hide: 3, wolf_pelt: 8, gold_bar: 1, bowstring: 3 }, out: { borsa_viaggiatore: 1 }, station: 'bench' });

function scale(mat, n) {
  return Object.fromEntries(Object.entries(mat).map(([k, v]) => [k, v * n]));
}

export const RECIPE = Object.fromEntries(RECIPES.map(r => [r.id, r]));
export const recipesFor = (skill, station = null) =>
  RECIPES.filter(r => r.skill === skill && (!station || r.station === station));
