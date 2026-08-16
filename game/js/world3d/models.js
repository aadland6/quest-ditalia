// models.js — original low-poly models built from primitives in code, in the
// spirit of RS2-era graphics (chunky, flat-shaded, few hundred tris each).
// Nothing here is extracted from or derived from any game client.

import * as THREE from '../../vendor/three.module.js';

const mat = (c, o = {}) => new THREE.MeshLambertMaterial({ color: c, flatShading: true, ...o });
const matS = (c, o = {}) => new THREE.MeshLambertMaterial({ color: c, ...o });  // smooth (gouraud) — the RS2 character look
const mesh = (geo, m) => new THREE.Mesh(geo, m);
const box = (w, h, d, c) => mesh(new THREE.BoxGeometry(w, h, d), mat(c));
const cyl = (rt, rb, h, c, seg = 6) => mesh(new THREE.CylinderGeometry(rt, rb, h, seg), mat(c));
const tcyl = (rt, rb, h, c, seg = 7) => mesh(new THREE.CylinderGeometry(rt, rb, h, seg), matS(c)); // smooth tapered limb/trunk
const cone = (r, h, c, seg = 6) => mesh(new THREE.ConeGeometry(r, h, seg), mat(c));
const ico = (r, c, det = 0) => mesh(new THREE.IcosahedronGeometry(r, det), mat(c));
const sph = (r, c, w = 6, hh = 5) => mesh(new THREE.SphereGeometry(r, w, hh), mat(c));
const sphS = (r, c, w = 8, hh = 7) => mesh(new THREE.SphereGeometry(r, w, hh), matS(c));

const at = (m, x, y, z) => { m.position.set(x, y, z); return m; };

// organic blob: icosahedron with seeded radial noise — RS2's lumpy canopies & boulders
const bhash = s => { let h = (s * 374761393) ^ 0x5bf03635; h = (h ^ (h >> 13)) * 1274126177; return ((h ^ (h >> 16)) >>> 0) / 4294967295; };
export function blobGeometry(r, seed = 1, spread = 0.22, det = 1) {
  const geo = new THREE.IcosahedronGeometry(r, det);
  const pos = geo.getAttribute('position');
  const v = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    const k = 1 + (bhash(seed * 91 + Math.round(v.x * 13 + v.y * 29 + v.z * 47)) - 0.5) * 2 * spread;
    pos.setXYZ(i, v.x * k, v.y * k, v.z * k);
  }
  geo.computeVertexNormals();
  return geo;
}
const blob = (r, c, seed = 1, spread = 0.22) => mesh(blobGeometry(r, seed, spread), mat(c));

function blobShadow(r = 0.35) {
  const m = mesh(new THREE.CircleGeometry(r, 12),
    new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.25, depthWrite: false }));
  m.rotation.x = -Math.PI / 2;
  m.position.y = 0.02;
  return m;
}

// floating nameplate (canvas-drawn sprite; our own "font rendering")
export function nameplate(text, color = '#ffe9a8', scale = 1) {
  const c = document.createElement('canvas');
  c.width = 256; c.height = 56;
  const ctx = c.getContext('2d');
  ctx.font = '700 30px -apple-system, Helvetica, sans-serif';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.strokeStyle = 'rgba(0,0,0,.85)'; ctx.lineWidth = 6;
  ctx.strokeText(text, 128, 28);
  ctx.fillStyle = color;
  ctx.fillText(text, 128, 28);
  const tex = new THREE.CanvasTexture(c);
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, depthWrite: false }));
  s.scale.set(2.2 * scale, 0.48 * scale, 1);
  return s;
}

// ---------- shared humanoid (player, bandits, undead…) ----------
// RS2-style: tapered smooth-shaded limbs and torso, round head — no boxes.
export function humanoid({ skin = 0xd9a066, shirt = 0x3f6fb2, pants = 0x54473a,
  hair = 0x3a2a1a, scale = 1, hood = null, thin = false } = {}) {
  const g = new THREE.Group();
  const f = thin ? 0.68 : 1;

  // legs (pivot at hip); boots ride along as children
  const legGeo = new THREE.CylinderGeometry(0.075 * f, 0.05 * f, 0.42, 6);
  legGeo.translate(0, -0.21, 0);
  const legL = mesh(legGeo, matS(pants));
  at(legL, -0.09, 0.46, 0);
  const bootL = mesh(new THREE.BoxGeometry(0.11 * f, 0.07, 0.17), matS(0x3a3226));
  at(bootL, 0, -0.41, 0.03);
  legL.add(bootL);
  const legR = legL.clone(); legR.position.x = 0.09;

  // torso: broad shoulders tapering to the waist; belt line
  const torso = mesh(new THREE.CylinderGeometry(0.2 * f, 0.13 * f, 0.5, 7), matS(shirt));
  torso.scale.z = 0.72;
  at(torso, 0, 0.72, 0);
  const belt = mesh(new THREE.CylinderGeometry(0.14 * f, 0.145 * f, 0.07, 7), matS(0x4a3a28));
  belt.scale.z = 0.72;
  at(belt, 0, 0.49, 0);

  // arms (pivot at shoulder, angled slightly out); hands as children
  const armGeo = new THREE.CylinderGeometry(0.05 * f, 0.038 * f, 0.36, 6);
  armGeo.translate(0, -0.18, 0);
  const armL = mesh(armGeo, matS(shirt));
  at(armL, -0.235 * f - (thin ? 0.02 : 0), 0.92, 0);
  armL.rotation.z = 0.14;
  const handL = mesh(new THREE.SphereGeometry(0.045, 6, 5), matS(skin));
  at(handL, 0, -0.37, 0);
  armL.add(handL);
  const armR = armL.clone();
  armR.position.x = 0.235 * f + (thin ? 0.02 : 0);
  armR.rotation.z = -0.14;

  // head + hair shell (or hood)
  const head = sphS(0.145, skin);
  head.scale.set(0.95, 1.08, 0.92);
  at(head, 0, 1.1, 0);
  g.add(legL, legR, torso, belt, armL, armR, head, blobShadow(0.3));
  if (hood) {
    const hd = mesh(new THREE.ConeGeometry(0.2, 0.36, 8), matS(hood));
    at(hd, 0, 1.24, -0.01);
    g.add(hd);
  } else {
    const hairCap = sphS(0.15, hair);
    hairCap.scale.set(1, 0.82, 1);
    at(hairCap, 0, 1.15, -0.025);
    g.add(hairCap);
  }
  g.scale.setScalar(scale);
  g.userData.anim = { kind: 'humanoid', legs: [legL, legR], arms: [armL, armR] };
  return g;
}

export function buildPlayer() {
  const g = humanoid({ shirt: 0x3f6fb2, pants: 0x4a3b2a });
  // cape hangs down the BACK, flaring slightly at the hem
  const cape = mesh(new THREE.CylinderGeometry(0.16, 0.22, 0.52, 7, 1, true, Math.PI * 0.6, Math.PI * 0.8), matS(0x8a2f2f, { side: THREE.DoubleSide }));
  at(cape, 0, 0.72, -0.05);
  cape.rotation.y = Math.PI;
  g.add(cape);
  return g;
}

// ---------- vegetation ----------
const CANOPY = {
  tree: 0x3f7a34, oak: 0x2f6329, teak: 0x7a8f3e, willow: 0x7fae76,
  maple: 0xb5652a, elder: 0x4a3e6b, yew: 0x274d3d, nests: 0x4a7c3c,
};
function treeModel(nodeId) {
  const g = new THREE.Group();
  const big = ['oak', 'maple', 'elder', 'yew'].includes(nodeId);
  const h = big ? 1.05 : 0.78;
  const seed = [...nodeId].reduce((a, ch) => a + ch.charCodeAt(0), 3);
  // tapered trunk with a slight lean, like RS2's crooked trees
  const trunk = tcyl(0.06, 0.13, h, 0x5a4028, 6);
  trunk.rotation.z = (bhash(seed) - 0.5) * 0.16;
  at(trunk, 0, h / 2, 0);
  g.add(trunk, blobShadow(0.5));
  const c = CANOPY[nodeId] ?? 0x3f7a34;
  if (nodeId === 'willow') {
    const cap = blob(0.55, c, seed, 0.18); cap.scale.y = 0.62; at(cap, 0, h + 0.28, 0); g.add(cap);
    for (let i = 0; i < 5; i++) {
      const strand = tcyl(0.028, 0.015, 0.55, 0x8fae76, 4);
      const a = i * (Math.PI * 2 / 5) + 0.4;
      at(strand, Math.cos(a) * 0.48, h + 0.06, Math.sin(a) * 0.48);
      strand.rotation.z = Math.cos(a) * 0.12;
      g.add(strand);
    }
  } else if (nodeId === 'nests') {
    const cap = blob(0.4, c, seed, 0.25); at(cap, 0, 0.78, 0); g.add(cap);
    const nest = mesh(new THREE.TorusGeometry(0.09, 0.04, 5, 8), mat(0x7a5c34));
    nest.rotation.x = Math.PI / 2; at(nest, 0.18, 0.98, 0.1);
    const egg = sph(0.05, 0xf2ead8, 5, 4); at(egg, 0.18, 1.0, 0.1);
    g.add(nest, egg);
  } else {
    // 2–3 lumpy overlapping canopy lobes, two-tone
    const lobes = big ? 3 : 2;
    const shade = new THREE.Color(c).multiplyScalar(1.18).getHex();
    for (let i = 0; i < lobes; i++) {
      const r = (big ? 0.5 : 0.4) - i * 0.09;
      const cap = blob(r, i === lobes - 1 ? shade : c, seed + i * 7, 0.26);
      at(cap,
        (bhash(seed + i) - 0.5) * 0.36,
        h + 0.18 + i * 0.26,
        (bhash(seed + i + 3) - 0.5) * 0.3);
      g.add(cap);
    }
  }
  return g;
}

function flaxModel() {
  const g = new THREE.Group();
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2;
    const blade = box(0.03, 0.5 + (i % 2) * 0.12, 0.03, 0x7aa35a);
    at(blade, Math.cos(a) * 0.14, 0.28, Math.sin(a) * 0.14);
    blade.rotation.z = Math.cos(a) * 0.25;
    blade.rotation.x = Math.sin(a) * 0.25;
    g.add(blade);
    const flower = sph(0.05, 0x7f9fe0, 5, 4);
    at(flower, Math.cos(a) * 0.2, 0.56 + (i % 2) * 0.1, Math.sin(a) * 0.2);
    g.add(flower);
  }
  g.add(blobShadow(0.3));
  return g;
}

function clayPitModel() {
  const g = new THREE.Group();
  const rim = mesh(new THREE.TorusGeometry(0.4, 0.1, 5, 10), mat(0x8a5a3a));
  rim.rotation.x = Math.PI / 2; at(rim, 0, 0.06, 0);
  const mud = mesh(new THREE.CircleGeometry(0.38, 10), mat(0x6e4326));
  mud.rotation.x = -Math.PI / 2; at(mud, 0, 0.04, 0);
  g.add(rim, mud);
  return g;
}

// ---------- rocks & ore ----------
const ORE_COLORS = {
  copper: 0xc07a3e, tin: 0xb9c0c8, iron: 0x9a5c48, silver: 0xe8e8ee, coal: 0x2b2b30,
  gold: 0xe8c33e, mithril: 0x5b7fd4, adamant: 0x4e9e6a, runite: 0x4fc3d0,
  gemrock: 0xc05ad0, stone: 0x8f8f96, granite: 0x565660, claypit: 0x8a5a3a,
};
function rockModel(nodeId) {
  if (nodeId === 'claypit') return clayPitModel();
  const g = new THREE.Group();
  const seed = [...nodeId].reduce((a, ch) => a + ch.charCodeAt(0), 11);
  const base = blob(0.42, 0x77777f, seed, 0.3);
  base.scale.y = 0.72; at(base, 0, 0.28, 0);
  g.add(base, blobShadow(0.45));
  const c = ORE_COLORS[nodeId] ?? 0x8f8f96;
  if (nodeId === 'stone' || nodeId === 'granite') {
    base.material = mat(c);
    const chunk = ico(0.2, c, 0); at(chunk, 0.3, 0.14, 0.15); g.add(chunk);
  } else {
    const n = nodeId === 'gemrock' ? 5 : 4;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + 0.5;
      const vein = ico(0.09, nodeId === 'gemrock' ? [0x4fc3d0, 0x60c060, 0xd05a5a, 0xc05ad0, 0xe8c33e][i] : c, 0);
      at(vein, Math.cos(a) * 0.3, 0.32 + Math.sin(i * 2.1) * 0.14, Math.sin(a) * 0.3);
      g.add(vein);
    }
  }
  return g;
}

// ---------- buildings ----------
const ROOFS = { bank: 0xc9a13a, workshop: 0x8a4a3a, shop: 0x4a7a4a, sawmill: 0x7a5c34, library: 0x3f5f9f, home: 0x8a4a3a, farm: 0x7a8f3e };
function prismRoof(w, d, h, c) {
  const geo = new THREE.BufferGeometry();
  const hw = w / 2, hd = d / 2;
  const v = [
    // two sloped quads + two gable triangles
    -hw, 0, -hd, -hw, 0, hd, 0, h, hd, -hw, 0, -hd, 0, h, hd, 0, h, -hd,
    hw, 0, hd, hw, 0, -hd, 0, h, -hd, hw, 0, hd, 0, h, -hd, 0, h, hd,
    -hw, 0, hd, hw, 0, hd, 0, h, hd,
    hw, 0, -hd, -hw, 0, -hd, 0, h, -hd,
  ];
  geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(v), 3));
  geo.computeVertexNormals();
  return mesh(geo, mat(c));
}
function buildingModel(e) {
  const g = new THREE.Group();
  const big = e.screen === 'bank';
  const w = big ? 1.7 : 1.4, d = big ? 1.5 : 1.25, hh = big ? 0.95 : 0.82;
  const TIMBER = 0x4a3a28;

  // RS2 townhouse: stone footing, plaster upper, dark timber frame
  const base = box(w + 0.06, 0.26, d + 0.06, 0x8a8a90);
  at(base, 0, 0.13, 0);
  const walls = box(w, hh - 0.26, d, e.screen === 'library' ? 0xd8cfba : 0xd6c9a8);
  at(walls, 0, 0.26 + (hh - 0.26) / 2, 0);
  g.add(base, walls);
  for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
    const post = box(0.09, hh, 0.09, TIMBER);
    at(post, sx * (w / 2 - 0.02), hh / 2, sz * (d / 2 - 0.02));
    g.add(post);
  }
  const beam = box(w + 0.04, 0.07, d + 0.04, TIMBER);
  at(beam, 0, hh - 0.05, 0);
  g.add(beam);
  // windows with timber sills
  for (const sx of [-0.33, 0.33]) {
    const win = box(0.2, 0.22, 0.04, 0x51422e);
    at(win, sx * w, hh * 0.62, d / 2 + 0.01);
    const sill = box(0.26, 0.04, 0.06, TIMBER);
    at(sill, sx * w, hh * 0.62 - 0.13, d / 2 + 0.02);
    g.add(win, sill);
  }
  // door with frame and a stone step
  const door = box(0.28, 0.42, 0.05, 0x5a4028);
  at(door, 0, 0.24, d / 2 + 0.02);
  const frame = box(0.36, 0.5, 0.04, TIMBER);
  at(frame, 0, 0.26, d / 2 + 0.005);
  const step = box(0.4, 0.07, 0.16, 0x9a9aa0);
  at(step, 0, 0.035, d / 2 + 0.1);
  g.add(frame, door, step);
  // overhanging roof with fascia and ridge beam
  const roof = prismRoof(w + 0.45, d + 0.45, big ? 0.62 : 0.5, ROOFS[e.screen] ?? 0x8a4a3a);
  at(roof, 0, hh, 0);
  const ridge = cyl(0.045, 0.045, d + 0.5, TIMBER, 5);
  ridge.rotation.x = Math.PI / 2;
  at(ridge, 0, hh + (big ? 0.62 : 0.5), 0);
  for (const s of [-1, 1]) {
    const fascia = box(w + 0.5, 0.07, 0.06, TIMBER);
    at(fascia, 0, hh + 0.01, s * (d / 2 + 0.21));
    g.add(fascia);
  }
  g.add(roof, ridge);
  if (big) {   // the bank earns a gold trim
    const trim = box(w + 0.08, 0.05, d + 0.08, 0xc9a13a);
    at(trim, 0, 0.29, 0);
    g.add(trim);
  }
  if (e.screen === 'workshop') { const ch = box(0.2, 0.55, 0.2, 0x8f8f96); at(ch, w / 2 - 0.2, hh + 0.35, -d / 4); g.add(ch); }
  if (e.screen === 'sawmill') { const log = cyl(0.12, 0.12, 0.9, 0x7a5c34, 6); log.rotation.z = Math.PI / 2; at(log, w / 2 + 0.3, 0.14, 0.2); g.add(log); }
  if (e.screen === 'farm') {
    g.clear();
    for (let i = 0; i < 4; i++) {
      const bed = box(0.55, 0.1, 0.85, 0x6b4e30);
      at(bed, (i % 2) * 0.75 - 0.37, 0.05, Math.floor(i / 2) * 1.05 - 0.5);
      g.add(bed);
      for (let s = 0; s < 3; s++) {
        const sprout = cone(0.06, 0.16, 0x6fae4a, 5);
        at(sprout, bed.position.x, 0.18, bed.position.z - 0.28 + s * 0.28);
        g.add(sprout);
      }
    }
  }
  const label = nameplate(e.name);
  at(label, 0, big ? 2.1 : 1.85, 0);
  g.add(label);
  return g;
}

function chestModel() {
  const g = new THREE.Group();
  const body = box(0.6, 0.32, 0.42, 0x7a5c34); at(body, 0, 0.16, 0);
  const lid = box(0.6, 0.16, 0.42, 0x8a6a3e); at(lid, 0, 0.38, -0.04); lid.rotation.x = -0.25;
  const band = box(0.64, 0.08, 0.46, 0xc9a13a); at(band, 0, 0.2, 0);
  const spark = ico(0.09, 0xffe066, 0); at(spark, 0, 0.85, 0);
  spark.material.transparent = true;
  g.add(body, lid, band, spark, blobShadow(0.42));
  g.userData.spark = spark;
  return g;
}

function gateModel(e) {
  const g = new THREE.Group();
  for (const s of [-0.55, 0.55]) {
    const post = box(0.16, 1.0, 0.16, 0x6b5b40); at(post, s, 0.5, 0);
    const tip = cone(0.12, 0.18, 0x5a4a33, 4); at(tip, s, 1.08, 0);
    g.add(post, tip);
  }
  const bar = box(1.26, 0.12, 0.1, 0x7a6a4c); at(bar, 0, 0.82, 0);
  g.add(bar);
  const label = nameplate(`⚔ ${e.combat}+  ${e.name}`, '#ff9a9a', 1.15);
  at(label, 0, 1.55, 0);
  g.add(label);
  g.userData.gateLabel = label;
  return g;
}

// ---------- monsters ----------
function slimeModel(scale = 1) {
  const g = new THREE.Group();
  const body = sph(0.34, 0x53b04a, 7, 5);
  body.material.transparent = true; body.material.opacity = 0.85;
  body.scale.y = 0.7; at(body, 0, 0.26, 0);
  const eyeL = sph(0.05, 0x18321a, 4, 3); at(eyeL, -0.1, 0.34, 0.26);
  const eyeR = eyeL.clone(); at(eyeR, 0.1, 0.34, 0.26);
  g.add(body, eyeL, eyeR, blobShadow(0.34));
  g.scale.setScalar(scale);
  g.userData.anim = { kind: 'slime', body };
  return g;
}
function ratModel() {
  const g = new THREE.Group();
  const body = sph(0.3, 0x6e5a4a, 7, 5); body.scale.set(1.4, 0.8, 1); at(body, 0, 0.26, 0);
  const head = cone(0.18, 0.34, 0x6e5a4a, 6); head.rotation.x = Math.PI / 2; at(head, 0, 0.28, 0.5);
  const earL = sph(0.07, 0xa88a72, 5, 4); at(earL, -0.09, 0.42, 0.38);
  const earR = earL.clone(); at(earR, 0.09, 0.42, 0.38);
  const tail = cyl(0.02, 0.04, 0.6, 0xa88a72, 4); tail.rotation.x = Math.PI / 2.3; at(tail, 0, 0.18, -0.6);
  g.add(body, head, earL, earR, tail, blobShadow(0.4));
  g.userData.anim = { kind: 'bob' };
  return g;
}
function lurkerModel() {
  const g = new THREE.Group();
  const body = sph(0.4, 0x4a7a3a, 7, 5); body.scale.y = 0.55; at(body, 0, 0.24, 0);
  for (const s of [-0.14, 0.14]) {
    const stalk = cyl(0.03, 0.03, 0.3, 0x4a7a3a, 4); at(stalk, s, 0.5, 0.1);
    const eye = sph(0.07, 0xe8d84b, 5, 4); at(eye, s, 0.66, 0.1);
    g.add(stalk, eye);
  }
  const legL = sph(0.12, 0x3d652f, 5, 4); at(legL, -0.34, 0.12, 0.18);
  const legR = legL.clone(); at(legR, 0.34, 0.12, 0.18);
  g.add(body, legL, legR, blobShadow(0.45));
  g.userData.anim = { kind: 'bob' };
  return g;
}
function wolfModel() {
  const g = new THREE.Group();
  const body = mesh(new THREE.CapsuleGeometry(0.17, 0.42, 3, 7), matS(0x777782));
  body.rotation.x = Math.PI / 2; at(body, 0, 0.42, 0);
  const head = sphS(0.15, 0x8a8a95); head.scale.set(0.9, 0.9, 1.1); at(head, 0, 0.56, 0.48);
  const snout = mesh(new THREE.ConeGeometry(0.07, 0.2, 6), matS(0x6a6a75));
  snout.rotation.x = Math.PI / 2; at(snout, 0, 0.52, 0.68);
  for (const s of [-0.08, 0.08]) { const ear = cone(0.05, 0.11, 0x6a6a75, 4); at(ear, s, 0.72, 0.42); g.add(ear); }
  for (const [sx, sz] of [[-0.1, 0.24], [0.1, 0.24], [-0.1, -0.24], [0.1, -0.24]]) {
    const leg = tcyl(0.045, 0.035, 0.3, 0x6a6a75, 5); at(leg, sx, 0.15, sz); g.add(leg);
  }
  const tail = tcyl(0.05, 0.02, 0.36, 0x8a8a95, 5); at(tail, 0, 0.52, -0.5); tail.rotation.x = -1.0;
  g.add(body, head, snout, tail, blobShadow(0.45));
  g.userData.anim = { kind: 'bob' };
  return g;
}
function crawlerModel() {
  const g = new THREE.Group();
  const segs = [0.26, 0.2, 0.15];
  segs.forEach((r, i) => { const s = sph(r, 0x5a6a4a, 6, 5); at(s, 0, 0.2 + i * 0.02, -i * 0.34); g.add(s); });
  for (const s of [-0.08, 0.08]) { const ant = cyl(0.02, 0.02, 0.3, 0x8a9a6a, 4); ant.rotation.z = s * 4; at(ant, s * 1.5, 0.45, 0.16); g.add(ant); }
  g.add(blobShadow(0.4));
  g.userData.anim = { kind: 'bob' };
  return g;
}
function golemModel() {
  // living masonry: lumpy boulder body parts
  const g = new THREE.Group();
  const legGeo = new THREE.CylinderGeometry(0.11, 0.09, 0.4, 6);
  legGeo.translate(0, -0.2, 0);
  const legL = mesh(legGeo, matS(0x7d8290)); at(legL, -0.16, 0.44, 0);
  const legR = legL.clone(); legR.position.x = 0.16;
  const torso = blob(0.34, 0x8f8f96, 5, 0.24);
  torso.scale.set(1, 1.1, 0.8); at(torso, 0, 0.82, 0);
  const armGeo = new THREE.CylinderGeometry(0.09, 0.07, 0.52, 6);
  armGeo.translate(0, -0.26, 0);
  const armL = mesh(armGeo, matS(0x7d8290)); at(armL, -0.42, 1.05, 0); armL.rotation.z = 0.18;
  const armR = armL.clone(); armR.position.x = 0.42; armR.rotation.z = -0.18;
  const shL = blob(0.15, 0x9a9ea8, 8, 0.3); at(shL, -0.4, 1.12, 0);
  const shR = blob(0.15, 0x9a9ea8, 12, 0.3); at(shR, 0.4, 1.12, 0);
  const head = blob(0.17, 0x9a9ea8, 21, 0.26); at(head, 0, 1.34, 0);
  const eye = sph(0.045, 0xe85a4b, 4, 3); at(eye, 0, 1.36, 0.15);
  g.add(legL, legR, torso, armL, armR, shL, shR, head, eye, blobShadow(0.5));
  g.userData.anim = { kind: 'humanoid', legs: [legL, legR], arms: [armL, armR] };
  return g;
}
function wyrmModel({ scale = 1, color = 0x4a8a4a, belly = 0xc9c07a } = {}) {
  const g = new THREE.Group();
  const body = sph(0.5, color, 8, 6); body.scale.set(1, 0.8, 1.4); at(body, 0, 0.5, 0);
  const chest = sph(0.34, belly, 6, 5); at(chest, 0, 0.45, 0.4);
  const neck = cyl(0.14, 0.22, 0.7, color, 6); neck.rotation.x = 0.5; at(neck, 0, 0.95, 0.45);
  const head = box(0.3, 0.22, 0.44, color); at(head, 0, 1.28, 0.62);
  const jaw = box(0.24, 0.08, 0.3, belly); at(jaw, 0, 1.16, 0.68);
  const tail = cone(0.16, 0.9, color, 6); tail.rotation.x = -Math.PI / 2.4; at(tail, 0, 0.4, -0.85);
  const wingGeo = new THREE.BufferGeometry();
  wingGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array([
    0, 0, 0, 1.1, 0.5, -0.3, 0.9, 0.1, -0.7,
  ]), 3));
  wingGeo.computeVertexNormals();
  const wingL = mesh(wingGeo, mat(color, { side: THREE.DoubleSide }));
  at(wingL, 0.25, 0.85, -0.1);
  const wingR = wingL.clone(); wingR.scale.x = -1; wingR.position.x = -0.25;
  for (const s of [-0.28, 0.28]) { const leg = box(0.14, 0.4, 0.14, color); at(leg, s, 0.2, 0.25); g.add(leg); }
  g.add(body, chest, neck, head, jaw, tail, wingL, wingR, blobShadow(0.7));
  g.scale.setScalar(scale);
  g.userData.anim = { kind: 'wyrm', wings: [wingL, wingR] };
  return g;
}

const MONSTERS = {
  marsh_slime: () => slimeModel(1),
  giant_rat: () => ratModel(),
  marsh_lurker: () => lurkerModel(),
  wolf: () => wolfModel(),
  cave_crawler: () => crawlerModel(),
  bandit: () => humanoid({ shirt: 0x555560, pants: 0x3a3a44, hood: 0x2f2f3a }),
  bandit_archer: () => {
    const g = humanoid({ shirt: 0x4a5a3a, pants: 0x3a3a2a, hood: 0x33402a });
    const bow = mesh(new THREE.TorusGeometry(0.3, 0.03, 4, 10, Math.PI), mat(0x7a5c34));
    bow.rotation.z = Math.PI / 2; at(bow, -0.34, 0.85, 0.05); g.add(bow);
    return g;
  },
  bandit_captain: () => {
    const g = humanoid({ shirt: 0x6a2a2a, pants: 0x2f2f3a, hood: 0x1f1f28, scale: 1.12 });
    const plume = cone(0.06, 0.24, 0xd04a4a, 5); at(plume, 0, 1.44, 0); g.add(plume);
    return g;
  },
  skeleton: () => humanoid({ skin: 0xe8e4d8, shirt: 0xd8d4c8, pants: 0xc8c4b8, hair: 0xd8d4c8, thin: true }),
  ghoul: () => humanoid({ skin: 0x7a9a6a, shirt: 0x5a6a4a, pants: 0x4a5a3a, hair: 0x5a6a4a }),
  stone_golem: () => golemModel(),
  wight: () => {
    const g = new THREE.Group();
    const robe = cone(0.4, 1.2, 0x2a2a3a, 7); at(robe, 0, 0.6, 0);
    const hood = cone(0.22, 0.35, 0x1f1f2c, 6); at(hood, 0, 1.25, 0);
    const eyes = sph(0.04, 0x9ad0ff, 4, 3); at(eyes, -0.07, 1.12, 0.14);
    const eyes2 = eyes.clone(); at(eyes2, 0.07, 1.12, 0.14);
    g.add(robe, hood, eyes, eyes2, blobShadow(0.4));
    g.userData.anim = { kind: 'hover' };
    return g;
  },
  young_wyrm: () => wyrmModel({ scale: 0.85, color: 0x4a8a4a }),
  elder_wyrm: () => wyrmModel({ scale: 1.15, color: 0xa04a3a, belly: 0xd8b06a }),
  wyrm_matriarch: () => wyrmModel({ scale: 1.45, color: 0x3a2a4a, belly: 0x9a7ac0 }),
};

// ---------- NPCs & ambient creatures ----------
function dogModel() {
  const g = new THREE.Group();
  const body = mesh(new THREE.CapsuleGeometry(0.12, 0.28, 3, 7), matS(0xb08a5a));
  body.rotation.x = Math.PI / 2; at(body, 0, 0.26, 0);
  const head = sphS(0.11, 0xc09a6a); head.scale.set(0.95, 0.95, 1.1); at(head, 0, 0.4, 0.3);
  const snout = mesh(new THREE.ConeGeometry(0.05, 0.13, 6), matS(0x8a6a42));
  snout.rotation.x = Math.PI / 2; at(snout, 0, 0.37, 0.44);
  for (const s of [-0.06, 0.06]) { const ear = cone(0.035, 0.09, 0x8a6a42, 4); at(ear, s, 0.52, 0.26); g.add(ear); }
  for (const [sx, sz] of [[-0.07, 0.14], [0.07, 0.14], [-0.07, -0.14], [0.07, -0.14]]) {
    const leg = tcyl(0.032, 0.026, 0.2, 0x9a7a4e, 5); at(leg, sx, 0.1, sz); g.add(leg);
  }
  const tail = tcyl(0.03, 0.012, 0.24, 0xc09a6a, 4); at(tail, 0, 0.38, -0.3); tail.rotation.x = -1.1;
  g.add(body, head, snout, tail, blobShadow(0.3));
  g.userData.anim = { kind: 'bob' };
  return g;
}
function ghostNpcModel() {
  const g = new THREE.Group();
  const robe = cone(0.32, 1.0, 0xbac4de, 7); at(robe, 0, 0.55, 0);
  robe.material.transparent = true; robe.material.opacity = 0.55;
  const head = sph(0.16, 0xcfd8ea, 6, 5); at(head, 0, 1.1, 0);
  head.material.transparent = true; head.material.opacity = 0.6;
  const eL = sph(0.035, 0x2a3a5a, 4, 3); at(eL, -0.06, 1.12, 0.13);
  const eR = eL.clone(); at(eR, 0.06, 1.12, 0.13);
  g.add(robe, head, eL, eR);
  g.userData.anim = { kind: 'hover' };
  return g;
}
export function buildNpcModel(npc) {
  let g;
  if (npc.kind === 'dog') g = dogModel();
  else if (npc.kind === 'ghost') g = ghostNpcModel();
  else {
    g = humanoid({ ...(npc.colors || {}), scale: npc.scale || 0.95 });
    g.userData.anim.kind = 'humanoid';
  }
  const label = nameplate(npc.name, '#cfe4ff', 0.8);
  at(label, 0, npc.kind === 'dog' ? 0.9 : 1.7, 0);
  g.add(label);
  return g;
}

export function butterflyModel() {
  const g = new THREE.Group();
  const wingGeo = new THREE.BufferGeometry();
  wingGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array([0, 0, 0, 0.14, 0.05, -0.06, 0.13, 0.02, 0.07]), 3));
  wingGeo.computeVertexNormals();
  const colors = [0xe8a04a, 0x9a6ae0, 0xe8e8ee, 0x6ac0e8];
  const c = colors[Math.floor(Math.random() * colors.length)];
  const wL = mesh(wingGeo, mat(c, { side: THREE.DoubleSide }));
  const wR = wL.clone(); wR.scale.x = -1;
  g.add(wL, wR);
  g.userData.wings = [wL, wR];
  return g;
}
export function birdModel() {
  const g = new THREE.Group();
  const body = sph(0.09, 0x4a4a54, 5, 4); body.scale.z = 1.7;
  const wingGeo = new THREE.BufferGeometry();
  wingGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array([0, 0, 0.06, 0.42, 0.02, -0.05, 0, 0, -0.12]), 3));
  wingGeo.computeVertexNormals();
  const wL = mesh(wingGeo, mat(0x5a5a64, { side: THREE.DoubleSide }));
  const wR = wL.clone(); wR.scale.x = -1;
  g.add(body, wL, wR);
  g.userData.wings = [wL, wR];
  return g;
}
export function campfireFlame() {
  const flame = cone(0.14, 0.4, 0xffa04a, 6);
  flame.material.transparent = true;
  flame.material.opacity = 0.9;
  return flame;
}
export function smokePuff() {
  const s = sph(0.1, 0x9a9aa4, 5, 4);
  s.material.transparent = true;
  s.material.opacity = 0.4;
  return s;
}

// ---------- entry point ----------
export function buildEntityModel(e) {
  let g;
  if (e.kind === 'gather') {
    const TREE_NODES = ['tree', 'oak', 'teak', 'willow', 'maple', 'elder', 'yew', 'nests'];
    if (TREE_NODES.includes(e.node)) g = treeModel(e.node);
    else if (e.node === 'flax') g = flaxModel();
    else g = rockModel(e.node);
  } else if (e.kind === 'enemy') {
    g = (MONSTERS[e.enemyId] || (() => slimeModel()))();
  } else if (e.kind === 'chest') {
    g = chestModel();
  } else if (e.kind === 'building') {
    g = buildingModel(e);
  } else if (e.kind === 'gate') {
    g = gateModel(e);
  } else if (e.kind === 'npc') {
    g = buildNpcModel(e.npc);
  } else {
    g = ico(0.3, 0xff00ff);
  }
  g.userData.entity = e;
  return g;
}
