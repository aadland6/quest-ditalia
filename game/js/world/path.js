// path.js — A* pathfinding over the tile grid, 4-directional.
// `passable(x, y)` is supplied by the caller (terrain + entities + gates).

export function findPath(sx, sy, tx, ty, passable, maxIter = 6000) {
  if (sx === tx && sy === ty) return [];
  if (!passable(tx, ty)) return null;
  const key = (x, y) => y * 4096 + x;
  const open = [{ x: sx, y: sy, gCost: 0, f: 0 }];
  const gScore = new Map([[key(sx, sy), 0]]);
  const came = new Map();
  const h = (x, y) => Math.abs(x - tx) + Math.abs(y - ty);
  let iter = 0;

  while (open.length && iter++ < maxIter) {
    // binary-heap-free: small maps, linear extract-min is fine
    let bi = 0;
    for (let i = 1; i < open.length; i++) if (open[i].f < open[bi].f) bi = i;
    const cur = open.splice(bi, 1)[0];
    if (cur.x === tx && cur.y === ty) {
      const out = [];
      let k = key(tx, ty);
      let node = { x: tx, y: ty };
      while (k !== key(sx, sy)) {
        out.unshift(node);
        node = came.get(k);
        k = key(node.x, node.y);
      }
      return out;
    }
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = cur.x + dx, ny = cur.y + dy;
      if (!passable(nx, ny)) continue;
      const nk = key(nx, ny);
      const ng = cur.gCost + 1;
      if (ng < (gScore.get(nk) ?? Infinity)) {
        gScore.set(nk, ng);
        came.set(nk, { x: cur.x, y: cur.y });
        open.push({ x: nx, y: ny, gCost: ng, f: ng + h(nx, ny) });
      }
    }
  }
  return null;
}
