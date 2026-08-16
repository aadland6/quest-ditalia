// areas.js — the world: areas, gathering nodes, enemies, chests, buildings, map layout.
// Map coords are in the world-map SVG viewBox (0 0 100 130), portrait.

export const AREAS = [
  {
    id: 'town', name: 'Borgosereno', icon: '🏘️', x: 50, y: 80,
    desc: 'A quiet crossroads town. Bank your haul, work the forge, hit the library.',
    unlock: null,
    buildings: ['bank', 'workshop', 'shop', 'sawmill', 'library', 'home'],
    gather: [], enemies: [], chest: null,
  },
  {
    id: 'mine', name: 'Miniera del Rame', icon: '⛏️', x: 20, y: 58,
    desc: 'Terraced pits and deep shafts. The deeper veins wait for skilled hands.',
    unlock: null,
    buildings: [],
    gather: [
      { id: 'copper', name: 'Copper vein', icon: '🟤', skill: 'mining', lvl: 1, xp: 18, out: { copper_ore: 1 } },
      { id: 'tin', name: 'Tin vein', icon: '⚪', skill: 'mining', lvl: 1, xp: 18, out: { tin_ore: 1 } },
      { id: 'stone', name: 'Stone quarry', icon: '🪨', skill: 'mining', lvl: 5, xp: 20, out: { stone: 1 } },
      { id: 'iron', name: 'Iron vein', icon: '🔩', skill: 'mining', lvl: 15, xp: 35, out: { iron_ore: 1 } },
      { id: 'silver', name: 'Silver vein', icon: '⚪', skill: 'mining', lvl: 20, xp: 40, out: { silver_ore: 1 } },
      { id: 'gemrock', name: 'Gem rock', icon: '💎', skill: 'mining', lvl: 25, xp: 45, out: 'gem' },
      { id: 'coal', name: 'Coal seam', icon: '⚫', skill: 'mining', lvl: 30, xp: 50, out: { coal: 1 } },
      { id: 'gold', name: 'Gold vein', icon: '🟡', skill: 'mining', lvl: 40, xp: 65, out: { gold_ore: 1 } },
      { id: 'granite', name: 'Granite quarry', icon: '🗿', skill: 'mining', lvl: 48, xp: 70, out: { granite: 1 } },
      { id: 'mithril', name: 'Mithril vein', icon: '🔵', skill: 'mining', lvl: 55, xp: 80, out: { mithril_ore: 1 } },
      { id: 'adamant', name: 'Adamantite vein', icon: '🟩', skill: 'mining', lvl: 70, xp: 95, out: { adamant_ore: 1 } },
      { id: 'runite', name: 'Runite vein', icon: '🩵', skill: 'mining', lvl: 85, xp: 125, out: { runite_ore: 1 } },
    ],
    enemies: ['cave_crawler'],
    chest: {
      id: 'miners_cache', name: "Miner's Cache", icon: '🧰', questions: 3, cooldownH: 4,
      loot: [
        { item: 'coins', min: 20, max: 60, chance: 1 },
        { item: 'iron_ore', min: 2, max: 5, chance: 0.7 },
        { item: 'coal', min: 2, max: 6, chance: 0.5 },
        { item: 'uncut_sapphire', min: 1, max: 1, chance: 0.15 },
        { item: 'uncut_emerald', min: 1, max: 1, chance: 0.06 },
        { item: 'moka', min: 1, max: 1, chance: 0.01 },
      ],
    },
  },
  {
    id: 'forest', name: 'Bosco delle Spine', icon: '🌲', x: 80, y: 60,
    desc: 'Old growth and older paths. Nests in the canopy shed feathers.',
    unlock: null,
    buildings: [],
    gather: [
      { id: 'tree', name: 'Tree', icon: '🌳', skill: 'woodcutting', lvl: 1, xp: 25, out: { logs: 1 } },
      { id: 'nests', name: 'Bird nests', icon: '🪺', skill: 'woodcutting', lvl: 1, xp: 10, out: { feather: 3 } },
      { id: 'oak', name: 'Oak', icon: '🌳', skill: 'woodcutting', lvl: 15, xp: 38, out: { oak_logs: 1 } },
      { id: 'teak', name: 'Teak', icon: '🌴', skill: 'woodcutting', lvl: 24, xp: 52, out: { teak_logs: 1 } },
      { id: 'willow', name: 'Willow', icon: '🌳', skill: 'woodcutting', lvl: 33, xp: 68, out: { willow_logs: 1 } },
      { id: 'maple', name: 'Maple', icon: '🍁', skill: 'woodcutting', lvl: 45, xp: 100, out: { maple_logs: 1 } },
      { id: 'elder', name: 'Elder', icon: '🌳', skill: 'woodcutting', lvl: 58, xp: 140, out: { elder_logs: 1 } },
      { id: 'yew', name: 'Yew', icon: '🌲', skill: 'woodcutting', lvl: 70, xp: 190, out: { yew_logs: 1 } },
    ],
    enemies: ['wolf'],
    chest: {
      id: 'hollow_stump', name: 'Hollow Stump', icon: '🪵', questions: 3, cooldownH: 4,
      loot: [
        { item: 'coins', min: 15, max: 50, chance: 1 },
        { item: 'oak_logs', min: 2, max: 5, chance: 0.7 },
        { item: 'feather', min: 5, max: 15, chance: 0.6 },
        { item: 'willow_logs', min: 1, max: 4, chance: 0.35 },
        { item: 'teak_logs', min: 1, max: 3, chance: 0.25 },
        { item: 'elder_logs', min: 1, max: 2, chance: 0.1 },
        { item: 'yew_logs', min: 1, max: 2, chance: 0.08 },
        { item: 'seed_marshweed', min: 1, max: 2, chance: 0.3 },
        { item: 'seed_corn', min: 1, max: 2, chance: 0.2 },
        { item: 'vespa', min: 1, max: 1, chance: 0.01 },
      ],
    },
  },
  {
    id: 'meadow', name: 'Campi del Mulino', icon: '🌾', x: 50, y: 105,
    desc: 'Flax rows, clay banks — and things squelching in the marsh margin.',
    unlock: null,
    buildings: [],
    gather: [
      { id: 'flax', name: 'Flax field', icon: '🌾', skill: 'crafting', lvl: 1, xp: 6, out: { flax: 1 } },
      { id: 'claypit', name: 'Clay pit', icon: '🧱', skill: 'mining', lvl: 3, xp: 12, out: { clay: 1 } },
    ],
    enemies: ['marsh_slime', 'giant_rat', 'marsh_lurker'],
    chest: {
      id: 'scarecrow_stash', name: "Scarecrow's Stash", icon: '🎃', questions: 3, cooldownH: 4,
      loot: [
        { item: 'coins', min: 10, max: 40, chance: 1 },
        { item: 'flax', min: 3, max: 8, chance: 0.8 },
        { item: 'clay', min: 2, max: 6, chance: 0.6 },
        { item: 'rat_fur', min: 2, max: 5, chance: 0.5 },
        { item: 'bandage', min: 1, max: 2, chance: 0.3 },
        { item: 'seed_potato', min: 1, max: 3, chance: 0.5 },
        { item: 'seed_flax', min: 1, max: 3, chance: 0.4 },
        { item: 'seed_marshweed', min: 1, max: 2, chance: 0.25 },
        { item: 'seed_corn', min: 1, max: 1, chance: 0.15 },
      ],
    },
  },
  {
    id: 'ridge', name: 'Passo dei Briganti', icon: '⛰️', x: 76, y: 32,
    desc: 'The high road is theirs — for now. Bring a blade or a bow.',
    unlock: { combat: 10 },
    buildings: [],
    gather: [],
    enemies: ['bandit', 'bandit_archer', 'bandit_captain'],
    chest: {
      id: 'stolen_strongbox', name: 'Stolen Strongbox', icon: '🧳', questions: 4, cooldownH: 6, keyItem: 'bandit_key',
      loot: [
        { item: 'coins', min: 80, max: 250, chance: 1 },
        { item: 'steel_bar', min: 1, max: 3, chance: 0.5 },
        { item: 'iron_arrowheads', min: 15, max: 45, chance: 0.5 },
        { item: 'uncut_emerald', min: 1, max: 1, chance: 0.2 },
        { item: 'uncut_ruby', min: 1, max: 1, chance: 0.08 },
        { item: 'vespa', min: 1, max: 1, chance: 0.02 },
      ],
    },
  },
  {
    id: 'keep', name: 'Rocca Diroccata', icon: '🏰', x: 22, y: 30,
    desc: 'A collapsed border fort. Its garrison never got the discharge order.',
    unlock: { combat: 20 },
    buildings: [],
    gather: [],
    enemies: ['skeleton', 'ghoul', 'stone_golem', 'wight'],
    chest: {
      id: 'keep_vault', name: 'Keep Vault', icon: '🚪', questions: 4, cooldownH: 6, keyItem: 'keep_key',
      loot: [
        { item: 'coins', min: 120, max: 400, chance: 1 },
        { item: 'mithril_ore', min: 1, max: 3, chance: 0.5 },
        { item: 'steel_bar', min: 2, max: 4, chance: 0.5 },
        { item: 'uncut_ruby', min: 1, max: 1, chance: 0.2 },
        { item: 'uncut_diamond', min: 1, max: 1, chance: 0.06 },
        { item: 'divina_commedia', min: 1, max: 1, chance: 0.02 },
      ],
    },
  },
  {
    id: 'peak', name: 'Picco del Drago', icon: '🌋', x: 50, y: 12,
    desc: 'Thin air, old bones, and wings on the thermals. The endgame.',
    unlock: { combat: 40 },
    buildings: [],
    gather: [],
    enemies: ['young_wyrm', 'elder_wyrm', 'wyrm_matriarch'],
    chest: {
      id: 'wyrm_hoard', name: 'Wyrm Hoard', icon: '👑', questions: 5, cooldownH: 8, keyItem: 'wyrm_key',
      loot: [
        { item: 'coins', min: 300, max: 900, chance: 1 },
        { item: 'runite_ore', min: 1, max: 2, chance: 0.4 },
        { item: 'wyrm_hide', min: 1, max: 3, chance: 0.6 },
        { item: 'uncut_diamond', min: 1, max: 1, chance: 0.25 },
        { item: 'maschera_veneziana', min: 1, max: 1, chance: 0.03 },
      ],
    },
  },
];

export const AREA = Object.fromEntries(AREAS.map(a => [a.id, a]));

// Paths drawn between areas on the map (visual only; travel is free-tap)
export const MAP_PATHS = [
  ['town', 'mine'], ['town', 'forest'], ['town', 'meadow'],
  ['mine', 'keep'], ['forest', 'ridge'], ['keep', 'peak'], ['ridge', 'peak'],
];

// Random gem table for the gem rock (weights)
export const GEM_TABLE = [
  { item: 'uncut_sapphire', w: 55 }, { item: 'uncut_emerald', w: 28 },
  { item: 'uncut_ruby', w: 13 }, { item: 'uncut_diamond', w: 4 },
];
