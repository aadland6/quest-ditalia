// state.js — the game save: one JSON document persisted to IndexedDB ('italia-game').
// All mutation goes through mutate(fn); persistence is debounced; 'change' events
// drive UI refresh. The SRS keeps its own separate database ('italia-srs').

import { levelForXp } from './xp.js';
import { COMBAT_SKILLS } from './data/skills.js';

const DB_NAME = 'italia-game';
const STORE = 'save';
const KEY = 'main';

export const defaultSave = () => ({
  v: 1,
  created: Date.now(),
  name: 'Viaggiatore',
  xp: {
    attack: 0, strength: 0, defence: 0, ranged: 0, hitpoints: 1154, // level 10, RS-style
    mining: 0, woodcutting: 0, farming: 0, smithing: 0, fletching: 0, crafting: 0, construction: 0,
  },
  hp: 10,
  inv: { coins: 25, bronze_pickaxe: 1, bronze_axe: 1 },
  bankVault: {},
  equip: {},                 // slot -> itemId (weapon, head, body, legs, ammo, amulet)
  style: 'attack',           // melee xp style: attack | strength | defence
  streak: 0, bestStreak: 0,
  answered: 0, correctCount: 0,
  libraryCleared: 0,
  perfectChests: 0,
  chests: {},                // chestId -> last-opened timestamp
  home: {},                  // roomId -> tier (0 if absent)
  build: null,               // in-progress project { roomId, tier, done, total }
  gardenClaimed: 0,          // last garden crate timestamp
  kills: {},                 // enemyId -> count
  actions: {},               // skillId -> question-actions taken
  farm: { plots: [] },       // farming plots: null | {crop, at, fert}
  pos: { x: 37, y: 64 },     // player tile position in the world (town plaza)
  settings: { controls: 'dpad', dpadSide: 'left' },
  harvests: 0,
  contract: null,            // today's contract (Sala delle Mappe)
  contractsDone: 0,
  ach: {},                   // achievementId -> earned timestamp
  log: {},                   // collection log: itemId -> first-obtained timestamp
  seenIntro: false,
});

let db = null;
let save = null;
let persistTimer = null;
const listeners = new Set();

function openDb() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

const tx = (mode, fn) => new Promise((resolve, reject) => {
  const t = db.transaction(STORE, mode);
  const store = t.objectStore(STORE);
  const req = fn(store);
  t.oncomplete = () => resolve(req?.result);
  t.onerror = () => reject(t.error);
});

export async function initState() {
  db = await openDb();
  const existing = await tx('readonly', s => s.get(KEY));
  if (existing) {
    const def = defaultSave();
    save = { ...def, ...existing };
    save.xp = { ...def.xp, ...existing.xp };       // new skills default to 0 xp
    save.farm = existing.farm || def.farm;
    save.settings = { ...def.settings, ...existing.settings };
  } else {
    save = defaultSave();
    await persist();
  }
  return save;
}

export const getSave = () => save;

async function persist() {
  // structuredClone strips nothing here (plain data), but guards against proxies
  await tx('readwrite', s => s.put(structuredClone(save), KEY));
}

function schedulePersist() {
  clearTimeout(persistTimer);
  persistTimer = setTimeout(() => persist().catch(e => console.error('save failed', e)), 250);
}

// Apply a mutation, persist (debounced) and notify UI. Returns fn's return value.
export function mutate(fn) {
  const out = fn(save);
  schedulePersist();
  for (const l of listeners) l(save);
  return out;
}

export function onChange(fn) { listeners.add(fn); return () => listeners.delete(fn); }

// Immediate flush (used before page hide)
export const flush = () => persist();

export async function hardReset() {
  clearTimeout(persistTimer);
  await tx('readwrite', s => s.delete(KEY));
  save = defaultSave();
  await persist();
  for (const l of listeners) l(save);
}

// ---------- derived stats ----------
export const level = skill => levelForXp(save.xp[skill] || 0);
export const totalLevel = () => Object.keys(save.xp).reduce((a, s) => a + level(s), 0);
export const maxHp = () => level('hitpoints');

// RS-lite combat level
export function combatLevel() {
  const base = (level('defence') + level('hitpoints')) / 4;
  const melee = (level('attack') + level('strength')) * 0.325;
  const range = level('ranged') * 0.4875;
  return Math.max(3, Math.floor(base + Math.max(melee, range)));
}

export const isCombatSkill = s => COMBAT_SKILLS.includes(s);

if (typeof window !== 'undefined') {
  window.addEventListener('pagehide', () => { clearTimeout(persistTimer); persist(); });
}
