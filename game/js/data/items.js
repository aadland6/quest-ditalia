// items.js — full item registry. Items are flat records:
// { id, name, icon, cat, value, tier?, equip?: { slot, req: {skill:lvl}, acc, str, def, rAcc, rStr }, heal?, desc? }
// Everything stacks; inventory slots are per item type.

export const METALS = ['bronze', 'iron', 'steel', 'mithril', 'adamant', 'runite'];
export const METAL_NAMES = ['Bronze', 'Iron', 'Steel', 'Mithril', 'Adamant', 'Runite'];
export const WOODS = ['wood', 'oak', 'teak', 'willow', 'maple', 'elder', 'yew'];
export const WOOD_NAMES = ['Wood', 'Oak', 'Teak', 'Willow', 'Maple', 'Elder', 'Yew'];

const R = {}; // registry
const add = it => { R[it.id] = it; return it; };

// ---- currencies & misc ----
add({ id: 'coins', name: 'Coins', icon: '🪙', cat: 'currency', value: 1 });
add({ id: 'bones', name: 'Bones', icon: '🦴', cat: 'loot', value: 6, desc: 'Remains of the fallen. The general store buys them.' });
add({ id: 'feather', name: 'Feather', icon: '🪶', cat: 'material', value: 2, desc: 'Fletching material for arrows.' });
add({ id: 'flax', name: 'Flax', icon: '🌾', cat: 'material', value: 3, desc: 'Spin into bowstrings, or weave bandages.' });
add({ id: 'bowstring', name: 'Bowstring', icon: '🧶', cat: 'material', value: 12, desc: 'Spun flax. Strings a carved bow stave.' });
add({ id: 'bandage', name: 'Linen bandage', icon: '🩹', cat: 'consumable', value: 20, heal: 0.35, desc: 'Restores 35% of your hitpoints.' });
add({ id: 'clay', name: 'Clay', icon: '🧱', cat: 'material', value: 4, desc: 'Construction material for hearths and gardens.' });
add({ id: 'stone', name: 'Stone block', icon: '🪨', cat: 'material', value: 8, desc: 'Quarried stone for construction.' });
add({ id: 'nails', name: 'Nails', icon: '📌', cat: 'material', value: 3, desc: 'Smithed nails, 15 to a bar. Construction staple.' });
add({ id: 'rat_fur', name: 'Rat fur', icon: '🐀', cat: 'material', value: 4, desc: 'Tans into leather.' });
add({ id: 'wolf_pelt', name: 'Wolf pelt', icon: '🐺', cat: 'material', value: 18, desc: 'Thick and warm. Satchel-making material.' });
add({ id: 'pot', name: 'Clay pot', icon: '🏺', cat: 'material', value: 12, desc: 'Fired clay. Gardens and observatories want them.' });
add({ id: 'leather', name: 'Leather', icon: '🟫', cat: 'material', value: 10, desc: 'Tanned fur, ready for the needle.' });
add({ id: 'wyrm_hide', name: 'Wyrm hide', icon: '🐉', cat: 'material', value: 220, desc: 'Scaled hide of a wyrm. The finest ranged armour.' });
add({ id: 'arrow_shaft', name: 'Arrow shaft', icon: '〡', cat: 'material', value: 1, desc: 'Cut from logs, 15 at a time.' });

// ---- keys ----
add({ id: 'bandit_key', name: 'Bandit key', icon: '🗝️', cat: 'key', value: 0, desc: 'Opens the Stolen Strongbox on Passo dei Briganti.' });
add({ id: 'keep_key', name: 'Keep key', icon: '🗝️', cat: 'key', value: 0, desc: 'Opens the Keep Vault in the Rocca Diroccata.' });
add({ id: 'wyrm_key', name: 'Wyrm key', icon: '🗝️', cat: 'key', value: 0, desc: 'Opens the Wyrm Hoard atop Picco del Drago.' });

// ---- ores & smelting ----
const ORES = [
  ['copper_ore', 'Copper ore', 5], ['tin_ore', 'Tin ore', 5], ['iron_ore', 'Iron ore', 15],
  ['silver_ore', 'Silver ore', 40], ['coal', 'Coal', 25], ['gold_ore', 'Gold ore', 60],
  ['mithril_ore', 'Mithril ore', 80], ['adamant_ore', 'Adamantite ore', 160], ['runite_ore', 'Runite ore', 320],
];
for (const [id, name, value] of ORES) add({ id, name, icon: '⛰️', cat: 'ore', value });
add({ id: 'granite', name: 'Granite block', icon: '🗿', cat: 'material', value: 30, desc: 'Dense quarried granite for serious construction.' });

const BAR_VALUES = [12, 30, 60, 160, 320, 640];
METALS.forEach((m, t) => add({ id: `${m}_bar`, name: `${METAL_NAMES[t]} bar`, icon: '🧈', cat: 'bar', tier: t, value: BAR_VALUES[t] }));
add({ id: 'gold_bar', name: 'Gold bar', icon: '🧈', cat: 'bar', value: 120, desc: 'For jewellery, not war.' });
add({ id: 'silver_bar', name: 'Silver bar', icon: '🧈', cat: 'bar', value: 80, desc: 'For rings and finework.' });

// ---- gems ----
const GEMS = [['sapphire', 'Sapphire', '🔷', 80], ['emerald', 'Emerald', '🟢', 140], ['ruby', 'Ruby', '🔴', 240], ['diamond', 'Diamond', '💠', 480], ['amethyst', 'Amethyst', '🟣', 900]];
for (const [id, name, icon, value] of GEMS) {
  add({ id: `uncut_${id}`, name: `Uncut ${name.toLowerCase()}`, icon: '💎', cat: 'gem', value: Math.floor(value / 2) });
  add({ id, name, icon, cat: 'gem', value });
}

// ---- logs & planks ----
const LOG_VALUES = [4, 12, 22, 35, 80, 140, 200];
WOODS.forEach((w, t) => {
  const base = w === 'wood' ? 'logs' : `${w}_logs`;
  add({ id: base, name: w === 'wood' ? 'Logs' : `${WOOD_NAMES[t]} logs`, icon: '🪵', cat: 'log', tier: t, value: LOG_VALUES[t] });
  add({ id: w === 'wood' ? 'plank' : `${w}_plank`, name: `${WOOD_NAMES[t]} plank`, icon: '🟧', cat: 'plank', tier: t, value: LOG_VALUES[t] * 3 });
});

// ---- tools (best owned is auto-used) ----
METALS.forEach((m, t) => {
  add({ id: `${m}_pickaxe`, name: `${METAL_NAMES[t]} pickaxe`, icon: '⛏️', cat: 'tool', tool: 'mining', tier: t, value: BAR_VALUES[t] * 2,
    desc: `Double-ore chance ${5 + t * 5}%.` });
  add({ id: `${m}_axe`, name: `${METAL_NAMES[t]} axe`, icon: '🪓', cat: 'tool', tool: 'woodcutting', tier: t, value: BAR_VALUES[t],
    desc: `Double-log chance ${5 + t * 5}%.` });
  add({ id: `${m}_spade`, name: `${METAL_NAMES[t]} spade`, icon: '🥄', cat: 'tool', tool: 'farming', tier: t, value: BAR_VALUES[t] * 2,
    desc: `Double-harvest chance ${5 + t * 5}%.` });
});

// ---- farming: seeds, crops, herbs, salves ----
const SEEDS = [
  ['seed_potato', 'Potato seed', 4], ['seed_flax', 'Flax seed', 6], ['seed_marshweed', 'Marshweed seed', 12],
  ['seed_corn', 'Sweetcorn seed', 18], ['seed_wyrmbane', 'Wyrmbane seed', 40],
  ['seed_wheat', 'Golden wheat seed', 70], ['seed_starbloom', 'Starbloom seed', 150],
];
for (const [id, name, value] of SEEDS) add({ id, name, icon: '🌰', cat: 'seed', value });
add({ id: 'bonemeal', name: 'Bonemeal', icon: '🦴', cat: 'material', value: 10, desc: 'Ground bones and clay. +50% harvest yield when planting.' });
add({ id: 'potato', name: 'Potato', icon: '🥔', cat: 'consumable', value: 6, heal: 0.15, desc: 'Field food. Restores 15% of your hitpoints.' });
add({ id: 'sweetcorn', name: 'Sweetcorn', icon: '🌽', cat: 'consumable', value: 16, heal: 0.25, desc: 'Roast it on a hearth you built yourself. Restores 25%.' });
add({ id: 'golden_wheat', name: 'Golden loaf', icon: '🍞', cat: 'consumable', value: 45, heal: 0.4, desc: 'Baked from your own golden wheat. Restores 40%.' });
add({ id: 'marshweed', name: 'Marshweed', icon: '🌿', cat: 'herb', value: 20, desc: 'A pungent healing herb. Salve material.' });
add({ id: 'wyrmbane', name: 'Wyrmbane', icon: '🪻', cat: 'herb', value: 60, desc: 'Grows in defiance of dragons. Potent salve material.' });
add({ id: 'starbloom', name: 'Starbloom', icon: '🌸', cat: 'herb', value: 200, desc: 'Blooms once a season, under clear skies only.' });
add({ id: 'healing_salve', name: 'Healing salve', icon: '🧴', cat: 'consumable', value: 60, heal: 0.5, desc: 'Marshweed in linen. Restores 50% of your hitpoints.' });
add({ id: 'wyrmbane_salve', name: 'Wyrmbane salve', icon: '🧴', cat: 'consumable', value: 160, heal: 0.75, desc: 'Restores 75% of your hitpoints.' });
add({ id: 'starbloom_elixir', name: 'Starbloom elixir', icon: '⚗️', cat: 'consumable', value: 500, heal: 1.0, desc: 'Full restoration, distilled.' });

// ---- melee weapons & armour ----
const meleeReq = [1, 10, 20, 30, 40, 50];
METALS.forEach((m, t) => {
  add({ id: `${m}_dagger`, name: `${METAL_NAMES[t]} dagger`, icon: '🔪', cat: 'weapon', tier: t, value: BAR_VALUES[t],
    equip: { slot: 'weapon', style: 'melee', req: { attack: meleeReq[t] }, acc: 3 + 5 * t, str: 3 + 5 * t } });
  add({ id: `${m}_sword`, name: `${METAL_NAMES[t]} sword`, icon: '🗡️', cat: 'weapon', tier: t, value: BAR_VALUES[t] * 2,
    equip: { slot: 'weapon', style: 'melee', req: { attack: meleeReq[t] }, acc: 4 + 6 * t, str: 5 + 7 * t } });
  add({ id: `${m}_scimitar`, name: `${METAL_NAMES[t]} scimitar`, icon: '⚔️', cat: 'weapon', tier: t, value: BAR_VALUES[t] * 3,
    equip: { slot: 'weapon', style: 'melee', req: { attack: Math.min(99, meleeReq[t] + 4) }, acc: 3 + 5 * t, str: 8 + 8 * t } });
  add({ id: `${m}_kiteshield`, name: `${METAL_NAMES[t]} kiteshield`, icon: '🛡️', cat: 'armour', tier: t, value: BAR_VALUES[t] * 3,
    equip: { slot: 'shield', req: { defence: Math.min(99, meleeReq[t] + 4) }, def: 3 + 4 * t } });
  add({ id: `${m}_helm`, name: `${METAL_NAMES[t]} helm`, icon: '🪖', cat: 'armour', tier: t, value: BAR_VALUES[t] * 2,
    equip: { slot: 'head', req: { defence: meleeReq[t] }, def: 2 + 3 * t } });
  add({ id: `${m}_platebody`, name: `${METAL_NAMES[t]} platebody`, icon: '🥋', cat: 'armour', tier: t, value: BAR_VALUES[t] * 5,
    equip: { slot: 'body', req: { defence: meleeReq[t] }, def: 5 + 6 * t } });
  add({ id: `${m}_platelegs`, name: `${METAL_NAMES[t]} platelegs`, icon: '👖', cat: 'armour', tier: t, value: BAR_VALUES[t] * 3,
    equip: { slot: 'legs', req: { defence: meleeReq[t] }, def: 3 + 4 * t } });
});

// ---- bows & arrows ----
const BOW_NAMES = ['Shortbow', 'Oak bow', 'Teak bow', 'Willow bow', 'Maple bow', 'Elder bow', 'Yew bow'];
const bowReq = [1, 8, 16, 24, 32, 40, 48];
WOODS.forEach((w, t) => {
  add({ id: `${w}_stave`, name: `${WOOD_NAMES[t]} bow stave`, icon: '🥢', cat: 'material', tier: t, value: LOG_VALUES[t] * 2, desc: 'Needs a bowstring.' });
  add({ id: `${w}_bow`, name: BOW_NAMES[t], icon: '🏹', cat: 'weapon', tier: t, value: LOG_VALUES[t] * 5 + 20,
    equip: { slot: 'weapon', style: 'ranged', req: { ranged: bowReq[t] }, rAcc: 6 + 8 * t, rStr: 4 + 6 * t } });
  add({ id: `${w}_longstave`, name: `${WOOD_NAMES[t]} longbow stave`, icon: '🦯', cat: 'material', tier: t, value: LOG_VALUES[t] * 4, desc: 'Needs a bowstring.' });
  add({ id: `${w}_longbow`, name: `${WOOD_NAMES[t] === 'Wood' ? 'Longbow' : WOOD_NAMES[t] + ' longbow'}`, icon: '🏹', cat: 'weapon', tier: t, value: LOG_VALUES[t] * 9 + 40,
    equip: { slot: 'weapon', style: 'ranged', req: { ranged: bowReq[t] + 6 }, rAcc: 10 + 8 * t, rStr: 6 + 6 * t } });
});
METALS.forEach((m, t) => {
  add({ id: `${m}_arrowheads`, name: `${METAL_NAMES[t]} arrowheads`, icon: '🔺', cat: 'material', tier: t, value: Math.ceil(BAR_VALUES[t] / 10) });
  add({ id: `${m}_arrow`, name: `${METAL_NAMES[t]} arrow`, icon: '➳', cat: 'ammo', tier: t, value: Math.ceil(BAR_VALUES[t] / 8),
    equip: { slot: 'ammo', req: { ranged: meleeReq[t] }, rStr: 3 + 4 * t } });
});

// ---- ranged armour ----
const RANGED_SETS = [
  ['leather', 'Leather', 1, 0],
  ['studded', 'Studded', 20, 1],
  ['wyrm', 'Wyrm-hide', 40, 2],
];
for (const [set, setName, req, t] of RANGED_SETS) {
  add({ id: `${set}_coif`, name: `${setName} coif`, icon: '🧢', cat: 'armour', tier: t, value: 30 + t * 200,
    equip: { slot: 'head', req: { ranged: req }, def: 1 + 2 * t, rAcc: 2 + 3 * t } });
  add({ id: `${set}_body`, name: `${setName} body`, icon: '🦺', cat: 'armour', tier: t, value: 60 + t * 400,
    equip: { slot: 'body', req: { ranged: req }, def: 2 + 4 * t, rAcc: 4 + 5 * t } });
  add({ id: `${set}_chaps`, name: `${setName} chaps`, icon: '👖', cat: 'armour', tier: t, value: 45 + t * 300,
    equip: { slot: 'legs', req: { ranged: req }, def: 2 + 3 * t, rAcc: 3 + 4 * t } });
}

// ---- rings (perks read by systems/perks; crafted from silver + cut gems) ----
add({ id: 'sapphire_ring', name: 'Sapphire ring', icon: '💍', cat: 'jewellery', value: 250,
  equip: { slot: 'ring', req: {} }, desc: '+3% experience from all actions.' });
add({ id: 'emerald_ring', name: 'Emerald ring', icon: '💍', cat: 'jewellery', value: 450,
  equip: { slot: 'ring', req: {} }, desc: '+6% chance of double loot.' });
add({ id: 'ruby_ring', name: 'Ruby ring', icon: '💍', cat: 'jewellery', value: 700,
  equip: { slot: 'ring', req: {} }, desc: '+5% combat accuracy.' });
add({ id: 'diamond_ring', name: 'Diamond ring', icon: '💍', cat: 'jewellery', value: 1400,
  equip: { slot: 'ring', req: {} }, desc: '+8% coins from all sources.' });
add({ id: 'amethyst_ring', name: 'Amethyst ring', icon: '💍', cat: 'jewellery', value: 3000,
  equip: { slot: 'ring', req: {} }, desc: '+4% experience and +4% double loot.' });

// ---- satchels (passive carry upgrades — best owned applies, no equip needed) ----
add({ id: 'leather_satchel', name: 'Leather satchel', icon: '👝', cat: 'satchel', value: 300, carry: 4,
  desc: 'A sturdy side-bag. +4 pack slots (passive — just own it).' });
add({ id: 'hunters_satchel', name: "Hunter's satchel", icon: '🎒', cat: 'satchel', value: 900, carry: 8,
  desc: 'Wolf-pelt lined, many pockets. +8 pack slots (passive).' });
add({ id: 'borsa_viaggiatore', name: "Traveler's bag", icon: '🧳', cat: 'satchel', value: 2500, carry: 12,
  desc: 'Waxed wyrm-hide, instrument loops. +12 pack slots (passive).' });

// ---- amulets (perks read by systems/perks) ----
add({ id: 'sapphire_amulet', name: 'Sapphire amulet', icon: '📿', cat: 'jewellery', value: 400,
  equip: { slot: 'amulet', req: {} }, desc: '+5% experience from all actions.' });
add({ id: 'emerald_amulet', name: 'Emerald amulet', icon: '📿', cat: 'jewellery', value: 700,
  equip: { slot: 'amulet', req: {} }, desc: '+10% chance of double loot from monsters and chests.' });
add({ id: 'ruby_amulet', name: 'Ruby amulet', icon: '📿', cat: 'jewellery', value: 1100,
  equip: { slot: 'amulet', req: {} }, desc: '+8% combat accuracy.' });
add({ id: 'diamond_amulet', name: 'Diamond amulet', icon: '📿', cat: 'jewellery', value: 2200,
  equip: { slot: 'amulet', req: {} }, desc: '+1 max hit and +5% experience.' });
add({ id: 'amethyst_amulet', name: 'Amethyst amulet', icon: '📿', cat: 'jewellery', value: 4500,
  equip: { slot: 'amulet', req: {} }, desc: '+8% experience and +1 max hit.' });

// ---- chest rares (trophies; Italian flavour) ----
add({ id: 'moka', name: 'Caffettiera moka', icon: '☕', cat: 'rare', value: 500, desc: 'A little octagonal coffee pot, forged for the perfect espresso. Trophy.' });
add({ id: 'vespa', name: 'Vespa rossa', icon: '🛵', cat: 'rare', value: 800, desc: 'A cherry-red scooter. Somebody rode it into a chest, somehow. Trophy.' });
add({ id: 'divina_commedia', name: 'La Divina Commedia', icon: '📖', cat: 'rare', value: 1200, desc: "Dante's journey through the three realms, illuminated by hand. Trophy." });
add({ id: 'maschera_veneziana', name: 'Maschera veneziana', icon: '🎭', cat: 'rare', value: 2500, desc: 'A gilded carnival mask from the lagoon city. The jewel of any collection. Trophy.' });

export const ITEMS = R;
export const item = id => {
  const it = R[id];
  if (!it) throw new Error(`unknown item: ${id}`);
  return it;
};
