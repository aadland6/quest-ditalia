// farming.js — crop registry. Growing happens in real time; planting and
// harvesting are question-driven actions like everything else.
// yield: [min, max] per harvest (before spade/bonemeal/greenhouse bonuses).

export const CROPS = [
  { id: 'potato', name: 'Potatoes', icon: '🥔', seed: 'seed_potato', out: 'potato',
    lvl: 1, growMin: 30, plantXp: 8, harvestXp: 25, yield: [3, 5] },
  { id: 'flax', name: 'Flax bed', icon: '🌾', seed: 'seed_flax', out: 'flax',
    lvl: 8, growMin: 45, plantXp: 12, harvestXp: 40, yield: [4, 8] },
  { id: 'marshweed', name: 'Marshweed', icon: '🌿', seed: 'seed_marshweed', out: 'marshweed',
    lvl: 15, growMin: 60, plantXp: 15, harvestXp: 55, yield: [2, 4] },
  { id: 'corn', name: 'Sweetcorn', icon: '🌽', seed: 'seed_corn', out: 'sweetcorn',
    lvl: 22, growMin: 90, plantXp: 18, harvestXp: 75, yield: [3, 5] },
  { id: 'wyrmbane', name: 'Wyrmbane', icon: '🪻', seed: 'seed_wyrmbane', out: 'wyrmbane',
    lvl: 40, growMin: 180, plantXp: 25, harvestXp: 120, yield: [2, 3] },
  { id: 'wheat', name: 'Golden wheat', icon: '🌾', seed: 'seed_wheat', out: 'golden_wheat',
    lvl: 55, growMin: 240, plantXp: 35, harvestXp: 180, yield: [2, 4] },
  { id: 'starbloom', name: 'Starbloom', icon: '🌸', seed: 'seed_starbloom', out: 'starbloom',
    lvl: 70, growMin: 360, plantXp: 50, harvestXp: 300, yield: [1, 2] },
];

export const CROP = Object.fromEntries(CROPS.map(c => [c.id, c]));

// plots unlocked purely by Farming level
export const PLOT_LEVELS = [1, 1, 15, 30, 45, 60];   // 2 plots at lvl 1 … 6 at lvl 60
export const plotCount = farmingLevel => PLOT_LEVELS.filter(l => farmingLevel >= l).length;
