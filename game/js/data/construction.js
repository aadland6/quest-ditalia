// construction.js — home rooms, tiers, costs and perks.
// Each room has 3 tiers. Costs are per-tier (not cumulative). Building a tier is a
// Construction "project": a series of question-driven build actions (one per plank batch).

export const ROOMS = [
  {
    id: 'study', name: 'Study', icon: '📚',
    desc: 'Bookshelves of grammars and dictionaries. Knowledge sticks better here.',
    perk: t => `+${t * 4}% experience from all actions`,
    tiers: [
      { lvl: 1, xp: 120, actions: 4, cost: { plank: 8, nails: 10 } },
      { lvl: 20, xp: 300, actions: 5, cost: { oak_plank: 10, nails: 20, stone: 4 } },
      { lvl: 45, xp: 700, actions: 6, cost: { maple_plank: 10, nails: 30, stone: 8, gold_bar: 1 } },
    ],
  },
  {
    id: 'workshop', name: 'Workshop', icon: '🛠️',
    desc: 'A proper bench beats a stump. Occasionally saves materials.',
    perk: t => `${t * 7}% chance production actions refund their materials`,
    tiers: [
      { lvl: 5, xp: 140, actions: 4, cost: { plank: 10, nails: 15, stone: 2 } },
      { lvl: 25, xp: 350, actions: 5, cost: { oak_plank: 12, nails: 25, iron_bar: 2 } },
      { lvl: 50, xp: 800, actions: 6, cost: { willow_plank: 12, nails: 35, steel_bar: 3 } },
    ],
  },
  {
    id: 'hearth', name: 'Hearth', icon: '🔥',
    desc: 'Rest here to recover between expeditions.',
    perk: t => `Resting heals ${25 + t * 25}% of max HP`,
    tiers: [
      { lvl: 1, xp: 100, actions: 3, cost: { plank: 6, clay: 8, stone: 4 } },
      { lvl: 15, xp: 260, actions: 4, cost: { oak_plank: 8, clay: 14, stone: 8 } },
      { lvl: 40, xp: 600, actions: 5, cost: { maple_plank: 8, clay: 20, stone: 16 } },
    ],
  },
  {
    id: 'garden', name: 'Garden', icon: '🌻',
    desc: 'A tidy plot that yields a daily crate of supplies.',
    perk: t => `Daily crate (tier ${t}): logs, ores, flax — richer at higher tiers`,
    tiers: [
      { lvl: 10, xp: 180, actions: 4, cost: { plank: 8, clay: 10, nails: 10 } },
      { lvl: 30, xp: 420, actions: 5, cost: { willow_plank: 8, clay: 16, nails: 20 } },
      { lvl: 55, xp: 900, actions: 6, cost: { yew_plank: 6, clay: 24, nails: 30, stone: 10 } },
    ],
  },
  {
    id: 'armory', name: 'Armory', icon: '🛡️',
    desc: 'Racks and stands keep your gear battle-ready.',
    perk: t => `+${t * 3}% combat accuracy and +${t} defence`,
    tiers: [
      { lvl: 15, xp: 220, actions: 4, cost: { oak_plank: 8, nails: 20, iron_bar: 3 } },
      { lvl: 35, xp: 500, actions: 5, cost: { willow_plank: 10, nails: 30, steel_bar: 4 } },
      { lvl: 60, xp: 1100, actions: 6, cost: { yew_plank: 8, nails: 40, mithril_bar: 4 } },
    ],
  },
  {
    id: 'training_yard', name: 'Training Yard', icon: '🎯',
    desc: 'Dummies, targets, and a rack of blunt swords.',
    perk: t => `+${t * 4}% combat experience`,
    tiers: [
      { lvl: 12, xp: 200, actions: 4, cost: { plank: 12, nails: 15, stone: 6 } },
      { lvl: 32, xp: 460, actions: 5, cost: { teak_plank: 10, nails: 25, granite: 4, iron_bar: 2 } },
      { lvl: 52, xp: 1000, actions: 6, cost: { elder_plank: 8, nails: 35, granite: 10, steel_bar: 4 } },
    ],
  },
  {
    id: 'observatory', name: 'Observatory', icon: '🔭',
    desc: 'Star charts over the terrace. La notte porta consiglio.',
    perk: t => `Library book crates roll ${t} extra reward${t > 1 ? 's' : ''}`,
    tiers: [
      { lvl: 25, xp: 320, actions: 5, cost: { teak_plank: 8, nails: 20, pot: 4, silver_bar: 2 } },
      { lvl: 45, xp: 700, actions: 6, cost: { maple_plank: 10, nails: 30, pot: 8, granite: 6, gold_bar: 1 } },
      { lvl: 65, xp: 1400, actions: 7, cost: { elder_plank: 10, nails: 40, pot: 12, granite: 12, gold_bar: 2 } },
    ],
  },
  {
    id: 'greenhouse', name: 'Greenhouse', icon: '🪴',
    desc: 'Glass and warmth. Crops grow faster under cover.',
    perk: t => `Crops grow ${t * 10}% faster`,
    tiers: [
      { lvl: 22, xp: 300, actions: 5, cost: { teak_plank: 8, nails: 25, pot: 4, stone: 8 } },
      { lvl: 42, xp: 640, actions: 6, cost: { maple_plank: 10, nails: 35, pot: 8, granite: 6, silver_bar: 2 } },
      { lvl: 62, xp: 1300, actions: 7, cost: { elder_plank: 10, nails: 45, pot: 12, granite: 12, gold_bar: 1 } },
    ],
  },
  {
    id: 'map_room', name: 'Sala delle Mappe', icon: '🗺️',
    desc: 'A contract board for commissions from the village guild.',
    perk: t => `Daily contract (tier ${t}: richer rewards)`,
    tiers: [
      { lvl: 18, xp: 260, actions: 4, cost: { oak_plank: 10, nails: 20, pot: 2, stone: 6 } },
      { lvl: 38, xp: 560, actions: 5, cost: { willow_plank: 10, nails: 30, pot: 6, granite: 6 } },
      { lvl: 58, xp: 1200, actions: 6, cost: { elder_plank: 8, nails: 40, pot: 10, granite: 12, gold_bar: 1 } },
    ],
  },
  {
    id: 'trophy', name: 'Trophy Hall', icon: '🏆',
    desc: 'Display your rarest finds. Impresses the chickens.',
    perk: t => `+${t * 5}% coins from all sources; displays your rares`,
    tiers: [
      { lvl: 20, xp: 260, actions: 4, cost: { oak_plank: 10, nails: 20, stone: 6 } },
      { lvl: 40, xp: 600, actions: 5, cost: { maple_plank: 10, nails: 30, stone: 12, gold_bar: 1 } },
      { lvl: 65, xp: 1300, actions: 6, cost: { yew_plank: 10, nails: 40, stone: 20, gold_bar: 2 } },
    ],
  },
];

export const ROOM = Object.fromEntries(ROOMS.map(r => [r.id, r]));

// Garden daily crate contents by tier (1-3)
export const GARDEN_CRATES = {
  1: [{ item: 'logs', min: 3, max: 6 }, { item: 'flax', min: 3, max: 6 }, { item: 'copper_ore', min: 2, max: 4 }],
  2: [{ item: 'oak_logs', min: 3, max: 6 }, { item: 'flax', min: 5, max: 10 }, { item: 'iron_ore', min: 2, max: 5 }, { item: 'coal', min: 1, max: 3 }],
  3: [{ item: 'willow_logs', min: 4, max: 8 }, { item: 'flax', min: 8, max: 14 }, { item: 'coal', min: 3, max: 6 }, { item: 'gold_ore', min: 1, max: 2 }, { item: 'uncut_sapphire', min: 0, max: 1 }],
};
