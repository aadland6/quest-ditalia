// terrain.js — low-poly heightmap terrain built from the SAME 72×96 tile grid
// that drives collision and pathfinding. Non-indexed geometry with per-face
// colours and normals gives the faceted RS2-era ground look. Original work —
// no assets from any game client.

import * as THREE from '../../vendor/three.module.js';
import { W, H, T, tileAt } from '../world/worldmap.js';

// base height per tile type (before smoothing)
const HEIGHTS = {
  [T.GRASS]: 0, [T.PATH]: 0, [T.MEADOW]: 0, [T.PLAZA]: 0.04, [T.SOIL]: 0.02,
  [T.FOREST]: 0.08, [T.STONE]: 0.28, [T.KEEP]: 0.45, [T.RIDGE]: 0.6,
  [T.VOLCANIC]: 1.7, [T.BRIDGE]: 0.08, [T.WATER]: -0.9, [T.ROCK]: 3.4,
};

// 3D colour palette (brighter than the 2D dark-UI palette)
const PALETTE = {
  [T.GRASS]: 0x4a7c3c, [T.PATH]: 0xb09468, [T.WATER]: 0x2d5f8a, [T.ROCK]: 0x6d7180,
  [T.STONE]: 0x8a8a92, [T.FOREST]: 0x35622e, [T.MEADOW]: 0x6b8f3e, [T.PLAZA]: 0x9a8468,
  [T.VOLCANIC]: 0x7a4444, [T.KEEP]: 0x7d8290, [T.BRIDGE]: 0x8a6a44, [T.SOIL]: 0x6b4e30,
  [T.RIDGE]: 0x8f7d54,
};

const hash = (x, y) => {
  let h = (x * 374761393 + y * 668265263) ^ 0x5bf03635;
  h = (h ^ (h >> 13)) * 1274126177;
  return ((h ^ (h >> 16)) >>> 0) / 4294967295;
};

// smoothed per-tile heights
const tileH = new Float32Array(W * H);
{
  const raw = new Float32Array(W * H);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) raw[y * W + x] = HEIGHTS[tileAt(x, y)] ?? 0;
  // two box-blur passes for rolling hills; water/bridge pinned afterwards
  let a = raw, b = new Float32Array(W * H);
  for (let pass = 0; pass < 2; pass++) {
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        let sum = 0, n = 0;
        for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
          const nx = x + dx, ny = y + dy;
          if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
          sum += a[ny * W + nx]; n++;
        }
        b[y * W + x] = sum / n;
      }
    }
    [a, b] = [b, a];
  }
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const t = tileAt(x, y);
    let h = a[y * W + x];
    if (t === T.WATER) h = Math.min(h, -0.55);
    if (t === T.BRIDGE) h = 0.08;
    // gentle rolling noise on open ground
    if (t !== T.WATER && t !== T.BRIDGE) h += (hash(x, y) - 0.5) * 0.12;
    tileH[y * W + x] = h;
  }
}

// corner grid (W+1 × H+1): mean of adjacent tile heights → continuous surface
const cornerH = new Float32Array((W + 1) * (H + 1));
for (let y = 0; y <= H; y++) {
  for (let x = 0; x <= W; x++) {
    let sum = 0, n = 0;
    for (const [dx, dy] of [[-1, -1], [0, -1], [-1, 0], [0, 0]]) {
      const tx = x + dx, ty = y + dy;
      if (tx < 0 || ty < 0 || tx >= W || ty >= H) continue;
      sum += tileH[ty * W + tx]; n++;
    }
    cornerH[y * (W + 1) + x] = n ? sum / n : 0;
  }
}
const cH = (x, y) => cornerH[y * (W + 1) + x];

// bilinear ground height at a world point (tile coords; entities/player use this)
export function heightAt(px, pz) {
  const x = Math.max(0, Math.min(W - 0.001, px));
  const z = Math.max(0, Math.min(H - 0.001, pz));
  const x0 = Math.floor(x), z0 = Math.floor(z);
  const fx = x - x0, fz = z - z0;
  const h00 = cH(x0, z0), h10 = cH(x0 + 1, z0), h01 = cH(x0, z0 + 1), h11 = cH(x0 + 1, z0 + 1);
  return (h00 * (1 - fx) + h10 * fx) * (1 - fz) + (h01 * (1 - fx) + h11 * fx) * fz;
}

// RS2-style ground colouring: vertex colours are BLENDED across tile corners
// (average of adjacent tile palettes + dither), so grass feathers into paths
// and rock instead of ending at hard tile edges. Normals stay per-face.
const cornerCol = new Float32Array((W + 1) * (H + 1) * 3);
{
  const c = new THREE.Color();
  for (let y = 0; y <= H; y++) {
    for (let x = 0; x <= W; x++) {
      let r = 0, g = 0, b = 0, n = 0;
      for (const [dx, dy] of [[-1, -1], [0, -1], [-1, 0], [0, 0]]) {
        const tx = x + dx, ty = y + dy;
        if (tx < 0 || ty < 0 || tx >= W || ty >= H) continue;
        c.setHex(PALETTE[tileAt(tx, ty)] ?? 0x4a7c3c);
        r += c.r; g += c.g; b += c.b; n++;
      }
      const jit = 0.92 + hash(x * 3 + 11, y * 5 + 7) * 0.16;   // dither
      const i = (y * (W + 1) + x) * 3;
      cornerCol[i] = (r / n) * jit; cornerCol[i + 1] = (g / n) * jit; cornerCol[i + 2] = (b / n) * jit;
    }
  }
}
const cCol = (x, y) => { const i = (y * (W + 1) + x) * 3; return [cornerCol[i], cornerCol[i + 1], cornerCol[i + 2]]; };

export function buildTerrain() {
  const positions = new Float32Array(W * H * 6 * 3);
  const colors = new Float32Array(W * H * 6 * 3);
  let i = 0;

  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const h00 = cH(x, y), h10 = cH(x + 1, y), h01 = cH(x, y + 1), h11 = cH(x + 1, y + 1);
      const c00 = cCol(x, y), c10 = cCol(x + 1, y), c01 = cCol(x, y + 1), c11 = cCol(x + 1, y + 1);
      // two triangles per tile, alternating split for a less regular mesh
      const flip = (x + y) % 2 === 0;
      const quad = flip
        ? [[x, h00, y, c00], [x, h01, y + 1, c01], [x + 1, h10, y, c10], [x + 1, h10, y, c10], [x, h01, y + 1, c01], [x + 1, h11, y + 1, c11]]
        : [[x, h00, y, c00], [x, h01, y + 1, c01], [x + 1, h11, y + 1, c11], [x, h00, y, c00], [x + 1, h11, y + 1, c11], [x + 1, h10, y, c10]];
      for (let v = 0; v < 6; v++) {
        positions[i * 3] = quad[v][0];
        positions[i * 3 + 1] = quad[v][1];
        positions[i * 3 + 2] = quad[v][2];
        // faint per-triangle tone shift keeps the dithered facet look
        const triJit = 0.97 + hash(x * 2 + (v < 3 ? 0 : 1), y * 3 + 7) * 0.06;
        const cc = quad[v][3];
        colors[i * 3] = cc[0] * triJit; colors[i * 3 + 1] = cc[1] * triJit; colors[i * 3 + 2] = cc[2] * triJit;
        i++;
      }
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geo.computeVertexNormals(); // non-indexed → true per-face normals (faceted)
  const mat = new THREE.MeshLambertMaterial({ vertexColors: true });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.name = 'terrain';
  return mesh;
}

// translucent river surface over the sunken water channel
export function buildWater() {
  const geo = new THREE.PlaneGeometry(68, 2.6);
  const mat = new THREE.MeshLambertMaterial({ color: 0x3a7ab5, transparent: true, opacity: 0.75 });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.set(2 + 34, -0.32, 74 + 1.3);
  mesh.name = 'water';
  return mesh;
}
