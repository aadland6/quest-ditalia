// worldmap.js — the tile world: one continuous 72×96 map authored in code.
// Terrain grid + collision, named regions (reusing areas.js data for gather
// nodes, chests and enemies), and every placed entity. No external assets.

import { AREA } from '../data/areas.js';
import { ENEMY } from '../data/enemies.js';
import { NPCS } from '../data/npcs.js';

export const W = 72, H = 96;

export const T = {
  GRASS: 0, PATH: 1, WATER: 2, ROCK: 3, STONE: 4, FOREST: 5, MEADOW: 6,
  PLAZA: 7, VOLCANIC: 8, KEEP: 9, BRIDGE: 10, SOIL: 11, RIDGE: 12,
};

// [base, alt] fill colours per tile type (dark-theme palette)
export const COLORS = {
  [T.GRASS]: ['#2c4230', '#2a3f2e'],
  [T.PATH]: ['#6b5b40', '#64553c'],
  [T.WATER]: ['#1d3a5f', '#1c3757'],
  [T.ROCK]: ['#3a3f4c', '#363b47'],
  [T.STONE]: ['#4a4a52', '#45454d'],
  [T.FOREST]: ['#213620', '#1f331e'],
  [T.MEADOW]: ['#3a4a2a', '#37462a'],
  [T.PLAZA]: ['#55483a', '#4f4336'],
  [T.VOLCANIC]: ['#45303a', '#412d37'],
  [T.KEEP]: ['#3d4250', '#393e4b'],
  [T.BRIDGE]: ['#7a6244', '#73593e'],
  [T.SOIL]: ['#4a3828', '#453425'],
  [T.RIDGE]: ['#4a4234', '#453e31'],
};

const g = new Uint8Array(W * H).fill(T.GRASS);
const set = (x, y, t) => { if (x >= 0 && y >= 0 && x < W && y < H) g[y * W + x] = t; };
const rect = (x0, y0, x1, y1, t) => { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) set(x, y, t); };

// ---------- terrain ----------
// outer border
rect(0, 0, W - 1, 1, T.ROCK); rect(0, H - 2, W - 1, H - 1, T.ROCK);
rect(0, 0, 1, H - 1, T.ROCK); rect(W - 2, 0, W - 1, H - 1, T.ROCK);

// northern mountain band with the volcanic peak carved into it
rect(2, 2, 69, 16, T.ROCK);
rect(28, 4, 44, 14, T.VOLCANIC);
rect(35, 14, 37, 16, T.PATH);                 // peak entrance corridor (gate below)

// ruined keep (NW) — walled, east entrance
rect(4, 18, 26, 36, T.ROCK);
rect(6, 20, 24, 34, T.KEEP);
rect(24, 26, 26, 28, T.PATH);                 // keep entrance

// bandit ridge (NE) — walled, west entrance
rect(46, 18, 68, 36, T.ROCK);
rect(48, 20, 66, 34, T.RIDGE);
rect(46, 26, 48, 28, T.PATH);                 // ridge entrance

// mine (W) — walled stone workings, east entrance
rect(4, 42, 26, 62, T.ROCK);
rect(6, 44, 24, 60, T.STONE);
rect(24, 50, 26, 52, T.PATH);                 // mine entrance

// forest (E) — open woodland floor
rect(46, 42, 68, 64, T.FOREST);

// town plaza
rect(30, 58, 44, 70, T.PLAZA);
rect(28, 66, 30, 68, T.SOIL);                 // farm soil beside the home

// river + bridge separating the meadow
rect(2, 74, 69, 75, T.WATER);
rect(35, 74, 37, 75, T.BRIDGE);

// southern meadow
rect(2, 76, 69, 93, T.MEADOW);

// paths
rect(36, 17, 36, 57, T.PATH);                 // great north road (peak → town)
rect(27, 27, 45, 27, T.PATH);                 // keep ↔ ridge crossroads
rect(27, 51, 35, 51, T.PATH);                 // mine link
rect(45, 58, 50, 58, T.PATH);                 // forest link
rect(36, 71, 36, 73, T.PATH);                 // town → bridge
rect(36, 76, 36, 79, T.PATH);                 // bridge → meadow

export const tileAt = (x, y) => (x < 0 || y < 0 || x >= W || y >= H) ? T.ROCK : g[y * W + x];
const BLOCKED = new Set([T.WATER, T.ROCK]);
export const terrainWalkable = (x, y) => !BLOCKED.has(tileAt(x, y));
export const terrain = g;

// ---------- regions (banner + areaId mapping; checked in order) ----------
export const REGIONS = [
  { areaId: 'peak', x0: 26, y0: 2, x1: 46, y1: 16 },
  { areaId: 'keep', x0: 4, y0: 18, x1: 26, y1: 36 },
  { areaId: 'ridge', x0: 46, y0: 18, x1: 68, y1: 36 },
  { areaId: 'mine', x0: 4, y0: 42, x1: 26, y1: 62 },
  { areaId: 'forest', x0: 46, y0: 42, x1: 68, y1: 64 },
  { areaId: 'town', x0: 28, y0: 56, x1: 46, y1: 73 },
  { areaId: 'meadow', x0: 2, y0: 74, x1: 69, y1: 93 },
];
export function regionAt(x, y) {
  for (const r of REGIONS) if (x >= r.x0 && x <= r.x1 && y >= r.y0 && y <= r.y1) return AREA[r.areaId];
  return null;
}

// ---------- entities ----------
export const ENTITIES = [];
let eid = 0;
const gatherIcon = (a, n) => AREA[a].gather.find(x => x.id === n).icon;
const addGather = (area, node, x, y) =>
  ENTITIES.push({ id: 'e' + eid++, kind: 'gather', area, node, x, y, icon: gatherIcon(area, node) });
const addEnemy = (enemyId, area, x, y) =>
  ENTITIES.push({ id: 'e' + eid++, kind: 'enemy', enemyId, area, x, y, icon: ENEMY[enemyId].icon });
const addChest = (area, x, y) =>
  ENTITIES.push({ id: 'e' + eid++, kind: 'chest', area, x, y, icon: AREA[area].chest.icon });
const addBuilding = (screen, name, icon, x, y) =>
  ENTITIES.push({ id: 'e' + eid++, kind: 'building', screen, name, x, y, icon });
const addGate = (combat, name, x, y) =>
  ENTITIES.push({ id: 'e' + eid++, kind: 'gate', combat, name, x, y, icon: '🚧' });

// NPCs wander; enemies wander too (see worldScreen) — both via moveEntity below
for (const n of NPCS) {
  ENTITIES.push({ id: 'npc_' + n.id, kind: 'npc', npc: n, x: n.x, y: n.y, icon: '💬' });
}

// town buildings (market row + home + farm)
addBuilding('bank', 'Bank', '🏦', 33, 60);
addBuilding('workshop', 'Workshop', '🏭', 35, 60);
addBuilding('shop', 'General Store', '🛒', 37, 60);
addBuilding('sawmill', 'Sawmill', '🪚', 39, 60);
addBuilding('library', 'Library', '📚', 41, 60);
addBuilding('home', 'Your Home', '🏠', 31, 64);
addBuilding('farm', 'Your Farm', '🌾', 29, 67);

// gates
addGate(40, 'Picco del Drago', 36, 15);
addGate(20, 'Rocca Diroccata', 25, 27);
addGate(10, 'Passo dei Briganti', 47, 27);

// mine — deeper west/north = higher tier
[['copper', 22, 50], ['copper', 23, 53], ['copper', 21, 47],
 ['tin', 23, 48], ['tin', 21, 55], ['tin', 23, 57],
 ['stone', 19, 58], ['stone', 20, 44],
 ['iron', 16, 50], ['iron', 15, 55], ['iron', 17, 45],
 ['silver', 13, 47], ['silver', 12, 58],
 ['gemrock', 10, 52],
 ['coal', 11, 44], ['coal', 9, 49], ['coal', 13, 60],
 ['gold', 8, 56], ['granite', 7, 51], ['mithril', 7, 45], ['adamant', 8, 48], ['runite', 7, 59],
].forEach(([n, x, y]) => addGather('mine', n, x, y));
addEnemy('cave_crawler', 'mine', 18, 53);
addEnemy('cave_crawler', 'mine', 12, 50);
addChest('mine', 6, 60);

// forest — deeper east = higher tier
[['tree', 50, 56], ['tree', 52, 61], ['tree', 49, 52], ['tree', 54, 55],
 ['nests', 51, 59], ['nests', 58, 60],
 ['oak', 55, 50], ['oak', 57, 57], ['oak', 60, 53],
 ['teak', 61, 60], ['teak', 63, 56],
 ['willow', 62, 47], ['willow', 59, 45],
 ['maple', 65, 51], ['maple', 64, 60],
 ['elder', 66, 45], ['yew', 67, 62],
].forEach(([n, x, y]) => addGather('forest', n, x, y));
addEnemy('wolf', 'forest', 56, 52);
addEnemy('wolf', 'forest', 63, 49);
addChest('forest', 66, 43);

// meadow — fields north, marsh south-west
[['flax', 32, 80], ['flax', 34, 84], ['flax', 30, 86], ['flax', 40, 82],
 ['claypit', 44, 86], ['claypit', 28, 82],
].forEach(([n, x, y]) => addGather('meadow', n, x, y));
addEnemy('marsh_slime', 'meadow', 38, 86);
addEnemy('marsh_slime', 'meadow', 42, 80);
addEnemy('marsh_slime', 'meadow', 35, 89);
addEnemy('giant_rat', 'meadow', 26, 84);
addEnemy('giant_rat', 'meadow', 46, 88);
addEnemy('marsh_lurker', 'meadow', 24, 90);
addChest('meadow', 23, 79);

// bandit ridge
addEnemy('bandit', 'ridge', 52, 24);
addEnemy('bandit', 'ridge', 58, 30);
addEnemy('bandit_archer', 'ridge', 56, 22);
addEnemy('bandit_archer', 'ridge', 62, 26);
addEnemy('bandit_captain', 'ridge', 64, 32);
addChest('ridge', 65, 21);

// ruined keep
addEnemy('skeleton', 'keep', 20, 24);
addEnemy('skeleton', 'keep', 14, 30);
addEnemy('ghoul', 'keep', 10, 26);
addEnemy('ghoul', 'keep', 16, 21);
addEnemy('stone_golem', 'keep', 8, 32);
addEnemy('wight', 'keep', 7, 21);
addChest('keep', 7, 33);

// wyrm peak
addEnemy('young_wyrm', 'peak', 32, 10);
addEnemy('young_wyrm', 'peak', 40, 8);
addEnemy('elder_wyrm', 'peak', 38, 11);
addEnemy('wyrm_matriarch', 'peak', 30, 5);
addChest('peak', 42, 4);

// spatial index + placement validation (dev aid: logs, never throws)
export const entityIndex = new Map();
for (const e of ENTITIES) {
  const key = e.x + ',' + e.y;
  if (entityIndex.has(key)) console.error('worldmap: entity overlap at', key, e);
  if (!terrainWalkable(e.x, e.y)) console.error('worldmap: entity on blocked tile', e);
  entityIndex.set(key, e);
}
export const entityAt = (x, y) => entityIndex.get(x + ',' + y) || null;

// Move a dynamic entity (wandering enemy/NPC) to a new tile, keeping the
// spatial index correct. Caller must verify the destination is free.
export function moveEntity(e, nx, ny) {
  entityIndex.delete(e.x + ',' + e.y);
  e.x = nx; e.y = ny;
  entityIndex.set(nx + ',' + ny, e);
}
