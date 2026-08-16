// scenery.js — bakes all static decoration into a single vertex-coloured mesh
// (one draw call for hundreds of props — kind to mobile GPUs). All shapes are
// original primitive compositions.

import * as THREE from '../../vendor/three.module.js';
import { DECOR } from '../world/decor.js';
import { heightAt } from './terrain.js';
import { blobGeometry } from './models.js';

// part: [kind, args, colorHex, x, y, z, rx?, ry?, rz?, s?]
const P = (kind, args, color, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0, s = 1) =>
  ({ kind, args, color, x, y, z, rx, ry, rz, s });

const TYPES = {
  pine: [
    P('cyl', [0.04, 0.1, 0.5, 6], 0x5a4028, 0, 0.25, 0),
    P('cone', [0.34, 0.62, 7], 0x2c5530, 0, 0.72, 0, 0.04, 0, 0.03),
    P('cone', [0.27, 0.52, 7], 0x336038, 0.02, 1.0, -0.02, -0.03, 0.5, 0.04),
    P('cone', [0.18, 0.4, 7], 0x3b6c42, -0.01, 1.28, 0.02, 0.03, 1, -0.03),
  ],
  leaftree: [
    P('cyl', [0.05, 0.12, 0.6, 6], 0x5a4028, 0, 0.3, 0, 0, 0, 0.06),
    P('blob', [0.42, 5, 0.26], 0x3f7a34, 0, 0.88, 0),
    P('blob', [0.3, 11, 0.26], 0x4a8a3e, 0.2, 1.08, 0.12),
    P('blob', [0.24, 17, 0.26], 0x386c30, -0.2, 1.0, -0.1),
  ],
  bush: [P('blob', [0.26, 7, 0.3], 0x39682f, 0, 0.16, 0)],
  flowers: [
    P('ico', [0.12, 0], 0x3f7a34, 0, 0.06, 0),
    P('sph', [0.05, 5, 4], 0xe8d84b, -0.1, 0.16, 0.05),
    P('sph', [0.05, 5, 4], 0xd06a9a, 0.1, 0.14, -0.06),
    P('sph', [0.05, 5, 4], 0xe8e8ee, 0.02, 0.18, 0.11),
  ],
  mushroom: [
    P('cyl', [0.04, 0.05, 0.14, 5], 0xe0d8c0, 0, 0.07, 0),
    P('cone', [0.11, 0.1, 6], 0xb03a2a, 0, 0.18, 0),
  ],
  cattail: [
    P('cyl', [0.015, 0.02, 0.55, 4], 0x5a8a4a, -0.06, 0.28, 0.03, 0, 0, 0.12),
    P('cyl', [0.015, 0.02, 0.45, 4], 0x5a8a4a, 0.07, 0.23, -0.04, 0, 0, -0.15),
    P('cyl', [0.035, 0.035, 0.14, 5], 0x6b4a2a, -0.08, 0.56, 0.03),
    P('cyl', [0.035, 0.035, 0.12, 5], 0x6b4a2a, 0.09, 0.47, -0.05),
  ],
  boulder: [P('blob', [0.32, 13, 0.3], 0x74747c, 0, 0.2, 0, 0.3, 0, 0.2)],
  crag: [
    P('blob', [0.42, 23, 0.32], 0x6d7180, 0, 0.28, 0, 0.2, 0, 0.3),
    P('blob', [0.24, 31, 0.3], 0x7a7e8c, 0.25, 0.15, 0.1),
  ],
  pebbles: [
    P('ico', [0.09, 0], 0x7a7a82, -0.15, 0.05, 0.1),
    P('ico', [0.07, 0], 0x8a8a92, 0.12, 0.04, -0.08),
    P('ico', [0.05, 0], 0x6a6a72, 0.02, 0.03, 0.15),
  ],
  stalagmite: [
    P('cone', [0.16, 0.5, 6], 0x7a7e8c, 0, 0.25, 0),
    P('cone', [0.1, 0.34, 5], 0x8a8e9c, 0.18, 0.17, 0.1),
  ],
  rubble: [
    P('box', [0.25, 0.14, 0.2], 0x7d8290, -0.1, 0.07, 0, 0, 0.4, 0),
    P('box', [0.18, 0.12, 0.16], 0x8d92a0, 0.14, 0.06, 0.08, 0, 0.9, 0),
    P('box', [0.12, 0.1, 0.12], 0x6d7280, 0.02, 0.05, -0.14, 0, 0.2, 0),
  ],
  pillar: [
    P('cyl', [0.16, 0.19, 1.0, 7], 0x9a9eac, 0, 0.5, 0, 0, 0, 0.12),
    P('box', [0.42, 0.1, 0.42], 0x8a8e9c, 0, 1.02, 0.06, 0, 0, 0.12),
  ],
  gravestone: [
    P('box', [0.28, 0.4, 0.08], 0x84889a, 0, 0.2, 0),
    P('box', [0.2, 0.1, 0.08], 0x84889a, 0, 0.44, 0),
  ],
  bones: [
    P('cyl', [0.025, 0.025, 0.4, 4], 0xe8e4d8, -0.05, 0.03, 0, 0, 0, 1.3),
    P('cyl', [0.025, 0.025, 0.34, 4], 0xdcd8cc, 0.08, 0.03, 0.05, 1.2, 0, 0.2),
    P('sph', [0.09, 6, 5], 0xe8e4d8, 0.12, 0.08, -0.1),
  ],
  lavarock: [
    P('ico', [0.26, 0], 0x3a2a2a, 0, 0.16, 0),
    P('ico', [0.1, 0], 0xe86a2a, 0.1, 0.24, 0.06),
    P('ico', [0.06, 0], 0xffa04a, -0.12, 0.12, -0.06),
  ],
  crate: [
    P('box', [0.36, 0.36, 0.36], 0x8a6a3e, 0, 0.18, 0),
    P('box', [0.38, 0.05, 0.05], 0x6b4e2a, 0, 0.18, 0.17),
  ],
  barrel: [
    P('cyl', [0.18, 0.21, 0.42, 8], 0x7a5c34, 0, 0.21, 0),
    P('cyl', [0.2, 0.2, 0.05, 8], 0x5a4028, 0, 0.3, 0),
  ],
  lamp: [
    P('cyl', [0.04, 0.05, 1.1, 5], 0x3a3a44, 0, 0.55, 0),
    P('box', [0.16, 0.18, 0.16], 0xffd97a, 0, 1.2, 0),
    P('cone', [0.14, 0.12, 4], 0x3a3a44, 0, 1.34, 0),
  ],
  well: [
    P('cyl', [0.42, 0.46, 0.4, 8], 0x8a8e9c, 0, 0.2, 0),
    P('cyl', [0.34, 0.34, 0.05, 8], 0x2d5f8a, 0, 0.41, 0),
    P('cyl', [0.04, 0.04, 0.8, 4], 0x6b4e2a, -0.36, 0.7, 0),
    P('cyl', [0.04, 0.04, 0.8, 4], 0x6b4e2a, 0.36, 0.7, 0),
    P('cone', [0.55, 0.3, 4], 0x8a4a3a, 0, 1.2, 0, 0, Math.PI / 4, 0),
  ],
  stall: [
    P('box', [0.04, 0.9, 0.04], 0x6b4e2a, -0.4, 0.45, -0.3), P('box', [0.04, 0.9, 0.04], 0x6b4e2a, 0.4, 0.45, -0.3),
    P('box', [0.04, 0.9, 0.04], 0x6b4e2a, -0.4, 0.45, 0.3), P('box', [0.04, 0.9, 0.04], 0x6b4e2a, 0.4, 0.45, 0.3),
    P('box', [1.0, 0.06, 0.8], 0xb03a2a, 0, 0.92, 0, 0, 0, 0.06),
    P('box', [0.9, 0.3, 0.6], 0x8a6a3e, 0, 0.35, 0),
    P('sph', [0.07, 5, 4], 0xd06a2a, -0.2, 0.55, 0.1), P('sph', [0.07, 5, 4], 0xe8d84b, 0.1, 0.55, -0.05),
  ],
  fence: [
    P('box', [0.06, 0.4, 0.06], 0x6b4e2a, -0.35, 0.2, 0), P('box', [0.06, 0.4, 0.06], 0x6b4e2a, 0.35, 0.2, 0),
    P('box', [0.8, 0.05, 0.04], 0x7a5c34, 0, 0.3, 0), P('box', [0.8, 0.05, 0.04], 0x7a5c34, 0, 0.16, 0),
  ],
  tent: [
    P('cone', [0.55, 0.7, 4], 0x4a4a54, 0, 0.35, 0, 0, Math.PI / 4, 0),
    P('cyl', [0.03, 0.03, 0.5, 4], 0x6b4e2a, 0, 0.6, 0),
  ],
  campfire: [
    P('ico', [0.09, 0], 0x6d7180, -0.2, 0.05, 0.08), P('ico', [0.08, 0], 0x7d8290, 0.18, 0.05, 0.1),
    P('ico', [0.08, 0], 0x6d7180, 0.02, 0.05, -0.2),
    P('cyl', [0.05, 0.05, 0.5, 4], 0x4a3320, 0, 0.08, 0, 0, 0, 1.4),
    P('cyl', [0.05, 0.05, 0.5, 4], 0x3a2818, 0, 0.08, 0, 1.4, 0.6, 0),
  ],
};

function partGeometry(p) {
  switch (p.kind) {
    case 'box': return new THREE.BoxGeometry(...p.args);
    case 'cyl': return new THREE.CylinderGeometry(...p.args);
    case 'cone': return new THREE.ConeGeometry(...p.args);
    case 'ico': return new THREE.IcosahedronGeometry(...p.args);
    case 'sph': return new THREE.SphereGeometry(...p.args);
    case 'blob': return blobGeometry(...p.args);   // lumpy RS2 canopy/boulder
    default: return new THREE.BoxGeometry(0.1, 0.1, 0.1);
  }
}

export function buildScenery() {
  const posArrays = [], colArrays = [];
  const color = new THREE.Color();
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), eu = new THREE.Euler();
  let total = 0;

  for (const d of DECOR) {
    const parts = TYPES[d.type];
    if (!parts) continue;
    const gy = heightAt(d.x + 0.5, d.y + 0.5);
    for (const p of parts) {
      const geo = partGeometry(p).toNonIndexed();
      eu.set(p.rx, p.ry + d.rot, p.rz);
      q.setFromEuler(eu);
      m.compose(
        new THREE.Vector3(d.x + 0.5 + p.x * d.s, gy + p.y * d.s, d.y + 0.5 + p.z * d.s),
        q, new THREE.Vector3(d.s * p.s, d.s * p.s, d.s * p.s));
      geo.applyMatrix4(m);
      const pa = geo.getAttribute('position').array;
      posArrays.push(pa);
      const jit = 0.9 + ((d.x * 31 + d.y * 17) % 13) / 13 * 0.2;
      const ca = new Float32Array(pa.length);
      // per-triangle tone dither — the RS2 faceted colour variance
      for (let i = 0; i < pa.length; i += 9) {
        const tj = 0.92 + (((i / 9) * 7 + d.x * 3 + d.y * 5) % 11) / 11 * 0.16;
        color.setHex(p.color).multiplyScalar(jit * tj);
        for (let v = 0; v < 9; v += 3) { ca[i + v] = color.r; ca[i + v + 1] = color.g; ca[i + v + 2] = color.b; }
      }
      colArrays.push(ca);
      total += pa.length;
      geo.dispose();
    }
  }

  const positions = new Float32Array(total);
  const colors = new Float32Array(total);
  let off = 0;
  for (let i = 0; i < posArrays.length; i++) {
    positions.set(posArrays[i], off);
    colors.set(colArrays[i], off);
    off += posArrays[i].length;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geo.computeVertexNormals();
  const mesh = new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ vertexColors: true }));
  mesh.name = 'scenery';
  return mesh;
}
