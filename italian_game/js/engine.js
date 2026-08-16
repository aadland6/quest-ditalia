// ===== Core game state, save/load, helpers =====

const SAVE_KEY = 'muraverde_save_v1';

let G = null; // global game state

function newGameState(name, race, cls){
  const r = RACES[race], c = CLASSES[cls];
  const stats = {};
  for (const k of ['hp','atk','def','wis','spd']) stats[k] = r.base[k] + c.mod[k];
  return {
    name, race, cls,
    level: 1, xp: 0,
    stats, hp: stats.hp,
    weapon: null, armor: null,
    inventory: { pane: 2 },
    resources: { monete: 15, legno: 0, pietra: 0, grano: 0 },
    buildings: { campanile:0, biblioteca:0, fucina:0, infermeria:0, mulino:0, orto:0 },
    map: 'abbazia', x: 11, y: 13, dir: 'down',
    flags: {},           // bosses defeated, chests opened, gates opened
    study: { levels: [], topics: [] }, // ⚙️ study filter (empty = automatic)
    review: [],          // missed question ids + snapshots
    counters: { ok:0, no:0, battles:0, words:{} },
    lang: 'it',
    ctrl: 'dpad',        // 'dpad' | 'touch' — overworld control scheme
  };
}

function maxHp(){ return G.stats.hp + G.buildings.infermeria * 5; }
function atkTotal(){ return G.stats.atk + (G.weapon ? ITEMS[G.weapon].atk : 0); }
function defTotal(){ return G.stats.def + (G.armor ? ITEMS[G.armor].def : 0); }

function gainXp(amount){
  const bonus = 1 + G.buildings.campanile * 0.10 + G.stats.wis * 0.01;
  const got = Math.round(amount * bonus);
  G.xp += got;
  let leveled = false;
  while (G.xp >= xpForLevel(G.level)) {
    G.xp -= xpForLevel(G.level);
    G.level++;
    const gr = RACES[G.race].growth;
    for (const k of ['hp','atk','def','wis','spd']) G.stats[k] += gr[k];
    G.hp = maxHp(); // full heal on level up
    leveled = true;
  }
  return { got, leveled };
}

function saveGame(){
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(G)); return true; }
  catch(e){ return false; }
}
function loadGame(){
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return false;
    G = JSON.parse(raw);
    if (!G || !G.name) return false;
    if (!G.study) G.study = { levels: [], topics: [] }; // migrate older saves
    if (!G.ctrl) G.ctrl = 'dpad';
    return true;
  } catch(e){ return false; }
}
function exportSave(){
  return btoa(unescape(encodeURIComponent(JSON.stringify(G))));
}
function importSave(code){
  try {
    const obj = JSON.parse(decodeURIComponent(escape(atob(code.trim()))));
    if (!obj || !obj.name || !obj.stats) return false;
    if (!obj.study) obj.study = { levels: [], topics: [] };
    if (!obj.ctrl) obj.ctrl = 'dpad';
    G = obj; saveGame(); return true;
  } catch(e){ return false; }
}

// small helpers
const $ = (id) => document.getElementById(id);
function showScreen(id){
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  $(id).classList.add('active');
}
function toast(msg, ms){
  const t = $('toast');
  t.textContent = msg; t.classList.add('show');
  clearTimeout(t._timer);
  t._timer = setTimeout(() => t.classList.remove('show'), ms || 2200);
}
function applyI18n(){
  document.querySelectorAll('[data-i18n]').forEach(el => { el.textContent = T(el.dataset.i18n); });
  $('btn-lang').textContent = LANG === 'it' ? '🇬🇧' : '🇮🇹';
}
function toggleLang(){
  LANG = LANG === 'it' ? 'en' : 'it';
  if (G) { G.lang = LANG; saveGame(); }
  applyI18n(); updateHud();
}
