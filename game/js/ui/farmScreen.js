// farmScreen.js — your farm: plots to plant, tend and harvest.
// Every skill feeds in: seeds (drops/nests/chests/shop), spades (Smithing),
// bonemeal (Crafting, from combat bones), the Greenhouse (Construction).
import { registerScreen, refresh, currentScreen } from './router.js';
import { header, esc, fmt, fmtMs, progressBar } from './common.js';
import { level } from '../state.js';
import { CROPS } from '../data/farming.js';
import { PLOT_LEVELS } from '../data/farming.js';
import { item } from '../data/items.js';
import { plots, plotState, plantableCrops, plant, harvest, spadeTier, spadeDoubleChance, growMs } from '../systems/farming.js';
import { invQty, bankQty } from '../systems/inventory.js';
import { toast, lootToast } from './toast.js';

let pickerFor = null; // plot index while choosing a crop

function render(el) {
  el.appendChild(header('Your Farm', '🌱', 'home'));
  const body = document.createElement('div');
  body.className = 'screen-body';
  const lvl = level('farming');
  const ps = plots();
  const spade = spadeTier();
  const bonemeal = invQty('bonemeal') + bankQty('bonemeal');

  let html = `
    <p class="area-desc">Farming level ${lvl} · ${ps.length} plot${ps.length > 1 ? 's' : ''}
      ${spade >= 0 ? ` · 🥄 double-harvest ${Math.round(spadeDoubleChance() * 100)}%` : ' · <b>no spade!</b> smith or buy one'}
      · 🦴 bonemeal ${fmt(bonemeal)}</p>
    <div class="cards">`;

  ps.forEach((p, i) => {
    const st = plotState(p);
    if (st.state === 'empty') {
      html += `
        <button class="card node" data-plant="${i}">
          <span class="card-icon">🟫</span>
          <span class="card-main"><span class="card-title">Empty plot</span>
          <span class="card-sub">Tap to plant a crop</span></span>
          <span class="card-side">🌰</span>
        </button>`;
    } else if (st.state === 'growing') {
      const total = growMs(st.crop);
      const done = total - (st.readyAt - Date.now());
      html += `
        <div class="card">
          <span class="card-icon">${st.crop.icon}</span>
          <span class="card-main"><span class="card-title">${esc(st.crop.name)}${st.fertilized ? ' 🦴' : ''}</span>
          ${progressBar(done / total, 'xpbar')}
          <span class="card-sub">ready in ${fmtMs(st.readyAt - Date.now())}</span></span>
          <span class="card-side">🌱</span>
        </div>`;
    } else {
      html += `
        <button class="card ready" data-harvest="${i}">
          <span class="card-icon">${st.crop.icon}</span>
          <span class="card-main"><span class="card-title">${esc(st.crop.name)}${st.fertilized ? ' 🦴' : ''}</span>
          <span class="card-sub">Ready to harvest!</span></span>
          <span class="card-side">✨</span>
        </button>`;
    }
  });
  html += `</div>`;

  const nextPlotLvl = PLOT_LEVELS.find(l => l > lvl);
  if (nextPlotLvl) html += `<p class="hint">Next plot unlocks at Farming ${nextPlotLvl}.</p>`;

  // crop picker
  if (pickerFor != null) {
    const usebm = bonemeal > 0;
    html += `<h2 class="sect">Plant what?</h2>
      ${usebm ? `<label class="toggle"><input type="checkbox" id="fert" checked> Use bonemeal (+50% yield, ${fmt(bonemeal)} left)</label>` : ''}
      <div class="cards">
      ${plantableCrops().map(c => `
        <button class="card ${c.unlocked && c.seeds > 0 ? '' : 'locked'}" data-crop="${c.id}">
          <span class="card-icon">${c.icon}</span>
          <span class="card-main">
            <span class="card-title">${esc(c.name)}</span>
            <span class="card-sub">lvl ${c.lvl} · grows ${c.growMin >= 60 ? (c.growMin / 60) + 'h' : c.growMin + 'm'} · yields ${c.yield[0]}–${c.yield[1]}× ${esc(item(c.out).name)} · ${c.plantXp}+${c.harvestXp} xp</span>
          </span>
          <span class="card-side">${c.unlocked ? `🌰 ${fmt(c.seeds)}` : '🔒 ' + c.lvl}</span>
        </button>`).join('')}
      </div>
      <div class="combat-actions"><button class="btn ghost" id="cancelPick">Cancel</button></div>`;
  }

  html += `<p class="hint">Seeds come from enemies, bird nests, chests and the store. Bones + clay grind
    into bonemeal at the loom. Crops feed crafting (flax, herbs → salves) and heal you in the field.</p>`;

  body.innerHTML = html;
  el.appendChild(body);

  body.querySelectorAll('[data-plant]').forEach(b => b.onclick = () => { pickerFor = +b.dataset.plant; refresh(); });
  body.querySelector('#cancelPick')?.addEventListener('click', () => { pickerFor = null; refresh(); });

  body.querySelectorAll('[data-crop]').forEach(b => b.onclick = async () => {
    const fert = body.querySelector('#fert')?.checked || false;
    const i = pickerFor;
    pickerFor = null;
    const res = await plant(i, b.dataset.crop, fert);
    if (!res) { refresh(); return; }
    if (res.blocked) { toast(res.blocked, '🔒'); refresh(); return; }
    if (!res.correct) { toast(res.msg, '💨'); refresh(); return; }
    toast(`${res.crop.name} planted (+${res.xp} xp)`, '🌱');
    refresh();
  });

  body.querySelectorAll('[data-harvest]').forEach(b => b.onclick = async () => {
    const res = await harvest(+b.dataset.harvest);
    if (!res) return;
    if (res.blocked) { toast(res.blocked, '⏳'); return; }
    if (!res.correct) { toast(res.msg, '💨'); refresh(); return; }
    lootToast(res.gains, res.doubled ? 'Bumper crop! ' : '', res.banked);
    refresh();
  });

  // tick timers while growing (only if the farm is still the visible screen)
  if (ps.some(p => p && plotState(p).state === 'growing')) {
    clearTimeout(render._t);
    render._t = setTimeout(() => { if (currentScreen()?.name === 'farm') refresh(); }, 30_000);
  }
}

registerScreen('farm', render);
