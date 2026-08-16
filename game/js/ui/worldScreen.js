// worldScreen.js — the low-poly 3D world (RS2/OSRS-inspired, all-original assets).
// Three.js scene over the SAME tile grid: tap ground to walk (A*), tap trees /
// rocks / monsters / chests / buildings to interact, drag to orbit the camera,
// pinch or scroll to zoom. Interactions open the existing screens & questions.

import * as THREE from '../../vendor/three.module.js';
import { registerScreen, show, currentScreen } from './router.js';
import { W, H, terrainWalkable, regionAt, ENTITIES, entityAt, moveEntity } from '../world/worldmap.js';
import { BLOCKING } from '../world/decor.js';
import { findPath } from '../world/path.js';
import { buildTerrain, buildWater, heightAt } from '../world3d/terrain.js';
import { buildEntityModel, buildPlayer, butterflyModel, birdModel, campfireFlame, smokePuff } from '../world3d/models.js';
import { buildScenery } from '../world3d/scenery.js';
import { AREA } from '../data/areas.js';
import { getSave, mutate, combatLevel } from '../state.js';
import { doGather, nodeAvailable, toolMissing } from '../systems/activity.js';
import { chestStatus } from '../systems/chests.js';
import { toast, lootToast } from './toast.js';
import { fmtMs } from './common.js';

const SPEED = 5.5;                       // tiles per second (walk)

// ---------- movement state (persists across screens; position saved) ----------
const P = { x: 37, y: 64, px: 37, py: 64, path: [], pending: null, busy: false, yaw: 0, walkPhase: 0 };
const held = { active: false, ux: 0, uy: 0, axisToggle: false };  // D-pad state (screen-space dir)

function loadPos() {
  const pos = getSave().pos;
  if (pos && terrainWalkable(pos.x, pos.y) && !entityAt(pos.x, pos.y)) { P.x = pos.x; P.y = pos.y; }
  P.px = P.x; P.py = P.y; P.path = []; P.pending = null; P.busy = false;
}
const savePos = () => mutate(s => { s.pos = { x: P.x, y: P.y }; });

function passable(x, y) {
  if (!terrainWalkable(x, y)) return false;
  if (BLOCKING.has(x + ',' + y)) return false;
  const e = entityAt(x, y);
  if (!e) return true;
  if (e.kind === 'gate') return combatLevel() >= e.combat;
  return false;
}

function advanceMovement(dt) {
  if (!P.path.length) return;
  const next = P.path[0];
  const dx = next.x - P.px, dy = next.y - P.py;
  const dist = Math.hypot(dx, dy);
  const move = SPEED * dt;
  if (dist > 0.001) P.yaw = Math.atan2(dx, dy);
  if (dist <= move) {
    P.px = next.x; P.py = next.y; P.x = next.x; P.y = next.y;
    P.path.shift();
    if (!P.path.length) {
      savePos();
      if (P.pending) {
        const e = P.pending; P.pending = null;
        // wandering targets may have stepped away — chase a couple of times
        const cheb = Math.max(Math.abs(e.x - P.x), Math.abs(e.y - P.y));
        if (cheb > 1 && (P.retry || 0) < 3) { P.retry = (P.retry || 0) + 1; approach(e); }
        else { P.retry = 0; interact(e); }
      }
    }
  } else {
    P.px += (dx / dist) * move;
    P.py += (dy / dist) * move;
  }
}

// D-pad: convert the held screen-space direction to a camera-relative grid step
// and enqueue it whenever the character is free. Diagonals alternate axes;
// blocked steps slide along the free axis.
function dpadStep() {
  if (!held.active || P.path.length || P.busy) return;
  // camera-relative basis on the ground plane
  const fwd = { x: -Math.sin(cam.yaw), y: -Math.cos(cam.yaw) };   // screen-up
  const right = { x: -fwd.y, y: fwd.x };                          // screen-right
  const wx = fwd.x * -held.uy + right.x * held.ux;
  const wy = fwd.y * -held.uy + right.y * held.ux;
  const len = Math.hypot(wx, wy) || 1;
  const nx = wx / len, ny = wy / len;
  let dx = Math.abs(nx) > 0.4 ? Math.sign(nx) : 0;
  let dy = Math.abs(ny) > 0.4 ? Math.sign(ny) : 0;
  if (!dx && !dy) { dx = Math.abs(nx) >= Math.abs(ny) ? Math.sign(nx) : 0; dy = dx ? 0 : Math.sign(ny); }

  P.pending = null;
  // grid steps are 4-directional: diagonals alternate axes, falling back to
  // whichever axis is open (natural wall-sliding)
  const candidates = [];
  if (dx && dy) {
    held.axisToggle = !held.axisToggle;
    if (held.axisToggle) candidates.push([dx, 0], [0, dy]);
    else candidates.push([0, dy], [dx, 0]);
  } else {
    candidates.push([dx, dy]);
  }
  for (const [sx, sy] of candidates) {
    const tx = P.x + sx, ty = P.y + sy;
    if (passable(tx, ty)) { P.path = [{ x: tx, y: ty }]; return; }
  }
}

function walkTo(tx, ty) {
  P.pending = null;
  if (!passable(tx, ty)) {
    const e = entityAt(tx, ty);
    if (e?.kind === 'gate') { interact(e); return false; }
    return false;
  }
  const path = findPath(P.x, P.y, tx, ty, passable);
  if (!path) { toast('No way through — look for a path or a gate.', '🧭'); return false; }
  P.path = path;
  return true;
}

function approach(e) {
  const cheb = Math.max(Math.abs(e.x - P.x), Math.abs(e.y - P.y));
  if (cheb <= 1) { interact(e); return; }
  let best = null;
  for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
    const ax = e.x + dx, ay = e.y + dy;
    if (!passable(ax, ay)) continue;
    const path = findPath(P.x, P.y, ax, ay, passable);
    if (path && (!best || path.length < best.length)) best = path;
  }
  if (!best) { toast('You can’t reach that from here.', '🧭'); return; }
  P.path = best;
  P.pending = e;
}

const npcLineIdx = {};
async function interact(e) {
  if (e.kind === 'npc') {
    const n = e.npc;
    const i = npcLineIdx[n.id] = ((npcLineIdx[n.id] ?? -1) + 1) % n.lines.length;
    toast(`${n.name}: “${n.lines[i]}”`, '💬', 4200);
    faceNpcToPlayer(e);
    return;
  }
  if (e.kind === 'building') { show(e.screen); return; }
  if (e.kind === 'gate') {
    const cb = combatLevel();
    if (cb >= e.combat) toast(`The way to ${e.name} is open to you.`, '🚧');
    else toast(`${e.name} requires combat level ${e.combat} (you are ${cb}).`, '🔒');
    return;
  }
  if (e.kind === 'enemy') { show('combat', { enemyId: e.enemyId, areaId: e.area }); return; }
  if (e.kind === 'chest') {
    const chest = AREA[e.area].chest;
    const st = chestStatus(chest);
    if (st.onCooldown) { toast(`${chest.name} resets in ${fmtMs(st.readyAt - Date.now())}.`, '⏳'); return; }
    if (!st.hasKey) { toast(`You need a ${chest.keyItem.replace('_', ' ')} — enemies nearby drop them.`, '🗝️'); return; }
    show('chest', { areaId: e.area });
    return;
  }
  if (e.kind === 'gather') {
    const area = AREA[e.area];
    const node = area.gather.find(n => n.id === e.node);
    if (!nodeAvailable(node)) { toast(`Requires ${node.skill} level ${node.lvl}.`, '🔒'); return; }
    if (toolMissing(node)) { toast(`You need a ${node.skill === 'mining' ? 'pickaxe' : 'axe'} — smith one or buy bronze at the store.`, '🧰'); return; }
    P.busy = true;
    try {
      const res = await doGather(area, node);
      if (res?.blocked) toast(res.blocked, '🔒');
      else if (res && !res.correct) toast(res.msg, '💨');
      else if (res) lootToast(res.gains, res.doubled ? 'Double haul! ' : '', res.banked);
    } finally { P.busy = false; }
  }
}

// ---------- persistent Three.js scene ----------
let renderer = null, scene = null, camera = null;
let playerGroup = null, entityRoot = null, terrainMesh = null;
const animated = [];        // { g, kind, baseY, seed, parts }
const chests3d = [];        // { g, chest }
const gates3d = [];         // { g, e }
const wanderers = [];       // { e, g, home, from, to, t, moving, nextAt, speed }
const entityGroups = new Map();
const ambients = [];        // butterflies, birds, smoke, flame
let marker = null;

function faceNpcToPlayer(e) {
  const g = entityGroups.get(e.id);
  if (g) g.rotation.y = Math.atan2(P.px - e.x, P.py - e.y);
}
const cam = { yaw: 0, pitch: 0.9, dist: 12 };
const raycaster = new THREE.Raycaster();

function ensureScene() {
  if (renderer) return;
  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
  renderer.domElement.className = 'world3d-canvas';

  scene = new THREE.Scene();
  const sky = new THREE.Color(0x87b0d8);
  scene.background = sky;
  scene.fog = new THREE.Fog(sky, 28, 60);

  camera = new THREE.PerspectiveCamera(55, 1, 0.1, 200);

  scene.add(new THREE.HemisphereLight(0xcfe4ff, 0x5a4a33, 0.9));
  const sun = new THREE.DirectionalLight(0xfff2cc, 1.25);
  sun.position.set(30, 60, 20);
  scene.add(sun);

  terrainMesh = buildTerrain();
  scene.add(terrainMesh, buildWater(), buildScenery());

  entityRoot = new THREE.Group();
  const seedOf = e => (e.x * 7 + e.y * 13) % 100 / 100;
  for (const e of ENTITIES) {
    const g = buildEntityModel(e);
    const gy = heightAt(e.x + 0.5, e.y + 0.5);
    g.position.set(e.x + 0.5, gy, e.y + 0.5);
    if (e.kind !== 'building' && e.kind !== 'gate') g.rotation.y = seedOf(e) * Math.PI * 2;
    entityRoot.add(g);
    entityGroups.set(e.id, g);
    if (g.userData.anim) animated.push({ g, kind: g.userData.anim.kind, baseY: gy, seed: seedOf(e) * 7, parts: g.userData.anim });
    if (e.kind === 'chest') chests3d.push({ g, chest: AREA[e.area].chest });
    if (e.kind === 'gate') gates3d.push({ g, e });
    if (e.kind === 'enemy' || e.kind === 'npc') {
      wanderers.push({
        e, g, home: { x: e.x, y: e.y }, from: null, to: null, t: 0, moving: false,
        nextAt: performance.now() + 1000 + seedOf(e) * 4000,
        speed: e.kind === 'npc' ? 1.6 : 2.2, radius: e.kind === 'npc' ? (e.npc.radius ?? 2) : 2,
      });
    }
  }
  scene.add(entityRoot);

  // ---- ambient life ----
  for (const [cx, cz] of [[34, 82], [40, 85], [30, 80], [44, 87]]) {
    const b = butterflyModel();
    scene.add(b);
    ambients.push({ kind: 'butterfly', g: b, cx, cz, phase: Math.random() * 9 });
  }
  for (const [cx, cz, r, h, sp] of [[40, 58, 8, 7, 0.25], [57, 50, 6, 6.5, 0.32]]) {
    const b = birdModel();
    scene.add(b);
    ambients.push({ kind: 'bird', g: b, cx, cz, r, h, sp, phase: Math.random() * 9 });
  }
  const flame = campfireFlame();
  flame.position.set(57.5, heightAt(57.5, 26.5) + 0.28, 26.5);
  scene.add(flame);
  ambients.push({ kind: 'flame', g: flame, baseY: flame.position.y });
  for (let i = 0; i < 3; i++) {
    const s = smokePuff();
    scene.add(s);
    ambients.push({ kind: 'smoke', g: s, i, bx: 35.95, bz: 60.2, baseY: heightAt(35.95, 60.2) + 1.5 });
  }

  playerGroup = buildPlayer();
  scene.add(playerGroup);

  marker = new THREE.Mesh(
    new THREE.RingGeometry(0.22, 0.34, 16),
    new THREE.MeshBasicMaterial({ color: 0xffe066, transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false }));
  marker.rotation.x = -Math.PI / 2;
  scene.add(marker);
}

function flashMarker(x, z, color) {
  marker.material.color.setHex(color);
  marker.material.opacity = 0.95;
  marker.position.set(x, heightAt(x, z) + 0.06, z);
  marker.scale.setScalar(1.4);
}

let lastChestSweep = 0;
function updateWorld(dt, now) {
  // player transform + walk animation
  const gy = heightAt(P.px + 0.5, P.py + 0.5);
  playerGroup.position.set(P.px + 0.5, gy, P.py + 0.5);
  const targetYaw = P.yaw;
  let d = targetYaw - playerGroup.rotation.y;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  playerGroup.rotation.y += d * Math.min(1, dt * 12);
  const moving = P.path.length > 0;
  P.walkPhase = moving ? P.walkPhase + dt * 9 : P.walkPhase * Math.max(0, 1 - dt * 10);
  const swing = Math.sin(P.walkPhase) * (moving ? 0.75 : 0.2);
  const pa = playerGroup.userData.anim;
  pa.legs[0].rotation.x = swing; pa.legs[1].rotation.x = -swing;
  pa.arms[0].rotation.x = -swing * 0.8; pa.arms[1].rotation.x = swing * 0.8;

  // idle animations
  for (const a of animated) {
    const t = now / 1000 + a.seed;
    if (a.kind === 'slime') {
      a.parts.body.scale.y = 0.7 + Math.sin(t * 3) * 0.08;
      a.g.position.y = a.baseY + Math.max(0, Math.sin(t * 3)) * 0.08;
    } else if (a.kind === 'bob') {
      a.g.position.y = a.baseY + Math.sin(t * 2) * 0.04;
    } else if (a.kind === 'hover') {
      a.g.position.y = a.baseY + 0.08 + Math.sin(t * 1.6) * 0.06;
    } else if (a.kind === 'wyrm') {
      const flap = Math.sin(t * 2.4) * 0.45;
      a.parts.wings[0].rotation.z = flap;
      a.parts.wings[1].rotation.z = -flap;
    } else if (a.kind === 'humanoid' && a.parts.legs) {
      a.g.position.y = a.baseY + Math.max(0, Math.sin(t * 1.7)) * 0.015; // subtle shift
    }
  }

  // ---- wandering enemies & NPCs ----
  for (const w of wanderers) {
    if (!w.anim) w.anim = animated.find(a => a.g === w.g) || null;
    if (w.moving) {
      w.t += dt * w.speed;
      const f = Math.min(1, w.t);
      const ix = w.from.x + (w.to.x - w.from.x) * f;
      const iz = w.from.y + (w.to.y - w.from.y) * f;
      w.g.position.x = ix + 0.5;
      w.g.position.z = iz + 0.5;
      const gy2 = heightAt(ix + 0.5, iz + 0.5);
      w.g.position.y = gy2;
      if (w.anim) w.anim.baseY = gy2;   // idle-anim kinds re-apply their offsets from this
      w.g.rotation.y = Math.atan2(w.to.x - w.from.x, w.to.y - w.from.y);
      // walking humanoids swing their legs
      const parts = w.g.userData.anim;
      if (parts?.legs) {
        const s = Math.sin(now / 90) * 0.55;
        parts.legs[0].rotation.x = s; parts.legs[1].rotation.x = -s;
        if (parts.arms) { parts.arms[0].rotation.x = -s * 0.7; parts.arms[1].rotation.x = s * 0.7; }
      }
      if (f >= 1) { w.moving = false; w.nextAt = now + 1400 + Math.random() * 4200; }
    } else {
      const parts = w.g.userData.anim;
      if (parts?.legs) { parts.legs[0].rotation.x *= 0.85; parts.legs[1].rotation.x *= 0.85; }
      if (now >= w.nextAt) {
        w.nextAt = now + 1400 + Math.random() * 4200;
        const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]].sort(() => Math.random() - 0.5);
        for (const [dx, dy] of dirs) {
          const nx = w.e.x + dx, ny = w.e.y + dy;
          if (Math.max(Math.abs(nx - w.home.x), Math.abs(ny - w.home.y)) > w.radius) continue;
          if (!terrainWalkable(nx, ny) || BLOCKING.has(nx + ',' + ny) || entityAt(nx, ny)) continue;
          if (nx === P.x && ny === P.y) continue;
          w.from = { x: w.e.x, y: w.e.y };
          w.to = { x: nx, y: ny };
          moveEntity(w.e, nx, ny);      // claim destination in the spatial index
          w.t = 0; w.moving = true;
          break;
        }
      }
    }
  }

  // ---- ambient life ----
  for (const a of ambients) {
    const t = now / 1000 + (a.phase || 0);
    if (a.kind === 'butterfly') {
      const x = a.cx + Math.sin(t * 0.5) * 2 + Math.sin(t * 1.9) * 0.4 + 0.5;
      const z = a.cz + Math.cos(t * 0.4) * 2 + Math.cos(t * 1.5) * 0.4 + 0.5;
      a.g.position.set(x, heightAt(x, z) + 0.7 + Math.sin(t * 3.1) * 0.2, z);
      a.g.rotation.y = Math.atan2(Math.cos(t * 0.5), -Math.sin(t * 0.4));
      const flap = Math.sin(t * 16) * 1.0;
      a.g.userData.wings[0].rotation.z = flap;
      a.g.userData.wings[1].rotation.z = -flap;
    } else if (a.kind === 'bird') {
      const ang = t * a.sp;
      const x = a.cx + Math.cos(ang) * a.r + 0.5, z = a.cz + Math.sin(ang) * a.r + 0.5;
      a.g.position.set(x, a.h + Math.sin(t * 0.9) * 0.4, z);
      a.g.rotation.y = Math.atan2(-Math.sin(ang), Math.cos(ang)) + Math.PI / 2;
      a.g.rotation.z = 0.25;
      const flap = Math.sin(t * 5) * 0.35;
      a.g.userData.wings[0].rotation.z = flap;
      a.g.userData.wings[1].rotation.z = -flap;
    } else if (a.kind === 'flame') {
      a.g.scale.set(1 + Math.sin(t * 11) * 0.2, 1 + Math.sin(t * 13.7) * 0.3, 1 + Math.cos(t * 10.3) * 0.2);
      a.g.rotation.y = t * 2;
    } else if (a.kind === 'smoke') {
      const f = ((t * 0.3 + a.i / 3) % 1);
      a.g.position.set(a.bx + Math.sin(t + a.i) * 0.08, a.baseY + f * 1.4, a.bz);
      a.g.scale.setScalar(0.6 + f * 1.2);
      a.g.material.opacity = 0.35 * (1 - f);
    }
  }

  // chest sparkles + gate labels (cheap sweep every 700ms)
  if (now - lastChestSweep > 700) {
    lastChestSweep = now;
    for (const c of chests3d) c.g.userData.spark.visible = chestStatus(c.chest).canOpen;
    for (const gt of gates3d) {
      const open = combatLevel() >= gt.e.combat;
      if (gt.g.userData.gateLabel) gt.g.userData.gateLabel.visible = !open;
    }
  }
  for (const c of chests3d) if (c.g.userData.spark.visible) c.g.userData.spark.rotation.y += dt * 3;

  // click marker fade
  if (marker.material.opacity > 0) {
    marker.material.opacity = Math.max(0, marker.material.opacity - dt * 2.2);
    marker.scale.multiplyScalar(1 - dt * 0.8);
  }

  // camera follow (orbit around player)
  const cp = Math.cos(cam.pitch), sp = Math.sin(cam.pitch);
  camera.position.set(
    playerGroup.position.x + Math.sin(cam.yaw) * cam.dist * cp,
    playerGroup.position.y + cam.dist * sp,
    playerGroup.position.z + Math.cos(cam.yaw) * cam.dist * cp,
  );
  camera.lookAt(playerGroup.position.x, playerGroup.position.y + 0.8, playerGroup.position.z);
}

function renderOnce(now = performance.now()) {
  updateWorld(0, now);
  renderer.render(scene, camera);
}

// debug/test hooks (rAF is suspended in hidden panes)
if (typeof window !== 'undefined') {
  window.__worldP = P;
  window.__worldTick = dt => { dpadStep(); advanceMovement(dt); };
  window.__worldHold = (ux, uy) => {
    if (ux == null) held.active = false;
    else { held.active = true; held.ux = ux; held.uy = uy; }
  };
  window.__worldRender = () => renderOnce();
  window.__worldProject = (tx, ty) => {   // world tile → screen px (for tests)
    const v = new THREE.Vector3(tx + 0.5, heightAt(tx + 0.5, ty + 0.5) + 0.3, ty + 0.5);
    v.project(camera);
    const r = renderer.domElement.getBoundingClientRect();
    return { x: r.left + (v.x + 1) / 2 * r.width, y: r.top + (1 - v.y) / 2 * r.height };
  };
}

// ---------- screen ----------
function render(el) {
  ensureScene();
  loadPos();
  held.active = false;
  const st = getSave().settings || {};
  const dpadMode = (st.controls || 'dpad') === 'dpad';
  el.innerHTML = `
    <div class="world-wrap">
      <div class="world-banner" id="worldBanner"></div>
      <button class="world-gear" id="worldGear" aria-label="Settings">⚙️</button>
      ${dpadMode ? `
        <div class="dpad ${st.dpadSide === 'right' ? 'right' : ''}" id="dpad">
          <span class="dpad-arrow up">▲</span><span class="dpad-arrow down">▼</span>
          <span class="dpad-arrow left">◀</span><span class="dpad-arrow right">▶</span>
          <div class="dpad-thumb" id="dpadThumb"></div>
        </div>` : ''}
      <div class="world-hint">${dpadMode
        ? 'Hold the pad to move · tap things to use · drag to look'
        : 'Tap to walk · tap things to use · drag to look · pinch to zoom'}</div>
    </div>`;
  const wrap = el.querySelector('.world-wrap');
  wrap.prepend(renderer.domElement);
  const banner = el.querySelector('#worldBanner');
  el.querySelector('#worldGear').onclick = () => show('settings');

  // ----- D-pad: thumb-slide 8-way -----
  const pad = el.querySelector('#dpad');
  if (pad) {
    const thumb = el.querySelector('#dpadThumb');
    let padPointer = null;
    const setDir = ev => {
      const r = pad.getBoundingClientRect();
      const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
      let ux = (ev.clientX - cx) / (r.width / 2), uy = (ev.clientY - cy) / (r.height / 2);
      const len = Math.hypot(ux, uy);
      if (len < 0.22) { held.active = false; thumb.style.transform = 'translate(-50%,-50%)'; return; }
      if (len > 1) { ux /= len; uy /= len; }
      held.active = true; held.ux = ux; held.uy = uy;
      thumb.style.transform = `translate(calc(-50% + ${ux * 34}px), calc(-50% + ${uy * 34}px))`;
    };
    const clear = () => { padPointer = null; held.active = false; thumb.style.transform = 'translate(-50%,-50%)'; };
    pad.addEventListener('pointerdown', ev => { padPointer = ev.pointerId; pad.setPointerCapture(ev.pointerId); setDir(ev); ev.stopPropagation(); });
    pad.addEventListener('pointermove', ev => { if (ev.pointerId === padPointer) { setDir(ev); ev.stopPropagation(); } });
    pad.addEventListener('pointerup', clear);
    pad.addEventListener('pointercancel', clear);
  }

  function resize() {
    if (!wrap.isConnected) return;
    const w = wrap.clientWidth, h = wrap.clientHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  resize();
  window.addEventListener('resize', resize);

  // ----- input: tap vs drag vs pinch -----
  const dom = renderer.domElement;
  const pointers = new Map();
  let dragging = false, pinchDist = 0;

  const onDown = ev => {
    pointers.set(ev.pointerId, { x: ev.clientX, y: ev.clientY, sx: ev.clientX, sy: ev.clientY });
    dragging = false;
    if (pointers.size === 2) {
      const [a, b] = [...pointers.values()];
      pinchDist = Math.hypot(a.x - b.x, a.y - b.y);
    }
  };
  const onMove = ev => {
    const p = pointers.get(ev.pointerId);
    if (!p) return;
    const dx = ev.clientX - p.x, dy = ev.clientY - p.y;
    p.x = ev.clientX; p.y = ev.clientY;
    if (pointers.size === 1) {
      if (Math.hypot(ev.clientX - p.sx, ev.clientY - p.sy) > 10) dragging = true;
      if (dragging) {
        cam.yaw -= dx * 0.007;
        cam.pitch = Math.max(0.45, Math.min(1.25, cam.pitch + dy * 0.005));
      }
    } else if (pointers.size === 2) {
      dragging = true;
      const [a, b] = [...pointers.values()];
      const nd = Math.hypot(a.x - b.x, a.y - b.y);
      if (pinchDist > 0) cam.dist = Math.max(6, Math.min(22, cam.dist * (pinchDist / nd)));
      pinchDist = nd;
    }
  };
  const onUp = ev => {
    const wasSingle = pointers.size === 1;
    pointers.delete(ev.pointerId);
    if (!dragging && wasSingle) tap(ev);
    if (pointers.size === 0) dragging = false;
  };
  dom.onpointerdown = onDown;
  dom.onpointermove = onMove;
  dom.onpointerup = onUp;
  dom.onpointercancel = ev => pointers.delete(ev.pointerId);
  dom.onwheel = ev => { cam.dist = Math.max(6, Math.min(22, cam.dist + ev.deltaY * 0.01)); ev.preventDefault(); };

  function tap(ev) {
    if (P.busy) return;
    const r = dom.getBoundingClientRect();
    const ndc = new THREE.Vector2(
      ((ev.clientX - r.left) / r.width) * 2 - 1,
      -((ev.clientY - r.top) / r.height) * 2 + 1);
    raycaster.setFromCamera(ndc, camera);
    const hits = raycaster.intersectObjects([entityRoot, terrainMesh], true);
    for (const hit of hits) {
      let n = hit.object;
      while (n && !n.userData?.entity && n !== entityRoot && n !== terrainMesh) n = n.parent;
      if (n?.userData?.entity) {
        const e = n.userData.entity;
        flashMarker(e.x + 0.5, e.y + 0.5, 0xff6a5a);
        approach(e);
        return;
      }
      if (hit.object === terrainMesh) {
        if (dpadMode) return;               // D-pad mode: the pad moves you
        const tx = Math.floor(hit.point.x), ty = Math.floor(hit.point.z);
        if (walkTo(tx, ty)) flashMarker(tx + 0.5, ty + 0.5, 0xffe066);
        return;
      }
    }
  }

  // ----- loop -----
  let last = performance.now();
  let bannerRegion;
  function step(now) {
    if (currentScreen()?.name !== 'world') { window.removeEventListener('resize', resize); return; }
    requestAnimationFrame(step);
    const dt = Math.min(0.1, (now - last) / 1000);
    last = now;
    dpadStep();
    advanceMovement(dt);
    updateWorld(dt, now);
    renderer.render(scene, camera);

    const region = regionAt(P.x, P.y);
    if (region !== bannerRegion) {
      bannerRegion = region;
      banner.textContent = region ? `${region.icon} ${region.name}` : '🌍 The Wilds';
    }
  }
  requestAnimationFrame(step);
  renderOnce();   // paint immediately even if rAF is throttled
}

registerScreen('world', render);
