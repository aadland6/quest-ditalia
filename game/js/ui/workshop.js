// workshop.js — production stations: furnace (smelt), anvil (forge), bench, loom.
// Recipes draw materials from inventory AND bank (town QoL).
import { registerScreen, refresh } from './router.js';
import { header, esc, fmt } from './common.js';
import { RECIPES } from '../data/recipes.js';
import { item } from '../data/items.js';
import { level } from '../state.js';
import { invQty, bankQty, canAfford } from '../systems/inventory.js';
import { doRecipe } from '../systems/activity.js';
import { toast, lootToast } from './toast.js';
import { SKILL } from '../data/skills.js';

const STATIONS = [
  { id: 'furnace', name: 'Furnace', icon: '🔥' },
  { id: 'anvil', name: 'Anvil', icon: '⚒️' },
  { id: 'bench', name: 'Bench', icon: '🪑' },
  { id: 'loom', name: 'Loom', icon: '🧶' },
];

let activeStation = 'furnace';
let hideLocked = false;

function costHtml(recipe) {
  return Object.entries(recipe.in).map(([id, q]) => {
    const have = invQty(id) + bankQty(id);
    const ok = have >= q;
    return `<span class="cost ${ok ? 'ok' : 'short'}">${item(id).icon}${q}<small>/${fmt(have)}</small></span>`;
  }).join(' ');
}

function render(el) {
  el.appendChild(header('Workshop', '🏭', 'world'));
  const body = document.createElement('div');
  body.className = 'screen-body';

  const recipes = RECIPES.filter(r => r.station === activeStation)
    .filter(r => !hideLocked || level(r.skill) >= r.lvl)
    .sort((a, b) => a.lvl - b.lvl);

  body.innerHTML = `
    <div class="tabs">
      ${STATIONS.map(s => `<button class="tab ${s.id === activeStation ? 'on' : ''}" data-st="${s.id}">${s.icon} ${s.name}</button>`).join('')}
    </div>
    <label class="toggle"><input type="checkbox" id="hideLocked" ${hideLocked ? 'checked' : ''}> Hide locked</label>
    <div class="cards">
      ${recipes.map(r => {
        const unlocked = level(r.skill) >= r.lvl;
        const affordable = canAfford(r.in, { useBank: true });
        const out = Object.entries(r.out)[0];
        return `
          <button class="card recipe ${unlocked && affordable ? '' : 'locked'}" data-r="${r.id}">
            <span class="card-icon">${item(out[0]).icon}</span>
            <span class="card-main">
              <span class="card-title">${esc(r.name)}${out[1] > 1 ? ` ×${out[1]}` : ''}</span>
              <span class="card-sub">${SKILL[r.skill].icon} ${r.lvl} · ${r.xp} xp · ${costHtml(r)}</span>
            </span>
            <span class="card-side">${unlocked ? (affordable ? '▶' : '📦') : '🔒 ' + r.lvl}</span>
          </button>`;
      }).join('') || '<div class="empty">Nothing here at your level yet.</div>'}
    </div>`;
  el.appendChild(body);

  body.querySelectorAll('[data-st]').forEach(b => b.onclick = () => { activeStation = b.dataset.st; refresh(); });
  body.querySelector('#hideLocked').onchange = e => { hideLocked = e.target.checked; refresh(); };

  body.querySelectorAll('[data-r]').forEach(btn => btn.onclick = async () => {
    const r = RECIPES.find(x => x.id === btn.dataset.r);
    const st = STATIONS.find(s => s.id === r.station);
    const res = await doRecipe(r, { useBank: true, stationIcon: st.icon, stationName: st.name });
    if (!res) return;
    if (res.blocked) { toast(res.blocked, '🔒'); return; }
    if (!res.correct) { toast(res.msg, '💨'); refresh(); return; }
    lootToast(res.gains, res.refunded ? 'Materials refunded! ' : '');
    refresh();
  });
}

registerScreen('workshop', render);
