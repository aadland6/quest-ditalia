// decor.js — deterministic scenery placement over the tile grid: trees on the
// mountainsides, dense woodland, flowers, cattails by the river, mine rubble,
// keep ruins, a bandit camp, town props. Pure data (no rendering here).
// Large decor on walkable tiles is "blocking" and joins the collision picture;
// a flood-fill check guarantees nothing important gets walled off.

import { W, H, T, tileAt, terrainWalkable, entityAt, ENTITIES } from './worldmap.js';

const hash = (x, y, salt = 0) => {
  let h = (x * 374761393 + y * 668265263 + salt * 987654323) ^ 0x5bf03635;
  h = (h ^ (h >> 13)) * 1274126177;
  return ((h ^ (h >> 16)) >>> 0) / 4294967295;
};

export const DECOR = [];        // { type, x, y, s, rot }
export const BLOCKING = new Set(); // 'x,y' keys of blocking decor

const nearEntity = (x, y, r = 1) => {
  for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
    if (entityAt(x + dx, y + dy)) return true;
  }
  return false;
};

function add(type, x, y, { blocking = false, salt = 0 } = {}) {
  DECOR.push({ type, x, y, s: 0.8 + hash(x, y, salt + 50) * 0.5, rot: hash(x, y, salt + 99) * Math.PI * 2 });
  if (blocking) BLOCKING.add(x + ',' + y);
}

// a blocking prop may only occupy a plain tile far from paths, entities & gates
function canBlock(x, y) {
  const t = tileAt(x, y);
  if (![T.GRASS, T.FOREST, T.MEADOW, T.RIDGE, T.KEEP, T.STONE, T.VOLCANIC].includes(t)) return false;
  if (nearEntity(x, y, 1)) return false;
  for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
    const tt = tileAt(x + dx, y + dy);
    if (tt === T.PATH || tt === T.BRIDGE || tt === T.SOIL || tt === T.PLAZA) return false;
  }
  return true;
}

// ---------- procedural scatter ----------
for (let y = 2; y < H - 2; y++) {
  for (let x = 2; x < W - 2; x++) {
    const t = tileAt(x, y);
    const r = hash(x, y);

    if (t === T.ROCK) {
      // pines and crags on the mountainsides (unwalkable anyway)
      const nearOpen = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => terrainWalkable(x + dx, y + dy));
      if (nearOpen && r < 0.14) add('pine', x, y);
      else if (r < 0.18) add('crag', x, y);
      continue;
    }
    if (entityAt(x, y)) continue;

    if (t === T.FOREST) {
      if (r < 0.11 && canBlock(x, y)) add(r < 0.05 ? 'pine' : 'leaftree', x, y, { blocking: true });
      else if (r < 0.16) add('bush', x, y);
      else if (r < 0.19) add('mushroom', x, y);
      else if (r < 0.22) add('flowers', x, y);
    } else if (t === T.GRASS) {
      if (r < 0.02 && canBlock(x, y)) add('leaftree', x, y, { blocking: true });
      else if (r < 0.06) add('flowers', x, y);
      else if (r < 0.08) add('bush', x, y);
    } else if (t === T.MEADOW) {
      const nearRiver = y <= 79;
      if (nearRiver && r < 0.2) add('cattail', x, y);
      else if (r < 0.05) add('flowers', x, y);
      else if (r < 0.07) add('bush', x, y);
      else if (r < 0.08 && canBlock(x, y)) add('leaftree', x, y, { blocking: true });
    } else if (t === T.STONE) {
      if (r < 0.06) add('pebbles', x, y);
      else if (r < 0.08 && canBlock(x, y)) add('stalagmite', x, y, { blocking: true });
    } else if (t === T.KEEP) {
      if (r < 0.05) add('rubble', x, y);
      else if (r < 0.075 && canBlock(x, y)) add('pillar', x, y, { blocking: true });
      else if (r < 0.1) add('gravestone', x, y);
    } else if (t === T.RIDGE) {
      if (r < 0.05) add('boulder', x, y);
      else if (r < 0.07) add('bush', x, y);
    } else if (t === T.VOLCANIC) {
      if (r < 0.07) add('lavarock', x, y);
      else if (r < 0.1) add('bones', x, y);
    }
  }
}

// ---------- hand-placed set dressing ----------
// Borgosereno: well, lamps, market stall, barrels, farm fence
add('well', 39, 66, { blocking: true });
for (const [x, y] of [[31, 59], [43, 59], [31, 69], [43, 69]]) add('lamp', x, y, { blocking: true });
add('stall', 33, 66, { blocking: true });
add('crate', 44, 61, { blocking: true });
add('barrel', 30, 61, { blocking: true });
for (const [x, y] of [[27, 65], [27, 66], [27, 67], [27, 68], [28, 69], [29, 69], [30, 69]]) add('fence', x, y);

// bandit camp on the ridge
add('campfire', 57, 26);
add('tent', 55, 25, { blocking: true });
add('tent', 59, 27, { blocking: true });
add('crate', 56, 28, { blocking: true });

// keep graveyard row
for (const [x, y] of [[18, 32], [19, 33], [17, 33]]) add('gravestone', x, y);

// ---------- connectivity guarantee ----------
// flood-fill from the town plaza; every entity must keep a reachable neighbour
{
  const pass = (x, y) => terrainWalkable(x, y) && !entityAt(x, y) && !BLOCKING.has(x + ',' + y);
  const seen = new Uint8Array(W * H);
  const q = [[37, 64]];
  seen[64 * W + 37] = 1;
  while (q.length) {
    const [x, y] = q.pop();
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx, ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= W || ny >= H || seen[ny * W + nx]) continue;
      // gates: treat as passable for reachability purposes (they open with levels)
      const e = entityAt(nx, ny);
      const ok = pass(nx, ny) || e?.kind === 'gate';
      if (!ok) continue;
      seen[ny * W + nx] = 1;
      q.push([nx, ny]);
    }
  }
  for (const e of ENTITIES) {
    const reachable = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => seen[(e.y + dy) * W + (e.x + dx)]);
    if (!reachable) console.error('decor: entity unreachable after decoration', e.kind, e.x, e.y);
  }
}
