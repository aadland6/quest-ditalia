// shop.js — Borgosereno General Store stock + sawmill plank conversion rates.
// Buy price in coins; anything with a value can be sold to the shop at 60% value.

export const SHOP_STOCK = [
  { item: 'feather', price: 4 },
  { item: 'nails', price: 6 },
  { item: 'bandage', price: 45 },
  { item: 'knifeless', hidden: true }, // placeholder — no tool purchases; smith your own
  { item: 'bronze_pickaxe', price: 40 },
  { item: 'bronze_axe', price: 25 },
  { item: 'bronze_spade', price: 40 },
  { item: 'bowstring', price: 30 },
  { item: 'seed_potato', price: 8 },
  { item: 'seed_flax', price: 12 },
  { item: 'bonemeal', price: 20 },
].filter(s => !s.hidden);

export const SELL_RATE = 0.6;

// Sawmill: log -> plank, per-plank coin fee (Construction's coin sink)
export const SAWMILL = [
  { log: 'logs', plank: 'plank', fee: 10 },
  { log: 'oak_logs', plank: 'oak_plank', fee: 25 },
  { log: 'teak_logs', plank: 'teak_plank', fee: 40 },
  { log: 'willow_logs', plank: 'willow_plank', fee: 60 },
  { log: 'maple_logs', plank: 'maple_plank', fee: 150 },
  { log: 'elder_logs', plank: 'elder_plank', fee: 280 },
  { log: 'yew_logs', plank: 'yew_plank', fee: 400 },
];
