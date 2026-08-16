// xp.js — RuneScape-style experience curve, levels 1–99.
export const MAX_LEVEL = 99;

// xpTable[n] = total xp required to BE level n (xpTable[1] = 0)
const xpTable = [0, 0];
{
  let points = 0;
  for (let l = 1; l < MAX_LEVEL; l++) {
    points += Math.floor(l + 300 * Math.pow(2, l / 7));
    xpTable[l + 1] = Math.floor(points / 4);
  }
}

export function xpForLevel(level) {
  return xpTable[Math.max(1, Math.min(MAX_LEVEL, level))];
}

export function levelForXp(xp) {
  let lo = 1, hi = MAX_LEVEL;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if (xpTable[mid] <= xp) lo = mid; else hi = mid - 1;
  }
  return lo;
}

// progress within the current level, 0..1 (1 at 99)
export function levelProgress(xp) {
  const lvl = levelForXp(xp);
  if (lvl >= MAX_LEVEL) return 1;
  const base = xpTable[lvl], next = xpTable[lvl + 1];
  return (xp - base) / (next - base);
}

export function xpToNext(xp) {
  const lvl = levelForXp(xp);
  return lvl >= MAX_LEVEL ? 0 : xpTable[lvl + 1] - xp;
}
